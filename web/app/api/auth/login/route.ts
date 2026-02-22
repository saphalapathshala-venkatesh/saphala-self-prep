import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizeIdentifier } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/Mobile and password are required." },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(identifier);
    const user =
      normalized.type === "email"
        ? await prisma.user.findUnique({ where: { email: normalized.value } })
        : await prisma.user.findUnique({ where: { mobile: normalized.value } });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your email/mobile and password." },
        { status: 401 }
      );
    }

    const isBcryptHash = user.passwordHash.startsWith("$2");

    if (isBcryptHash) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid credentials. Please check your email/mobile and password." },
          { status: 401 }
        );
      }
    } else {
      if (user.passwordHash !== password) {
        return NextResponse.json(
          { error: "Invalid credentials. Please check your email/mobile and password." },
          { status: 401 }
        );
      }
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    const cookie = await createSessionCookie(user.id);
    const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
