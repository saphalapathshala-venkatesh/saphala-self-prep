import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, IDLE_TIMEOUT_MS } from "./constants";
import { getSession, createSession, deleteSession } from "./sessionStore";
import { prisma } from "./db";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

const USER_SELECT = {
  id: true,
  email: true,
  mobile: true,
  role: true,
  fullName: true,
  gender: true,
  state: true,
  createdAt: true,
  isBlocked: true,
  isActive: true,
  deletedAt: true,
  infringementBlocked: true,
} as const;

// Cached per-request: layout + page both call this but only one DB hit occurs.
export const getCurrentUser = cache(async function _getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const session = await getSession(sessionCookie.value);
  if (!session) {
    return null;
  }

  const raw = await prisma.user.findUnique({
    where: { id: session.userId },
    select: USER_SELECT,
  });

  if (!raw) return null;

  if (raw.deletedAt || raw.isBlocked || raw.infringementBlocked || !raw.isActive) {
    return null;
  }

  const { isBlocked: _b, isActive: _a, deletedAt: _d, infringementBlocked: _i, ...user } = raw;
  return user;
});

export async function getCurrentUserAndSession(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  sessionToken: string;
} | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const session = await getSession(sessionCookie.value);
  if (!session) return null;

  const raw = await prisma.user.findUnique({
    where: { id: session.userId },
    select: USER_SELECT,
  });

  if (!raw) return null;

  if (raw.deletedAt || raw.isBlocked || raw.infringementBlocked || !raw.isActive) {
    return null;
  }

  const { isBlocked: _b, isActive: _a, deletedAt: _d, infringementBlocked: _i, ...user } = raw;
  return { user, sessionToken: sessionCookie.value };
}

export async function createSessionCookie(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS);
  await createSession(token, userId, expiresAt);

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: SESSION_TTL_MS / 1000,
      path: "/",
    },
  };
}

export async function setSessionCookie(userId: string): Promise<string> {
  const cookie = await createSessionCookie(userId);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);
  return cookie.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    await deleteSession(sessionCookie.value);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
