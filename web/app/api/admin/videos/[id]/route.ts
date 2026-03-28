import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: { xpEnabled?: boolean; xpValue?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.xpEnabled === "boolean") updates.xpEnabled = body.xpEnabled;
  if (typeof body.xpValue === "number" && body.xpValue >= 0) {
    updates.xpValue = Math.round(body.xpValue);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const setClauses = Object.entries(updates)
    .map(([k], i) => `"${k}" = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);

  await prisma.$executeRawUnsafe(
    `UPDATE "Video" SET ${setClauses} WHERE id = $1`,
    id,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<
    { id: string; title: string; xpEnabled: boolean; xpValue: number }[]
  >(`SELECT id, title, "xpEnabled", "xpValue" FROM "Video" WHERE id = $1`, id);

  if (!rows.length) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  return NextResponse.json({ video: rows[0] });
}
