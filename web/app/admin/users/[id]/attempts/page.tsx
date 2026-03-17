import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface AttemptRow {
  id: string;
  testTitle: string;
  testCode: string | null;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  scorePct: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalTimeUsedMs: number;
}

function msToHMS(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function statusBadge(status: string) {
  if (status === "SUBMITTED") return { label: "Submitted", bg: "#dcfce7", color: "#166534" };
  if (status === "IN_PROGRESS") return { label: "In Progress", bg: "#fef9c3", color: "#854d0e" };
  return { label: status, bg: "#f1f5f9", color: "#475569" };
}

export default async function AdminUserAttemptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "ADMIN" && me.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const { id: userId } = await params;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, mobile: true },
  });

  if (!targetUser) notFound();

  const rawAttempts = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      test: { select: { title: true, code: true } },
    },
  });

  const attempts: (AttemptRow & { test: { title: string; code: string | null } })[] =
    rawAttempts.map((a) => ({
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
      test: a.test,
    }));

  const xpEntries = await prisma.xpLedgerEntry.findMany({
    where: {
      userId,
      refType: "Attempt",
      refId: { in: attempts.map((a) => a.id) },
    },
    select: { refId: true, delta: true },
  });

  const xpMap = new Map(xpEntries.map((x) => [x.refId, x.delta]));

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/users"
          style={{ fontSize: 13, color: "#6D4BCB", textDecoration: "none" }}
        >
          ← Back to Users
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D1B69", marginBottom: 4 }}>
        Attempt History
      </h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
        {targetUser.fullName}
        {targetUser.email ? ` · ${targetUser.email}` : ""}
        {targetUser.mobile ? ` · ${targetUser.mobile}` : ""}
      </p>

      {attempts.length === 0 ? (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "40px 24px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          No attempts found for this learner.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                {[
                  "#",
                  "Test",
                  "Attempt",
                  "Status",
                  "Score %",
                  "Correct",
                  "Wrong",
                  "Unanswered",
                  "Time Used",
                  "XP Awarded",
                  "Submitted At",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => {
                const badge = statusBadge(a.status);
                const xp = xpMap.get(a.id);
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "#2D1B69" }}>{a.test.title}</div>
                      {a.test.code && (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.test.code}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      #{a.attemptNumber}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        color: a.scorePct >= 60 ? "#16a34a" : a.scorePct >= 35 ? "#d97706" : "#dc2626",
                      }}
                    >
                      {a.status === "SUBMITTED" ? `${a.scorePct.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 600 }}>
                      {a.status === "SUBMITTED" ? a.correctCount : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#dc2626", fontWeight: 600 }}>
                      {a.status === "SUBMITTED" ? a.wrongCount : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>
                      {a.status === "SUBMITTED" ? a.unansweredCount : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>
                      {a.totalTimeUsedMs > 0 ? msToHMS(a.totalTimeUsedMs) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6D4BCB", fontWeight: 600 }}>
                      {xp != null ? `+${xp} XP` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {a.submittedAt
                        ? new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(a.submittedAt))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
