import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email().max(254) });
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const generic = { message: "If this address has an unverified SQUADREC account, a fresh verification link will be sent." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, select: { id: true, email: true, name: true, emailVerified: true } });
  if (!user || user.emailVerified) return NextResponse.json(generic);

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return NextResponse.json({ error: "Email verification is not configured yet." }, { status: 503 });

  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    update: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  const link = new URL("/api/verify-email", new URL(request.url).origin);
  link.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [user.email], subject: "Your new SQUADREC verification link",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#21172b"><h1 style="color:#7014b8">Verify your email</h1><p>Hi ${(user.name || "there").replace(/[&<>"]/g, "")},</p><p>Use the button below to verify your SQUADREC email. This link expires in 30 minutes.</p><p><a href="${link.toString()}" style="display:inline-block;padding:14px 22px;background:#710fba;color:#fff;border-radius:28px;text-decoration:none;font-weight:bold">Verify my email</a></p></div>`,
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "We couldn't send the email right now. Please try again." }, { status: 502 });
  return NextResponse.json(generic);
}
