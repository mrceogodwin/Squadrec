import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  entity: z.enum(["artist", "track"]),
  id: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  const [artists, tracks] = await Promise.all([
    prisma.artistProfile.findMany({
      where: { verificationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    }),
    prisma.track.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        artistProfile: { select: { id: true, stageName: true, country: true, userId: true } },
        genre: { select: { name: true } },
        uploader: { select: { email: true, name: true } },
      },
    }),
  ]);
  const rights = tracks.length ? await prisma.auditLog.findMany({
    where: { entityType: "Track", entityId: { in: tracks.map(t => t.id) }, action: "TRACK_RIGHTS_EVIDENCE_UPLOADED" },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, createdAt: true, metadata: true },
  }) : [];
  const evidence = new Map<string, { uploadedAt: Date; fileName: string }>();
  for (const item of rights) if (!evidence.has(item.entityId)) {
    const meta = item.metadata as { fileName?: string } | null;
    evidence.set(item.entityId, { uploadedAt: item.createdAt, fileName: meta?.fileName || "Rights evidence uploaded" });
  }
  return NextResponse.json({
    artists,
    tracks: tracks.map(t => ({ ...t, rightsEvidence: evidence.get(t.id) || null })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
  const { entity, id, decision, note } = parsed.data;
  if (entity === "artist") {
    const profile = await prisma.artistProfile.findUnique({ where: { id }, select: { id: true, userId: true, verificationStatus: true, stageName: true } });
    if (!profile || profile.verificationStatus !== "PENDING") return NextResponse.json({ error: "This artist application is no longer pending." }, { status: 409 });
    await prisma.$transaction([
      prisma.artistProfile.update({ where: { id }, data: { verificationStatus: decision === "approve" ? "VERIFIED" : "REJECTED" } }),
      prisma.user.update({ where: { id: profile.userId }, data: { verificationStatus: decision === "approve" ? "VERIFIED" : "REJECTED", ...(decision === "approve" ? { role: "ARTIST" } : {}) } }),
      prisma.auditLog.create({ data: { actorId: session.user.id, action: decision === "approve" ? "ARTIST_APPLICATION_APPROVED" : "ARTIST_APPLICATION_REJECTED", entityType: "ArtistProfile", entityId: id, metadata: { note: note || null } } }),
    ]);
    return NextResponse.json({ success: true });
  }
  const track = await prisma.track.findUnique({ where: { id }, select: { id: true, status: true, type: true, uploaderId: true, title: true, audioObjectKey: true, previewObjectKey: true, artworkUrl: true } });
  if (!track || track.status !== "PENDING_REVIEW") return NextResponse.json({ error: "This track is no longer pending review." }, { status: 409 });
  if (decision === "approve") {
    const rights = await prisma.auditLog.findFirst({ where: { entityType: "Track", entityId: id, action: "TRACK_RIGHTS_EVIDENCE_UPLOADED" } });
    if (!track.audioObjectKey || !track.artworkUrl || !rights || (track.type === "EXCLUSIVE" && !track.previewObjectKey)) return NextResponse.json({ error: "Required audio, artwork, rights evidence or exclusive preview is missing." }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.track.update({ where: { id }, data: { status: decision === "approve" ? "APPROVED" : "REJECTED", ...(decision === "approve" ? { rightsVerifiedAt: new Date() } : {}) } }),
    prisma.auditLog.create({ data: { actorId: session.user.id, action: decision === "approve" ? "TRACK_APPROVED" : "TRACK_REJECTED", entityType: "Track", entityId: id, metadata: { note: note || null } } }),
  ]);
  return NextResponse.json({ success: true });
}
