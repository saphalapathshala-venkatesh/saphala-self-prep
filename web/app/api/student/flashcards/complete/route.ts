import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      alreadyAwarded: false,
      newTotal: totalXpAgg._sum.delta ?? 0,
    });
  }

  const existing = await prisma.xpLedgerEntry.findFirst({
    where: { userId: user.id, refType: "FlashcardDeck", refId: deckId },
  });

  if (existing) {
    const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
      where: { userId: user.id },
      _sum: { delta: true },
    });
    return Response.json({
      xpAwarded: 0,
      alreadyAwarded: true,
      newTotal: totalXpAgg._sum.delta ?? 0,
    });
  }

  await prisma.xpLedgerEntry.create({
    data: {
      userId: user.id,
      delta: deck.xpValue,
      reason: "Flashcard deck completion",
      refType: "FlashcardDeck",
      refId: deckId,
      meta: { deckTitle: deck.title, xpValue: deck.xpValue },
    },
  });

  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });

  return Response.json({
    xpAwarded: deck.xpValue,
    alreadyAwarded: false,
    newTotal: totalXpAgg._sum.delta ?? 0,
  });
}
