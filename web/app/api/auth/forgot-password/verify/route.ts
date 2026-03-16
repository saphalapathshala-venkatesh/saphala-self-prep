import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeIdentifier } from "@/lib/validation";
import { createHmac, randomBytes } from "crypto";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

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

export async function POST(request: NextRequest) {
  let body: { identifier?: string; mobileLast4?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { identifier, mobileLast4 } = body;

  if (!identifier || !mobileLast4) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const last4 = mobileLast4.trim().replace(/\D/g, "");
  if (last4.length !== 4) {
    return NextResponse.json({ error: "Please enter exactly 4 digits." }, { status: 400 });
  }

  const { type, value } = normalizeIdentifier(identifier);

  const user = await prisma.user.findUnique({
    where: type === "email" ? { email: value } : { mobile: value },
    select: {
      id: true,
      mobile: true,
      isBlocked: true,
      isActive: true,
      deletedAt: true,
      infringementBlocked: true,
    },
  });

  if (
    !user ||
    user.deletedAt !== null ||
    !user.isActive ||
    user.isBlocked ||
    user.infringementBlocked
  ) {
    return NextResponse.json(
      { error: "Details do not match our records." },
      { status: 400 }
    );
  }

  if (!user.mobile) {
    return NextResponse.json(
      { error: "Password reset is not available for this account. Please contact support." },
      { status: 400 }
    );
  }

  const storedLast4 = user.mobile.slice(-4);
  if (storedLast4 !== last4) {
    return NextResponse.json(
      { error: "Details do not match our records." },
      { status: 400 }
    );
  }

  const resetToken = buildResetToken(user.id);
  return NextResponse.json({ resetToken });
}
