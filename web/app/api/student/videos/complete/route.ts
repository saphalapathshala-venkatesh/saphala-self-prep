import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clearDashboardCache } from "@/lib/dashboardData";

export const dynamic = "force-dynamic";

function computeMultiplier(completionCount: number): number {
  if (completionCount === 1) return 1.0;
  if (completionCount === 2) return 0.5;
  return 0;
}

export async function POST(request: Request) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only student sessions can earn XP — admin previews never trigger XP
  if (user.role !== "STUDENT") {
    return Response.json({ xpAwarded: 0, completionNumber: 0, xpMultiplier: 0, newTotal: 0 });
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

  // ── 2. Verify video exists and is published ──────────────────────────────
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

  // ── 3. Atomically upsert UserXpSourceProgress ───────────────────────────
  //   Prisma translates upsert to INSERT ... ON CONFLICT DO UPDATE,
  //   so completionCount increment is a single atomic SQL statement.
  const progress = await prisma.userXpSourceProgress.upsert({
    where: {
      userId_sourceType_sourceId: {
        userId:     user.id,
        sourceType: "VIDEO",
        sourceId:   videoId,
      },
    },
    create: {
      userId:          user.id,
      sourceType:      "VIDEO",
      sourceId:        videoId,
      completionCount: 1,
      totalXpAwarded:  0,
    },
    update: {
      completionCount: { increment: 1 },
    },
  });

  const completionNumber = progress.completionCount;
  const xpMultiplier     = computeMultiplier(completionNumber);

  // ── 4. XP disabled → return count only, no ledger entry ─────────────────
  if (!video.xpEnabled || video.xpValue <= 0 || xpMultiplier === 0) {
    const wallet = await prisma.userXpWallet.findUnique({ where: { userId: user.id } });
    return Response.json({
      xpAwarded:        0,
      completionNumber,
      xpMultiplier,
      newTotal:         wallet?.currentXpBalance ?? 0,
    });
  }

  const xpEarned = Math.round(video.xpValue * xpMultiplier);

  // ── 5. Duplicate guard ───────────────────────────────────────────────────
  //   Prevents double-award if the endpoint is retried (e.g. by middleware).
  //   Uses JSON containment check on the meta column.
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "XpLedgerEntry"
     WHERE "userId"  = $1
       AND "refType" = 'Video'
       AND "refId"   = $2
       AND (meta->>'completionNumber')::int = $3
     LIMIT 1`,
    user.id,
    videoId,
    completionNumber,
  );

  if (existing.length > 0) {
    // Already awarded for this completion — idempotent return
    const wallet = await prisma.userXpWallet.findUnique({ where: { userId: user.id } });
    return Response.json({
      xpAwarded:        xpEarned,
      completionNumber,
      xpMultiplier,
      newTotal:         wallet?.currentXpBalance ?? 0,
    });
  }

  // ── 6. Create ledger entry ───────────────────────────────────────────────
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
        completionNumber,
      },
    },
  });

  // ── 7. Upsert wallet (atomic increment) ──────────────────────────────────
  const updatedWallet = await prisma.userXpWallet.upsert({
    where:  { userId: user.id },
    create: {
      userId:            user.id,
      currentXpBalance:  xpEarned,
      lifetimeXpEarned:  xpEarned,
    },
    update: {
      currentXpBalance: { increment: xpEarned },
      lifetimeXpEarned: { increment: xpEarned },
    },
  });

  // ── 8. Update totalXpAwarded on source progress row ──────────────────────
  await prisma.userXpSourceProgress.update({
    where: {
      userId_sourceType_sourceId: {
        userId:     user.id,
        sourceType: "VIDEO",
        sourceId:   videoId,
      },
    },
    data: {
      totalXpAwarded: { increment: xpEarned },
    },
  });

  // ── 9. Bust dashboard cache so next /dashboard render is always fresh ──────
  clearDashboardCache(user.id);

  return Response.json({
    xpAwarded:        xpEarned,
    completionNumber,
    xpMultiplier,
    newTotal:         updatedWallet.currentXpBalance,
  });
}
