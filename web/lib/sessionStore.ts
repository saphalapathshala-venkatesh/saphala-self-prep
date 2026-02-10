import { prisma } from "./db";
import { SESSION_TTL_MS } from "./constants";

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export async function createSession(userId: string): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}
