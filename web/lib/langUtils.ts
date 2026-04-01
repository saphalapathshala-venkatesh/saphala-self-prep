/**
 * Language rendering utilities for TestHub content.
 *
 * Design principles:
 *  - Primary language is always English.
 *  - Secondary language is configurable (currently Telugu, later Kannada/Hindi/etc.)
 *  - Never produce blank output when English content exists.
 *  - Fallback happens per field, independently.
 */

export type LangMode = "EN" | "TE" | "BOTH";

/**
 * Returns true when `value` has real renderable text content.
 * Treats null, undefined, "", whitespace, and empty HTML as absent.
 *
 * Handles:
 *   null / undefined               → false
 *   ""                             → false
 *   "   "                          → false
 *   "<p></p>"                      → false
 *   "<p>  </p>"                    → false
 *   "<div><br/></div>"             → false
 *   "<p>some text</p>"             → true
 */
export function hasContent(value: string | null | undefined): value is string {
  if (!value) return false;
  const stripped = value
    .replace(/<[^>]+>/g, "")   // strip HTML tags
    .replace(/&nbsp;/gi, " ")   // decode non-breaking space
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
  return stripped.length > 0;
}

/**
 * Pick a single display string for EN or TE mode.
 *
 * Rules:
 *  - EN  → always return primary (English).
 *  - TE  → return secondary if it has real content; otherwise return primary.
 *
 * This ensures a student in TE mode always sees something — never a blank field.
 */
export function pickText(
  primary: string | null | undefined,
  secondary: string | null | undefined,
  mode: "EN" | "TE"
): string {
  if (mode === "EN") return primary ?? "";
  return hasContent(secondary) ? secondary! : (primary ?? "");
}

/**
 * For BILINGUAL mode: return both primary and secondary when secondary has
 * real, distinct content.
 *
 * Returns `secondary: null` when:
 *  - secondary is absent/empty/whitespace/empty-HTML, OR
 *  - secondary is the same string as primary — this happens when the DB layer
 *    applied its own null-fallback (stemSecondary ?? stem), meaning the question
 *    was never actually translated.
 *
 * Consumers should render secondary only when it is non-null.
 */
export function bilingualPair(
  primary: string | null | undefined,
  secondary: string | null | undefined
): { primary: string; secondary: string | null } {
  const pri = primary ?? "";
  // Secondary is meaningful only when it has content AND differs from primary.
  // When the DB layer returns (stemSecondary ?? stem), null secondary produces
  // the same string as primary — the !== check reliably catches this.
  const sec =
    hasContent(secondary) && secondary !== primary ? secondary! : null;
  return { primary: pri, secondary: sec };
}

/**
 * Returns a human-readable label for the secondary language.
 * Currently returns "Telugu" — can be extended to accept the actual language
 * code when the backend exposes it.
 */
export function secondaryLangLabel(): string {
  return "Telugu";
}

/**
 * Returns a short label for a LangMode value for display in UI.
 */
export function langModeLabel(mode: LangMode): string {
  if (mode === "EN") return "English";
  if (mode === "TE") return secondaryLangLabel();
  return "Bilingual";
}
