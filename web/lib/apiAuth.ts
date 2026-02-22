import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./constants";
import { getSession } from "./sessionStore";
import { prisma } from "./db";
import type { UserRole } from "@prisma/client";

type AuthUser = { id: string; role: UserRole };
type AuthSuccess = { user: AuthUser; error?: undefined };
type AuthError = { error: NextResponse; user?: undefined };
type AuthResult = AuthSuccess | AuthError;

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const session = await getSession(sessionCookie.value);
  if (!session) {
    return { error: NextResponse.json({ error: "Session expired." }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: "User not found." }, { status: 401 }) };
  }

  return { user };
}

export async function requireRole(request: NextRequest, allowedRoles: UserRole[]): Promise<AuthResult> {
  const result = await requireAuth(request);
  if (result.error) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { user: result.user };
}
