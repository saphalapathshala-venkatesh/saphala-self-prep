import { getCurrentUserAndSession } from "./auth";

/**
 * Validates the session cookie for student-facing routes.
 * Returns { user, sessionToken } if authenticated, null otherwise.
 * All roles (STUDENT, ADMIN, SUPER_ADMIN) are accepted since admins
 * may also take tests.
 */
export async function getStudentSession() {
  return getCurrentUserAndSession();
}
