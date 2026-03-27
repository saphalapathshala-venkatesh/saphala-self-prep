import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, IDLE_TIMEOUT_MS } from "./constants";
import { createSession, deleteSession } from "./sessionStore";
import { prisma, isNeonQuotaError } from "./db";
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

// Only roll the idle window when less than half the TTL remains,
// to avoid a DB write on every single request.
const ROLL_THRESHOLD_MS = IDLE_TIMEOUT_MS / 2;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type RawUser = {
  id: string;
  email: string | null;
  mobile: string | null;
  role: string;
  fullName: string | null;
  gender: string | null;
  state: string | null;
  createdAt: Date;
  isBlocked: boolean;
  isActive: boolean;
  deletedAt: Date | null;
  infringementBlocked: boolean;
};

type SessionWithUser = {
  id: string;
  userId: string;
  expiresAt: Date;
  user: RawUser;
};

/**
 * Single-query session + user lookup.
 * Replaces the old two-query pattern (getSession → findFirst, then user → findUnique)
 * with a single Prisma query using include — one DB round-trip instead of two.
 */
async function lookupSessionAndUser(token: string): Promise<SessionWithUser | null> {
  if (!token) return null;
  const now = new Date();

  const doQuery = () =>
    prisma.session.findFirst({
      where: { id: token, expiresAt: { gt: now }, revokedAt: null },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: { select: USER_SELECT },
      },
    });

  let result: SessionWithUser | null = null;
  try {
    result = (await doQuery()) as SessionWithUser | null;
  } catch (err) {
    console.warn("[auth] session lookup failed (attempt 1):", (err as Error).message ?? err);
    // 402 quota errors are not transient — skip the retry immediately.
    if (isNeonQuotaError(err)) {
      console.error("[auth] Neon quota exceeded — skipping session retry");
      return null;
    }
    try {
      await sleep(400);
      result = (await doQuery()) as SessionWithUser | null;
      console.log("[auth] session lookup succeeded on retry");
    } catch (retryErr) {
      console.error("[auth] session lookup failed (attempt 2):", (retryErr as Error).message ?? retryErr);
      return null;
    }
  }

  if (!result?.user) return null;

  // Throttled idle-window roll: only update when < half the TTL remains.
  const remainingMs = result.expiresAt.getTime() - now.getTime();
  if (remainingMs < ROLL_THRESHOLD_MS) {
    const newExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);
    prisma.session
      .update({ where: { id: token }, data: { expiresAt: newExpiresAt } })
      .catch((e: unknown) => {
        console.warn("[auth] session roll failed (non-critical):", (e as Error).message ?? e);
      });
  }

  return result;
}

function extractUser(raw: RawUser) {
  if (raw.deletedAt || raw.isBlocked || raw.infringementBlocked || !raw.isActive) {
    return null;
  }
  const { isBlocked: _b, isActive: _a, deletedAt: _d, infringementBlocked: _i, ...user } = raw;
  return user;
}

// Cached per-request: layout + page both call getCurrentUser but only one DB hit occurs.
export const getCurrentUser = cache(async function _getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const result = await lookupSessionAndUser(sessionCookie.value);
  if (!result) return null;

  return extractUser(result.user);
});

export async function getCurrentUserAndSession(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  sessionToken: string;
} | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const result = await lookupSessionAndUser(sessionCookie.value);
  if (!result) return null;

  const user = extractUser(result.user);
  if (!user) return null;

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
