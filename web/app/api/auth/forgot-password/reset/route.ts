import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validatePassword, validateConfirmPassword } from "@/lib/validation";
import { verifyResetToken } from "../verify/route";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  let body: { resetToken?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resetToken, newPassword, confirmPassword } = body;

  if (!resetToken || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const confirmCheck = validateConfirmPassword(newPassword, confirmPassword);
  if (!confirmCheck.valid) {
    return NextResponse.json({ error: confirmCheck.error }, { status: 400 });
  }

  const verified = verifyResetToken(resetToken);
  if (!verified) {
    return NextResponse.json(
      { error: "Reset link is invalid or has expired. Please start over." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, isBlocked: true, isActive: true, deletedAt: true, infringementBlocked: true },
  });

  if (
    !user ||
    user.deletedAt !== null ||
    !user.isActive ||
    user.isBlocked ||
    user.infringementBlocked
  ) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ success: true });
}
