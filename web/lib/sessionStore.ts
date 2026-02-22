import { prisma } from "./db";

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export async function createSession(token: string, userId: string, expiresAt: Date): Promise<Session> {
  const session = await prisma.session.create({
    data: { id: token, token, userId, expiresAt },
  });
  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { id: token },
  });

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}
