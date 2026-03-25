// Shared subject-color utilities — single source of truth for Ebooks,
// Flashcards, and Course curriculum subject folders.
//
// Priority for resolving a subject's color:
//   1. FlashcardDeck.subjectColor  (admin-set, per subject)
//   2. SUBJECT_COLOR_MAP           (name-based fallback)
//   3. Brand purple                (#6D4BCB — default when nothing is set)

/** Single brand-purple fallback used across the app. */
export const BRAND_PURPLE = "#6D4BCB";

export const SUBJECT_COLOR_MAP: Record<string, string> = {
  economy:           "#2563EB",
  economics:         "#2563EB",
  geography:         "#2E8B57",
  history:           "#B45309",
  polity:            "#7C3AED",
  "indian polity":   "#7C3AED",
  science:           "#0891B2",
  "general science": "#0891B2",
  mathematics:       "#DC2626",
  environment:       "#16A34A",
};

/** Returns the name-based fallback color for a given subject name, or null if unknown. */
export function subjectColorFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return SUBJECT_COLOR_MAP[name.toLowerCase()] ?? null;
}

/**
 * Primary color accessor. Resolves in priority order:
 *   1. `explicitColor` — admin-set color stored on FlashcardDeck / resolved per-subject
 *   2. Name-based fallback from SUBJECT_COLOR_MAP
 *   3. Brand purple (#6D4BCB)
 *
 * Usage:
 *   getSubjectColor(deck.subjectColor, deck.breadcrumb.subject)
 *   getSubjectColor(lesson.subjectColor, lesson.breadcrumb.subject)
 */
export function getSubjectColor(
  explicitColor: string | null | undefined,
  subjectName?: string | null,
): string {
  return (
    explicitColor ??
    subjectColorFromName(subjectName) ??
    BRAND_PURPLE
  );
}

/**
 * Converts a hex color string (e.g. "#2563EB") into the three UI tokens used
 * by subject folder UI: a light background tint, a full-saturation icon color,
 * and a medium-opacity border.
 *
 * Falls back to brand purple when hex is null/undefined.
 */
export function colorTokens(hex: string | null | undefined): {
  bg: string;
  icon: string;
  border: string;
} {
  const color = hex ?? BRAND_PURPLE;
  return {
    bg:     color + "26", // 15% opacity  (#RRGGBBAA — broadly supported)
    icon:   color,
    border: color + "4D", // 30% opacity
  };
}
