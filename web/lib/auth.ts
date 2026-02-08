import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";
import { getSession, createSession, deleteSession } from "./sessionStore";
import { prisma } from "./db";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const session = getSession(sessionCookie.value);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, mobile: true, role: true, createdAt: true },
  });

  return user;
}

export function createSessionCookie(userId: string) {
  const session = createSession(userId);
  return {
    name: SESSION_COOKIE_NAME,
    value: session.id,
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
  const cookie = createSessionCookie(userId);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);
  return cookie.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    deleteSession(sessionCookie.value);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
