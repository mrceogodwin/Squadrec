import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildContractPdf, docuSignAccountId, docuSignApiBase, getDocuSignAccessToken } from "@/lib/docusign";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { include: {
      buyer: { select: { id: true, name: true, email: true } },
      track: { include: { artistProfile: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  const holder = contract.offer.track.artistProfile.user;
  const buyer = contract.offer.buyer;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isAdmin && holder.id !== session.user.id) return NextResponse.json({ error: "Only the rights holder or an administrator can initiate signature." }, { status: 403 });
  if (contract.status !== "SENT") return NextResponse.json({ error: "The agreement must be sent for review before signature." }, { status: 409 });
  const buyerAccepted = await prisma.auditLog.findFirst({
    where: { entityType: "Contract", entityId: contract.id, action: "CONTRACT_TERMS_ACCEPTED_PENDING_SIGNATURE", actorId: buyer.id },
    select: { id: true },
  });
  if (!buyerAccepted) return NextResponse.json({ error: "The acquiring party must accept the final terms before signature can begin." }, { status: 409 });
  if (!holder.email || !buyer.email) return NextResponse.json({ error: "Both parties must have valid email addresses." }, { status: 400 });
  const existing = await prisma.auditLog.findFirst({
    where: { entityType: "Contract", entityId: contract.id, action: "DOCUSIGN_ENVELOPE_CREATED" },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const previous = existing?.metadata as { envelopeId?: string; status?: string } | null;
  if (previous?.envelopeId && previous.status !== "voided" && previous.status !== "declined") {
    return NextResponse.json({ error: "A DocuSign envelope already exists for this agreement.", envelopeId: previous.envelopeId }, { status: 409 });
  }

  try {
    const token = await getDocuSignAccessToken();
    const base = docuSignApiBase();
    const accountId = docuSignAccountId();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured." }, { status: 503 });
    const lines = [
      "SQUADREC - MUSIC RIGHTS AGREEMENT",
      "Contract reference: " + contract.id,
      "Agreement type: " + contract.contractType.replaceAll("_", " "),
      "Track: " + contract.offer.track.title,
      "Artist: " + contract.offer.track.artistProfile.stageName,
      "Rights holder: " + (holder.name || holder.email) + " <" + holder.email + ">",
      "Acquiring party: " + (buyer.name || buyer.email) + " <" + buyer.email + ">",
      "Consideration: " + (contract.offer.amountMinor == null ? "As separately agreed" : (contract.offer.currency + " " + (contract.offer.amountMinor / 100).toFixed(2))),
      "",
      "AGREED TERMS",
      ...contract.terms.split(/\r?\n/),
      "",
      "SIGNATURES",
      "Rights holder signature: [HOLDER_SIGNATURE]",
      "Date: [HOLDER_DATE]",
      "Acquiring party signature: [BUYER_SIGNATURE]",
      "Date: [BUYER_DATE]",
      "",
      "This agreement is executed only when all required signers have completed the DocuSign process.",
    ];
    const pdf = buildContractPdf(lines);
    const documentBase64 = pdf.toString("base64");
    const webhookUrl = appUrl.replace(/\/$/, "") + "/api/webhooks/docusign";
    const envelope = {
      emailSubject: "SQUADREC agreement signature required: " + contract.offer.track.title,
      emailBlurb: "Please review and sign this music rights agreement. Each required party must complete signing.",
      status: "sent",
      documents: [{
        documentBase64,
        name: "SQUADREC-" + contract.id + ".pdf",
        fileExtension: "pdf",
        documentId: "1",
      }],
      recipients: {
        signers: [
          {
            email: holder.email,
            name: holder.name || contract.offer.track.artistProfile.stageName,
            recipientId: "1",
            routingOrder: "1",
            tabs: {
              signHereTabs: [{ anchorString: "[HOLDER_SIGNATURE]", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }],
              dateSignedTabs: [{ anchorString: "[HOLDER_DATE]", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }],
            },
          },
          {
            email: buyer.email,
            name: buyer.name || buyer.email,
            recipientId: "2",
            routingOrder: "2",
            tabs: {
              signHereTabs: [{ anchorString: "[BUYER_SIGNATURE]", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }],
              dateSignedTabs: [{ anchorString: "[BUYER_DATE]", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }],
            },
          },
        ],
      },
      eventNotification: {
        url: webhookUrl,
        loggingEnabled: "true",
        requireAcknowledgment: "true",
        includeHMAC: "true",
        includeDocuments: "false",
        includeCertificateOfCompletion: "true",
        envelopeEvents: [
          { envelopeEventStatusCode: "sent" },
          { envelopeEventStatusCode: "completed" },
          { envelopeEventStatusCode: "declined" },
          { envelopeEventStatusCode: "voided" },
        ],
      },
    };
    const response = await fetch(base + "/v2.1/accounts/" + encodeURIComponent(accountId) + "/envelopes", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.envelopeId) {
      return NextResponse.json({ error: "DocuSign could not create the signature envelope.", providerMessage: result.message || result.errorCode || "Provider request failed." }, { status: 502 });
    }
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "DOCUSIGN_ENVELOPE_CREATED",
        entityType: "Contract",
        entityId: contract.id,
        metadata: {
          provider: "DOCUSIGN",
          envelopeId: result.envelopeId,
          status: result.status || "sent",
          signerOrder: [holder.id, buyer.id],
          webhookConfigured: true,
          documentSha256: await (async () => {
            const { createHash } = await import("node:crypto");
            return createHash("sha256").update(pdf).digest("hex");
          })(),
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CONTRACT_SIGNATURES_REQUESTED",
        entityType: "Contract",
        entityId: contract.id,
        metadata: { provider: "DOCUSIGN", envelopeId: result.envelopeId },
      },
    });
    return NextResponse.json({ envelopeId: result.envelopeId, status: result.status || "sent", message: "DocuSign sent the agreement to the rights holder first, then the acquiring party." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DocuSign is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
