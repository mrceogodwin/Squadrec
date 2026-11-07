import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["ACCEPT", "DECLINE", "COUNTER"]),
  amountMinor: z.number().int().positive().optional(),
  terms: z.string().trim().max(4000).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid offer decision." }, { status: 400 });

  const offer = await prisma.acquisitionOffer.findUnique({
    where: { id: params.id },
    include: { track: { include: { artistProfile: { select: { userId: true } } } } },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  const isRightsHolder = offer.track.artistProfile.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isRightsHolder && !isAdmin) return NextResponse.json({ error: "Only the rights holder can respond to this offer." }, { status: 403 });
  if (offer.status !== "SUBMITTED" && offer.status !== "COUNTERED" && offer.status !== "UNDER_REVIEW") {
    return NextResponse.json({ error: "This offer is no longer open for negotiation." }, { status: 409 });
  }
  const { action, amountMinor, terms, message } = parsed.data;
  if (action === "COUNTER" && !amountMinor && !terms && !message) {
    return NextResponse.json({ error: "Add a counter amount, terms or message." }, { status: 400 });
  }
  const updated = await prisma.acquisitionOffer.update({
    where: { id: offer.id },
    data: {
      status: action === "ACCEPT" ? "ACCEPTED" : action === "DECLINE" ? "DECLINED" : "COUNTERED",
      ...(amountMinor ? { amountMinor } : {}),
      ...(terms ? { proposedTerms: terms } : {}),
      ...(message ? { message: offer.message + "\n\nRights-holder response: " + message } : {}),
    },
    select: { id: true, status: true, amountMinor: true, currency: true, updatedAt: true },
  });
  await prisma.auditLog.create({ data: {
    actorId: session.user.id,
    action: "ACQUISITION_OFFER_" + action,
    entityType: "AcquisitionOffer",
    entityId: offer.id,
    metadata: { amountMinor: amountMinor || null, terms: terms || null, message: message || null },
  } });
  return NextResponse.json({ offer: updated });
}
