# Saphala Pathshala

## Overview

Saphala Pathshala is an educational platform offering self-paced learning and exam simulations through four core products: Smart Learning (concept lessons + flashcards), TestHub (exam simulation), Pathshala (premium video lessons), and Prep Library (PDFs + study materials). The platform aims to help students prepare for exams effectively.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Next.js 16** with App Router, TypeScript, and React 19.
- **Tailwind CSS 4** for styling, supplemented by custom CSS in `globals.css` and design tokens in `styles/tokens.ts` and `styles/typography.ts`.
- **lucide-react** for icons.
- UI components are organized in `/web/ui-core/`.
- Configuration and mock data are in `/web/config/`.
- Responsive design with mobile-first breakpoints is a key principle.

### Backend & Database
- **Prisma 7** ORM with **Neon PostgreSQL**.
- User authentication uses cookie-based sessions (`saphala_session`) stored in PostgreSQL, with a 7-day expiration and a 15-minute idle timeout with sliding expiration.
- bcrypt is used for password hashing.
- User roles include STUDENT (default), ADMIN, and SUPER_ADMIN.
- Registration collects `fullName`, `email`, `mobile`, `state`, `gender`, and `password`.
- Registration requires legal acceptance (`legalAccepted: true`, `legalVersion`) — enforced on both frontend (disabled button) and backend (API validation). Legal version string managed in `web/config/legal.ts`.
- **One-device login**: User model has `allowMultiDevice Boolean @default(false)`. At login, if user already has an active session and `allowMultiDevice` is false, login is blocked with a 409 response. Admin can clear sessions and toggle `allowMultiDevice` per user.
- **`normalizeIdentifier`** in `web/lib/validation.ts` strips `+91` prefix: 12-digit numbers starting with "91" are trimmed to the last 10 digits before DB lookup.
- **XP by attempt number**: `generate-result` applies `xpMultiplier` — 1st attempt=1.0×, 2nd=0.5×, 3rd+=0× of base XP. Multiplier and attemptNumber stored in `XpLedgerEntry.meta`.
- **Session type**: Student sessions are created with `type: "STUDENT"` in `sessionStore.ts` (schema default was `ADMIN` — corrected).

### Admin APIs
- `DELETE /api/admin/users/[id]/sessions` — clears all sessions for a user
- `PATCH /api/admin/users/[id]/allow-multi-device` — toggles multi-device access
- `GET /api/admin/users/[id]/attempts` — returns attempt-wise records with XP for a user

### Learner Attempt Visibility APIs
- `GET /api/testhub/attempts/active?testId=X` — extended to return `summary: { bestScore, latestScore, lastXp }` from completed attempts + XP ledger
- `GET /api/testhub/attempts/result?attemptId=X` — extended to return `xpBreakdown: { attemptNumber, baseXP, bonusXP, xpMultiplier }` from XP ledger meta
- `GET /api/testhub/tests/[testId]/my-attempts` — returns all attempts for current user for a specific test with XP data

### Concurrent Test Protection
- `Attempt` model has `lockedSessionToken String?` field; stored in DB after Prisma generate + db push
- `attempt-data` GET: checks lock, blocks if another active session holds it (409 + `code: "ATTEMPT_LOCKED"`), acquires lock on access
- `save-answer` POST and `submit` POST: verify session lock; return 409 `ATTEMPT_LOCKED` if different active session holds lock
- `submit` clears `lockedSessionToken` on success
- `getCurrentUserAndSession()` helper in `auth.ts` returns `{ user, sessionToken }` for lock checks
- `TestAttemptClient` shows a user-friendly message on 409 `ATTEMPT_LOCKED`

### Core Features

#### Admin Panel
- Accessible at `/admin`, with routes for user management (`/admin/users`). Requires ADMIN role.

#### TestHub
- Allows users to browse tests, take simulated exams, and review results.
- Supports language selection (English/Telugu) for tests.
- Features include a question palette with status indicators, real-time timer with auto-submission, and post-exam result analysis with XP calculation, rank, and percentile.
- Test data is stored in the PostgreSQL database.
- Review functionality includes correctness visualization, timing insights, and a question issue reporting system.

#### Student Dashboard
- Located at `/dashboard` with a collapsible sidebar (desktop: icon-only collapsed mode, localStorage-persisted; mobile: hamburger drawer).
- **Dashboard V1**: Hero gradient with contextual CTAs (Resume Exam / Browse Tests), 4 metric cards (Tests Attempted=real DB, XP=XpLedgerEntry, Accuracy=correctCount/wrongCount aggregate, Streak=placeholder), resume-in-progress amber banner, recent attempts list, profile summary card, coming-soon teaser strip, recommended free tests grid.
- **My Attempts page** at `/dashboard/attempts`: full attempt history split into In Progress / Completed / Expired sections with score badges and Review/Result/Resume links.
- **Per-test Attempt History page** at `/testhub/tests/[testId]/attempts`: shows all submitted attempts for that test with score, correct/wrong/skipped, time used, XP earned and multiplier; links to Result and Review per attempt; summary stats (attempts used, best score, total XP).
- **Profile page V1** at `/dashboard/profile`: read-only student profile (name, email, mobile masked, state, gender, joined date) with stats row (tests completed, XP, streak).
- **Result score persistence**: `generate-result` API writes `scorePct`, `correctCount`, `wrongCount`, `unansweredCount`, `totalTimeUsedMs` back to `Attempt` and creates an idempotent `XpLedgerEntry`. Both routes (`generate-result` POST and `result` GET) delegate to `web/lib/resultComputer.ts` — shared function that tries the in-memory cache first, then recomputes entirely from DB on cache miss (handles server restarts).
- **Total XP**: `result` GET and `generate-result` POST both read `totalXp` from `XpLedgerEntry` DB aggregate (never from in-memory store).
- **Subject name resolution**: `getDbQuestionsForTest` now joins the `Subject` table by unique subjectId batch; falls back to capitalized raw ID only if subject not found.
- **`seriesIsPublished` on DbTest**: All three query functions (`getDbTestById`, `getDbTestByCode`, `getAllPublishedTests`) now expose `seriesIsPublished: boolean | null`. The `start` attempt route rejects requests where `!test.isPublished` or `test.seriesIsPublished === false`.
- **Category source consistency**: `getDashboardData` recent attempts now join `test.series.categoryId` with fallback to `test.categoryId`, matching the pattern used in `getAllAttemptsForStudent`.
- **Feedback/report paper trail**: `feedback` and `question-report` routes log structured JSON to server stdout (`[feedback]` / `[question-report]`) until DB tables are added.

### Known Schema-Level Blockers (not yet resolved)
- **`AttemptFeedback` / `QuestionReport` tables missing**: Feedback and question reports are in-memory + server logs only. DB tables required.
- **`legalAccepted`/`legalVersion` not on User model**: Enforced at registration but not auditable per user post-registration. Requires `legalAccepted Boolean @default(false)` + `legalVersion String?` on User.
- **`UserEntitlement` completely unwired**: Entitlement checks are not enforced on any test or content access flow. Schema exists but no code reads it.

#### Homepage
- 9-section layout: Header → Quote+Kalam Strip → Hero Slider (5 banners) → Exam Categories → Product Types (8) → Featured Courses → Features → Contact Form → Footer
- **Hero Slider**: 5 auto-advancing slides (Saphala Pathshala, Self Prep, Video Courses, Flash Cards, Test Series), each with badge/headline/benefits/CTAs
- **Quote + Kalam Strip**: 60/40 layout — daily quote left, Dr. Kalam photo (Wikipedia Commons) + dedication right; quote stable for the full calendar day
- **Exam Categories**: 16:9 thumbnail cards in horizontal scroll; fetched from DB — auto-reflects admin changes; fallback to Saphala logo
- **Product Types**: 8 hardcoded learning-approach cards (Free Demo, Complete Packs, Video, Self Prep, PDF, Test Series, Flashcards, Current Affairs)
- **Featured Courses**: 4 exam-oriented placeholder cards with ₹ pricing; login-gated access note
- **Footer**: 5-column dark navy — Brand/Contact, Explore (10 links), Student, Support (FAQ/Privacy/Terms/Refund), Community (social links)
- Guest browsing allowed for all homepage sections; content access is login-gated

### APIs
- **Public APIs**: `/api/public/quote-of-the-day` (daily Kalam quote, 12 rotating by day-of-year), `/api/public/categories` (live DB categories), `/api/public/contact` (validated contact form — logs submission)
- **Authenticated APIs**: For TestHub operations (starting/resuming attempts, saving answers, submitting tests, generating/retrieving results, reviewing attempts, reporting questions, feedback).
- **Admin APIs**: For managing users and roles.

### Legal Config
- `web/config/legal.ts` — shared `LEGAL_VERSION`, `LEGAL_TERMS_URL` (`/terms-and-conditions`), `LEGAL_REFUND_URL` (`/refund-policy`) constants used by signup and future checkout flows.
- Policy pages exist at `/terms-and-conditions` and `/refund-policy` (placeholder content, full text to be added pre-launch).

### Route Protection
- `proxy.ts` redirects unauthenticated users from protected routes (e.g., `/dashboard`, `/admin`) to the login page.

## External Dependencies

- **Next.js 16.1.6**, **React 19.2.3**, **Tailwind CSS 4**
- **TypeScript 5**, **ESLint**, **PostCSS**
- **Prisma 7**
- **Neon PostgreSQL**
- **lucide-react**
- **canvas-confetti** (for XP animation)
- **Geist font family** (via `next/font/google`)