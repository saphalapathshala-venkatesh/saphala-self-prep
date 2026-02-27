import { getAllPublishedTests } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const tests = await getAllPublishedTests();

  return Response.json({ tests });
}
