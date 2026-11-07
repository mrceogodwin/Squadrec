import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to view your library." }, { status: 401 });
  const playlists = await prisma.playlist.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      tracks: {
        orderBy: { position: "asc" },
        include: { track: { select: {
          id: true, title: true, artworkUrl: true, type: true,
          artistProfile: { select: { stageName: true } },
          genre: { select: { name: true } },
        } } },
      },
    },
  });
  return NextResponse.json({ playlists });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to create a playlist." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a playlist name (up to 80 characters)." }, { status: 400 });
  const playlist = await prisma.playlist.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      isPublic: parsed.data.isPublic ?? false,
    },
    select: { id: true, title: true, description: true, isPublic: true, createdAt: true },
  });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "PLAYLIST_CREATED", entityType: "Playlist", entityId: playlist.id } });
  return NextResponse.json({ playlist }, { status: 201 });
}
