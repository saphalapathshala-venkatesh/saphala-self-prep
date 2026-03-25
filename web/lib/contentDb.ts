import { prisma } from "@/lib/db";
import { subjectColorFromName } from "@/lib/subjectColor";

function subjectColorFallback(subjectName: string | null | undefined): string | null {
  return subjectColorFromName(subjectName);
}

// ── EBook block-to-HTML converter ─────────────────────────────────────────────
// Converts contentBlocks JSON (admin block editor format) to HTML for rendering.
// Block types: paragraph, box, table. Children inside box are rendered recursively.

type Block = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

function renderBlock(block: Block): string {
  switch (block.type) {
    case "paragraph": {
      const html = (block.props.html as string) ?? "";
      const align = (block.props.align as string) ?? "left";
      if (!html) return "";
      if (align && align !== "left") {
        return `<div style="text-align:${align}">${html}</div>`;
      }
      return html;
    }
    case "box": {
      const title = (block.props.title as string) ?? "";
      const accent = (block.props.accent as string) ?? "#e5e7eb";
      const bodyBg = (block.props.bodyBg as string) ?? "#f9fafb";
      const headerBg = (block.props.headerBg as string) ?? accent;
      const children = (block.props.children as Block[]) ?? [];
      const inner = children.map(renderBlock).join("\n");
      return `<div style="border-radius:10px;overflow:hidden;margin:1em 0;border:1.5px solid ${accent}">` +
        `<div style="background:${headerBg};padding:7px 14px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#1e1b4b">${title}</div>` +
        `<div style="background:${bodyBg};padding:12px 16px">${inner}</div>` +
        `</div>`;
    }
    case "table": {
      const headers = (block.props.headers as string[]) ?? [];
      const rows = (block.props.rows as string[][]) ?? [];
      const caption = (block.props.caption as string) ?? "";
      const width = (block.props.width as string) ?? "full";
      const tableStyle = `width:${width === "full" ? "100%" : "auto"};border-collapse:collapse;margin:1em 0;font-size:0.85rem`;
      const cellStyle = `border:1px solid #e5e7eb;padding:7px 10px;vertical-align:top`;
      const thStyle = `${cellStyle};background:#f3f4f6;font-weight:700`;
      let html = `<div style="overflow-x:auto"><table style="${tableStyle}">`;
      if (caption) html += `<caption style="caption-side:bottom;font-size:0.75rem;color:#6b7280;padding-top:4px">${caption}</caption>`;
      if (headers.length) {
        html += `<thead><tr>${headers.map((h) => `<th style="${thStyle}">${h}</th>`).join("")}</tr></thead>`;
      }
      if (rows.length) {
        html += `<tbody>${rows.map((row) =>
          `<tr>${row.map((cell) => `<td style="${cellStyle}">${cell}</td>`).join("")}</tr>`
        ).join("")}</tbody>`;
      }
      html += `</table></div>`;
      return html;
    }
    default:
      return "";
  }
}

function blocksToHtml(contentBlocks: unknown): string {
  if (!contentBlocks || typeof contentBlocks !== "object") return "";
  const doc = contentBlocks as { v?: number; blocks?: Block[] };
  if (!Array.isArray(doc.blocks)) return "";
  return doc.blocks.map(renderBlock).join("\n");
}

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

// ── Batch subject color resolver ──────────────────────────────────────────────
//
// Subject.subjectColor does not exist in the DB schema.
// Instead we proxy via FlashcardDeck.subjectColor (admin-set per subject).
// For listing pages we batch this to a single extra query.

async function batchSubjectColors(
  subjectIds: string[],
  subjectNameMap: Map<string, string>,
): Promise<Map<string, string | null>> {
  if (subjectIds.length === 0) return new Map();

  const decks = await prisma.flashcardDeck.findMany({
    where: { subjectId: { in: subjectIds }, NOT: { subjectColor: null } },
    select: { subjectId: true, subjectColor: true },
  });

  // Keep only the first hit per subjectId.
  const deckColorMap = new Map<string, string>();
  for (const d of decks) {
    if (d.subjectId && d.subjectColor && !deckColorMap.has(d.subjectId)) {
      deckColorMap.set(d.subjectId, d.subjectColor);
    }
  }

  const result = new Map<string, string | null>();
  for (const id of subjectIds) {
    const name = subjectNameMap.get(id) ?? null;
    result.set(id, deckColorMap.get(id) ?? subjectColorFallback(name) ?? null);
  }
  return result;
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
  subjectColor: string | null;
  breadcrumb: LessonBreadcrumb;
}

export interface EbookChapter {
  id: string;
  title: string | null;
  contentHtml: string;
}

export interface LessonDetail extends PublishedLesson {
  body: string;
  subjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  chapters: EbookChapter[];
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
                  id: true,
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

  // Batch-resolve subject colors using FlashcardDeck as proxy.
  const uniqueSubjectIds = [...new Set(
    pages
      .map((p) => p.subtopic?.topic.subject.id)
      .filter((id): id is string => id != null),
  )];
  const subjectNameMap = new Map(
    pages
      .map((p) => p.subtopic?.topic.subject)
      .filter((s): s is { id: string; name: string; category: { name: string } } => s != null)
      .map((s) => [s.id, s.name] as [string, string]),
  );
  const colorMap = await batchSubjectColors(uniqueSubjectIds, subjectNameMap);

  return pages.map((p) => {
    const subjectId = p.subtopic?.topic.subject.id ?? null;
    return {
      id: p.id,
      title: p.title,
      publishedAt: p.publishedAt,
      subjectColor: subjectId ? (colorMap.get(subjectId) ?? null) : null,
      breadcrumb: {
        category: p.subtopic?.topic.subject.category.name ?? null,
        subject: p.subtopic?.topic.subject.name ?? null,
        topic: p.subtopic?.topic.name ?? null,
        subtopic: p.subtopic?.name ?? null,
      },
    };
  });
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
                  id: true,
                  name: true,
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
          contentBlocks: true,
          orderIndex: true,
        },
      },
    },
  });

  if (!page || !page.isPublished) return null;
  if (page.unlockAt && page.unlockAt > new Date()) return null;

  // Look up subject-specific color.
  // Priority: FlashcardDeck.subjectColor (admin-set) → SUBJECT_COLOR_MAP fallback.
  const subjectId = page.subtopic?.topic.subject.id ?? null;
  const subjectName = page.subtopic?.topic.subject.name ?? null;
  let subjectColor: string | null = null;
  if (subjectId) {
    const colorDeck = await prisma.flashcardDeck.findFirst({
      where: { subjectId, NOT: { subjectColor: null } },
      select: { subjectColor: true },
    });
    subjectColor = colorDeck?.subjectColor ?? subjectColorFallback(subjectName);
  }

  // Helper: resolve the display HTML for an EBookPage.
  // Priority: contentHtml (if non-empty) → blocksToHtml(contentBlocks) → ""
  function resolvePageHtml(ep: { contentHtml: string; contentBlocks: unknown }): string {
    if (ep.contentHtml && ep.contentHtml.trim()) return ep.contentHtml;
    return blocksToHtml(ep.contentBlocks);
  }

  // Build the body from EBookPage chapters if they exist;
  // fall back to the legacy ContentPage.body for older ebooks.
  let resolvedBody: string;
  if (page.ebookPages.length > 0) {
    resolvedBody = page.ebookPages
      .map((chapter) => {
        const heading = chapter.title
          ? `<h2 class="ebook-chapter-heading">${chapter.title}</h2>`
          : "";
        return `${heading}${resolvePageHtml(chapter)}`;
      })
      .join("\n");
  } else {
    resolvedBody = page.body;
  }

  // Build the chapters array for the paginated reader.
  // If the ebook uses multi-chapter EBookPage rows, each is a chapter.
  // Otherwise, the legacy body becomes a single unnamed chapter.
  const chapters: EbookChapter[] =
    page.ebookPages.length > 0
      ? page.ebookPages.map((ep) => ({
          id: ep.id,
          title: ep.title ?? null,
          contentHtml: resolvePageHtml(ep),
        }))
      : [{ id: page.id, title: null, contentHtml: page.body }];

  return {
    id: page.id,
    title: page.title,
    body: resolvedBody,
    publishedAt: page.publishedAt,
    xpEnabled: page.xpEnabled,
    xpValue: page.xpValue,
    subjectColor,
    chapters,
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
  subjectColor: string | null;
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

  // Batch-resolve subject colors using FlashcardDeck as proxy.
  const pdfSubjectIds = unique(pdfs.map((p) => p.subjectId));
  const colorMap = await batchSubjectColors(pdfSubjectIds, subMap);

  return pdfs.map((p) => ({
    id: p.id,
    title: p.title,
    fileUrl: p.fileUrl,
    fileSize: p.fileSize,
    publishedAt: p.publishedAt,
    subjectColor: p.subjectId ? (colorMap.get(p.subjectId) ?? null) : null,
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

  return decks.map((d) => {
    const subjectName = d.subjectId ? (subMap.get(d.subjectId) ?? null) : null;
    return {
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      description: d.description,
      cardCount: d._count.cards,
      subjectColor: d.subjectColor ?? subjectColorFallback(subjectName),
      xpEnabled: d.xpEnabled,
      xpValue: d.xpValue,
      breadcrumb: {
        category: d.categoryId ? (catMap.get(d.categoryId) ?? null) : null,
        subject: subjectName,
        topic: d.topicId ? (topMap.get(d.topicId) ?? null) : null,
      },
    };
  });
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
  if (deck.unlockAt && deck.unlockAt > new Date()) return null;

  const unique = <T>(arr: (T | null | undefined)[]) =>
    [...new Set(arr.filter((x): x is T => x != null))];

  const { catMap, subMap, topMap } = await buildTaxonomyMaps(
    unique([deck.categoryId]),
    unique([deck.subjectId]),
    unique([deck.topicId]),
    [],
  );

  const subjectName = deck.subjectId ? (subMap.get(deck.subjectId) ?? null) : null;

  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.subtitle,
    description: deck.description,
    cardCount: deck._count.cards,
    subjectColor: deck.subjectColor ?? subjectColorFallback(subjectName),
    xpEnabled: deck.xpEnabled,
    xpValue: deck.xpValue,
    breadcrumb: {
      category: deck.categoryId ? (catMap.get(deck.categoryId) ?? null) : null,
      subject: subjectName,
      topic: deck.topicId ? (topMap.get(deck.topicId) ?? null) : null,
    },
    cards: deck.cards,
  };
}
