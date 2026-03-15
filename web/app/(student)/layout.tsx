import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import type { ReactNode } from "react";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const displayName = user.fullName ?? user.email ?? user.mobile ?? "Student";

  return <DashboardShell userName={displayName}>{children}</DashboardShell>;
}
