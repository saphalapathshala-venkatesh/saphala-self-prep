import { prisma } from "@/lib/db";

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
}

export async function getPublishedLessons(): Promise<PublishedLesson[]> {
  const now = new Date();
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
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!page || !page.isPublished) return null;
  if (page.unlockAt && page.unlockAt > new Date()) return null;

  return {
    id: page.id,
    title: page.title,
    body: page.body,
    publishedAt: page.publishedAt,
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
  const now = new Date();
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
  description: string | null;
  cardCount: number;
  breadcrumb: {
    category: string | null;
    subject: string | null;
    topic: string | null;
  };
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  imageUrl: string | null;
  order: number;
}

export interface DeckDetail extends PublishedDeck {
  cards: FlashCard[];
}

export async function getPublishedDecks(): Promise<PublishedDeck[]> {
  const now = new Date();
  const decks = await prisma.flashcardDeck.findMany({
    where: {
      isPublished: true,
      OR: [{ unlockAt: null }, { unlockAt: { lte: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
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
    description: d.description,
    cardCount: d._count.cards,
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
      description: true,
      isPublished: true,
      unlockAt: true,
      categoryId: true,
      subjectId: true,
      topicId: true,
      _count: { select: { cards: true } },
      cards: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          front: true,
          back: true,
          imageUrl: true,
          order: true,
        },
      },
    },
  });

  if (!deck || !deck.isPublished) return null;
  if (deck.unlockAt && deck.unlockAt > new Date()) return null;

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
    description: deck.description,
    cardCount: deck._count.cards,
    breadcrumb: {
      category: deck.categoryId ? (catMap.get(deck.categoryId) ?? null) : null,
      subject: deck.subjectId ? (subMap.get(deck.subjectId) ?? null) : null,
      topic: deck.topicId ? (topMap.get(deck.topicId) ?? null) : null,
    },
    cards: deck.cards,
  };
}
