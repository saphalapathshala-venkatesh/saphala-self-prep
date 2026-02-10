import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "./constants";
import { getSession } from "./sessionStore";
import { prisma } from "./db";

export async function requireAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  const headerList = await headers();
  const pathname = headerList.get("x-next-url") || "/dashboard";

  if (!sessionCookie?.value) {
    redirect(`/login?from=${encodeURIComponent(pathname)}`);
  }

  const session = await getSession(sessionCookie.value);
  if (!session) {
    redirect(`/login?from=${encodeURIComponent(pathname)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, mobile: true, role: true },
  });

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(pathname)}`);
  }

  return user;
}
