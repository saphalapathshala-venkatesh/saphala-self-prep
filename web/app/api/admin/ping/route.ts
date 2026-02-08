import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ["ADMIN"]);
  if (result.error) return result.error;

  return NextResponse.json({ ok: true });
}
