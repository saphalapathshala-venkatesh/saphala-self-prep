import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import type { DoubtStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, Number(searchParams.get("page")   ?? "1"));
  const status = searchParams.get("status") as DoubtStatus | null;
  const limit  = 30;
  const skip   = (page - 1) * limit;

  const where = status ? { status } : {};

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true, mobile: true } },
        replies: { select: { id: true, isAdminReply: true } },
      },
    }),
    prisma.doubt.count({ where }),
  ]);

  return NextResponse.json({ doubts, total, page, pages: Math.ceil(total / limit) });
}
