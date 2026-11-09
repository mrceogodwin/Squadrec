import { createSign } from "node:crypto";

const OAUTH_HOST = process.env.DOCUSIGN_OAUTH_HOST || "account-d.docusign.com";
const API_BASE = process.env.DOCUSIGN_BASE_PATH || "https://demo.docusign.net/restapi";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable.`);
  return value;
}

export async function getDocuSignAccessToken() {
  const integrationKey = required("DOCUSIGN_INTEGRATION_KEY");
  const userId = required("DOCUSIGN_USER_ID");
  const privateKey = required("DOCUSIGN_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({
    iss: integrationKey,
    sub: userId,
    aud: OAUTH_HOST,
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  });
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + signer.sign(privateKey).toString("base64url");
  const response = await fetch(`https://${OAUTH_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const message = data.error === "consent_required"
      ? "DocuSign JWT consent has not been granted for the integration user."
      : "DocuSign authentication failed.";
    throw new Error(message);
  }
  return String(data.access_token);
}

export function docuSignApiBase() {
  return API_BASE.replace(/\\/$/, "");
}

export function docuSignAccountId() {
  return required("DOCUSIGN_ACCOUNT_ID");
}

export function buildContractPdf(lines: string[]) {
  const clean = (value: string) => value.normalize("NFKD").replace(/[^\\x20-\\x7E]/g, "?");
  const wrapped: string[] = [];
  for (const line of lines) {
    const words = clean(line).split(/\\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? current + " " + word : word;
      if (next.length > 88 && current) { wrapped.push(current); current = word; }
      else current = next;
    }
    wrapped.push(current);
  }
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 48) pages.push(wrapped.slice(i, i + 48));
  if (!pages.length) pages.push(["SQUADREC AGREEMENT"]);
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => id + " 0 R").join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    let stream = "BT /F1 10 Tf 48 790 Td 14 TL ";
    page.forEach((line, lineIndex) => {
      const escaped = line.replace(/\\\\/g, "\\\\\\\\").replace(/\\(/g, "\\\\(").replace(/\\)/g, "\\\\)");
      stream += (lineIndex ? "T* " : "") + "(" + escaped + ") Tj ";
    });
    stream += "ET";
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\\nstream\\n${stream}\\nendstream`;
  });
  let pdf = "%PDF-1.4\\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\\n${objects[id]}\\nendobj\\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\\n0 ${objects.length}\\n0000000000 65535 f \\n`;
  for (let id = 1; id < objects.length; id++) pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \\n";
  pdf += `trailer\\n<< /Size ${objects.length} /Root 1 0 R >>\\nstartxref\\n${xref}\\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
