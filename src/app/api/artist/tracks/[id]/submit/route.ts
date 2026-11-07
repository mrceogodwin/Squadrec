import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to submit this track." }, { status: 401 });
  const track = await prisma.track.findUnique({ where: { id: params.id }, include: { artistProfile: true } });
  if (!track || track.uploaderId !== session.user.id) return NextResponse.json({ error: "Track draft not found." }, { status: 404 });
  if (track.artistProfile.verificationStatus !== "VERIFIED") return NextResponse.json({ error: "A verified artist profile is required." }, { status: 403 });
  if (track.status !== "DRAFT" && track.status !== "REJECTED") return NextResponse.json({ error: "This track has already been submitted." }, { status: 409 });
  const rightsEvidence = await prisma.auditLog.findFirst({ where: { entityType: "Track", entityId: track.id, action: "TRACK_RIGHTS_EVIDENCE_UPLOADED" }, orderBy: { createdAt: "desc" } });
  if (!track.audioObjectKey || !track.artworkUrl || !rightsEvidence || (track.type === "EXCLUSIVE" && !track.previewObjectKey)) {
    return NextResponse.json({ error: "Upload the audio file, cover artwork and rights evidence before submitting. Exclusive tracks also require a separate preview clip." }, { status: 400 });
  }
  const updated = await prisma.track.update({ where: { id: track.id }, data: { status: "PENDING_REVIEW" }, select: { id: true, title: true, status: true } });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "TRACK_SUBMITTED_FOR_REVIEW", entityType: "Track", entityId: track.id } });
  return NextResponse.json({ track: updated });
}
