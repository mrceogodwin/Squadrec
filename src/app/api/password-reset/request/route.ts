import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const generic = "If an active, verified SQUADREC account exists for that address, a password reset link will be sent.";
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, isActive: true, emailVerified: true } });
  if (!user || !user.isActive || !user.emailVerified || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ message: generic });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const origin = new URL(request.url).origin;
  const link = new URL("/reset-password", origin);
  link.searchParams.set("token", rawToken);
  const safeName = (user.name || "there").replace(/[&<>"']/g, "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [user.email],
      subject: "Reset your SQUADREC password",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#21172b"><h1 style="color:#7014b8">Reset your password</h1><p>Hi ${safeName},</p><p>Use the secure link below to choose a new SQUADREC password. It expires in 30 minutes.</p><p><a href="${link.toString()}" style="display:inline-block;padding:14px 22px;background:#710fba;color:#fff;border-radius:28px;text-decoration:none;font-weight:bold">Reset my password</a></p><p>If you didn't request this, you can ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
    return NextResponse.json({ error: "We couldn't send the reset email. Please try again later." }, { status: 503 });
  }
  return NextResponse.json({ message: generic });
}
