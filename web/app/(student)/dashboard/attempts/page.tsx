import { getCurrentUser } from "@/lib/auth";
import { getAllAttemptsForStudent } from "@/lib/dashboardData";
import AttemptsClient from "@/components/dashboard/AttemptsClient";

export const dynamic = "force-dynamic";

export default async function MyAttemptsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allAttempts = await getAllAttemptsForStudent(user.id);

  const serialized = allAttempts.map((a) => ({
    ...a,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
    endsAt: a.endsAt?.toISOString() ?? null,
  }));

  return <AttemptsClient attempts={serialized} />;
}
