import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MIME: Record<string, { types: string[]; extensions: string[] }> = {
  audio: { types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/flac", "audio/ogg", "audio/webm"], extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg", "webm"] },
  artwork: { types: ["image/jpeg", "image/png", "image/webp"], extensions: ["jpg", "jpeg", "png", "webp"] },
  rights: { types: ["application/pdf", "image/jpeg", "image/png"], extensions: ["pdf", "jpg", "jpeg", "png"] },
};
function extension(name: string) { return name.split(".").pop()?.toLowerCase() || ""; }

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to upload music." }, { status: 401 });
  if (!["ARTIST", "AUTHORISED_UPLOADER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Artist or authorised uploader access is required." }, { status: 403 });

  const track = await prisma.track.findUnique({ where: { id: params.id }, include: { artistProfile: true } });
  if (!track || track.uploaderId !== session.user.id) return NextResponse.json({ error: "Track draft not found." }, { status: 404 });
  if (track.artistProfile.verificationStatus !== "VERIFIED") return NextResponse.json({ error: "Your artist profile must be verified before uploading." }, { status: 403 });
  if (track.status !== "DRAFT" && track.status !== "REJECTED") return NextResponse.json({ error: "This submission is locked for editing." }, { status: 409 });

  const form = await request.formData();
  const uploads = (["audio", "artwork", "rights"] as const).map(kind => ({ kind, file: form.get(kind) })).filter((item): item is { kind: "audio" | "artwork" | "rights"; file: File } => item.file instanceof File && item.file.size > 0);
  if (!uploads.length) return NextResponse.json({ error: "Choose at least one file to upload." }, { status: 400 });

  const results: Record<string, string> = {};
  for (const { kind, file } of uploads) {
    const rule = MIME[kind];
    const ext = extension(file.name);
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Each file must be 4 MB or smaller. Larger audio upload support is being added." }, { status: 413 });
    if (!rule.types.includes(file.type) || !rule.extensions.includes(ext)) return NextResponse.json({ error: `Unsupported ${kind} file format.` }, { status: 415 });
    const blob = await put(`${session.user.id}/${track.id}/${kind}-${Date.now()}.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60,
    });
    results[kind] = blob.pathname;
  }

  if (results.audio || results.artwork) {
    await prisma.track.update({
      where: { id: track.id },
      data: {
        ...(results.audio ? { audioObjectKey: results.audio } : {}),
        ...(results.artwork ? { artworkUrl: results.artwork } : {}),
      },
    });
  }
  if (results.rights) {
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "TRACK_RIGHTS_EVIDENCE_UPLOADED",
        entityType: "Track",
        entityId: track.id,
        metadata: { objectKey: results.rights, fileName: uploads.find(x => x.kind === "rights")?.file.name, contentType: uploads.find(x => x.kind === "rights")?.file.type },
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "TRACK_ASSETS_UPLOADED",
      entityType: "Track",
      entityId: track.id,
      metadata: { uploaded: Object.keys(results) },
    },
  });
  return NextResponse.json({ uploaded: Object.keys(results), message: "Files stored privately." });
}
