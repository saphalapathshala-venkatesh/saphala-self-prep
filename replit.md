# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed for comprehensive exam preparation, offering self-paced learning, simulated tests, premium video lessons, and a library of study materials. Its core purpose is to equip students with effective tools for academic success through features like Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials). The platform aims to be a leading resource for students seeking to excel in their academic pursuits.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with Next.js 16 (App Router, TypeScript, React 19), styled using Tailwind CSS 4, custom CSS, and `lucide-react` for icons. It emphasizes modularity, responsiveness, and server-side authentication.

### Backend & Database
The backend uses Prisma 7 ORM with Neon PostgreSQL. User authentication is cookie-based with sessions stored in PostgreSQL and `bcrypt` for password hashing. The database client uses `@prisma/adapter-neon`. User roles include `STUDENT`, `ADMIN`, and `SUPER_ADMIN`. The system includes an XP architecture for tracking progress and awarding points, and supports a "one-device login" feature. Content availability is managed via `unlockAt` fields. All time-sensitive data is handled in IST (Asia/Kolkata, UTC+5:30).

### Core Features

#### XP Architecture
An experience point (XP) system tracks user progress via `XpLedgerEntry` rows, awarding points for various learning activities like attempts, flashcards, content pages, and videos.

#### Admin Panel
An administrative interface at `/admin` allows `ADMIN` users to manage users and roles.

#### TestHub
Offers simulated exams with features like language selection, question palette, real-time timers, and auto-submission. Post-exam analysis includes XP, rank, percentile, leaderboard, and detailed insights. Concurrent test attempts are prevented via `lockedSessionToken`.

**Language Rendering Architecture:**
- `lib/langUtils.ts` — shared utilities: `hasContent()` (detects absent/whitespace/empty-HTML), `pickText()` (EN/TE with fallback), `bilingualPair()` (BOTH mode — returns secondary only when it is non-null and different from primary), `secondaryLangLabel()`, `langModeLabel()`.
- Three display modes: `EN` (English only), `TE` (secondary preferred, EN fallback per-field), `BOTH` (bilingual stacked — English as primary, secondary shown inline below when actually translated).
- `BOTH` is stored as `Attempt.language = "BOTH"` (the `LanguageAvailable` Prisma enum already supports it).
- `BriefClient`: language selector shows options based on `test.languageAvailable` (EN → English only; TE → English + secondary; BOTH → all three including Bilingual option). Labels use `langUtils` helpers — no hardcoded "Telugu".
- `TestAttemptClient`: `qTextSingle`/`qTextBilingual` + `renderedOptions[].textSecondary` for stacked rendering in BOTH mode. EN/TE modes use `pickText()` with per-field fallback.
- `ReviewClient`: secondary content shown inline in BOTH mode (no toggle); EN/TE modes use "View [secondary lang]" toggle with generic `altLangLabel`. Explanation also shows secondary inline in BOTH mode.
- `api/testhub/attempts/start/route.ts` now accepts `"BOTH"` as a valid language value.

#### Student Dashboard
The dashboard at `/dashboard` provides an overview of student progress, metrics, recent attempts, and personalized daily practice suggestions.

#### Homepage
A dynamic layout featuring a hero slider, database-driven exam categories, featured courses, product types, and a contact form.

#### Content Library
Learning content under `app/(student)/` is dynamically generated from the database and requires login. This includes:
-   **Ebooks (`/learn/lessons`)**: Paginated, multi-chapter readers with XP awards upon completion.
-   **PDFs (`/learn/pdfs`)**: Downloadable study materials.
-   **Flashcard Decks (`/learn/flashcards`)**: Interactive study UIs.

#### Course Architecture
Courses are organized by `Exam Category` and `Product Category` within a 5-level curriculum tree. `unlockAt` controls scheduled release, and free demo courses are available. Course APIs utilize raw SQL.

#### Live Classes (`/live-classes`)
Provides listings of live classes (LIVE NOW, Upcoming, Past). Access is controlled by entitlement checks.

#### Recorded Videos (`/videos`, `/videos/[id]`)
A video library from the `Video` table, featuring entitlement-based access, YouTube embeds, and HLS streaming for other providers. XP is awarded on first watch. The video player uses HLS.js for robust playback and progress tracking.

**Video Playback Pipeline:**
- `app/api/student/videos/[id]/playback`: Protected endpoint — validates session + entitlement, signs Bunny URLs server-side, returns `{ manifestUrl, embedUrl, posterUrl, provider, providerVideoId }`. Signed URL never appears in SSR HTML.
- `lib/video/bunnyPlayback.ts`: `signBunnyUrl()` applies HMAC-SHA256 Bunny token auth when `BUNNY_SECURITY_KEY` is set; passes URL through otherwise. `resolveManifestUrl()` resolution order: (1) explicit `hlsUrl` from DB, (2) auto-constructed Bunny Stream HLS URL `https://vz-{BUNNY_LIBRARY_ID}.b-cdn.net/{providerVideoId}/playlist.m3u8` for any Bunny video with `providerVideoId`, (3) `playbackUrl`, (4) null → iframe embed fallback. All Bunny videos with `providerVideoId` use native HLS (no iframe embed), ensuring skip controls, XP events, and quality selector work.
- `components/video/CourseVideoPlayer.tsx`: Client component. Accepts `playbackApiUrl` (fetches on mount) or direct `manifestUrl`. Handles HLS.js, native Safari HLS, YouTube iframe, loading/error/unsupported states, and 15-second progress tracking.

#### Video XP (Sadhana Points)
Videos award XP on completion via `POST /api/student/videos/complete`. `Video` table has `xpEnabled` (bool) and `xpValue` (int) columns. XP follows the 1st=100% / 2nd=50% / 3rd+=0% pattern, stored as `XpLedgerEntry` rows with `refType="Video"`. The `VideoPlayerWithXp` client component handles the `onEnded` event, calls the complete API, shows confetti, and displays the XP banner. Admin controls XP settings at `/admin/videos` via `PATCH /api/admin/videos/[id]`.

**Final XP architecture (single source of truth):**
- `UserXpSourceProgress` — tracks per-user per-source (VIDEO/TEST/etc.) `completionCount` and `totalXpAwarded`. Unique on `(userId, sourceType, sourceId)`. The completion API atomically upserts this via `INSERT ... ON CONFLICT DO UPDATE SET completionCount+1` so concurrent calls are safe.
- `XpLedgerEntry` — immutable log of every XP award with `refType="Video"`, `refId=videoId`, and `meta.completionNumber` for idempotency checks.
- `UserXpWallet` — live balance; upserted atomically on every XP award via `ON CONFLICT DO UPDATE SET currentXpBalance += xp`.
- Non-student roles (ADMIN, SUPER_ADMIN) always get `xpAwarded=0` — admin preview never triggers XP.
- Duplicate-award guard: before inserting a ledger entry, checks `meta->>'completionNumber' = N` for that user/video — idempotent on network retries.
- `VideoPlayerWithXp` accepts `onXpAwarded?(result: XpResult)` callback for external consumers.
- **Removed:** `VideoProgress` model/table (was a duplicate of `UserXpSourceProgress`).

**XP Dashboard Integration:**
- `GET /api/student/xp/summary` — uncached endpoint returning `{ xpTotal, xpBreakdown: { total, testHub, flashcards, ebooks, pathshala } }` from `XpLedgerEntry.groupBy`.
- `components/dashboard/XpMetricCard.tsx` — client component replacing static XP MetricCard. Fetches live value on mount, listens for window `"xp-awarded"` event (same-page), and refetches on window `focus` (student navigating back from video page). Shows brief amber highlight when value updates.
- `VideoPlayerWithXp` dispatches `window.CustomEvent("xp-awarded", { detail: { xpAwarded, newTotal } })` after every completion.
- `clearDashboardCache(userId)` in `dashboardData.ts` — evicts the 60s in-memory cache entry; called by the video completion route after every XP award so the next `/dashboard` SSR render is always fresh.
- Pre-play XP rules panel in `VideoPlayerWithXp`: shows 1st/2nd/3rd watch XP rates when `xpEnabled && xpStatus === "idle"`.
- Post-completion banners: 1st="🎉 You earned N XP!", 2nd="✨ You earned N XP on your second completion", 3rd+="✓ Video completed — no XP for this attempt".

#### Video Doubts
Students can ask doubts while watching videos via the `DoubtModal` client component (rendered in `VideoPlayerWithXp`). Doubts are stored in the `Doubt` table with statuses: `OPEN → ADDRESSED → CLOSED`. Admin replies via `/admin/doubts` page. Students view their doubt history at `/doubts`. Dashboard shows a card for recently answered doubts. Sidebar includes a "My Doubts" nav link.

- DB: `Doubt` + `DoubtReply` Prisma models (tables created via raw SQL)
- Student APIs: `POST/GET /api/student/doubts`, `GET /api/student/doubts/[id]`
- Admin APIs: `GET /api/admin/doubts`, `PATCH /api/admin/doubts/[id]`, `POST /api/admin/doubts/[id]/reply`

#### Course Pricing & Checkout
Course pricing is managed by `Course.sellingPrice` and `Course.mrp` (for strikethrough). The checkout flow integrates with Cashfree for payments, supports coupons, and manages `ProductPackage` for entitlement mapping. The system ensures robust security for payment credentials.

#### Course Catalog (`/courses`)
A server component displaying active courses with stackable server-side filters.

#### APIs
Public APIs for daily quotes, categories, and contact forms. Authenticated APIs for TestHub operations, results, and feedback. Admin APIs for user management.

#### Route Protection
Protected routes (`/dashboard`, `/learn`, `/admin`) redirect unauthenticated users to `/login`.

#### Forgot Password / Reset Password Flow
Email-based password reset via Resend. Student submits their registered email address; the API generates a stateless HMAC-SHA256 signed token (15 min TTL) and sends a secure one-time reset link to that email. The link leads to `/forgot-password/reset?token=…` where the student sets a new password. On success all existing sessions are revoked. The identity is never revealed in the API response (same generic message whether account exists or not).

- API: `POST /api/auth/forgot-password/verify` — accepts `{ email }`, sends Resend email, returns generic success
- API: `POST /api/auth/forgot-password/reset` — accepts `{ resetToken, newPassword, confirmPassword }`, validates token, hashes password with bcrypt, deletes all sessions
- Pages: `/forgot-password` (email entry), `/forgot-password/reset` (token from URL query param → set new password form)
- Utility: `lib/resend.ts` — shared Resend email utility (`sendPasswordResetEmail`, `sendContactEmail`)

#### Auth Hardening
Session validation includes checks for `revokedAt`, `isBlocked`, `isActive`, `deletedAt`, and `infringementBlocked` on every request. Login API provides explicit error codes.

#### Contact Form → Email
Both contact forms (`/` homepage and `/contact` page) now POST to `POST /api/public/contact` which validates inputs, applies a simple in-memory rate limit (3 req / 10 min per IP), checks a honeypot field, then sends an email to `SUPPORT_EMAIL` via Resend including sender name, email, phone, message, and IST timestamp. The homepage form (`components/home/ContactForm.tsx`) was already wired; the `/contact` page form (`app/contact/ContactForm.tsx`) was rewritten to call the API.

#### Test Series Course-Derived Entitlement
`resolveTestAccess` (used at all protected endpoints and SSR pages) now checks three access paths in order:
1. `test.isFree` — free access
2. `TESTHUB_ALL` or `TESTHUB_SERIES_<id>` entitlement — legacy direct entitlement
3. **NEW**: User holds a course entitlement (`productCode = courseId`) for any course that has a `CourseLinkedContent` row with `contentType = TEST_SERIES` and `sourceId = seriesId` — course-derived access

`getPublishedTestsForStudent` (bulk listing) runs the same three-path logic in one parallel query set — the course-derived series IDs are fetched with a single `DISTINCT` JOIN and merged into the same `userSeriesAccess` set before access states are resolved.

Later-added series: because access is derived at query time (not written as entitlement rows), any series linked to a course after purchase is automatically accessible to all existing course holders without any backfill.

## External Dependencies

-   Next.js 16.1.6
-   React 19.2.3
-   Tailwind CSS 4
-   TypeScript 5
-   Prisma 7
-   Neon PostgreSQL
-   lucide-react
-   canvas-confetti
-   resend (email delivery)
-   Geist font family