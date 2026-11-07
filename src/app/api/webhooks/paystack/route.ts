import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({ received: true });

  const paymentEvent = await prisma.auditLog.findFirst({
    where: { action: "PAYMENT_INITIALIZED", entityType: "Contract" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadata: true },
  });
  const reference = event.data.reference;
  const matching = await prisma.auditLog.findFirst({
    where: { action: "PAYMENT_INITIALIZED", entityType: "Contract", metadata: { path: ["reference"], equals: reference } },
    select: { entityId: true, metadata: true },
  });
  if (!matching) return NextResponse.json({ error: "Payment reference is not recognised." }, { status: 404 });

  const verifyResponse = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
    headers: { Authorization: "Bearer " + secret },
    cache: "no-store",
  });
  const verification = await verifyResponse.json();
  if (!verifyResponse.ok || !verification.status || verification.data?.status !== "success" || verification.data?.reference !== reference) {
    return NextResponse.json({ error: "Paystack transaction verification failed." }, { status: 400 });
  }

  const metadata = matching.metadata as { amount?: number; currency?: string } | null;
  if (verification.data.amount !== metadata?.amount || verification.data.currency !== metadata?.currency) {
    return NextResponse.json({ error: "Verified payment amount or currency does not match the contract." }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({ where: { id: matching.entityId }, select: { id: true, status: true, contractType: true, signedAt: true } });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.status === "COMPLETED" && contract.completedAt) return NextResponse.json({ received: true, alreadyProcessed: true });
  if (contract.status !== "PAYMENT_PENDING" || !contract.signedAt) return NextResponse.json({ error: "Contract is not signed and awaiting payment." }, { status: 409 });

  await prisma.$transaction([
    prisma.contract.update({ where: { id: contract.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        action: "PAYMENT_VERIFIED_CONTRACT_COMPLETED",
        entityType: "Contract",
        entityId: contract.id,
        metadata: { reference, amount: verification.data.amount, currency: verification.data.currency, ownershipTransferRecorded: contract.contractType === "OWNERSHIP_TRANSFER" },
      },
    }),
  ]);
  return NextResponse.json({ received: true });
}
