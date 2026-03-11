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
    const { email, mobile, password, confirmPassword, fullName, state, gender } = body;

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
      return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 409 });
    }
    if (existing?.mobile === mobile) {
      return NextResponse.json({ error: "An account with this mobile number already exists. Please log in instead." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    const validStates = [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
      "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
      "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
      "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
      "Other",
    ];
    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ error: "Please select a valid state." }, { status: 400 });
    }
    const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
    if (!gender || !validGenders.includes(gender)) {
      return NextResponse.json({ error: "Please select a valid gender option." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        mobile,
        passwordHash: hashed,
        fullName: fullName.trim(),
        state: state.trim(),
        gender,
      },
      select: { id: true },
    });

    const cookie = await createSessionCookie(user.id);
    const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e: unknown) {
    console.error(e);
    if (
      typeof e === "object" && e !== null && "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      const meta = (e as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.[0];
      if (field === "email") {
        return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 409 });
      }
      if (field === "mobile") {
        return NextResponse.json({ error: "An account with this mobile number already exists. Please log in instead." }, { status: 409 });
      }
      return NextResponse.json({ error: "An account with these details already exists. Please log in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
