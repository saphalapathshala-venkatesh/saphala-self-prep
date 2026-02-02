import { NextRequest, NextResponse } from "next/server";
import { createUser, isEmailTaken, isMobileTaken } from "@/lib/userStore";
import { setSessionCookie } from "@/lib/auth";
import {
  validateEmail,
  validateMobile,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, mobile, password, confirmPassword } = body;

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return NextResponse.json({ error: emailResult.error }, { status: 400 });
    }

    const mobileResult = validateMobile(mobile);
    if (!mobileResult.valid) {
      return NextResponse.json({ error: mobileResult.error }, { status: 400 });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return NextResponse.json({ error: passwordResult.error }, { status: 400 });
    }

    const confirmResult = validateConfirmPassword(password, confirmPassword);
    if (!confirmResult.valid) {
      return NextResponse.json({ error: confirmResult.error }, { status: 400 });
    }

    if (isEmailTaken(email)) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }

    if (isMobileTaken(mobile)) {
      return NextResponse.json(
        { error: "This mobile number is already registered." },
        { status: 409 }
      );
    }

    const user = createUser(email, mobile, password);
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
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
