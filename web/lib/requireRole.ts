import { redirect } from "next/navigation";
import { requireAuth } from "./serverAuth";
import type { UserRole } from "@prisma/client";

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
