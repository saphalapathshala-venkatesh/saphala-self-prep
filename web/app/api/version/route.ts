import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    env: process.env.NODE_ENV ?? null,
  });
}
