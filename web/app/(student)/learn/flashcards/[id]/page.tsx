import { notFound } from "next/navigation";
import { getDeckById } from "@/lib/contentDb";
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
  const deck = await getDeckById(id);

  if (!deck) {
    notFound();
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
