import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  offerId: z.string().min(1),
  terms: z.string().trim().min(80).max(12000),
  contractType: z.enum(["OWNERSHIP_TRANSFER", "EXCLUSIVE_LICENSE"]).default("OWNERSHIP_TRANSFER"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const contracts = await prisma.contract.findMany({
    where: isAdmin ? {} : { offer: { OR: [
      { buyerId: session.user.id },
      { track: { artistProfile: { userId: session.user.id } } },
    ] } },
    orderBy: { createdAt: "desc" },
    include: {
      offer: {
        include: {
          track: { select: { id: true, title: true, artistProfile: { select: { stageName: true, userId: true } } } },
          buyer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  const acceptedOffers = await prisma.acquisitionOffer.findMany({ where: { status: "ACCEPTED", ...(isAdmin ? {} : { track: { artistProfile: { userId: session.user.id } } }), contracts: { none: {} } }, include: { track: { select: { title: true, artistProfile: { select: { stageName: true } } } }, buyer: { select: { name: true, email: true } } }, orderBy: { updatedAt: "desc" } });\n  return NextResponse.json({ contracts, acceptedOffers });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide the accepted offer and complete contract terms (at least 80 characters)." }, { status: 400 });
  const offer = await prisma.acquisitionOffer.findUnique({
    where: { id: parsed.data.offerId },
    include: { track: { include: { artistProfile: { select: { userId: true } } } } },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  const isRightsHolder = offer.track.artistProfile.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isRightsHolder && !isAdmin) return NextResponse.json({ error: "Only the rights holder or administrator can prepare the agreement." }, { status: 403 });
  if (offer.status !== "ACCEPTED") return NextResponse.json({ error: "The offer must be accepted before a contract can be prepared." }, { status: 409 });
  const existing = await prisma.contract.findFirst({ where: { offerId: offer.id, status: { notIn: ["CANCELLED"] } }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "A contract already exists for this accepted offer." }, { status: 409 });
  const contract = await prisma.contract.create({
    data: { offerId: offer.id, terms: parsed.data.terms, contractType: parsed.data.contractType, status: "DRAFT" },
    select: { id: true, status: true, contractType: true, createdAt: true },
  });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "CONTRACT_DRAFT_CREATED", entityType: "Contract", entityId: contract.id } });
  return NextResponse.json({ contract }, { status: 201 });
}
