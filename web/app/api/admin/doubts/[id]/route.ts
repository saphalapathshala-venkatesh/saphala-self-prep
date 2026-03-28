import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import type { DoubtStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  const doubt = await prisma.doubt.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, fullName: true, email: true, mobile: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, fullName: true, role: true } },
        },
      },
    },
  });

  if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

  return NextResponse.json({ doubt });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: { status?: DoubtStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status } = body;
  const validStatuses: DoubtStatus[] = ["OPEN", "ADDRESSED", "CLOSED"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Valid status required: OPEN, ADDRESSED, CLOSED" }, { status: 400 });
  }

  const doubt = await prisma.doubt.findUnique({ where: { id } });
  if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

  const updated = await prisma.doubt.update({ where: { id }, data: { status } });
  return NextResponse.json({ doubt: updated });
}
