import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

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
