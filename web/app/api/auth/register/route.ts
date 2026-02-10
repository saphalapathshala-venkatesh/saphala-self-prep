import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
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
    if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

    const mobileResult = validateMobile(mobile);
    if (!mobileResult.valid) return NextResponse.json({ error: mobileResult.error }, { status: 400 });

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) return NextResponse.json({ error: passwordResult.error }, { status: 400 });

    const confirmResult = validateConfirmPassword(password, confirmPassword);
    if (!confirmResult.valid) return NextResponse.json({ error: confirmResult.error }, { status: 400 });

    // Check duplicates in DB
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { mobile }] },
      select: { email: true, mobile: true },
    });

    if (existing?.email === email) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    if (existing?.mobile === mobile) {
      return NextResponse.json({ error: "This mobile number is already registered." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, mobile, password: hashed },
      select: { id: true },
    });

    const cookie = await createSessionCookie(user.id);
    const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
