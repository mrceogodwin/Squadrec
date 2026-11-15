import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(72),
  accountType: z.enum(["ARTIST", "RIGHTS_HOLDER", "LABEL_PUBLISHER"]),
});
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function sendVerificationEmail(email: string, name: string, token: string, origin: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const link = new URL("/api/verify-email", origin);
  link.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your SQUADREC email",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#21172b"><h1 style="color:#7014b8">Welcome to SQUADREC</h1><p>Hi ${name.replace(/[&<>"]/g, "")},</p><p>Confirm your email address to activate your SQUADREC account.</p><p><a href="${link.toString()}" style="display:inline-block;padding:14px 22px;background:#710fba;color:#fff;border-radius:28px;text-decoration:none;font-weight:bold">Verify my email</a></p><p>This link expires in 30 minutes. If you did not create this account, you can ignore this message.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error("EMAIL_SEND_FAILED");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email, password and account type." }, { status: 400 });

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email verification is not configured yet. Please try again later." }, { status: 503 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });

  const rawToken = randomBytes(32).toString("hex");
  const passwordHash = await hash(parsed.data.password, 12);
  let userId = "";
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: "LISTENER",
        accountType: parsed.data.accountType,
        emailVerificationToken: {
          create: { tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        },
      },
      select: { id: true, name: true, email: true },
    });
    userId = user.id;
    await sendVerificationEmail(user.email, user.name || "there", rawToken, new URL(request.url).origin);
    return NextResponse.json({ email: user.email, verificationRequired: true }, { status: 201 });
  } catch (error) {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "EMAIL_PROVIDER_NOT_CONFIGURED" ? "Email verification is not configured yet." : "We couldn't send your verification email. Please try again." }, { status: 503 });
  }
}
