import { notFound, redirect } from "next/navigation";
import { getDeckById, canUserAccessDeck } from "@/lib/contentDb";
import { getCurrentUser } from "@/lib/auth";
import { ROUTES, PRODUCTS } from "@/config/terminology";
import Link from "next/link";
import FlashcardStudyClient from "@/components/learn/FlashcardStudyClient";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";

export const dynamic = "force-dynamic";

export default async function FlashcardStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [user, deck] = await Promise.all([getCurrentUser(), getDeckById(id)]);

  if (!user) redirect(`/login?from=/learn/flashcards/${id}`);
  if (!deck) notFound();

  const canAccess = await canUserAccessDeck(user.id, deck);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#2D1B69] mb-2">{deck.title}</h1>
          <p className="text-sm text-gray-500 mb-6">
            This flashcard deck is part of a paid course. Purchase the course to get full access to this study material.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6D4BCB] text-white text-sm font-semibold rounded-xl hover:bg-[#5C3DB5] transition-colors"
            >
              Browse Courses
            </Link>
            <Link
              href={ROUTES.flashcards}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back to {PRODUCTS.flashcards}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ctx = parseCourseContext(sp);
  const backHref = ctx ? courseReturnUrl(ctx) : ROUTES.flashcards;
  const backLabel = ctx ? "← Back to Course" : `All ${PRODUCTS.flashcards}`;

  const breadcrumbParts = [
    deck.breadcrumb.category,
    deck.breadcrumb.subject,
    deck.breadcrumb.topic,
  ].filter(Boolean);

  return (
    <div>
      {/* Deck header */}
      <div className="bg-white py-8 border-b border-gray-100 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6D4BCB] mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {backLabel}
          </Link>

          {breadcrumbParts.length > 0 && (
            <p className="text-xs text-gray-400 mb-1">
              {breadcrumbParts.join(" › ")}
            </p>
          )}
          <h1 className="text-2xl font-bold text-[#2D1B69]">{deck.title}</h1>
          {deck.description && (
            <div
              className="text-gray-500 text-sm mt-1 max-w-xl rich-html overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: deck.description }}
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <FlashcardStudyClient
        deckId={deck.id}
        deckTitle={deck.title}
        deckSubtitle={deck.subtitle}
        subject={deck.breadcrumb.subject}
        xpEnabled={deck.xpEnabled}
        xpValue={deck.xpValue}
        cards={deck.cards}
        subjectColor={deck.subjectColor}
        backHref={backHref}
        backLabel={backLabel}
      />
    </div>
  );
}
