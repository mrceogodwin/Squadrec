import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const track = await prisma.track.findFirst({
    where: { id: params.id, type: "RELEASED", status: "APPROVED" },
    select: { id: true, title: true, audioObjectKey: true },
  });
  if (!track?.audioObjectKey) return NextResponse.json({ error: "This released track is not available for streaming." }, { status: 404 });

  try {
    const asset = await get(track.audioObjectKey, { access: "private" });
    if (!asset?.stream || asset.statusCode !== 200) return NextResponse.json({ error: "Audio file could not be retrieved." }, { status: 404 });
    return new Response(asset.stream, {
      headers: {
        "Content-Type": asset.blob.contentType || "audio/mpeg",
        "Content-Disposition": "inline; filename=\"" + track.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 80) + "-audio\"",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Audio streaming is temporarily unavailable." }, { status: 502 });
  }
}
