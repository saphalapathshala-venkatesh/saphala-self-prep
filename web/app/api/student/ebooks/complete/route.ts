import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// XP policy (same as TestHub + Flashcards):
//   1st completion → 100% of xpValue
//   2nd completion → 50% of xpValue
//   3rd+ completion → 0 XP
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

  let body: { lessonId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { lessonId } = body;
  if (!lessonId || typeof lessonId !== "string") {
    return Response.json({ error: "lessonId is required" }, { status: 400 });
  }

  const lesson = await prisma.contentPage.findFirst({
    where: { id: lessonId, isPublished: true },
    select: { id: true, xpEnabled: true, xpValue: true, title: true },
  });

  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!lesson.xpEnabled || lesson.xpValue <= 0) {
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
    where: { userId: user.id, refType: "ContentPage", refId: lessonId },
  });

  const completionNumber = priorCompletions + 1;
  const xpMultiplier = computeMultiplier(completionNumber);
  const xpEarned = Math.round(lesson.xpValue * xpMultiplier);

  if (xpEarned > 0) {
    await prisma.xpLedgerEntry.create({
      data: {
        userId: user.id,
        delta: xpEarned,
        reason: "Ebook lesson completion",
        refType: "ContentPage",
        refId: lessonId,
        meta: {
          lessonTitle: lesson.title,
          baseXp: lesson.xpValue,
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
