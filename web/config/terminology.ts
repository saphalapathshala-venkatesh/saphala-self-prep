/**
 * Canonical student-facing product names and UI labels for Saphala Pathshala.
 *
 * Import from this file whenever you need to display a product name, section
 * heading, or CTA label so they stay consistent across all student-facing pages.
 */

/** Platform product names — use exactly these strings in UI copy. */
export const PRODUCTS = {
  testHub: "TestHub",
  selfPrep: "Self Prep",
  contentLibrary: "Content Library",
  ebooks: "Ebooks",
  pdfs: "PDFs",
  flashcards: "Flashcards",
  pathshala: "Pathshala",
  videoLessons: "Video Lessons",
  currentAffairs: "Current Affairs",
  testSeries: "Test Series",
} as const;

/** Brand identity strings. */
export const BRAND = {
  name: "Saphala Pathshala",
  tagline: "Your Success is Our Focus",
  selfPrepTag: "Self Prep",
  supportEmail: "support@saphala.in",
} as const;

/** Canonical navigation labels — must stay in sync with Sidebar PRIMARY_NAV. */
export const NAV_LABELS = {
  dashboard: "Dashboard",
  testHub: "TestHub",
  courses: "Courses",
  myAttempts: "My Attempts",
  profile: "Profile",
  contentLibrary: "Content Library",
  ebooks: "Ebooks",
  flashcards: "Flashcards",
  pdfs: "PDFs",
} as const;

/** Canonical routes for key student destinations. */
export const ROUTES = {
  home: "/",
  courses: "/courses",
  testHub: "/testhub",
  ebooks: "/learn/lessons",
  flashcards: "/learn/flashcards",
  pdfs: "/learn/pdfs",
  dashboard: "/dashboard",
  attempts: "/dashboard/attempts",
  profile: "/dashboard/profile",
  login: "/login",
  register: "/register",
  contact: "/contact",
  termsAndConditions: "/terms-and-conditions",
  refundPolicy: "/refund-policy",
} as const;
