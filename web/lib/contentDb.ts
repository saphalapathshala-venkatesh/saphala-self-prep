import { prisma } from "@/lib/db";
import { nowIST } from "@/lib/formatIST";

const IST_NOW_SQL = `NOW() + INTERVAL '5 hours 30 minutes'`;

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

// ── Module-level TTL caches ────────────────────────────────────────────────────
// Content lists are identical for all users and change infrequently.
// A 60-second in-process cache eliminates repeated DB roundtrips on hot pages
// without requiring any external cache infrastructure.

const CACHE_TTL = 60_000; // 60 s

type TTLCache<T> = { data: T; expiresAt: number } | null;

let _lessonsCache: TTLCache<PublishedLesson[]> = null;
let _pdfsCache: TTLCache<PublishedPdf[]> = null;
let _decksCache: TTLCache<PublishedDeck[]> = null;

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
  const now = Date.now();
  if (_lessonsCache && _lessonsCache.expiresAt > now) return _lessonsCache.data;

  const pages = await prisma.contentPage.findMany({
    where: {
      isPublished: true,
      OR: [{ unlockAt: null }, { unlockAt: { lte: nowIST() } }],
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
                  subjectColor: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // subjectColor comes directly from the Subject row fetched above — no extra query needed.
  const data: PublishedLesson[] = pages.map((p) => ({
    id: p.id,
    title: p.title,
    publishedAt: p.publishedAt,
    subjectColor: p.subtopic?.topic.subject.subjectColor ?? null,
    breadcrumb: {
      category: p.subtopic?.topic.subject.category.name ?? null,
      subject: p.subtopic?.topic.subject.name ?? null,
      topic: p.subtopic?.topic.name ?? null,
      subtopic: p.subtopic?.name ?? null,
    },
  }));

  _lessonsCache = { data, expiresAt: now + CACHE_TTL };
  return data;
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
                  subjectColor: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
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
  if (page.unlockAt && page.unlockAt > nowIST()) return null;

  const subjectColor = page.subtopic?.topic.subject.subjectColor ?? null;

  function resolvePageHtml(ep: { contentHtml: string; contentBlocks: unknown }): string {
    if (ep.contentHtml && ep.contentHtml.trim()) return ep.contentHtml;
    return blocksToHtml(ep.contentBlocks);
  }

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

type PdfRow = {
  id: string;
  title: string;
  fileUrl: string;
  fileSize: number | null;
  publishedAt: Date | null;
  categoryName: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  topicName: string | null;
  subtopicName: string | null;
};

export async function getPublishedPdfs(): Promise<PublishedPdf[]> {
  const now = Date.now();
  if (_pdfsCache && _pdfsCache.expiresAt > now) return _pdfsCache.data;

  // Single JOIN query replaces: 1 PDF findMany + 4 taxonomy findMany queries.
  const rows = await prisma.$queryRawUnsafe<PdfRow[]>(`
    SELECT
      pa.id,
      pa.title,
      pa."fileUrl",
      pa."fileSize",
      pa."publishedAt",
      cat.name   AS "categoryName",
      s.name     AS "subjectName",
      s."subjectColor",
      t.name     AS "topicName",
      st.name    AS "subtopicName"
    FROM "PdfAsset" pa
    LEFT JOIN "Category" cat ON cat.id = pa."categoryId"
    LEFT JOIN "Subject"  s   ON s.id   = pa."subjectId"
    LEFT JOIN "Topic"    t   ON t.id   = pa."topicId"
    LEFT JOIN "Subtopic" st  ON st.id  = pa."subtopicId"
    WHERE pa."isPublished" = true
      AND (pa."unlockAt" IS NULL OR pa."unlockAt" <= ${IST_NOW_SQL})
    ORDER BY pa."createdAt" DESC
  `);

  const data: PublishedPdf[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    fileUrl: r.fileUrl,
    fileSize: r.fileSize,
    publishedAt: r.publishedAt,
    subjectColor: r.subjectColor ?? null,
    breadcrumb: {
      category: r.categoryName ?? null,
      subject: r.subjectName ?? null,
      topic: r.topicName ?? null,
      subtopic: r.subtopicName ?? null,
    },
  }));

  _pdfsCache = { data, expiresAt: now + CACHE_TTL };
  return data;
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

type DeckRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  deckSubjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  cardCount: number;
  categoryName: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  topicName: string | null;
};

export async function getPublishedDecks(): Promise<PublishedDeck[]> {
  const now = Date.now();
  if (_decksCache && _decksCache.expiresAt > now) return _decksCache.data;

  // Single JOIN query replaces: 1 deck findMany + 3 taxonomy findMany queries.
  // cardCount computed via correlated subquery to avoid row explosion from JOIN.
  const rows = await prisma.$queryRawUnsafe<DeckRow[]>(`
    SELECT
      fd.id,
      fd.title,
      fd.subtitle,
      fd.description,
      fd."subjectColor"          AS "deckSubjectColor",
      fd."xpEnabled",
      fd."xpValue",
      (SELECT COUNT(*)::int
         FROM "FlashcardCard" fc
        WHERE fc."deckId" = fd.id) AS "cardCount",
      cat.name   AS "categoryName",
      s.name     AS "subjectName",
      s."subjectColor",
      t.name     AS "topicName"
    FROM "FlashcardDeck" fd
    LEFT JOIN "Category" cat ON cat.id = fd."categoryId"
    LEFT JOIN "Subject"  s   ON s.id   = fd."subjectId"
    LEFT JOIN "Topic"    t   ON t.id   = fd."topicId"
    WHERE fd."isPublished" = true
      AND (fd."unlockAt" IS NULL OR fd."unlockAt" <= ${IST_NOW_SQL})
    ORDER BY fd."createdAt" DESC
  `);

  const data: PublishedDeck[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description,
    cardCount: r.cardCount,
    // Priority: Subject.subjectColor → FlashcardDeck.subjectColor → null
    subjectColor: r.subjectColor ?? r.deckSubjectColor ?? null,
    xpEnabled: r.xpEnabled,
    xpValue: r.xpValue,
    breadcrumb: {
      category: r.categoryName ?? null,
      subject: r.subjectName ?? null,
      topic: r.topicName ?? null,
    },
  }));

  _decksCache = { data, expiresAt: now + CACHE_TTL };
  return data;
}

type DeckDetailRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  isPublished: boolean;
  unlockAt: Date | null;
  deckSubjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  cardCount: number;
  categoryName: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  topicName: string | null;
};

export async function getDeckById(id: string): Promise<DeckDetail | null> {
  // Two parallel queries instead of the previous 4+ sequential/parallel queries:
  // 1. Deck metadata + taxonomy names via JOIN (replaces findUnique + buildTaxonomyMaps)
  // 2. Cards query (unchanged — one-to-many, stays separate)
  const [deckRows, cards] = await Promise.all([
    prisma.$queryRawUnsafe<DeckDetailRow[]>(`
      SELECT
        fd.id,
        fd.title,
        fd.subtitle,
        fd.description,
        fd."isPublished",
        fd."unlockAt",
        fd."subjectColor"          AS "deckSubjectColor",
        fd."xpEnabled",
        fd."xpValue",
        (SELECT COUNT(*)::int
           FROM "FlashcardCard" fc
          WHERE fc."deckId" = fd.id) AS "cardCount",
        cat.name   AS "categoryName",
        s.name     AS "subjectName",
        s."subjectColor",
        t.name     AS "topicName"
      FROM "FlashcardDeck" fd
      LEFT JOIN "Category" cat ON cat.id = fd."categoryId"
      LEFT JOIN "Subject"  s   ON s.id   = fd."subjectId"
      LEFT JOIN "Topic"    t   ON t.id   = fd."topicId"
      WHERE fd.id = $1
      LIMIT 1
    `, id),
    prisma.flashcardCard.findMany({
      where: { deckId: id },
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
    }),
  ]);

  const deck = deckRows[0];
  if (!deck || !deck.isPublished) return null;
  if (deck.unlockAt && new Date(deck.unlockAt) > nowIST()) return null;

  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.subtitle,
    description: deck.description,
    cardCount: deck.cardCount,
    subjectColor: deck.subjectColor ?? deck.deckSubjectColor ?? null,
    xpEnabled: deck.xpEnabled,
    xpValue: deck.xpValue,
    breadcrumb: {
      category: deck.categoryName ?? null,
      subject: deck.subjectName ?? null,
      topic: deck.topicName ?? null,
    },
    cards,
  };
}
