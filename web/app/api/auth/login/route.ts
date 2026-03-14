import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizeIdentifier } from "@/lib/validation";

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

    let user;
    try {
      user =
        normalized.type === "email"
          ? await prisma.user.findUnique({ where: { email: normalized.value } })
          : await prisma.user.findUnique({ where: { mobile: normalized.value } });
    } catch (dbErr) {
      console.error("[login] DB lookup failed:", dbErr);
      return NextResponse.json(
        { error: "Login failed. Please try again in a moment." },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact support." },
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
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    let cookie;
    try {
      cookie = await createSessionCookie(user.id);
    } catch (sessionErr) {
      console.error("[login] Session creation failed:", sessionErr);
      return NextResponse.json(
        { error: "Login failed. Please try again in a moment." },
        { status: 503 }
      );
    }

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
