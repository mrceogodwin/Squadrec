import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { include: { track: { include: { artistProfile: { select: { userId: true } } } } } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  const isRightsHolder = contract.offer.track.artistProfile.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isRightsHolder && !isAdmin) return NextResponse.json({ error: "Only the rights holder or an administrator can send this draft." }, { status: 403 });
  if (contract.status !== "DRAFT") return NextResponse.json({ error: "Only draft agreements can be sent for review." }, { status: 409 });
  if (contract.terms.trim().length < 80) return NextResponse.json({ error: "The agreement needs complete terms before it can be sent." }, { status: 400 });
  const updated = await prisma.contract.update({ where: { id: contract.id }, data: { status: "SENT" }, select: { id: true, status: true, updatedAt: true } });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "CONTRACT_SENT_FOR_REVIEW", entityType: "Contract", entityId: contract.id } });
  return NextResponse.json({ contract: updated, message: "Draft sent for counterparty review. No electronic signature or ownership transfer has occurred." });
}
