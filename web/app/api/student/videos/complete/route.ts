import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function computeMultiplier(completionNumber: number): number {
  if (completionNumber === 1) return 1.0;
  if (completionNumber === 2) return 0.5;
  return 0;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { videoId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { videoId } = body;
  if (!videoId || typeof videoId !== "string") {
    return Response.json({ error: "videoId is required" }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<
    { id: string; title: string; xpEnabled: boolean; xpValue: number }[]
  >(
    `SELECT id, title, "xpEnabled", "xpValue" FROM "Video" WHERE id = $1 AND status = 'PUBLISHED'`,
    videoId,
  );

  if (!rows.length) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  const video = rows[0];

  if (!video.xpEnabled || video.xpValue <= 0) {
    const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
      where: { userId: user.id },
      _sum: { delta: true },
    });
    return Response.json({
      xpAwarded: 0,
      completionNumber: 0,
      xpMultiplier: 0,
      newTotal: totalXpAgg._sum.delta ?? 0,
    });
  }

  const priorCompletions = await prisma.xpLedgerEntry.count({
    where: { userId: user.id, refType: "Video", refId: videoId },
  });

  const completionNumber = priorCompletions + 1;
  const xpMultiplier = computeMultiplier(completionNumber);
  const xpEarned = Math.round(video.xpValue * xpMultiplier);

  if (xpEarned > 0) {
    await prisma.xpLedgerEntry.create({
      data: {
        userId: user.id,
        delta: xpEarned,
        reason: "Video completion",
        refType: "Video",
        refId: videoId,
        meta: {
          videoTitle: video.title,
          baseXp: video.xpValue,
          xpMultiplier,
          completionNumber,
        },
      },
    });
  }

  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });

  return Response.json({
    xpAwarded: xpEarned,
    completionNumber,
    xpMultiplier,
    newTotal: totalXpAgg._sum.delta ?? 0,
  });
}
