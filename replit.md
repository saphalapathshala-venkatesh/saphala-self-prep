# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed to enhance exam preparation through self-paced learning and simulated tests. It offers four main products: Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials). The platform aims to provide a comprehensive and effective learning experience for students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with **Next.js 16** (App Router, TypeScript, React 19) and styled using **Tailwind CSS 4**, complemented by custom CSS and design tokens. Icons are provided by **lucide-react**. Canonical layout components are centralized in `web/components/layout/`, ensuring consistency. The `app/(student)/layout.tsx` provides server-side authentication and wraps student-facing pages in a dashboard shell. Homepage sections are modular, database-driven where applicable, and responsive design is a core principle. Key terminology and navigation labels are managed in `config/terminology.ts`.

### Backend & Database
The backend utilizes **Prisma 7** ORM with **Neon PostgreSQL** (`divine-butterfly` for dev). User authentication is cookie-based, with sessions stored in PostgreSQL, secured with `bcrypt` for password hashing. The system supports `STUDENT`, `ADMIN`, and `SUPER_ADMIN` roles. User registration includes `fullName`, `email`, `mobile`, `state`, `gender`, and `password`, with legal acceptance (`legalAccepted`, `legalVersion`) enforced. A "one-device login" feature blocks concurrent logins for users who opt out of multi-device access. Mobile numbers are normalized to 10 digits. XP calculation for TestHub incorporates an `xpMultiplier` based on attempt number.

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
- Student-frontend runtime fields on `Test`: `code`, `languageAvailable`, `marksPerQuestion`, `negativeMarksPerQuestion`, `attemptsAllowed`, `subjectIds`, `syllabusTags` — these are in the DB and schema.
- Bilingual fields on `Question` (`stemEn`, `stemTe`, `explanationEn`, `explanationTe`) and `QuestionOption` (`textEn`, `textTe`) are nullable; `getDbQuestionsForTest` falls back to `stem`/`text` when null.

**Restored fields (after accidental drop):**
- `User`: state, gender, isBlocked, blockedReason, maxWebDevices, deletedAt, infringementWarnings, infringementBlocked, mustChangePassword, legalAcceptedAt, legalVersion
- `Test`: shuffleGroups, shuffleGroupChildren, shuffleOptions, shuffleQuestions, xpEnabled, xpValue, testStartTime, totalQuestions; code, languageAvailable (enum), marksPerQuestion, negativeMarksPerQuestion, attemptsAllowed, subjectIds, syllabusTags
- `TestSeries`: thumbnailUrl, isFree
- `TestSection`: targetCount, parentSectionId (self-referential nested sections)
- `TestQuestion`: marks, negativeMarks
- `Attempt`: status (AttemptStatus enum), attemptNumber, language (LanguageAvailable enum), endsAt, lockedSessionToken, totalTimeUsedMs
- `AttemptAnswer`: selectedOptionId, isMarkedForReview, timeSpentMs, savedAt, updatedAt
- `FlashcardDeck`: subtitle, subtopicId, titleTemplate, titleImageUrl, subjectColor, xpEnabled, xpValue
- `FlashcardCard`: cardType (FlashcardCardType enum), content (Json)
- `ContentPage`: categoryId, subjectId, topicId, xpEnabled, xpValue
- `PdfAsset`: isDownloadable
- `Purchase`: legalAcceptedAt, legalVersion
**Enums added to DB (after accidental drop):** `AttemptStatus` (IN_PROGRESS, SUBMITTED), `LanguageAvailable` (EN, TE, BOTH)

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
A `proxy.ts` middleware redirects unauthenticated guests from protected routes to `/login?from=<path>`. Protected paths: `/dashboard`, `/learn`, `/admin`. `/courses` and all public pages are intentionally unprotected at the edge. Auth for TestHub is handled inside its own API and page layers.

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