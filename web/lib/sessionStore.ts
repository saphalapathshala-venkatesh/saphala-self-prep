import { prisma } from "./db";
import { IDLE_TIMEOUT_MS } from "./constants";

export interface Session {
  id: string;
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function createSession(token: string, userId: string, expiresAt: Date): Promise<Session> {
  if (!token) {
    throw new Error("Session token missing");
  }

  const session = await prisma.session.create({
    data: { id: token, token, userId, expiresAt, type: "STUDENT" },
  });
  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  if (!token) return null;

  const now = new Date();

  // Step 1: find the session — use findFirst (unambiguous across all Prisma versions)
  let existing: Session | null = null;
  try {
    existing = await prisma.session.findFirst({
      where: {
        id: token,
        expiresAt: { gt: now },
        revokedAt: null,
      },
    });
  } catch (err) {
    // Transient DB error — retry once before giving up
    console.warn("[getSession] findFirst failed (attempt 1):", (err as Error).message ?? err);
    try {
      await sleep(400);
      existing = await prisma.session.findFirst({
        where: {
          id: token,
          expiresAt: { gt: now },
          revokedAt: null,
        },
      });
      console.log("[getSession] findFirst succeeded on retry");
    } catch (retryErr) {
      console.error("[getSession] findFirst failed (attempt 2):", (retryErr as Error).message ?? retryErr);
      // Do NOT return null here immediately — cookie is valid, DB is flaky
      // Returning null would log the user out. Better to let the request through
      // than to silently log out a valid user. Only return null if both retries fail.
      return null;
    }
  }

  if (!existing) {
    // Session not found / expired / revoked — clean up if there's an expired record
    prisma.session.deleteMany({
      where: { id: token, expiresAt: { lte: now } },
    }).catch(() => {});
    return null;
  }

  // Step 2: roll the idle window fire-and-forget (non-blocking — don't await this)
  const newExpiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS);
  prisma.session.update({
    where: { id: token },
    data: { expiresAt: newExpiresAt },
  }).catch((rollErr: unknown) => {
    console.warn("[getSession] expiresAt roll failed (non-critical):", (rollErr as Error).message ?? rollErr);
  });

  return existing;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}
