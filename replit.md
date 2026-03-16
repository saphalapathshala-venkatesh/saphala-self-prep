# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed to enhance exam preparation through self-paced learning and simulated tests. It offers four main products: Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials). The platform aims to provide a comprehensive and effective learning experience for students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with **Next.js 16** (App Router, TypeScript, React 19) and styled using **Tailwind CSS 4**, complemented by custom CSS and design tokens. Icons are provided by **lucide-react**. Canonical layout components are centralized in `web/components/layout/`, ensuring consistency. The `app/(student)/layout.tsx` provides server-side authentication and wraps student-facing pages in a dashboard shell. Homepage sections are modular, database-driven where applicable, and responsive design is a core principle. Key terminology and navigation labels are managed in `config/terminology.ts`.

### Backend & Database
The backend utilizes **Prisma 7** ORM with **Neon PostgreSQL** (`divine-butterfly` for dev). User authentication is cookie-based, with sessions stored in PostgreSQL, secured with `bcrypt` for password hashing. The database client uses **`@prisma/adapter-neon` + `@neondatabase/serverless` (HTTP mode)** — stateless HTTP per query, no TCP pool, works reliably on Vercel serverless, Replit autoscale, and local Node.js without WebSocket or connection pool management.

**CRITICAL for Vercel deployment:** `DATABASE_URL` must be set to the Neon POOLER URL (`postgresql://neondb_owner:...@ep-divine-butterfly-a1q63q5z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`) in Vercel's Environment Variables dashboard. The local `.env` has a `prisma+postgres://localhost` dev URL that only works in Replit's dev environment — it will cause a hard failure in production if deployed without overriding it.

The system supports `STUDENT`, `ADMIN`, and `SUPER_ADMIN` roles. User registration includes `fullName`, `email`, `mobile`, `state`, `gender`, and `password`, with legal acceptance (`legalAccepted`, `legalVersion`) enforced. A "one-device login" feature blocks concurrent logins for users who opt out of multi-device access. Mobile numbers are normalized to 10 digits. XP calculation for TestHub incorporates an `xpMultiplier` based on attempt number.

### Schema Governance (CRITICAL)
The student frontend shares its database with the admin app. The admin app **owns** the schema and is the source of truth.

**RULES — read before any schema changes:**
1. **NEVER run `prisma db push --accept-data-loss`** against the shared production DB. This drops admin-owned tables/columns and causes irreversible data loss.
2. The student frontend's `web/prisma/schema.prisma` is a **superset** of the admin schema — it includes all admin fields on shared tables plus student-specific runtime fields. Always keep it in sync.
3. Admin-only tables (`Course`, `Video`, `Faculty`, `LiveClass`, `UserDevice`, `UserActivity`, etc.) exist in the production DB but are **not listed in the frontend schema** — they are managed exclusively by the admin app. Safe as long as rule 1 is followed.
4. When the admin app adds new fields to shared tables, they must also be added here (and vice versa).
5. To add columns safely: run `ALTER TABLE "TableName" ADD COLUMN IF NOT EXISTS ...` SQL first, then update `schema.prisma`, then run `prisma generate`.

**Key schema facts:**
- `Test.accessType` does **NOT** exist in the DB. The admin app uses `Test.isFree Boolean` instead. `accessType: "FREE" | "LOCKED"` is a DERIVED TypeScript value computed from `Test.isFree` in `testhubDb.ts`. Never add `accessType` back to the Prisma schema.
- `TestSeries.isFree Boolean @default(false)` controls series-level free access — when true, all published tests in that series are freely accessible.
- `unlockAt DateTime?` is present on `Test`, `ContentPage`, `FlashcardDeck`, and `PdfAsset`. When set to a future timestamp, the item is treated as "scheduled" and blocked from student access until that date. Tests show a "Coming Soon" / "Available [date]" badge in TestHub and a "Not Yet Available" page at the brief URL. Content library items (ebooks, PDFs, flashcard decks) are filtered out of listings and return null on direct access.
- Student-frontend runtime fields on `Test`: `code`, `languageAvailable`, `marksPerQuestion`, `negativeMarksPerQuestion`, `attemptsAllowed`, `subjectIds`, `syllabusTags` — these are in the DB and schema.
- Bilingual fields on `Question` (`stemEn`, `stemTe`, `explanationEn`, `explanationTe`) and `QuestionOption` (`textEn`, `textTe`) are nullable; `getDbQuestionsForTest` falls back to `stem`/`text` when null.

**DB column audit (verified 2026-03-16 against divine-butterfly Neon):**
The production DB was audited directly via psql (not the Replit local DB — the `executeSql` tool connects to a DIFFERENT DB than the app uses). Confirmed all columns exist:
- `User`: all 22 fields present. NOTE: `state` and `gender` were missing and re-added 2026-03-16 via ALTER TABLE.
- `Test`: all 32 columns present including code, languageAvailable, attemptsAllowed, subjectIds, syllabusTags
- `Attempt`: all 17 columns present. NOTE: `endsAt` and `lockedSessionToken` were missing and re-added 2026-03-16 via ALTER TABLE.
- `AttemptAnswer`: all 11 columns present. NOTE: `selectedOptionId` and `savedAt` were missing and re-added 2026-03-16 via ALTER TABLE.
- `Question`: bilingual fields `stemEn`, `stemTe`, `explanationEn`, `explanationTe` were missing and re-added 2026-03-16 via ALTER TABLE.
- `QuestionOption`: bilingual fields `textEn`, `textTe` were missing and re-added 2026-03-16 via ALTER TABLE.
- `AttemptStatus` and `LanguageAvailable` enum types confirmed in DB
- `TestSeries`: thumbnailUrl, isFree confirmed present
- `TestQuestion`: marks, negativeMarks confirmed present

**IMPORTANT — DB querying note:** Always use `psql "postgresql://neondb_owner:...@ep-divine-butterfly-a1q63q5z-pooler..."` for schema audits. The `executeSql` code_execution tool connects to the Replit LOCAL database (prisma+postgres://localhost:51213), NOT the divine-butterfly Neon DB used by the app. These are completely different databases.

**Enums in DB:** `AttemptStatus` (IN_PROGRESS, SUBMITTED), `LanguageAvailable` (EN, TE, BOTH)

### Admin APIs
Admin functionalities include endpoints for clearing user sessions, toggling multi-device access per user, and retrieving user attempt records.

### Learner Attempt Visibility APIs
APIs provide comprehensive data for learner attempts, including summaries of best/latest scores, XP earned, and detailed XP breakdowns for specific attempts.

### Concurrent Test Protection
The `Attempt` model prevents concurrent test access using a `lockedSessionToken`. If an attempt is locked by another active session, subsequent access attempts are blocked with a `409 Conflict` response. The lock is cleared upon successful submission.

### Core Features

#### Admin Panel
An administrative interface at `/admin` allows management of users and roles, accessible only to `ADMIN` users.

#### TestHub
This module enables users to take simulated exams, offering features like language selection (English/Telugu), a question palette with status indicators, real-time timers with auto-submission, and post-exam analysis including XP, rank, and percentile. Test data is stored in PostgreSQL. A review feature provides correctness visualization, timing insights, and a question issue reporting system.

#### Student Dashboard
The dashboard (`/dashboard`) features a collapsible sidebar and provides an overview of student progress, including metrics (tests attempted, XP, accuracy, streak), recent attempts, and a profile summary. Dedicated pages for "My Attempts" and "Per-test Attempt History" offer detailed insights into past exam performance and XP earnings. The profile page displays read-only student information and statistics. Result scores and XP are persisted and aggregated, with subject names resolved via database joins.

#### Homepage
The homepage features a dynamic layout with sections for quotes, a hero slider, database-driven exam categories and featured courses, product types, and a contact form. Most content on the homepage is accessible to guests, with content access for learning materials being login-gated.

#### Content Library (Student Content Reflection Layer)
All learning content routes are dynamically generated from the database. These pages live under the `app/(student)/` route group and require login (auth handled by the shared layout). **Canonical business terminology**: "Content Library" is the umbrella section label; "Ebooks" refers to HTML materials (`ContentPage`); "PDFs" refers to PDF materials (`PdfAsset`). Do not use "Lesson Notes", "Prep Library", or "Smart Learning" in student-facing UI.
- **Ebooks (`/learn/lessons`)**: Login-required listing of published `ContentPage` rows, displaying taxonomy breadcrumbs. Uses `LearnPageShell` with "Content Library" product label.
- **PDFs (`/learn/pdfs`)**: Login-required listing of published `PdfAsset` rows. All logged-in users can download files directly. Uses `LearnPageShell` with "Content Library" product label.
- **Flashcard Decks (`/learn/flashcards`)**: Login-required listing of published `FlashcardDeck` rows with card counts. Uses `LearnPageShell` with "Content Library" product label. Authenticated users can study decks using an interactive flip-card UI.
- **Shared shell**: `components/learn/LearnPageShell.tsx` provides a consistent page header (product label, title, description, back-to-dashboard link) and max-width content container for all three listing pages.

#### Course Catalog (`/courses`)
A database-driven server component that dynamically queries and displays published content from `TestSeries`, `PdfAsset`, `FlashcardDeck`, and `ContentPage`, organized by product type. It replaces previous hardcoded course listings.

### APIs
- **Public APIs**: For daily quotes, categories, and contact form submissions.
- **Authenticated APIs**: For TestHub operations (starting tests, saving answers, submitting, generating results, reviewing, reporting questions, feedback).
- **Admin APIs**: For user and role management.

### Legal Config
Legal constants like `LEGAL_VERSION`, `LEGAL_TERMS_URL`, and `LEGAL_REFUND_URL` are defined in `web/config/legal.ts` and used across the platform for signup and future checkout flows. Policy pages exist as placeholders.

### Route Protection
`proxy.ts` is the **Next.js 16 equivalent of `middleware.ts`** — it runs at the edge and redirects unauthenticated guests from protected routes to `/login?from=<path>`. Protected paths: `/dashboard`, `/learn`, `/admin`. `/courses` and all public pages are intentionally unprotected at the edge. Auth for TestHub is handled inside its own API and page layers. Do NOT create a `middleware.ts` — Next.js 16 uses `proxy.ts` and will throw a conflict error if both exist.

### Forgot Password Flow
Students can reset their password at `/forgot-password` without email or SMS:
1. Enter registered email/mobile + last 4 digits of their registered mobile number
2. If verified, a short-lived HMAC-SHA256 reset token (15-minute TTL) is returned to the client
3. Student enters new password + confirm → server validates token, updates `passwordHash`, revokes all sessions via `prisma.session.deleteMany`
4. Student is redirected to login with success message
- Routes: `POST /api/auth/forgot-password/verify`, `POST /api/auth/forgot-password/reset`
- Token: HMAC-SHA256 signed with a secret derived from `DATABASE_URL`, encodes `userId|expires|nonce`
- No email, no SMS, no DB table for tokens, no schema changes required

### Auth Hardening (2026-03-16)
- `getSession()` now checks `revokedAt: null` — admin-revoked sessions are immediately invalid
- `getCurrentUser()` and `getCurrentUserAndSession()` now re-check `isBlocked`, `isActive`, `deletedAt`, `infringementBlocked` on every request — users blocked after login are denied access immediately
- Login API returns explicit `code` fields: `ACCOUNT_BLOCKED`, `ACCOUNT_INACTIVE`, `ACTIVE_SESSION_EXISTS`
- LoginForm has explicit code-based error handling for all three codes
- `AUTH_SMOKE_TEST.md` in web/ is the reference checklist for pre-deploy auth verification

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