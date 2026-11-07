import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string; kind: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const track = await prisma.track.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, uploaderId: true, artworkUrl: true, audioObjectKey: true, previewObjectKey: true, artistProfile: { select: { userId: true } } },
  });
  if (!track) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (!isAdmin && track.uploaderId !== session.user.id && track.artistProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "You do not have permission to access this file." }, { status: 403 });
  }
  let pathname: string | null = null;
  let fallbackType = "application/octet-stream";
  if (params.kind === "audio") { pathname = track.audioObjectKey; fallbackType = "audio/mpeg"; }
  else if (params.kind === "preview") { pathname = track.previewObjectKey; fallbackType = "audio/mpeg"; }
  else if (params.kind === "artwork") { pathname = track.artworkUrl; fallbackType = "image/jpeg"; }
  else if (params.kind === "rights") {
    if (!isAdmin) return NextResponse.json({ error: "Rights evidence is restricted to administrators." }, { status: 403 });
    const evidence = await prisma.auditLog.findFirst({
      where: { entityType: "Track", entityId: track.id, action: "TRACK_RIGHTS_EVIDENCE_UPLOADED" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const metadata = evidence?.metadata as { objectKey?: string; contentType?: string; fileName?: string } | null;
    pathname = metadata?.objectKey || null;
    fallbackType = metadata?.contentType || "application/pdf";
  } else return NextResponse.json({ error: "Unknown file type." }, { status: 400 });
  if (!pathname) return NextResponse.json({ error: "This file has not been uploaded." }, { status: 404 });
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || !result.stream) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const safeTitle = track.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 80) || "track";
    const ext = pathname.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || fallbackType,
        "Content-Disposition": params.kind === "rights" ? `attachment; filename="${safeTitle}-rights.${ext}"` : `inline; filename="${safeTitle}-${params.kind}.${ext}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve this private file." }, { status: 502 });
  }
}
