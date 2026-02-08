import { redirect } from "next/navigation";
import { requireAuth } from "./serverAuth";
import type { Role } from "./generated/prisma";

export async function requireRole(roles: Role[]) {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
