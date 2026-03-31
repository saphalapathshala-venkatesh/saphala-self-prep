/**
 * Strips editor-only data-* attributes from HTML while preserving all
 * structural and semantic content, and injects loading="lazy" on every
 * <img> tag that does not already carry that attribute.
 *
 * Rich-text editors (TipTap, ProseMirror, etc.) inject attributes like
 * data-start, data-end, data-node-type into the serialised HTML.
 * These must be removed before rendering to students.
 *
 * loading="lazy" defers off-screen image decoding; this is safe for both
 * external URL images and legacy base64 data-URI images that still exist
 * in older content rows.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/\s+data-[a-z][a-z0-9-]*(?:="[^"]*")?/gi, "")
    .replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy"');
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
