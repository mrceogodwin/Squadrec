import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MIME: Record<string, { types: string[]; extensions: string[] }> = {
  audio: { types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/flac", "audio/ogg", "audio/webm"], extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg", "webm"] },
  preview: { types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/flac", "audio/ogg", "audio/webm"], extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg", "webm"] },
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
  const uploads = (["audio", "preview", "artwork", "rights"] as const).map(kind => ({ kind, file: form.get(kind) })).filter((item): item is { kind: "audio" | "preview" | "artwork" | "rights"; file: File } => item.file instanceof File && item.file.size > 0);
  if (uploads.length !== 1) return NextResponse.json({ error: "Upload one file per request." }, { status: 400 });

  if (uploads.some(x => x.kind === "preview") && track.type !== "EXCLUSIVE") return NextResponse.json({ error: "Preview audio is only for exclusive tracks." }, { status: 400 });
  const results: Record<string, string> = {};
  for (const { kind, file } of uploads) {
    const rule = MIME[kind];
    const ext = extension(file.name);
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Each file must be 4 MB or smaller. Larger audio upload support is being added." }, { status: 413 });
    if (!rule.types.includes(file.type) || !rule.extensions.includes(ext)) return NextResponse.json({ error: `Unsupported ${kind} file format.` }, { status: 415 });

    if (kind === "preview") {
      try {
        const { parseBuffer } = await import("music-metadata");
        const metadata = await parseBuffer(
          Buffer.from(await file.arrayBuffer()),
          { mimeType: file.type, size: file.size },
          { duration: true, skipCovers: true, maxMemoryAllocation: 8 * 1024 * 1024 },
        );
        const duration = metadata.format.duration;
        const targetSeconds = track.previewSeconds || 10;
        if (typeof duration !== "number" || !Number.isFinite(duration)) {
          return NextResponse.json({ error: "We could not verify this preview's duration. Export it as a standard MP3, WAV or M4A file and try again." }, { status: 422 });
        }
        if (Math.abs(duration - targetSeconds) > 0.15) {
          return NextResponse.json({ error: `Exclusive preview must be ${targetSeconds} seconds (±0.15s). Your file is ${duration.toFixed(2)} seconds. Trim it and upload again.` }, { status: 422 });
        }
      } catch {
        return NextResponse.json({ error: "We could not read this preview's audio duration. Please re-export it as MP3, WAV or M4A and try again." }, { status: 422 });
      }
    }

    const blob = await put(`${session.user.id}/${track.id}/${kind}-${Date.now()}.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60,
    });
    results[kind] = blob.pathname;
  }

  if (results.audio || results.preview || results.artwork) {
    await prisma.track.update({
      where: { id: track.id },
      data: {
        ...(results.audio ? { audioObjectKey: results.audio } : {}),
        ...(results.preview ? { previewObjectKey: results.preview } : {}),
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
