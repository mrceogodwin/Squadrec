import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const track = await prisma.track.findFirst({
    where: { id: params.id, type: "RELEASED", status: "APPROVED" },
    select: { id: true, artworkUrl: true },
  });
  if (!track?.artworkUrl) return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
  try {
    const asset = await get(track.artworkUrl, { access: "private" });
    if (!asset?.stream || asset.statusCode !== 200) return NextResponse.json({ error: "Artwork could not be retrieved." }, { status: 404 });
    return new Response(asset.stream, {
      headers: {
        "Content-Type": asset.blob.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Artwork is temporarily unavailable." }, { status: 502 });
  }
}
