import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByMobile, verifyPassword } from "@/lib/userStore";
import { setSessionCookie } from "@/lib/auth";
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
        ? findUserByEmail(normalized.value)
        : findUserByMobile(normalized.value);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your email/mobile and password." },
        { status: 401 }
      );
    }

    if (!verifyPassword(user, password)) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your email/mobile and password." },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
