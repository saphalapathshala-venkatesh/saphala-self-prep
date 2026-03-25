import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Clear device bindings
  const deviceResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `DELETE FROM "UserDevice" WHERE "userId" = $1 RETURNING id`,
    id
  );
  const devicesCleared = Array.isArray(deviceResult) ? deviceResult.length : 0;

  // Also revoke all active sessions so the student is immediately logged out
  // from any current device — this ensures stale sessions can't bypass the reset.
  const { count: sessionsRevoked } = await prisma.session.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log(
    `[device-reset] Admin ${auth.user.id} reset device for user ${id} (${user.fullName}) — ` +
    `${devicesCleared} device(s) cleared, ${sessionsRevoked} session(s) revoked`
  );

  return NextResponse.json({
    success: true,
    devicesCleared,
    sessionsRevoked,
    message: `Device binding reset and all active sessions revoked. The user can now log in from a new device.`,
  });
}
