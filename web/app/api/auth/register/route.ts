import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  validateEmail,
  validateMobile,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dbFindByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function dbFindByMobile(mobile: string) {
  return prisma.user.findUnique({ where: { mobile }, select: { id: true } });
}

async function dbCreateUser(data: {
  email: string;
  mobile: string;
  passwordHash: string;
  fullName: string;
  state: string;
  gender: string;
}) {
  return prisma.user.create({ data, select: { id: true } });
}

function dbUrlProbe(): string {
  try {
    const raw = process.env.DATABASE_URL ?? "";
    const proto = raw.split("://")[0] ?? "missing";
    const host = raw.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
    return `${proto}://${host}`;
  } catch {
    return "unreadable";
  }
}

function extractPrismaError(e: unknown): { code: string | undefined; message: string | undefined; meta: unknown } {
  const err = e as { code?: string; message?: string; meta?: unknown };
  return { code: err?.code, message: err?.message, meta: err?.meta ?? null };
}

export async function POST(request: NextRequest) {
  const dbProbe = dbUrlProbe();
  console.log("[register] START dbUrl:", dbProbe);

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { password, confirmPassword, fullName, state, gender, legalAccepted } = body;

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

    // ── Email duplicate check — retry once on transient connection failure ──
    let emailConflict;
    try {
      emailConflict = await dbFindByEmail(email);
    } catch (dbErr) {
      const e1 = extractPrismaError(dbErr);
      console.error("[register] email lookup failed (attempt 1):", { code: e1.code, message: e1.message, meta: e1.meta, dbUrl: dbProbe });
      try {
        await sleep(700);
        emailConflict = await dbFindByEmail(email);
        console.log("[register] email lookup succeeded on retry");
      } catch (retryErr) {
        const e2 = extractPrismaError(retryErr);
        console.error("[register] email lookup failed (attempt 2):", { code: e2.code, message: e2.message, meta: e2.meta, dbUrl: dbProbe });
        return NextResponse.json(
          { error: "Registration is temporarily unavailable. Please try again in a moment." },
          { status: 503 }
        );
      }
    }
    if (emailConflict) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // ── Mobile duplicate check — retry once on transient connection failure ──
    let mobileConflict;
    try {
      mobileConflict = await dbFindByMobile(mobile);
    } catch (dbErr) {
      const e1 = extractPrismaError(dbErr);
      console.error("[register] mobile lookup failed (attempt 1):", { code: e1.code, message: e1.message, meta: e1.meta, dbUrl: dbProbe });
      try {
        await sleep(700);
        mobileConflict = await dbFindByMobile(mobile);
        console.log("[register] mobile lookup succeeded on retry");
      } catch (retryErr) {
        const e2 = extractPrismaError(retryErr);
        console.error("[register] mobile lookup failed (attempt 2):", { code: e2.code, message: e2.message, meta: e2.meta, dbUrl: dbProbe });
        return NextResponse.json(
          { error: "Registration is temporarily unavailable. Please try again in a moment." },
          { status: 503 }
        );
      }
    }
    if (mobileConflict) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // ── User creation — retry once on transient connection failure ──
    try {
      await dbCreateUser({
        email,
        mobile,
        passwordHash: hashed,
        fullName: fullName.trim(),
        state: state.trim(),
        gender,
      });
    } catch (dbErr) {
      const e1 = extractPrismaError(dbErr);
      console.error("[register] user create failed (attempt 1):", { code: e1.code, message: e1.message, meta: e1.meta, dbUrl: dbProbe });

      const code = e1.code;
      if (code === "P2002") {
        const target = (e1.meta as { target?: string[] } | null)?.target?.[0];
        if (target === "email") {
          return NextResponse.json(
            { error: "An account with this email already exists. Please log in instead." },
            { status: 409 }
          );
        }
        if (target === "mobile") {
          return NextResponse.json(
            { error: "An account with this mobile number already exists. Please log in instead." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "An account with these details already exists. Please log in instead." },
          { status: 409 }
        );
      }

      try {
        await sleep(700);
        await dbCreateUser({
          email,
          mobile,
          passwordHash: hashed,
          fullName: fullName.trim(),
          state: state.trim(),
          gender,
        });
        console.log("[register] user create succeeded on retry");
      } catch (retryErr) {
        const e2 = extractPrismaError(retryErr);
        console.error("[register] user create failed (attempt 2):", { code: e2.code, message: e2.message, meta: e2.meta, dbUrl: dbProbe });
        const retryCode = e2.code;
        if (retryCode === "P2002") {
          const target = (e2.meta as { target?: string[] } | null)?.target?.[0];
          if (target === "email") {
            return NextResponse.json(
              { error: "An account with this email already exists. Please log in instead." },
              { status: 409 }
            );
          }
          if (target === "mobile") {
            return NextResponse.json(
              { error: "An account with this mobile number already exists. Please log in instead." },
              { status: 409 }
            );
          }
        }
        return NextResponse.json(
          { error: "Registration is temporarily unavailable. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; meta?: { target?: string[] } };
    console.error("[register] Unhandled error:", {
      code: err?.code,
      message: err?.message,
      meta: err?.meta,
    });

    if (err?.code === "P2002") {
      const field = err?.meta?.target?.[0];
      if (field === "email") {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in instead." },
          { status: 409 }
        );
      }
      if (field === "mobile") {
        return NextResponse.json(
          { error: "An account with this mobile number already exists. Please log in instead." },
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
