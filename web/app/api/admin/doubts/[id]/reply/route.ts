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

  // Store the answer inline on the Doubt row (no separate DoubtReply table)
  const updated = await prisma.doubt.update({
    where: { id },
    data: {
      answer:       body.body.trim(),
      answeredById: auth.user.id,
      status:       "ADDRESSED",
    },
  });

  return NextResponse.json({ doubt: updated }, { status: 201 });
}
