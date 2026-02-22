import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    ok: true,
    vercel: {
      env: process.env.VERCEL_ENV,
      sha: process.env.VERCEL_GIT_COMMIT_SHA,
      ref: process.env.VERCEL_GIT_COMMIT_REF,
      msg: process.env.VERCEL_GIT_COMMIT_MESSAGE,
    },
    nodeEnv: process.env.NODE_ENV,
    at: new Date().toISOString(),
  });
}
