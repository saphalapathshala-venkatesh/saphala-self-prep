import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
  }

  const doubt = await prisma.doubt.findUnique({ where: { id } });
  if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

  const reply = await prisma.doubtReply.create({
    data: {
      doubtId: id,
      authorId: auth.user.id,
      body: body.body.trim(),
      isAdminReply: true,
    },
  });

  await prisma.doubt.update({
    where: { id },
    data: { status: "ADDRESSED" },
  });

  return NextResponse.json({ reply }, { status: 201 });
}
