/**
 * Strips editor-only data-* attributes from HTML while preserving all
 * structural and semantic content.
 *
 * Rich-text editors (TipTap, ProseMirror, etc.) inject attributes like
 * data-start, data-end, data-node-type into the serialised HTML.
 * These must be removed before rendering to students.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/\s+data-[a-z][a-z0-9-]*(?:="[^"]*")?/gi, "");
}

/**
 * Returns true when the HTML string contains actual readable content
 * (i.e. non-whitespace text after stripping all tags).
 * Used to decide whether to show the real explanation or a fallback.
 */
export function hasRealContent(html: string | null | undefined): boolean {
  if (!html) return false;
  const textOnly = html.replace(/<[^>]+>/g, "").trim();
  return textOnly.length > 0;
}
