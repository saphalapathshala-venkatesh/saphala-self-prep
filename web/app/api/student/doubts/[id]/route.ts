import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doubt = await prisma.doubt.findFirst({
    where: { id, userId: user.id },
    include: {
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
