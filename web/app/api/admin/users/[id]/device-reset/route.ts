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

  const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `DELETE FROM "UserDevice" WHERE "userId" = $1 RETURNING id`,
    id
  );

  const deletedCount = Array.isArray(result) ? result.length : 0;

  console.log(
    `[device-reset] Admin ${auth.user.id} reset device binding for user ${id} (${user.fullName}) — ${deletedCount} device(s) cleared`
  );

  return NextResponse.json({
    success: true,
    devicesCleared: deletedCount,
    message: `Device binding reset. The user can now log in from a new device.`,
  });
}
