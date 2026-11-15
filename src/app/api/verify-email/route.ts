import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length > 200) return NextResponse.redirect(new URL("/verify-email?status=invalid", url.origin));
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true } });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return NextResponse.redirect(new URL("/verify-email?status=expired", url.origin));
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
  return NextResponse.redirect(new URL("/verify-email?status=success", url.origin));
}
