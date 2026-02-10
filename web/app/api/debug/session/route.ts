import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("saphala_session")?.value ?? null;

  if (!token) {
    return NextResponse.json({ token: null, sessionFound: false, reason: "No cookie" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: token },
    });

    if (!session) {
      return NextResponse.json({ token, sessionFound: false, reason: "No matching row in Session table" });
    }

    const expired = new Date() > session.expiresAt;

    return NextResponse.json({
      token,
      sessionFound: !expired,
      expired,
      sessionRow: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({
      token,
      sessionFound: false,
      reason: `DB error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
