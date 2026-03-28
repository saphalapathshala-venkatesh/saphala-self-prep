import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { videoId?: string; title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { videoId, title, body: doubtBody } = body;
  if (!videoId || !title?.trim() || !doubtBody?.trim()) {
    return NextResponse.json({ error: "videoId, title, and body are required" }, { status: 400 });
  }

  const videoRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Video" WHERE id = $1 AND status = 'PUBLISHED'`,
    videoId,
  );
  if (!videoRows.length) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const doubt = await prisma.doubt.create({
    data: {
      userId: user.id,
      videoId,
      title: title.trim(),
      body: doubtBody.trim(),
    },
  });

  return NextResponse.json({ doubt }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        videoId: true,
        title: true,
        status: true,
        createdAt: true,
        _count: { select: { replies: true } },
      },
    }),
    prisma.doubt.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ doubts, total, page, pages: Math.ceil(total / limit) });
}
