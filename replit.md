# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform offering self-paced learning and simulated tests for exam preparation. It provides Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials) to deliver a comprehensive learning experience. The project aims to empower students with effective tools for academic success.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses **Next.js 16** (App Router, TypeScript, React 19) with **Tailwind CSS 4**, custom CSS, and `lucide-react` for icons. Layout components are standardized in `web/components/layout/`. The `app/(student)/layout.tsx` handles server-side authentication and acts as a dashboard shell for student pages. The homepage is modular and responsive, with content managed via the database where applicable. Key terminology is defined in `config/terminology.ts`.

### Backend & Database
The backend uses **Prisma 7** ORM with **Neon PostgreSQL**. User authentication is cookie-based, storing sessions in PostgreSQL with `bcrypt` for password hashing. The database client uses `@prisma/adapter-neon` with `@neondatabase/serverless` in HTTP mode for serverless compatibility. User roles include `STUDENT`, `ADMIN`, and `SUPER_ADMIN`. User registration captures `fullName`, `email`, `mobile`, `state`, `gender`, and `password`, with `legalAccepted` and `legalVersion` tracking. A "one-device login" feature can prevent concurrent logins. Mobile numbers are normalized to 10 digits, and TestHub XP calculation includes an `xpMultiplier`.

### Schema Governance
The student frontend shares its database with the admin application, which is the schema owner. The student frontend's `web/prisma/schema.prisma` is a superset of the admin schema. Direct database alterations using `prisma db push --accept-data-loss` are forbidden against the shared production DB. Admin-only tables are not listed in the frontend schema. `Test.accessType` is a derived TypeScript value, not a database field. `unlockAt` fields on `Test`, `ContentPage`, `FlashcardDeck`, and `PdfAsset` control content availability.

### XP Architecture
XP is stored in `XpLedgerEntry` rows. Each row has `delta` (points), `reason`, `refType`, and `refId`. `refType` distinguishes the source: `"Attempt"` = TestHub, `"FlashcardDeck"` = Flashcard, `"ContentPage"` = Ebooks, `"Video"` = Pathshala. Dashboard total = sum of all `delta` for the user. Dashboard breakdown groups by `refType`. `UserXpSourceProgress` and `UserXpWallet` exist in the DB (admin schema) but are not in the student Prisma schema — use raw SQL if needed. `XpRule` table is currently empty (rules not seeded). Idempotency: before awarding, check `findFirst` on `XpLedgerEntry` with same `userId + refType + refId`. Flashcard XP: `POST /api/student/flashcards/complete` — checks `deck.xpEnabled`, idempotent per deck per user. Test XP: committed in `lib/resultComputer.ts` during `computeOrGetResult`. XP celebration: `triggerXpCelebration()` from `lib/xpCelebration.ts` — reusable across all modules, dual crackers + ribbon effect.

### Admin APIs
Admin APIs manage user sessions, multi-device access, and retrieve user attempt records.

### Learner Attempt Visibility APIs
APIs provide data for learner attempts, including summaries, XP earned, and detailed breakdowns.

### Concurrent Test Protection
The `Attempt` model uses a `lockedSessionToken` to prevent concurrent test access, blocking subsequent attempts with a `409 Conflict` if an active session holds a lock.

### Core Features

#### Admin Panel
An administrative interface at `/admin` allows `ADMIN` users to manage users and roles.

#### TestHub
Allows users to take simulated exams with language selection, question palette, real-time timers, and auto-submission. Post-exam analysis includes XP, rank, percentile, correctness visualization, timing insights, and question issue reporting.

#### Student Dashboard
Located at `/dashboard`, it provides an overview of student progress, including metrics, recent attempts, and a profile summary. Dedicated pages detail past exam performance and XP earnings.

**"Your Daily Practice" card**: Appears on the dashboard for every logged-in student. Built in `web/lib/practiceDb.ts` via `getDailyPractice(userId)`. Shows 1–3 personalised suggestions (tests, flashcards, ebooks — never videos or PDFs). Priority logic: (1) unattempted content first ("Not started yet"), (2) low-scoring test attempts < 60% ("You scored X% — improve it"), (3) seen-but-worth-revisiting fallback. Guaranteed to always return at least 1 item. Each row shows a type badge (colour-coded), reason pill (blue=new, amber=retry, grey=revise), title, and a direct CTA button ("Start Test" / "Study Cards" / "Read Now").

#### Homepage
A dynamic layout with sections for quotes, a hero slider, database-driven exam categories, featured courses, product types, and a contact form. Most content is accessible to guests, with learning materials requiring login.

#### Content Library (Student Content Reflection Layer)
Learning content routes are dynamically generated from the database under `app/(student)/` and require login. This includes:
- **Ebooks (`/learn/lessons`)**: Listings of published `ContentPage` rows. Detail page uses `EbookReaderClient` (client component) — a paginated multi-chapter reader built on `EbookPageShell`. Each `EBookPage` row is a separate "page"; the student navigates with two-color buttons (purple #6D4BCB = Next/forward, emerald #10B981 = Back/Previous/Finish). Chapter progress dots shown for multi-chapter ebooks. On the last page, "Finish ✓" calls `POST /api/student/ebooks/complete` (XP policy: 1st=100%, 2nd=50%, 3rd+=0, refType="ContentPage") and triggers XP confetti. `getLessonById` returns both `body` (concatenated legacy) and `chapters[]` (individual EBookPage rows). Falls back to a single chapter from `ContentPage.body` for legacy ebooks. `Subject.subjectColor` removed from schema (column not in shared DB); ebooks always use brand purple fallback.
- **PDFs (`/learn/pdfs`)**: Listings of published `PdfAsset` rows for download.
- **Flashcard Decks (`/learn/flashcards`)**: Listings of published `FlashcardDeck` rows with interactive study UI.
All use `components/learn/LearnPageShell.tsx` for consistent presentation.

#### Course Architecture
Courses are organized by two dimensions: **Exam Category** (APPSC, AP Police, TGPSC, UPSC, etc. — `Course.categoryId` → `Category`) and **Product Category** (FREE_DEMO, VIDEO_ONLY, TEST_SERIES, etc. — `Course.productCategory` enum). `Course.featured` flags editorial picks shown in the home page hero. Only `Course.isActive = true` courses are visible to students.

The curriculum is a 5-level tree: `Course → CourseSubjectSection → Chapter → Lesson (status=PUBLISHED) → LessonItem`. `LessonItem.itemType` determines which viewer to launch: `HTML_PAGE` → ebook reader, `PDF` → PDF viewer, `FLASHCARD_DECK` → flashcard player, `VIDEO` → video player, `EXTERNAL_LINK` → open in browser. `LessonItem.unlockAt` controls scheduled release. `Course` and curriculum tables are admin-owned and NOT in the student Prisma schema — always query via `prisma.$queryRawUnsafe` from `web/lib/courseDb.ts`.

**Student Course APIs:** `GET /api/student/courses` (list with optional categoryId/productCategory/featured filters) and `GET /api/student/courses/[id]` (full course + curriculum tree). Both use raw SQL via `courseDb.ts`. `FREE_DEMO` courses are accessible to all logged-in students without entitlement check. Other product types show a "Purchase Required" gate in the curriculum.

**Course UI pages:**
- Public catalog: `/courses` — category tab bar (URL `?category=id`) + course cards with content-type badges and "Start Free →" CTA
- Student detail: `/courses/[id]` (within student layout, requires login) — course header + collapsible curriculum accordion (`CurriculumAccordion` client component in `components/courses/`)
- Dashboard: "Start Learning" section shows FREE_DEMO courses as compact cards

#### Course Catalog (`/courses`)
A database-driven server component that dynamically displays active `Course` records with category tab filters (server-side via URL search params) and content-type capability badges. Uses `web/lib/courseDb.ts` for raw SQL queries.

### APIs
Public APIs for daily quotes, categories, and contact forms. Authenticated APIs for TestHub operations (start, save, submit, results, review, reporting, feedback). Admin APIs for user/role management.

### Legal Config
Legal constants (`LEGAL_VERSION`, `LEGAL_TERMS_URL`, `LEGAL_REFUND_URL`) are defined in `web/config/legal.ts` for signup and checkout flows.

### Route Protection
`proxy.ts` (Next.js 16 equivalent of `middleware.ts`) redirects unauthenticated guests from protected routes (`/dashboard`, `/learn`, `/admin`) to `/login`.

### Forgot Password Flow
Students can reset passwords at `/forgot-password` using registered email/mobile and the last 4 digits of their mobile number. This generates a short-lived HMAC-SHA256 token for password reset, revoking all existing sessions upon successful reset. No email/SMS or dedicated DB table for tokens is used.

### Student Test Panel
The TestHub student test panel (`components/testhub/TestAttemptClient.tsx`) uses a 7-route student API layer at `/api/student/`. It supports sections, multiple timer modes (TOTAL, SECTION, SUBSECTION), and fully DB-persisted pause/resume. Answers are tracked by `selectedOptionId` (DB uuid).

**Pause/Resume design**: Pause creates an `AttemptPause` row (`pausedAt`, `resumedAt`) and sets `Attempt.status = PAUSED` atomically. Resume closes the open pause event, extends `Attempt.endsAt` by the paused duration (so remaining time is always accurate), and restores `status = IN_PROGRESS`. On refresh-while-paused, `GET /attempts/[id]` returns `currentlyPaused: true` + `lastPausedAt`, and the FE freezes the timer at `endsAt - lastPausedAt`. Submit while paused is rejected (409); student must resume first. `AttemptStatus` enum: `IN_PROGRESS | PAUSED | SUBMITTED`. `AttemptPause` model: `id, attemptId, pausedAt, resumedAt`.

### Auth Hardening
`getSession()` checks `revokedAt: null` to invalidate admin-revoked sessions. `getCurrentUser()` and `getCurrentUserAndSession()` re-check `isBlocked`, `isActive`, `deletedAt`, `infringementBlocked` on every request. Login API returns explicit error codes (`ACCOUNT_BLOCKED`, `ACCOUNT_INACTIVE`, `ACTIVE_SESSION_EXISTS`) for robust error handling in the LoginForm.

## External Dependencies

- **Next.js 16.1.6**
- **React 19.2.3**
- **Tailwind CSS 4**
- **TypeScript 5**
- **Prisma 7**
- **Neon PostgreSQL**
- **lucide-react**
- **canvas-confetti**
- **Geist font family**