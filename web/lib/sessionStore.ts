import { prisma } from "./db";

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

  const session = await prisma.session.findUnique({
    where: { id: token },
  });

  if (!session) return null;

  if (!session.token) {
    console.error(`Session ${session.id} has no token — deleting invalid session`);
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}
