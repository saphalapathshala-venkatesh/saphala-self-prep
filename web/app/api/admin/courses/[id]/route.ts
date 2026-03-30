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

  let body: { thumbnailUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!("thumbnailUrl" in body)) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const thumbnailUrl = body.thumbnailUrl?.trim() || null;

  await prisma.$executeRawUnsafe(
    `UPDATE "Course" SET "thumbnailUrl" = $1 WHERE id = $2`,
    thumbnailUrl,
    id,
  );

  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; thumbnailUrl: string | null }[]>(
    `SELECT id, name, "thumbnailUrl" FROM "Course" WHERE id = $1`,
    id,
  );

  if (!rows.length) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json({ course: rows[0] });
}
