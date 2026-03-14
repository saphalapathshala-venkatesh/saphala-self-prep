import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getAllAttemptsForStudent } from "@/lib/dashboardData";
import AttemptsClient from "@/components/dashboard/AttemptsClient";

export const dynamic = "force-dynamic";

export default async function MyAttemptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const displayName = user.fullName ?? user.email ?? user.mobile ?? "Student";
  const allAttempts = await getAllAttemptsForStudent(user.id);

  const serialized = allAttempts.map((a) => ({
    ...a,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
    endsAt: a.endsAt?.toISOString() ?? null,
  }));

  return (
    <DashboardShell userName={displayName}>
      <AttemptsClient attempts={serialized} />
    </DashboardShell>
  );
}
