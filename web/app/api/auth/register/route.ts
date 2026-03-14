import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  validateEmail,
  validateMobile,
  validatePassword,
  validateConfirmPassword,
  normalizeIdentifier,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { password, confirmPassword, fullName, state, gender, legalAccepted } = body;

    // Backend enforcement — frontend disabling alone is not sufficient
    if (legalAccepted !== true) {
      return NextResponse.json(
        { error: "You must accept the Terms & Conditions and Refund Policy to register." },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email;
    const mobileRaw = typeof body.mobile === "string" ? body.mobile : "";
    const mobileDigits = mobileRaw.trim().replace(/\D/g, "");
    const mobile =
      mobileDigits.length === 12 && mobileDigits.startsWith("91")
        ? mobileDigits.slice(2)
        : mobileDigits;

    const emailResult = validateEmail(email);
    if (!emailResult.valid)
      return NextResponse.json({ error: emailResult.error }, { status: 400 });

    const mobileResult = validateMobile(mobile);
    if (!mobileResult.valid)
      return NextResponse.json({ error: mobileResult.error }, { status: 400 });

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid)
      return NextResponse.json({ error: passwordResult.error }, { status: 400 });

    const confirmResult = validateConfirmPassword(password, confirmPassword);
    if (!confirmResult.valid)
      return NextResponse.json({ error: confirmResult.error }, { status: 400 });

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
      "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
      "Other",
    ];
    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ error: "Please select a valid state." }, { status: 400 });
    }

    const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
    if (!gender || !validGenders.includes(gender)) {
      return NextResponse.json(
        { error: "Please select a valid gender option." },
        { status: 400 }
      );
    }

    // Check for duplicates — two separate findUnique calls, each hitting the
    // unique index directly, so the result is always unambiguous.
    const emailConflict = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (emailConflict) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const mobileConflict = await prisma.user.findUnique({
      where: { mobile },
      select: { id: true },
    });
    if (mobileConflict) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
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

    // Account created — user will log in manually on the login page.
    // No auto-login session is created here to keep the flow clean.
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[register] Error:", e);

    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      const meta = (e as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.[0];
      if (field === "email") {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }
      if (field === "mobile") {
        return NextResponse.json(
          {
            error:
              "An account with this mobile number already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "An account with these details already exists. Please log in instead." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
