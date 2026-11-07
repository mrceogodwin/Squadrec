import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !appUrl) return NextResponse.json({ error: "Payment provider is not configured yet." }, { status: 503 });

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { include: { buyer: { select: { id: true, email: true } }, track: { select: { title: true } } } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.offer.buyer.id !== session.user.id) return NextResponse.json({ error: "Only the acquiring buyer can initiate payment." }, { status: 403 });
  if (contract.status !== "SIGNED" || !contract.signedAt) return NextResponse.json({ error: "Payment can only begin after the agreement has been signed by all required parties." }, { status: 409 });
  const amount = contract.offer.amountMinor;
  if (!amount || amount <= 0) return NextResponse.json({ error: "The accepted offer has no valid payment amount." }, { status: 400 });
  const currency = contract.offer.currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "The contract currency is invalid." }, { status: 400 });

  const existing = await prisma.auditLog.findFirst({
    where: { entityType: "Contract", entityId: contract.id, action: "PAYMENT_INITIALIZED" },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const previous = existing?.metadata as { reference?: string; authorizationUrl?: string } | null;
  if (contract.status === "PAYMENT_PENDING" && previous?.authorizationUrl) {
    return NextResponse.json({ authorizationUrl: previous.authorizationUrl, reference: previous.reference });
  }

  const reference = "squadrec_" + contract.id + "_" + randomUUID().replaceAll("-", "");
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: contract.offer.buyer.email,
      amount,
      currency,
      reference,
      callback_url: appUrl.replace(/\/$/, "") + "/dashboard/contracts/" + contract.id + "?payment=return",
      metadata: { contractId: contract.id, contractType: contract.contractType, trackTitle: contract.offer.track.title },
    }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.status || !result.data?.authorization_url) {
    return NextResponse.json({ error: result.message || "Paystack could not initialize this payment." }, { status: 502 });
  }
  await prisma.contract.update({ where: { id: contract.id }, data: { status: "PAYMENT_PENDING" } });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "PAYMENT_INITIALIZED",
      entityType: "Contract",
      entityId: contract.id,
      metadata: { reference, authorizationUrl: result.data.authorization_url, amount, currency },
    },
  });
  return NextResponse.json({ authorizationUrl: result.data.authorization_url, reference });
}
