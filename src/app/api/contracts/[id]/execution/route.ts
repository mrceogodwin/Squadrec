import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { include: { buyer: { select: { id: true } }, track: { include: { artistProfile: { select: { userId: true } } } } } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  const isParty = contract.offer.buyer.id === session.user.id || contract.offer.track.artistProfile.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isParty && !isAdmin) return NextResponse.json({ error: "You cannot view this contract's execution status." }, { status: 403 });
  const events = await prisma.auditLog.findMany({
    where: { entityType: "Contract", entityId: contract.id },
    orderBy: { createdAt: "asc" },
    select: { action: true, createdAt: true, actorId: true, metadata: true },
  });
  const buyerAcceptedTerms = events.some((event) => event.action === "CONTRACT_TERMS_ACCEPTED_PENDING_SIGNATURE");
  const changesRequested = events.some((event) => event.action === "CONTRACT_CHANGES_REQUESTED" && event.createdAt > (events.find((item) => item.action === "CONTRACT_TERMS_ACCEPTED_PENDING_SIGNATURE")?.createdAt || new Date(0)));
  return NextResponse.json({
    contract: { id: contract.id, status: contract.status, contractType: contract.contractType, signedAt: contract.signedAt, completedAt: contract.completedAt },
    milestones: {
      draftPrepared: true,
      sentForReview: events.some((event) => event.action === "CONTRACT_SENT_FOR_REVIEW"),
      buyerAcceptedTerms: buyerAcceptedTerms && !changesRequested,
      signatureProviderConfigured: Boolean(process.env.DOCUSIGN_INTEGRATION_KEY && process.env.DOCUSIGN_USER_ID && process.env.DOCUSIGN_ACCOUNT_ID && process.env.DOCUSIGN_PRIVATE_KEY),
      signaturesComplete: ["SIGNED", "PAYMENT_PENDING", "COMPLETED"].includes(contract.status) && Boolean(contract.signedAt),
      paymentVerified: contract.status === "COMPLETED" && Boolean(contract.completedAt),
      ownershipTransferComplete: contract.contractType === "OWNERSHIP_TRANSFER" && contract.status === "COMPLETED" && Boolean(contract.completedAt),
    },
    events,
    notice: "This is a status checklist, not a signature or legal verification service.",
  });
}
