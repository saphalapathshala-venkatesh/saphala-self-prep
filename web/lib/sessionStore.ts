import { prisma } from "./db";
import { IDLE_TIMEOUT_MS } from "./constants";

export interface Session {
  id: string;
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export async function createSession(token: string, userId: string, expiresAt: Date): Promise<Session> {
  if (!token) {
    throw new Error("Session token missing");
  }

  const session = await prisma.session.create({
    data: { id: token, token, userId, expiresAt },
  });
  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  if (!token) return null;

  const now = new Date();
  const newExpiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS);

  try {
    const session = await prisma.session.update({
      where: {
        id: token,
        expiresAt: { gt: now },
      },
      data: { expiresAt: newExpiresAt },
    });

    if (!session.token) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session;
  } catch {
    await prisma.session.deleteMany({
      where: { id: token, expiresAt: { lte: now } },
    }).catch(() => {});
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}
