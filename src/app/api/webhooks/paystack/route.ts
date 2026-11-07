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

  const contract = await prisma.contract.findUnique({ where: { id: matching.entityId }, select: { id: true, status: true, contractType: true, signedAt: true, completedAt: true } });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.status === "COMPLETED" && contract.completedAt) return NextResponse.json({ received: true, alreadyProcessed: true });
  if (contract.status !== "PAYMENT_PENDING" || !contract.signedAt) return NextResponse.json({ error: "Contract is not signed and awaiting payment." }, { status: 409 });

  const completion = await prisma.$transaction(async (tx) => {
    const updated = await tx.contract.updateMany({
      where: { id: contract.id, status: "PAYMENT_PENDING", signedAt: { not: null } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (updated.count === 0) {
      const current = await tx.contract.findUnique({ where: { id: contract.id }, select: { status: true } });
      return { alreadyProcessed: current?.status === "COMPLETED" };
    }
    await tx.auditLog.create({
      data: {
        action: "PAYMENT_VERIFIED_CONTRACT_COMPLETED",
        entityType: "Contract",
        entityId: contract.id,
        metadata: {
          reference,
          amount: verification.data.amount,
          currency: verification.data.currency,
          ownershipTransferRecorded: false,
          rightsRegisterUpdateRequired: contract.contractType === "OWNERSHIP_TRANSFER",
        },
      },
    });
    return { alreadyProcessed: false };
  });
  if (!completion.alreadyProcessed) {
    const duplicate = await prisma.contract.findUnique({ where: { id: contract.id }, select: { status: true } });
    if (duplicate?.status !== "COMPLETED") return NextResponse.json({ error: "Contract changed before payment could be recorded." }, { status: 409 });
  }
  return NextResponse.json({ received: true, alreadyProcessed: completion.alreadyProcessed });
}
