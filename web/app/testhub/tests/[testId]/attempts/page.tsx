import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDbTestById } from "@/lib/testhubDb";

function msToHMS(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function xpLabel(multiplier: number | null): string {
  if (multiplier === null) return "—";
  if (multiplier === 1) return "Full";
  if (multiplier === 0.5) return "50%";
  return "None";
}

function xpLabelColor(multiplier: number | null): string {
  if (multiplier === 1) return "#166534";
  if (multiplier === 0.5) return "#92400e";
  return "#64748b";
}

function xpLabelBg(multiplier: number | null): string {
  if (multiplier === 1) return "#dcfce7";
  if (multiplier === 0.5) return "#fef3c7";
  return "#f1f5f9";
}

export default async function LearnerAttemptsPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { testId } = await params;

  const test = await getDbTestById(testId);
  if (!test) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, testId },
    orderBy: { startedAt: "asc" },
  });

  const xpEntries = await prisma.xpLedgerEntry.findMany({
    where: {
      userId: user.id,
      refType: "Attempt",
      refId: { in: attempts.map((a) => a.id) },
    },
    select: { refId: true, delta: true, meta: true },
  });

  type XpMeta = { xpMultiplier?: number };
  const xpMap = new Map(
    xpEntries.map((x) => [x.refId, { delta: x.delta, meta: x.meta as XpMeta | null }])
  );

  const submittedAttempts = attempts.filter((a) => a.status === "SUBMITTED");

  return (
    <div className="flex-grow py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/testhub/tests/${testId}/brief`}
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            ← Back to Test
          </Link>
        </div>

        <h1 className="text-xl font-bold text-[#2D1B69] mb-1">{test.title}</h1>
        <p className="text-xs text-gray-400 font-mono mb-6">{test.code}</p>

        {submittedAttempts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-sm mb-4">You have not completed any attempts for this test yet.</div>
            <Link
              href={`/testhub/tests/${testId}/brief`}
              className="btn-glossy-primary px-6 py-2.5 text-sm font-semibold"
            >
              Take This Test
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-xl font-bold text-[#2D1B69]">{submittedAttempts.length}/{test.attemptsAllowed}</div>
                <div className="text-xs text-gray-500 mt-1">Attempts Used</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-xl font-bold text-green-700">
                  {Math.max(...submittedAttempts.map((a) => a.scorePct)).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Best Score</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                <div className="text-xl font-bold text-purple-600">
                  +{xpEntries.reduce((sum, x) => sum + x.delta, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total XP Earned</div>
              </div>
            </div>

            <div className="space-y-4">
              {submittedAttempts.map((a) => {
                const xpEntry = xpMap.get(a.id);
                const multiplier = xpEntry?.meta?.xpMultiplier ?? null;
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-sm font-semibold text-[#2D1B69]">
                          Attempt #{a.attemptNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {a.submittedAt
                            ? new Date(a.submittedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#2D1B69]">
                          {a.scorePct.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                      <div className="bg-green-50 rounded-lg p-2.5">
                        <div className="text-sm font-bold text-green-700">{a.correctCount}</div>
                        <div className="text-[10px] text-gray-500">Correct</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2.5">
                        <div className="text-sm font-bold text-red-500">{a.wrongCount}</div>
                        <div className="text-[10px] text-gray-500">Wrong</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-sm font-bold text-gray-600">{a.unansweredCount}</div>
                        <div className="text-[10px] text-gray-500">Skipped</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <div className="text-sm font-bold text-blue-700">{msToHMS(a.totalTimeUsedMs)}</div>
                        <div className="text-[10px] text-gray-500">Time Used</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">XP</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: xpLabelBg(multiplier),
                            color: xpLabelColor(multiplier),
                          }}
                        >
                          {xpEntry ? `+${xpEntry.delta} (${xpLabel(multiplier)})` : "—"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/testhub/tests/${testId}/result?attemptId=${a.id}`}
                          className="text-xs px-3 py-1.5 border border-[#6D4BCB] text-[#6D4BCB] rounded-lg font-medium hover:bg-purple-50 transition-colors"
                        >
                          Result
                        </Link>
                        <Link
                          href={`/testhub/tests/${testId}/review?attemptId=${a.id}`}
                          className="text-xs px-3 py-1.5 btn-glossy-primary font-medium"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-400 text-center mt-6 bg-purple-50 rounded-xl p-4 border border-purple-100">
              XP rule: 1st attempt earns 100% · 2nd attempt earns 50% · 3rd attempt onward earns no XP
            </div>
          </>
        )}
      </div>
    </div>
  );
}
