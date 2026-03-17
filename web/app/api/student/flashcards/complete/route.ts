import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// XP policy (matches TestHub policy):
//   1st completion → 100% of xpValue
//   2nd completion → 50% of xpValue
//   3rd+ completion → 0 XP
function computeMultiplier(completionNumber: number): number {
  if (completionNumber === 1) return 1.0;
  if (completionNumber === 2) return 0.5;
  return 0;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { deckId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { deckId } = body;
  if (!deckId || typeof deckId !== "string") {
    return Response.json({ error: "deckId is required" }, { status: 400 });
  }

  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, isPublished: true },
    select: { id: true, xpEnabled: true, xpValue: true, title: true },
  });

  if (!deck) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  if (!deck.xpEnabled || deck.xpValue <= 0) {
    const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
      where: { userId: user.id },
      _sum: { delta: true },
    });
    return Response.json({
      xpAwarded: 0,
      completionNumber: 0,
      xpMultiplier: 0,
      newTotal: totalXpAgg._sum.delta ?? 0,
    });
  }

  // Count how many times this user has already completed this deck
  const priorCompletions = await prisma.xpLedgerEntry.count({
    where: { userId: user.id, refType: "FlashcardDeck", refId: deckId },
  });

  const completionNumber = priorCompletions + 1;
  const xpMultiplier = computeMultiplier(completionNumber);
  const xpEarned = Math.round(deck.xpValue * xpMultiplier);

  if (xpEarned > 0) {
    await prisma.xpLedgerEntry.create({
      data: {
        userId: user.id,
        delta: xpEarned,
        reason: "Flashcard deck completion",
        refType: "FlashcardDeck",
        refId: deckId,
        meta: {
          deckTitle: deck.title,
          baseXp: deck.xpValue,
          xpMultiplier,
          completionNumber,
        },
      },
    });
  }

  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });

  return Response.json({
    xpAwarded: xpEarned,
    completionNumber,
    xpMultiplier,
    newTotal: totalXpAgg._sum.delta ?? 0,
  });
}
