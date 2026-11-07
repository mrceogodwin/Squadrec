import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["ACCEPT_TERMS", "REQUEST_CHANGES"]),
  message: z.string().trim().min(10).max(3000),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a review decision and a message of at least 10 characters." }, { status: 400 });

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { select: { buyerId: true, track: { select: { artistProfile: { select: { userId: true } } } } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  const isBuyer = contract.offer.buyerId === session.user.id;
  const isRightsHolder = contract.offer.track.artistProfile.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isBuyer && !isAdmin) return NextResponse.json({ error: "Only the acquiring buyer or an administrator can submit this counterparty review." }, { status: 403 });
  if (contract.status !== "SENT") return NextResponse.json({ error: "Only agreements sent for counterparty review can be reviewed." }, { status: 409 });
  if (isRightsHolder) return NextResponse.json({ error: "The rights holder cannot review their own agreement." }, { status: 403 });

  const action = parsed.data.action;
  if (action === "REQUEST_CHANGES") {
    await prisma.contract.update({ where: { id: contract.id }, data: { status: "DRAFT" } });
  }
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: action === "ACCEPT_TERMS" ? "CONTRACT_TERMS_ACCEPTED_PENDING_SIGNATURE" : "CONTRACT_CHANGES_REQUESTED",
      entityType: "Contract",
      entityId: contract.id,
      metadata: { message: parsed.data.message, action, signatureRequired: true },
    },
  });
  return NextResponse.json({
    message: action === "ACCEPT_TERMS"
      ? "Terms accepted for signature. This is not an electronic signature and does not transfer ownership."
      : "Changes requested. The agreement has returned to draft status for the rights holder to revise.",
    status: action === "ACCEPT_TERMS" ? "SENT" : "DRAFT",
    signatureRequired: true,
  });
}
