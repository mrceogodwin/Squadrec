import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(32).max(128), password: z.string().min(10).max(72) });
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Use a valid reset link and a password of at least 10 characters." }, { status: 400 });

  const tokenHash = sha256(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true } });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.deleteMany({
      where: { id: record.id, userId: record.userId, tokenHash, expiresAt: { gt: new Date() } },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    return true;
  });
  if (!updated) return NextResponse.json({ error: "This reset link has already been used or has expired. Request a new one." }, { status: 400 });
  return NextResponse.json({ message: "Your password has been updated. You can now sign in." });
}
