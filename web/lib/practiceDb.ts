import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PracticeItemType = "test" | "flashcard" | "ebook";
export type PracticeReasonKind = "new" | "retry" | "revise";

export interface PracticeSuggestion {
  type: PracticeItemType;
  id: string;
  title: string;
  href: string;
  cta: string;
  reason: string;
  reasonKind: PracticeReasonKind;
  meta?: string; // e.g. "25 cards" or "10 questions"
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

type RawTest = { id: string; title: string; totalQuestions: number | null };
type RawAttempt = { testId: string; correct: number; wrong: number; unanswered: number };
type RawDeck = { id: string; title: string; cardCount: number };
type RawEbook = { id: string; title: string };

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Build 1–3 personalised practice suggestions for today.
 *
 * Priority:
 *   Test      → unattempted first; else lowest-scoring attempt; else any published test
 *   Flashcard → unseen deck first; else any published deck
 *   Ebook     → unread page first; else any published content page
 *
 * At least 1 item is always returned (guaranteed fallback on each type).
 */
export async function getDailyPractice(userId: string): Promise<PracticeSuggestion[]> {
  const safeId = userId.replace(/'/g, "''");
  const results: PracticeSuggestion[] = [];

  // ── 1. Test suggestion ───────────────────────────────────────────────────

  try {
    // 1a. Unattempted published, unlocked free tests
    const unattemptedTests = await prisma.$queryRawUnsafe<RawTest[]>(`
      SELECT t.id, t.title, t."totalQuestions"
      FROM "Test" t
      JOIN "TestSeries" ts ON ts.id = t."seriesId"
      WHERE t."isPublished" = true
        AND ts."isPublished" = true
        AND (t."unlockAt" IS NULL OR t."unlockAt" <= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM "Attempt" a
          WHERE a."testId" = t.id AND a."userId" = '${safeId}' AND a.status = 'SUBMITTED'
        )
      ORDER BY t."createdAt" DESC
      LIMIT 1
    `);

    if (unattemptedTests.length) {
      const t = unattemptedTests[0];
      results.push({
        type: "test",
        id: t.id,
        title: t.title,
        href: `/testhub/tests/${t.id}/brief`,
        cta: "Start Test",
        reason: "Not started yet",
        reasonKind: "new",
        meta: t.totalQuestions ? `${t.totalQuestions} questions` : undefined,
      });
    } else {
      // 1b. Lowest-scoring attempt (< 60% accuracy) — suggest a retry
      const lowScoreAttempts = await prisma.$queryRawUnsafe<(RawAttempt & RawTest)[]>(`
        SELECT DISTINCT ON (a."testId")
          a."testId" AS "testId",
          t.title,
          t."totalQuestions",
          a."correctCount" AS correct,
          a."wrongCount" AS wrong,
          a."unansweredCount" AS unanswered
        FROM "Attempt" a
        JOIN "Test" t ON t.id = a."testId"
        JOIN "TestSeries" ts ON ts.id = t."seriesId"
        WHERE a."userId" = '${safeId}'
          AND a.status = 'SUBMITTED'
          AND t."isPublished" = true
          AND ts."isPublished" = true
          AND (t."unlockAt" IS NULL OR t."unlockAt" <= NOW())
        ORDER BY a."testId", a."correctCount"::float /
          NULLIF(a."correctCount" + a."wrongCount" + a."unansweredCount", 0) ASC
        LIMIT 1
      `);

      if (lowScoreAttempts.length) {
        const row = lowScoreAttempts[0];
        const total = (row.correct ?? 0) + (row.wrong ?? 0) + (row.unanswered ?? 0);
        const pct = total > 0 ? Math.round(((row.correct ?? 0) / total) * 100) : 0;
        const needsRetry = pct < 60;

        results.push({
          type: "test",
          id: row.testId,
          title: row.title,
          href: `/testhub/tests/${row.testId}/brief`,
          cta: "Retry Test",
          reason: needsRetry ? `You scored ${pct}% — improve it` : `Scored ${pct}% — practise more`,
          reasonKind: "retry",
          meta: row.totalQuestions ? `${row.totalQuestions} questions` : undefined,
        });
      } else {
        // 1c. Absolute fallback — any published test
        const anyTest = await prisma.$queryRawUnsafe<RawTest[]>(`
          SELECT t.id, t.title, t."totalQuestions"
          FROM "Test" t
          JOIN "TestSeries" ts ON ts.id = t."seriesId"
          WHERE t."isPublished" = true AND ts."isPublished" = true
            AND (t."unlockAt" IS NULL OR t."unlockAt" <= NOW())
          ORDER BY t."createdAt" DESC LIMIT 1
        `);
        if (anyTest.length) {
          const t = anyTest[0];
          results.push({
            type: "test",
            id: t.id,
            title: t.title,
            href: `/testhub/tests/${t.id}/brief`,
            cta: "Start Test",
            reason: "Great for exam practice",
            reasonKind: "new",
            meta: t.totalQuestions ? `${t.totalQuestions} questions` : undefined,
          });
        }
      }
    }
  } catch {
    // non-fatal — skip test suggestion
  }

  // ── 2. Flashcard suggestion ──────────────────────────────────────────────

  try {
    // 2a. Unseen deck (no XP earned for it yet)
    const unseenDecks = await prisma.$queryRawUnsafe<RawDeck[]>(`
      SELECT fd.id, fd.title,
        (SELECT COUNT(*) FROM "FlashcardCard" fc WHERE fc."deckId" = fd.id)::int AS "cardCount"
      FROM "FlashcardDeck" fd
      WHERE fd."isPublished" = true
        AND (fd."unlockAt" IS NULL OR fd."unlockAt" <= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM "XpLedgerEntry" x
          WHERE x."userId" = '${safeId}'
            AND x."refType" = 'FlashcardDeck'
            AND x."refId" = fd.id
        )
      ORDER BY fd."createdAt" DESC
      LIMIT 1
    `);

    if (unseenDecks.length) {
      const d = unseenDecks[0];
      results.push({
        type: "flashcard",
        id: d.id,
        title: d.title,
        href: `/learn/flashcards/${d.id}`,
        cta: "Study Cards",
        reason: "Not studied yet",
        reasonKind: "new",
        meta: d.cardCount ? `${d.cardCount} cards` : undefined,
      });
    } else {
      // 2b. Fallback — any published deck (good for revision)
      const anyDeck = await prisma.$queryRawUnsafe<RawDeck[]>(`
        SELECT fd.id, fd.title,
          (SELECT COUNT(*) FROM "FlashcardCard" fc WHERE fc."deckId" = fd.id)::int AS "cardCount"
        FROM "FlashcardDeck" fd
        WHERE fd."isPublished" = true
          AND (fd."unlockAt" IS NULL OR fd."unlockAt" <= NOW())
        ORDER BY fd."createdAt" DESC LIMIT 1
      `);
      if (anyDeck.length) {
        const d = anyDeck[0];
        results.push({
          type: "flashcard",
          id: d.id,
          title: d.title,
          href: `/learn/flashcards/${d.id}`,
          cta: "Revise Cards",
          reason: "Good for quick revision",
          reasonKind: "revise",
          meta: d.cardCount ? `${d.cardCount} cards` : undefined,
        });
      }
    }
  } catch {
    // non-fatal
  }

  // ── 3. Ebook suggestion ──────────────────────────────────────────────────

  try {
    // 3a. Unread page
    const unreadPages = await prisma.$queryRawUnsafe<RawEbook[]>(`
      SELECT cp.id, cp.title
      FROM "ContentPage" cp
      WHERE cp."isPublished" = true
        AND (cp."unlockAt" IS NULL OR cp."unlockAt" <= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM "XpLedgerEntry" x
          WHERE x."userId" = '${safeId}'
            AND x."refType" = 'ContentPage'
            AND x."refId" = cp.id
        )
      ORDER BY cp."createdAt" DESC
      LIMIT 1
    `);

    if (unreadPages.length) {
      results.push({
        type: "ebook",
        id: unreadPages[0].id,
        title: unreadPages[0].title,
        href: `/learn/lessons/${unreadPages[0].id}`,
        cta: "Read Now",
        reason: "Not read yet",
        reasonKind: "new",
      });
    } else {
      // 3b. Fallback — any ebook for re-reading
      const anyEbook = await prisma.$queryRawUnsafe<RawEbook[]>(`
        SELECT cp.id, cp.title
        FROM "ContentPage" cp
        WHERE cp."isPublished" = true
          AND (cp."unlockAt" IS NULL OR cp."unlockAt" <= NOW())
        ORDER BY cp."createdAt" DESC LIMIT 1
      `);
      if (anyEbook.length) {
        results.push({
          type: "ebook",
          id: anyEbook[0].id,
          title: anyEbook[0].title,
          href: `/learn/lessons/${anyEbook[0].id}`,
          cta: "Re-read",
          reason: "Strengthen your understanding",
          reasonKind: "revise",
        });
      }
    }
  } catch {
    // non-fatal
  }

  // ── Final guarantee: if everything failed, return a hard-coded nudge ──────
  // (Should never happen in practice, but protects against empty state.)
  if (results.length === 0) {
    results.push({
      type: "test",
      id: "",
      title: "Try a practice test",
      href: "/testhub",
      cta: "Browse Tests",
      reason: "Start building exam confidence",
      reasonKind: "new",
    });
  }

  // Cap at 3
  return results.slice(0, 3);
}
