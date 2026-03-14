import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const MIN_LENGTH = 8;

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only ADMIN (and SUPER_ADMIN) may perform this action
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id: targetUserId } = await params;

  let body: { newPassword?: string; confirmPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { newPassword, confirmPassword } = body;

  if (!newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation are required." },
      { status: 400 }
    );
  }

  const validationError = validatePassword(newPassword);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 }
    );
  }

  // Confirm the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, mobile: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Hash the new password using the same method as the rest of the system
  const newHash = await bcrypt.hash(newPassword, 10);

  // Update password hash — never store or return plain text
  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash: newHash },
  });

  // Invalidate all existing sessions for this user (security)
  await prisma.session.deleteMany({ where: { userId: targetUserId } });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      actorId: auth.user.id,
      action: "ADMIN_PASSWORD_RESET",
      entityType: "User",
      entityId: targetUserId,
      before: Prisma.JsonNull,
      after: Prisma.JsonNull, // Never log password hashes
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        null,
      userAgent: request.headers.get("user-agent") ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Password reset successfully. All existing sessions for this user have been invalidated.",
  });
}
