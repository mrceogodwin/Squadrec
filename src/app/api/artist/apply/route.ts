import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  stageName: z.string().trim().min(2).max(100),
  biography: z.string().trim().max(1200).optional(),
  country: z.string().trim().max(80).optional(),
  website: z.string().url().optional().or(z.literal("")),
  confirmsRights: z.literal(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to apply for artist access." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete the required fields and confirm that you control the rights to the music you submit." }, { status: 400 });

  const existing = await prisma.artistProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "An artist profile already exists for this account.", status: existing.verificationStatus }, { status: 409 });

  const profile = await prisma.artistProfile.create({
    data: {
      userId: session.user.id,
      stageName: parsed.data.stageName,
      biography: parsed.data.biography || null,
      country: parsed.data.country || null,
      website: parsed.data.website || null,
      verificationStatus: "PENDING",
      rightsDeclaration: true,
    },
    select: { id: true, stageName: true, verificationStatus: true, createdAt: true },
  });
  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "ARTIST_ACCESS_APPLIED", entityType: "ArtistProfile", entityId: profile.id },
  });
  return NextResponse.json({ profile }, { status: 201 });
}
