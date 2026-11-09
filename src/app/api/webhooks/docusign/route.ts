import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { docuSignAccountId, docuSignApiBase, getDocuSignAccessToken } from "@/lib/docusign";

export const runtime = "nodejs";

function validHmac(rawBody: string, signature: string, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64"); } catch { return false; }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function getEvent(payload: any) {
  const summary = payload?.data?.envelopeSummary || payload?.envelopeSummary || payload?.data || payload;
  return {
    envelopeId: String(summary?.envelopeId || payload?.envelopeId || ""),
    status: String(summary?.status || payload?.status || "").toLowerCase(),
  };
}

export async function POST(request: Request) {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_KEY;
  if (!secret) return NextResponse.json({ error: "DocuSign Connect webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const signatures = Array.from({ length: 5 }, (_, index) => request.headers.get("x-docusign-signature-" + (index + 1))).filter((value): value is string => Boolean(value));
  if (!signatures.some(signature => validHmac(rawBody, signature, secret))) {
    return NextResponse.json({ error: "Invalid DocuSign webhook signature." }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Webhook payload must be configured as JSON." }, { status: 400 }); }
  const event = getEvent(payload);
  if (!event.envelopeId || !event.status) return NextResponse.json({ error: "Missing envelope ID or status." }, { status: 400 });

  const envelopeLog = await prisma.auditLog.findFirst({
    where: { action: "DOCUSIGN_ENVELOPE_CREATED", entityType: "Contract", metadata: { path: ["envelopeId"], equals: event.envelopeId } },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });
  if (!envelopeLog) return NextResponse.json({ error: "Unknown DocuSign envelope." }, { status: 404 });

  if (event.status === "completed") {
    try {
      const token = await getDocuSignAccessToken();
      const verifyResponse = await fetch(
        docuSignApiBase() + "/v2.1/accounts/" + encodeURIComponent(docuSignAccountId()) + "/envelopes/" + encodeURIComponent(event.envelopeId),
        { headers: { Authorization: "Bearer " + token }, cache: "no-store" },
      );
      const verified = await verifyResponse.json();
      if (!verifyResponse.ok || String(verified.status).toLowerCase() !== "completed" || verified.envelopeId !== event.envelopeId) {
        return NextResponse.json({ error: "DocuSign envelope status could not be independently verified." }, { status: 502 });
      }

      await prisma.$transaction(async tx => {
        const current = await tx.contract.findUnique({ where: { id: envelopeLog.entityId }, select: { status: true, signedAt: true } });
        if (!current) throw new Error("Contract no longer exists.");
        if (current.status === "SIGNED" || current.status === "PAYMENT_PENDING" || current.status === "COMPLETED") return;
        if (current.status !== "SENT" && current.status !== "PARTIALLY_SIGNED") {
          throw new Error("Contract is not awaiting DocuSign completion.");
        }
        await tx.contract.update({
          where: { id: envelopeLog.entityId },
          data: { status: "SIGNED", signedAt: verified.completedDateTime ? new Date(verified.completedDateTime) : new Date() },
        });
        await tx.auditLog.create({
          data: {
            action: "SIGNATURES_VERIFIED_BY_PROVIDER",
            entityType: "Contract",
            entityId: envelopeLog.entityId,
            metadata: {
              provider: "DOCUSIGN",
              envelopeId: event.envelopeId,
              providerStatus: verified.status,
              completedDateTime: verified.completedDateTime || null,
              certificateOfCompletionAvailable: true,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            action: "CONTRACT_SIGNED_BY_PROVIDER",
            entityType: "Contract",
            entityId: envelopeLog.entityId,
            metadata: { provider: "DOCUSIGN", envelopeId: event.envelopeId },
          },
        });
      });
    } catch {
      return NextResponse.json({ error: "Signature completion could not be verified or recorded." }, { status: 502 });
    }
  } else if (event.status === "declined" || event.status === "voided") {
    await prisma.auditLog.create({
      data: {
        action: event.status === "declined" ? "DOCUSIGN_ENVELOPE_DECLINED" : "DOCUSIGN_ENVELOPE_VOIDED",
        entityType: "Contract",
        entityId: envelopeLog.entityId,
        metadata: { provider: "DOCUSIGN", envelopeId: event.envelopeId, status: event.status },
      },
    });
  } else {
    await prisma.auditLog.create({
      data: {
        action: "DOCUSIGN_ENVELOPE_EVENT",
        entityType: "Contract",
        entityId: envelopeLog.entityId,
        metadata: { provider: "DOCUSIGN", envelopeId: event.envelopeId, status: event.status },
      },
    });
  }
  return NextResponse.json({ received: true });
}
