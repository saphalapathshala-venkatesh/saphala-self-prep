import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;

  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, mobile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      test: { select: { title: true, code: true } },
    },
  });

  const xpEntries = await prisma.xpLedgerEntry.findMany({
    where: {
      userId,
      refType: "Attempt",
      refId: { in: attempts.map((a) => a.id) },
    },
    select: { refId: true, delta: true },
  });

  const xpMap = new Map(xpEntries.map((x) => [x.refId, x.delta]));

  const rows = attempts.map((a) => ({
    id: a.id,
    testTitle: a.test.title,
    testCode: a.test.code,
    attemptNumber: a.attemptNumber,
    status: a.status,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    scorePct: a.scorePct,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    unansweredCount: a.unansweredCount,
    totalTimeUsedMs: a.totalTimeUsedMs,
    xpAwarded: xpMap.get(a.id) ?? null,
  }));

  return NextResponse.json({ user, attempts: rows });
}
