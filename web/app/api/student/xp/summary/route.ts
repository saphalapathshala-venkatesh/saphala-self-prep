import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const xpGrouped = await prisma.xpLedgerEntry.groupBy({
    by: ["refType"],
    where: { userId: user.id },
    _sum: { delta: true },
  });

  const breakdown = { total: 0, testHub: 0, flashcards: 0, ebooks: 0, pathshala: 0 };
  for (const row of xpGrouped) {
    const d = row._sum.delta ?? 0;
    breakdown.total += d;
    if (row.refType === "Attempt")           breakdown.testHub    += d;
    else if (row.refType === "FlashcardDeck") breakdown.flashcards += d;
    else if (row.refType === "ContentPage")  breakdown.ebooks     += d;
    else if (row.refType === "Video")        breakdown.pathshala  += d;
  }

  return Response.json({ xpTotal: breakdown.total, xpBreakdown: breakdown });
}
