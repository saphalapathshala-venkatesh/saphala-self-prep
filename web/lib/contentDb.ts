import { prisma } from "@/lib/db";
import { nowIST } from "@/lib/formatIST";

// ── Shared taxonomy helpers ───────────────────────────────────────────────────

async function buildTaxonomyMaps(
  categoryIds: string[],
  subjectIds: string[],
  topicIds: string[],
  subtopicIds: string[],
) {
  const [cats, subs, tops, subtops] = await Promise.all([
    categoryIds.length
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [],
    subjectIds.length
      ? prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [],
    topicIds.length
      ? prisma.topic.findMany({
          where: { id: { in: topicIds } },
          select: { id: true, name: true },
        })
      : [],
    subtopicIds.length
      ? prisma.subtopic.findMany({
          where: { id: { in: subtopicIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  return {
    catMap: new Map(cats.map((c) => [c.id, c.name])),
    subMap: new Map(subs.map((s) => [s.id, s.name])),
    topMap: new Map(tops.map((t) => [t.id, t.name])),
    subtopMap: new Map(subtops.map((s) => [s.id, s.name])),
  };
}

// ── ContentPage ────────────────────────────────────────────────────────────────

export interface LessonBreadcrumb {
  category: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
}

export interface PublishedLesson {
  id: string;
  title: string;
  publishedAt: Date | null;
  breadcrumb: LessonBreadcrumb;
}

export interface LessonDetail extends PublishedLesson {
  body: string;
  subjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
}

export async function getPublishedLessons(): Promise<PublishedLesson[]> {
  const now = nowIST();
  const pages = await prisma.contentPage.findMany({
    where: {
      isPublished: true,
      OR: [{ unlockAt: null }, { unlockAt: { lte: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      subtopic: {
        select: {
          name: true,
          topic: {
            select: {
              name: true,
              subject: {
                select: {
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    publishedAt: p.publishedAt,
    breadcrumb: {
      category: p.subtopic?.topic.subject.category.name ?? null,
      subject: p.subtopic?.topic.subject.name ?? null,
      topic: p.subtopic?.topic.name ?? null,
      subtopic: p.subtopic?.name ?? null,
    },
  }));
}

export async function getLessonById(id: string): Promise<LessonDetail | null> {
  const page = await prisma.contentPage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      xpEnabled: true,
      xpValue: true,
      isPublished: true,
      publishedAt: true,
      unlockAt: true,
      subtopic: {
        select: {
          name: true,
          topic: {
            select: {
              name: true,
              subject: {
                select: {
                  name: true,
                  subjectColor: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      // Fetch multi-chapter content (new ebook model)
      ebookPages: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          contentHtml: true,
          orderIndex: true,
        },
      },
    },
  });

  if (!page || !page.isPublished) return null;
  if (page.unlockAt && page.unlockAt > nowIST()) return null;

  // Build the body from EBookPage chapters if they exist;
  // fall back to the legacy ContentPage.body for older ebooks.
  let resolvedBody: string;
  if (page.ebookPages.length > 0) {
    // Concatenate chapters. Each chapter gets a heading (if it has a title)
    // followed by its HTML content.
    resolvedBody = page.ebookPages
      .map((chapter) => {
        const heading = chapter.title
          ? `<h2 class="ebook-chapter-heading">${chapter.title}</h2>`
          : "";
        return `${heading}${chapter.contentHtml}`;
      })
      .join("\n");
  } else {
    resolvedBody = page.body;
  }

  return {
    id: page.id,
    title: page.title,
    body: resolvedBody,
    publishedAt: page.publishedAt,
    xpEnabled: page.xpEnabled,
    xpValue: page.xpValue,
    subjectColor: page.subtopic?.topic.subject.subjectColor ?? null,
    breadcrumb: {
      category: page.subtopic?.topic.subject.category.name ?? null,
      subject: page.subtopic?.topic.subject.name ?? null,
      topic: page.subtopic?.topic.name ?? null,
      subtopic: page.subtopic?.name ?? null,
    },
  };
}

// ── PdfAsset ──────────────────────────────────────────────────────────────────

export interface PublishedPdf {
  id: string;
  title: string;
  fileUrl: string;
  fileSize: number | null;
  publishedAt: Date | null;
  breadcrumb: {
    category: string | null;
    subject: string | null;
    topic: string | null;
    subtopic: string | null;
  };
}

export async function getPublishedPdfs(): Promise<PublishedPdf[]> {
  const now = nowIST();
  const pdfs = await prisma.pdfAsset.findMany({
    where: {
      isPublished: true,
      OR: [{ unlockAt: null }, { unlockAt: { lte: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileSize: true,
      publishedAt: true,
      categoryId: true,
      subjectId: true,
      topicId: true,
      subtopicId: true,
    },
  });

  if (pdfs.length === 0) return [];

  const unique = <T>(arr: (T | null | undefined)[]) =>
    [...new Set(arr.filter((x): x is T => x != null))];

  const { catMap, subMap, topMap, subtopMap } = await buildTaxonomyMaps(
    unique(pdfs.map((p) => p.categoryId)),
    unique(pdfs.map((p) => p.subjectId)),
    unique(pdfs.map((p) => p.topicId)),
    unique(pdfs.map((p) => p.subtopicId)),
  );

  return pdfs.map((p) => ({
    id: p.id,
    title: p.title,
    fileUrl: p.fileUrl,
    fileSize: p.fileSize,
    publishedAt: p.publishedAt,
    breadcrumb: {
      category: p.categoryId ? (catMap.get(p.categoryId) ?? null) : null,
      subject: p.subjectId ? (subMap.get(p.subjectId) ?? null) : null,
      topic: p.topicId ? (topMap.get(p.topicId) ?? null) : null,
      subtopic: p.subtopicId ? (subtopMap.get(p.subtopicId) ?? null) : null,
    },
  }));
}

// ── FlashcardDeck ─────────────────────────────────────────────────────────────

export interface PublishedDeck {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cardCount: number;
  subjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  breadcrumb: {
    category: string | null;
    subject: string | null;
    topic: string | null;
  };
}

export interface FlashCard {
  id: string;
  cardType: string;
  front: string;
  back: string;
  imageUrl: string | null;
  content: unknown;
  order: number;
}

export interface DeckDetail extends PublishedDeck {
  cards: FlashCard[];
}

export async function getPublishedDecks(): Promise<PublishedDeck[]> {
  const now = nowIST();
  const decks = await prisma.flashcardDeck.findMany({
    where: {
      isPublished: true,
      OR: [{ unlockAt: null }, { unlockAt: { lte: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      subjectColor: true,
      xpEnabled: true,
      xpValue: true,
      categoryId: true,
      subjectId: true,
      topicId: true,
      _count: { select: { cards: true } },
    },
  });

  if (decks.length === 0) return [];

  const unique = <T>(arr: (T | null | undefined)[]) =>
    [...new Set(arr.filter((x): x is T => x != null))];

  const { catMap, subMap, topMap } = await buildTaxonomyMaps(
    unique(decks.map((d) => d.categoryId)),
    unique(decks.map((d) => d.subjectId)),
    unique(decks.map((d) => d.topicId)),
    [],
  );

  return decks.map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    description: d.description,
    cardCount: d._count.cards,
    subjectColor: d.subjectColor,
    xpEnabled: d.xpEnabled,
    xpValue: d.xpValue,
    breadcrumb: {
      category: d.categoryId ? (catMap.get(d.categoryId) ?? null) : null,
      subject: d.subjectId ? (subMap.get(d.subjectId) ?? null) : null,
      topic: d.topicId ? (topMap.get(d.topicId) ?? null) : null,
    },
  }));
}

export async function getDeckById(id: string): Promise<DeckDetail | null> {
  const deck = await prisma.flashcardDeck.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      isPublished: true,
      unlockAt: true,
      subjectColor: true,
      xpEnabled: true,
      xpValue: true,
      categoryId: true,
      subjectId: true,
      topicId: true,
      _count: { select: { cards: true } },
      cards: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          cardType: true,
          front: true,
          back: true,
          imageUrl: true,
          content: true,
          order: true,
        },
      },
    },
  });

  if (!deck || !deck.isPublished) return null;
  if (deck.unlockAt && deck.unlockAt > nowIST()) return null;

  const unique = <T>(arr: (T | null | undefined)[]) =>
    [...new Set(arr.filter((x): x is T => x != null))];

  const { catMap, subMap, topMap } = await buildTaxonomyMaps(
    unique([deck.categoryId]),
    unique([deck.subjectId]),
    unique([deck.topicId]),
    [],
  );

  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.subtitle,
    description: deck.description,
    cardCount: deck._count.cards,
    subjectColor: deck.subjectColor,
    xpEnabled: deck.xpEnabled,
    xpValue: deck.xpValue,
    breadcrumb: {
      category: deck.categoryId ? (catMap.get(deck.categoryId) ?? null) : null,
      subject: deck.subjectId ? (subMap.get(deck.subjectId) ?? null) : null,
      topic: deck.topicId ? (topMap.get(deck.topicId) ?? null) : null,
    },
    cards: deck.cards,
  };
}
