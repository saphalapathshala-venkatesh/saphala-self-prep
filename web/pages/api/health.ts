import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      ok: true,
      db: "ok",
      env: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(500).json({
      ok: false,
      db: "error",
    });
  }
}
