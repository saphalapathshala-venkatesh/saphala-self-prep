import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";
import { getSession, createSession, deleteSession } from "./sessionStore";
import { findUserById, type User } from "./userStore";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }

  const session = getSession(sessionCookie.value);
  if (!session) {
    return null;
  }

  return findUserById(session.userId);
}

export async function setSessionCookie(userId: string): Promise<string> {
  const session = createSession(userId);
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  return session.id;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (sessionCookie?.value) {
    deleteSession(sessionCookie.value);
  }
  
  cookieStore.delete(SESSION_COOKIE_NAME);
}
