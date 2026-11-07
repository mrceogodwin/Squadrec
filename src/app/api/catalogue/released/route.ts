import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const genre = searchParams.get("genre")?.trim().slice(0, 60);
  const tracks = await prisma.track.findMany({
    where: {
      type: "RELEASED",
      status: "APPROVED",
      ...(query ? { OR: [
        { title: { contains: query, mode: "insensitive" } },
        { artistProfile: { stageName: { contains: query, mode: "insensitive" } } },
      ] } : {}),
      ...(genre ? { genre: { name: { equals: genre, mode: "insensitive" } } } : {}),
    },
    orderBy: [{ releaseDate: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true, title: true, description: true, artworkUrl: true,
      durationSeconds: true, previewSeconds: true, releaseDate: true,
      artistProfile: { select: { stageName: true } },
      genre: { select: { name: true } },
    },
  });
  return NextResponse.json({ tracks });
}
