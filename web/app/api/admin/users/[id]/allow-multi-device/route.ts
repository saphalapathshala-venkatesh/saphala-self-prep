import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.allowMultiDevice !== "boolean") {
    return NextResponse.json({ error: "allowMultiDevice (boolean) is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { allowMultiDevice: body.allowMultiDevice },
  });

  return NextResponse.json({ success: true, allowMultiDevice: body.allowMultiDevice });
}
