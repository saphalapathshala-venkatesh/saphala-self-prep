import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac, randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/resend";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getResetSecret(): string {
  const url = process.env.DATABASE_URL ?? "saphala-forgot-password-secret-fallback";
  return url.slice(0, 64);
}

export function buildResetToken(userId: string): string {
  const expires = Date.now() + RESET_TOKEN_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${userId}|${expires}|${nonce}`;
  const sig = createHmac("sha256", getResetSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyResetToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return null;
    const [userId, expiresStr, nonce, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (!userId || isNaN(expires) || Date.now() > expires) return null;
    const payload = `${userId}|${expires}|${nonce}`;
    const expectedSig = createHmac("sha256", getResetSecret()).update(payload).digest("hex");
    if (sig !== expectedSig) return null;
    return { userId };
  } catch {
    return null;
  }
}

// Generic success message — never reveal whether account exists
const GENERIC_OK =
  "If an account with that email exists, a password reset link has been sent. Check your inbox (and spam folder).";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawEmail = (body.email ?? "").trim().toLowerCase();
  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Look up user — do NOT reveal whether they exist
  const user = await prisma.user.findUnique({
    where: { email: rawEmail },
    select: {
      id: true,
      email: true,
      isBlocked: true,
      isActive: true,
      deletedAt: true,
      infringementBlocked: true,
    },
  });

  // If account doesn't exist or is deactivated, return the same success message
  if (
    !user ||
    user.deletedAt !== null ||
    !user.isActive ||
    user.isBlocked ||
    user.infringementBlocked ||
    !user.email
  ) {
    return NextResponse.json({ success: true, message: GENERIC_OK });
  }

  const resetToken = buildResetToken(user.id);
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.saphala.in"
  ).replace(/\/$/, "");
  const resetUrl = `${siteUrl}/forgot-password/reset?token=${resetToken}`;

  const result = await sendPasswordResetEmail(user.email, resetUrl);
  if (!result.ok) {
    console.error("[forgot-password/verify] Email send failed:", result.error);
    // Still return generic success — don't expose internal errors to client
    return NextResponse.json({ success: true, message: GENERIC_OK });
  }

  return NextResponse.json({ success: true, message: GENERIC_OK });
}
