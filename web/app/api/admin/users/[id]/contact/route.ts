import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { validateEmail, validateMobile } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id: userId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email: rawEmail, mobile: rawMobile } = body;

  if (rawEmail === undefined && rawMobile === undefined) {
    return NextResponse.json(
      { error: "At least one of email or mobile must be provided." },
      { status: 400 }
    );
  }

  const updateData: { email?: string; mobile?: string } = {};

  if (rawEmail !== undefined) {
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      return NextResponse.json({ error: emailResult.error }, { status: 400 });
    }
    updateData.email = email;
  }

  if (rawMobile !== undefined) {
    const digits =
      typeof rawMobile === "string" ? rawMobile.trim().replace(/\D/g, "") : "";
    const mobile =
      digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    const mobileResult = validateMobile(mobile);
    if (!mobileResult.valid) {
      return NextResponse.json({ error: mobileResult.error }, { status: 400 });
    }
    updateData.mobile = mobile;
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (updateData.email) {
    const conflict = await prisma.user.findUnique({
      where: { email: updateData.email },
      select: { id: true },
    });
    if (conflict && conflict.id !== userId) {
      return NextResponse.json(
        { error: "That email address is already in use by another account." },
        { status: 409 }
      );
    }
  }

  if (updateData.mobile) {
    const conflict = await prisma.user.findUnique({
      where: { mobile: updateData.mobile },
      select: { id: true },
    });
    if (conflict && conflict.id !== userId) {
      return NextResponse.json(
        { error: "That mobile number is already in use by another account." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, mobile: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
