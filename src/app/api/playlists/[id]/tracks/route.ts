import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ trackId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to update playlists." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid track." }, { status: 400 });

  const playlist = await prisma.playlist.findFirst({ where: { id: params.id, userId: session.user.id }, select: { id: true } });
  if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  const track = await prisma.track.findFirst({
    where: { id: parsed.data.trackId, type: "RELEASED", status: "APPROVED" },
    select: { id: true },
  });
  if (!track) return NextResponse.json({ error: "Only approved released tracks can be added." }, { status: 404 });

  const existing = await prisma.playlistTrack.findUnique({ where: { playlistId_trackId: { playlistId: playlist.id, trackId: track.id } } });
  if (existing) return NextResponse.json({ message: "Track is already in this playlist." });
  const last = await prisma.playlistTrack.aggregate({ where: { playlistId: playlist.id }, _max: { position: true } });
  const item = await prisma.playlistTrack.create({
    data: { playlistId: playlist.id, trackId: track.id, position: (last._max.position ?? -1) + 1 },
  });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "TRACK_ADDED_TO_PLAYLIST", entityType: "Playlist", entityId: playlist.id, metadata: { trackId: track.id } } });
  return NextResponse.json({ item }, { status: 201 });
}
