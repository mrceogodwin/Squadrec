import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to access the exclusive preview." }, { status: 401 });
  if (!["INDUSTRY_BUYER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Verified industry access is required." }, { status: 403 });
  }

  const track = await prisma.track.findFirst({
    where: { id: params.id, type: "EXCLUSIVE", status: "APPROVED" },
    select: { id: true, title: true, previewObjectKey: true },
  });
  if (!track?.previewObjectKey) {
    return NextResponse.json({ error: "A private preview has not been supplied for this track." }, { status: 404 });
  }

  try {
    const asset = await get(track.previewObjectKey, { access: "private" });
    if (!asset?.stream || asset.statusCode !== 200) {
      return NextResponse.json({ error: "Preview audio could not be retrieved." }, { status: 404 });
    }
    return new Response(asset.stream, {
      headers: {
        "Content-Type": asset.blob.contentType || "audio/mpeg",
        "Content-Disposition": "inline; filename=\"" + track.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 80) + "-preview\"",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ error: "Preview streaming is temporarily unavailable." }, { status: 502 });
  }
}
