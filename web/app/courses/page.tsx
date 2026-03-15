import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center col-span-full">
      <p className="text-sm text-gray-400">{label} coming soon.</p>
    </div>
  );
}

export default async function CoursesPage() {
  const [testSeries, pdfAssets, flashcardDecks, contentPages, categories] =
    await Promise.all([
      prisma.testSeries.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          pricePaise: true,
          discountPaise: true,
          categoryId: true,
        },
      }),
      prisma.pdfAsset.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          fileSize: true,
          categoryId: true,
        },
      }),
      prisma.flashcardDeck.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          categoryId: true,
          _count: { select: { cards: true } },
        },
      }),
      prisma.contentPage.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
        },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const totalItems =
    testSeries.length +
    pdfAssets.length +
    flashcardDecks.length +
    contentPages.length;

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-gray-50 py-12 flex-grow">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-1">
              Course Catalog
            </h1>
            <p className="text-gray-500 text-sm">
              All published test series, ebooks, flashcard decks, and PDFs.
            </p>
          </div>

          {totalItems === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
              <p className="text-gray-400 text-base font-medium mb-1">
                No content published yet
              </p>
              <p className="text-gray-400 text-sm">
                New courses and study materials are being added. Check back
                soon.
              </p>
            </div>
          )}

          {/* ── Test Series ──────────────────────────────────────────── */}
          {(testSeries.length > 0 || totalItems === 0) && totalItems > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#2D1B69] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#6D4BCB] inline-block" />
                Test Series
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {testSeries.length === 0 ? (
                  <SectionEmpty label="Test Series" />
                ) : (
                  testSeries.map((s) => {
                    const cat = s.categoryId
                      ? (catMap.get(s.categoryId) ?? null)
                      : null;
                    const isFree = s.pricePaise === 0;
                    const originalPrice =
                      s.discountPaise > 0
                        ? s.pricePaise + s.discountPaise
                        : undefined;

                    return (
                      <div
                        key={s.id}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                      >
                        <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] h-24 flex items-center justify-center px-4">
                          <h3 className="text-white font-semibold text-sm text-center leading-snug line-clamp-2">
                            {s.title}
                          </h3>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          {cat && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                              {cat}
                            </span>
                          )}
                          {s.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
                              {s.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-auto">
                            <div>
                              <span className="font-bold text-[#2D1B69]">
                                {isFree ? "Free" : formatPrice(s.pricePaise)}
                              </span>
                              {originalPrice !== undefined && (
                                <span className="text-xs text-gray-400 line-through ml-1.5">
                                  {formatPrice(originalPrice)}
                                </span>
                              )}
                            </div>
                            <Link
                              href="/testhub"
                              className="text-xs font-semibold bg-[#6D4BCB] text-white px-3 py-1.5 rounded-full hover:bg-[#5E3FB8] transition-colors"
                            >
                              {isFree ? "Start Free" : "View Tests"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── PDFs ──────────────────────────────────────────────────── */}
          {pdfAssets.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#2D1B69] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-red-400 inline-block" />
                PDFs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {pdfAssets.map((pdf) => {
                  const cat = pdf.categoryId
                    ? (catMap.get(pdf.categoryId) ?? null)
                    : null;
                  const sizeLabel =
                    pdf.fileSize != null
                      ? pdf.fileSize > 1024 * 1024
                        ? `${(pdf.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(pdf.fileSize / 1024)} KB`
                      : null;

                  return (
                    <Link
                      key={pdf.id}
                      href="/learn/pdfs"
                      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <svg
                            className="w-5 h-5 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          {cat && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                              {cat}
                            </span>
                          )}
                          <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2">
                            {pdf.title}
                          </h3>
                          {sizeLabel && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {sizeLabel}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="mt-auto text-xs font-semibold text-[#6D4BCB] group-hover:underline">
                        View Materials →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Flashcard Decks ───────────────────────────────────────── */}
          {flashcardDecks.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#2D1B69] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-yellow-400 inline-block" />
                Flashcard Decks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {flashcardDecks.map((deck) => {
                  const cat = deck.categoryId
                    ? (catMap.get(deck.categoryId) ?? null)
                    : null;

                  return (
                    <Link
                      key={deck.id}
                      href={`/learn/flashcards/${deck.id}`}
                      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                          <svg
                            className="w-5 h-5 text-yellow-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          {cat && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                              {cat}
                            </span>
                          )}
                          <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2">
                            {deck.title}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {deck._count.cards} cards
                          </p>
                        </div>
                      </div>
                      {deck.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {deck.description}
                        </p>
                      )}
                      <span className="mt-auto text-xs font-semibold text-[#6D4BCB] group-hover:underline">
                        Study Deck →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ebooks ─────────────────────────────────────────────────── */}
          {contentPages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#2D1B69] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-green-400 inline-block" />
                Ebooks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {contentPages.map((cp) => (
                  <Link
                    key={cp.id}
                    href={`/learn/lessons/${cp.id}`}
                    className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2 group-hover:text-[#6D4BCB] transition-colors">
                        {cp.title}
                      </h3>
                      <span className="text-xs font-semibold text-[#6D4BCB] group-hover:underline">
                        Read →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
