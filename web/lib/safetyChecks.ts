import { PrismaClient, UserRole } from "@prisma/client";

const EXPECTED_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "STUDENT"];

export function verifySystemIntegrity(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL environment variable is not set");
  }

  if (typeof PrismaClient !== "function") {
    errors.push("PrismaClient is not available from @prisma/client");
  }

  for (const role of EXPECTED_ROLES) {
    if (!Object.values(UserRole).includes(role)) {
      errors.push(`UserRole enum missing expected value: ${role}`);
    }
  }

  if (errors.length > 0) {
    console.error("[SAFETY CHECK FAILED]", errors);
  } else {
    console.log("[SAFETY CHECK] System integrity verified — AUTH + PRISMA OK");
  }

  return { ok: errors.length === 0, errors };
}
