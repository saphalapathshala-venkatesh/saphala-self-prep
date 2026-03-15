import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDeckById } from "@/lib/contentDb";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";
import FlashcardStudyClient from "@/components/learn/FlashcardStudyClient";

export const dynamic = "force-dynamic";

export default async function FlashcardStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, deck] = await Promise.all([getCurrentUser(), getDeckById(id)]);

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/learn/flashcards/${id}`)}`);
  }

  if (!deck) {
    notFound();
  }

  const breadcrumbParts = [
    deck.breadcrumb.category,
    deck.breadcrumb.subject,
    deck.breadcrumb.topic,
  ].filter(Boolean);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <section className="bg-white py-8 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <Link
            href="/learn/flashcards"
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
            All Decks
          </Link>

          {breadcrumbParts.length > 0 && (
            <p className="text-xs text-gray-400 mb-1">
              {breadcrumbParts.join(" › ")}
            </p>
          )}
          <h1 className="text-2xl font-bold text-[#2D1B69]">{deck.title}</h1>
          {deck.description && (
            <p className="text-gray-500 text-sm mt-1 max-w-xl">
              {deck.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <FlashcardStudyClient deckTitle={deck.title} cards={deck.cards} />

      <Footer />
    </main>
  );
}
