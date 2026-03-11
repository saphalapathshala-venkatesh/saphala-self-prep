import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ isAuthed: false });
  return Response.json({
    isAuthed: true,
    fullName: user.fullName ?? null,
    email: user.email ?? null,
  });
}
