import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function computeMultiplier(attemptCount: number): number {
  if (attemptCount === 1) return 1.0;
  if (attemptCount === 2) return 0.5;
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

  // 1. Verify video exists and is published
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

  // 2. Atomically upsert VideoProgress — increment attemptCount.
  //    This is a single SQL statement so it's safe against concurrent calls.
  const newId = crypto.randomUUID();
  const progressRows = await prisma.$queryRawUnsafe<{ attemptCount: number }[]>(
    `
    INSERT INTO "VideoProgress" ("id", "userId", "videoId", "attemptCount", "lastCompletedAt", "createdAt")
    VALUES ($1, $2, $3, 1, now(), now())
    ON CONFLICT ("userId", "videoId")
    DO UPDATE SET
      "attemptCount"    = "VideoProgress"."attemptCount" + 1,
      "lastCompletedAt" = now()
    RETURNING "attemptCount"
    `,
    newId,
    user.id,
    videoId,
  );

  const attemptCount: number = progressRows[0]?.attemptCount ?? 1;
  const xpMultiplier = computeMultiplier(attemptCount);

  // 3. If XP is disabled on this video, return early
  if (!video.xpEnabled || video.xpValue <= 0) {
    const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
      where: { userId: user.id },
      _sum: { delta: true },
    });
    return Response.json({
      xpAwarded:        0,
      completionNumber: attemptCount,
      xpMultiplier:     0,
      newTotal:         totalXpAgg._sum.delta ?? 0,
    });
  }

  const xpEarned = Math.round(video.xpValue * xpMultiplier);

  // 4. Create ledger entry only when XP > 0.
  //    Guard against duplicates: if a ledger entry already exists for this
  //    (userId, videoId, completionNumber), skip insertion. This makes the
  //    endpoint idempotent for repeated network retries.
  if (xpEarned > 0) {
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "XpLedgerEntry"
       WHERE "userId" = $1
         AND "refType" = 'Video'
         AND "refId"   = $2
         AND (meta->>'completionNumber')::int = $3
       LIMIT 1`,
      user.id,
      videoId,
      attemptCount,
    );

    if (existing.length === 0) {
      await prisma.xpLedgerEntry.create({
        data: {
          userId:  user.id,
          delta:   xpEarned,
          reason:  "Video completion",
          refType: "Video",
          refId:   videoId,
          meta: {
            videoTitle:       video.title,
            baseXp:           video.xpValue,
            xpMultiplier,
            completionNumber: attemptCount,
          },
        },
      });
    }
  }

  // 5. Return updated XP total
  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });

  return Response.json({
    xpAwarded:        xpEarned,
    completionNumber: attemptCount,
    xpMultiplier,
    newTotal:         totalXpAgg._sum.delta ?? 0,
  });
}
