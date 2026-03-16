import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizeIdentifier } from "@/lib/validation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lookupUser(normalized: { type: "email" | "mobile"; value: string }) {
  return normalized.type === "email"
    ? prisma.user.findUnique({ where: { email: normalized.value } })
    : prisma.user.findUnique({ where: { mobile: normalized.value } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/Mobile and password are required." },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(identifier);

    // User lookup — retry once on transient connection failure
    let user;
    try {
      user = await lookupUser(normalized);
    } catch (dbErr) {
      console.error("[login] DB lookup failed (attempt 1):", dbErr);
      try {
        await sleep(700);
        user = await lookupUser(normalized);
        console.log("[login] DB lookup succeeded on retry");
      } catch (retryErr) {
        console.error("[login] DB lookup failed (attempt 2):", retryErr);
        return NextResponse.json(
          { error: "Login failed. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    if (!user) {
      console.log(`[login] No user found for identifier type=${normalized.type}`);
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    // Soft-deleted account
    if (user.deletedAt) {
      console.log(`[login] Rejected — user ${user.id} is soft-deleted`);
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    // Blocked by admin
    if (user.isBlocked || user.infringementBlocked) {
      console.log(`[login] Rejected — user ${user.id} is blocked (isBlocked=${user.isBlocked}, infringementBlocked=${user.infringementBlocked})`);
      return NextResponse.json(
        {
          error: "Your account has been blocked. Please contact support.",
          code: "ACCOUNT_BLOCKED",
        },
        { status: 403 }
      );
    }

    // Deactivated
    if (!user.isActive) {
      console.log(`[login] Rejected — user ${user.id} is inactive`);
      return NextResponse.json(
        {
          error: "Your account is inactive. Please contact support.",
          code: "ACCOUNT_INACTIVE",
        },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      console.error(`[login] User ${user.id} has no password hash`);
      return NextResponse.json(
        { error: "Account setup incomplete. Please contact support." },
        { status: 500 }
      );
    }

    const isBcryptHash = user.passwordHash.startsWith("$2");
    let passwordValid = false;

    try {
      if (isBcryptHash) {
        passwordValid = await bcrypt.compare(password, user.passwordHash);
      } else {
        // Plain-text fallback (should not exist for new accounts)
        passwordValid = user.passwordHash === password;
        if (passwordValid) {
          const newHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          }).catch((e) => console.error("[login] Hash upgrade failed:", e));
        }
      }
    } catch (bcryptErr) {
      console.error("[login] Password verification failed:", bcryptErr);
      return NextResponse.json(
        { error: "Login failed. Please try again." },
        { status: 500 }
      );
    }

    if (!passwordValid) {
      console.log(`[login] Rejected — wrong password for user ${user.id}`);
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    // One-device enforcement: block if user already has an active session
    // (unless the user is explicitly allowed multi-device access)
    if (!user.allowMultiDevice) {
      const existingSession = await prisma.session.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
        select: { id: true },
      });
      if (existingSession) {
        console.log(`[login] Rejected — active session already exists for user ${user.id}`);
        return NextResponse.json(
          {
            error: "This account is already active on another device. Please sign out from your other device first, or contact support.",
            code: "ACTIVE_SESSION_EXISTS",
          },
          { status: 409 }
        );
      }
    }

    // Session creation — retry once on transient failure
    let cookie;
    try {
      cookie = await createSessionCookie(user.id);
    } catch (sessionErr) {
      console.error("[login] Session creation failed (attempt 1):", sessionErr);
      try {
        await sleep(700);
        cookie = await createSessionCookie(user.id);
        console.log("[login] Session creation succeeded on retry");
      } catch (retryErr) {
        console.error("[login] Session creation failed (attempt 2):", retryErr);
        return NextResponse.json(
          { error: "Login failed. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    console.log(`[login] Success — user ${user.id} (${user.role})`);
    const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    console.error("[login] Unhandled error:", e);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
