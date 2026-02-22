import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

const VALID_ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.role || !VALID_ROLES.includes(body.role as typeof VALID_ROLES[number])) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: body.role as typeof VALID_ROLES[number] },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
