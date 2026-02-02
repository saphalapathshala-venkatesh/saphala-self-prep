import { SESSION_TTL_MS } from "./constants";

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessions = new Map<string, Session>();

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function createSession(userId: string): Session {
  const id = generateSessionId();
  const now = new Date();
  const session: Session = {
    id,
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
