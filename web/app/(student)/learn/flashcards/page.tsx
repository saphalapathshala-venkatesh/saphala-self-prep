import { getPublishedDecks } from "@/lib/contentDb";
import Link from "next/link";
import { stripHtml } from "@/lib/sanitizeHtml";
import LearnPageShell from "@/components/learn/LearnPageShell";
import { PRODUCTS } from "@/config/terminology";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const decks = await getPublishedDecks();

  return (
    <LearnPageShell
      productLabel={PRODUCTS.contentLibrary}
      title={PRODUCTS.flashcards}
      description="Rapid-recall study cards. Pick a deck and flip through concepts at exam speed."
    >
      {decks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-gray-400 font-medium mb-1">No flashcard decks published yet</p>
          <p className="text-gray-400 text-sm">
            Flashcard decks are being prepared. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {decks.map((deck) => {
            const label =
              deck.breadcrumb.topic ??
              deck.breadcrumb.subject ??
              deck.breadcrumb.category ??
              null;

            return (
              <Link
                key={deck.id}
                href={`/learn/flashcards/${deck.id}`}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Thumbnail: subject color when set, default yellow gradient otherwise */}
                <div
                  className="h-24 flex items-center justify-center px-5"
                  style={
                    deck.subjectColor
                      ? { backgroundColor: deck.subjectColor }
                      : { background: "linear-gradient(to bottom right, #FFF8DC, #FFF3A3)" }
                  }
                >
                  <svg
                    className={`w-10 h-10 opacity-70 ${deck.subjectColor ? "text-white" : "text-yellow-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                  </svg>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  {label && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                      {label}
                    </span>
                  )}
                  <h3 className="font-bold text-[#2D1B69] text-sm leading-snug line-clamp-2 flex-1 group-hover:text-[#6D4BCB] transition-colors">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">{stripHtml(deck.description)}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">
                      {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-semibold text-[#6D4BCB] group-hover:underline">
                      Study →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </LearnPageShell>
  );
}
