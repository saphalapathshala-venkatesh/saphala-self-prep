import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateEmail, validateMobile, validatePassword } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { fullName, password } = body;

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const mobileDigits =
    typeof body.mobile === "string" ? body.mobile.trim().replace(/\D/g, "") : "";
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

  if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  const emailConflict = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailConflict) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const mobileConflict = await prisma.user.findUnique({
    where: { mobile },
    select: { id: true },
  });
  if (mobileConflict) {
    return NextResponse.json(
      { error: "An account with this mobile number already exists." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      mobile,
      passwordHash: hashed,
      fullName: fullName.trim(),
    },
    select: {
      id: true,
      email: true,
      mobile: true,
      fullName: true,
      role: true,
      isActive: true,
      allowMultiDevice: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, user });
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      mobile: true,
      fullName: true,
      role: true,
      isActive: true,
      allowMultiDevice: true,
      createdAt: true,
      _count: {
        select: {
          sessions: {
            where: {
              expiresAt: { gt: new Date() },
              revokedAt: null,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      mobile: u.mobile,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      allowMultiDevice: u.allowMultiDevice,
      createdAt: u.createdAt,
      activeSessionCount: u._count.sessions,
    })),
  });
}
