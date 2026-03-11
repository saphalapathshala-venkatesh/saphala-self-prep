# Saphala Pathshala

## Overview

Saphala Pathshala is an educational platform designed to help students prepare for exams through self-paced learning modules and test simulations. The platform offers four core products: Smart Learning (concept lessons + flashcards), TestHub (exam simulation), Pathshala (premium video lessons), and Prep Library (PDFs + study materials). The frontend is built with Next.js and Tailwind CSS, following a clean, study-friendly design with a purple brand color scheme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **Next.js 16** with App Router architecture
- TypeScript for type safety
- React 19 for UI components

### Styling Approach
- **Tailwind CSS 4** for utility-first styling
- Custom CSS components defined in `globals.css` (glossy buttons)
- Design tokens stored in `styles/tokens.ts` and `styles/typography.ts`
- **lucide-react** for icons (BookOpen, ClipboardCheck, PlayCircle, Library)
- No other external UI component libraries - only Tailwind + custom components + lucide icons

### Component Structure
- UI components live in `/web/ui-core/` directory
- Configuration/mock data stored in `/web/config/` directory
- Client components use `'use client'` directive for interactivity

### Key Design Patterns
- Separation of config data from presentation components
- Reusable button styles via Tailwind `@layer components`
- Responsive design with mobile-first breakpoints

### Locked Files (Do Not Modify Unless Asked)
- `ui-core/*` - Core UI components
- `styles/tokens.ts` - Color tokens
- `styles/typography.ts` - Typography definitions

## External Dependencies

### Core Dependencies
- **Next.js 16.1.6** - React framework with server-side rendering
- **React 19.2.3** - UI library
- **Tailwind CSS 4** - Utility CSS framework

### Development Tools
- TypeScript 5
- ESLint with Next.js config
- PostCSS with Tailwind plugin

### External Assets
- Unsplash images for banners and course thumbnails (referenced via URLs)
- Geist font family loaded via `next/font/google`

### Backend & Database
- **Prisma 7** ORM with Neon PostgreSQL (datasource URL in `prisma.config.ts`)
- Prisma Client generated to standard `node_modules/@prisma/client` (all imports use `@prisma/client`)
- Build script runs `prisma generate` before `next build`; `postinstall` also runs `prisma generate`
- UserRole enum: STUDENT (default), ADMIN, SUPER_ADMIN
- User model uses `passwordHash` field (not `password`)
- User model has optional `fullName`, `state`, `gender` fields (added for student onboarding)
- Registration collects: Full Name, Email, Mobile, State (Indian states dropdown), Gender (Male/Female/Other/Prefer not to say), Password
- Existing users without fullName/state/gender can still log in normally (fields are nullable)
- Dashboard greeting uses gender-based salutation: Male→"Mr.", Female→"Ms.", Other/Prefer not to say→no prefix
- Login success toast shows fullName with email fallback

### Authentication
- Cookie-based sessions using `saphala_session` cookie
- Database-backed session store (`lib/sessionStore.ts`) — sessions persist in PostgreSQL Session table
- Sessions expire after 7 days; expired sessions are cleaned up on access
- **15-minute idle timeout** with sliding expiration — every authenticated request extends `expiresAt` by 15 minutes via atomic DB update
- Atomic session check: `getSession()` uses `update WHERE expiresAt > now()` in one DB call (no TOCTOU race)
- Server-side auth helpers: `lib/serverAuth.ts`, `lib/requireRole.ts`
- API auth helpers: `lib/apiAuth.ts` (requireAuth, requireRole)
- Registration validates +91 Indian mobile format (10 digits)
- bcrypt password hashing

### Admin Panel
- `/admin` redirects to `/admin/users`
- `/admin/users` — lists users with role dropdown, ADMIN-only (server-side role guard via layout.tsx)
- API: `GET /api/admin/users`, `PATCH /api/admin/users/[id]/role`
- Promote script: `node scripts/promoteAdmin.mjs <email>`

### TestHub
- `/testhub` — browse tests without login (client-side page with category filters)
- `/testhub/tests/[testId]/brief` — exam brief page (server-side auth guard, redirects to login)
  - Full instructions, exam pattern, and rules (no collapsible sections)
  - Language dropdown (English/Telugu), stored as EN/TE in attempt
  - "I have read and understood" checkbox — Start Test disabled until checked
  - Resume banner + "Resume Test" CTA when active attempt exists (language locked)
  - Attempts exhausted card when all attempts used
- `/testhub/tests/[testId]/attempt` — test-taking interface (server-side auth guard)
  - `TestAttemptClient` renders full exam UI: question display, option selection, palette, timer
  - "Instructions" pill in header bar opens modal with same ExamInstructionsContent
  - Desktop: sticky right sidebar palette; Mobile: collapsible bottom drawer with status counts
  - Question palette with 5 status colors: Not Visited (grey), Unanswered (red), Answered (green), Marked for Review (purple), Answered + Marked (purple + green tick)
  - Draft vs Saved answer states: selecting an option is draft-only; Save & Next or Mark for Review & Next persists
  - Clear Response clears both draft and saved state
  - Timer uses server-authoritative `endsAt`; auto-submits at 0 with "Time is Over" message
  - Submit confirmation modal shows answered/unanswered/review counts
  - Final auto-commit: unsaved drafts (non-null, differing from saved) are committed on submit
  - After submission, redirects to `/testhub/tests/[testId]/submitted?attemptId=...`
- `/testhub/tests/[testId]/submitted` — attempts summary page (overall + subject-wise counts, no marks)
  - Shows answered/unattempted/marked/answered+marked/not-visited counts
  - Subject-wise breakdown table (for multi-subject tests)
  - Time used vs total duration
  - "Generate Result" CTA → calls API → redirects to result page
- `/testhub/tests/[testId]/result` — full result page with XP overlay (3s confetti), marks breakdown, subject-wise analysis, rank/percentile/top10
- `ResultPageClient` (`components/testhub/`) — client component for result display with XP overlay and confetti
- Result computation: gross = correct * marksPerQuestion, negative = incorrect * negativeMarks, net = gross - negative
- XP: baseXP = correct * 2, +10 bonus if accuracy >= 80%
- Rank/percentile/top10 shown only when >= 30 results exist for the test; else polite message
- canvas-confetti package for 3-second Saphala-colored confetti on XP overlay
- `TestAttemptClient` (`components/testhub/`) — main client component for test-taking UI
- `ExamInstructionsContent` (`components/testhub/`) — shared component for instructions (used in brief + attempt modal)
- `BriefClient` (`components/testhub/`) — client component handling language, checkbox, start/resume logic
- `InstructionsPill` (`components/testhub/`) — pill button + modal for attempt page instructions
- `LoginRequiredModal` (`components/testhub/`) — shown when unauthenticated user clicks "Start Test"
- `useAuthStatus` hook (`lib/auth/useAuthStatus.ts`) — client-side auth check via `/api/auth/status`
- **DB-backed test data**: Tests, questions, and options stored in Prisma/PostgreSQL via `lib/testhubDb.ts`
- `LanguageAvailable` type: "EN" | "TE" | "BOTH" — controls language options per test
- 5 seed tests (SEED-001 to SEED-005) imported to DB via `npm run import:testhub`
  - SEED-001: FREE, EN only, negative ON (0.25), 10 Qs
  - SEED-002: FREE, BOTH, negative OFF, 10 Qs
  - SEED-003: LOCKED, EN only, negative ON (0.25), 8 Qs
  - SEED-004: LOCKED, BOTH, negative ON (0.25), 10 Qs
  - SEED-005: LOCKED, TE only, negative OFF, 8 Qs
- Config files (`config/testhub.ts`, `config/mockQuestions.ts`) still exist for type definitions (MockTest) used by client components
- `lib/testhubDb.ts` — DB adapter layer: `getDbTestById`, `getAllPublishedTests`, `getDbQuestionsForTest`, `resolveOptionIdFromLetter`, `optionIdToLetter`
- Test difficulty derived from question DifficultyLevel (FOUNDATIONAL→Easy, PROFICIENT→Medium, MASTERY→Hard)
- Option identifiers: Client uses letters (A/B/C/D), APIs translate to/from DB option UUIDs via `resolveOptionIdFromLetter`/`optionIdToLetter`
- `/testhub` page server-fetches via `getPublishedTestsForStudent()` (SSR, no loading state)
- `TestHubClient` (`components/testhub/`) — client component for test list with category filters, auth gating
- Brief & attempt pages use `getDbTestById` from `lib/testhubDb.ts` (not config)
- DB health endpoint: `GET /api/health/db` — checks User, Test, Session table connectivity
- In-memory result store (`lib/resultStore.ts`) — stores computed results, subject breakdowns, and user XP totals (still in-memory, resets on restart)
- API: `POST /api/testhub/attempts/start` — creates or resumes attempt, enforces attempt limits
- API: `GET /api/testhub/attempts/active?testId=` — checks for active attempt + attempts used
- API: `GET /api/testhub/tests/[testId]/attempt-data` — returns test meta, attempt meta, questions, saved answers
- API: `POST /api/testhub/attempts/save-answer` — upserts single answer with time tracking
- API: `POST /api/testhub/attempts/submit` — bulk upserts final answers, marks attempt SUBMITTED
- API: `GET /api/testhub/attempts/summary?attemptId=` — returns overall + subject-wise question state counts
- API: `POST /api/testhub/attempts/generate-result` — computes gross/negative/net marks, accuracy, XP, rank/percentile; idempotent
- API: `GET /api/testhub/attempts/result?attemptId=` — returns full result data with test meta, breakdown, leaderboard
- API: `GET /api/testhub/attempts/review?attemptId=` — returns questions with correctOption, user answers, timing, median time
- API: `POST /api/testhub/questions/report` — saves question issue reports (incorrect key, unclear, translation, etc.)
- API: `GET /api/testhub/tests` — lists all published tests from DB
- API: `POST /api/testhub/attempts/feedback` — saves star rating + comment feedback for an attempt
- `/testhub/tests/[testId]/review` — review page with correctness visualization, timing insights, language toggle
- `ReviewClient` (`components/testhub/`) — client component for reviewing answered questions post-result
  - Green check on correct option, red X on wrong selected option
  - Timing insight: Your Time vs Median with pace label (Very Fast/Ideal/Too Slow)
  - Median only shown when >=20 submitted attempts exist for the question
  - Language toggle to view alternate language (EN/TE)
  - Palette navigation with correct/incorrect/unattempted colors
  - Report Issue modal (radio options + text area) per question
  - Feedback section (star rating 1-5 + comment) on last question
- In-memory report store (`lib/reportStore.ts`) — stores question issue reports
- In-memory feedback store (`lib/feedbackStore.ts`) — stores attempt feedback
- Login/Register forms both support `?from=` redirect for post-auth navigation

### Route Protection
- `proxy.ts` protects: /dashboard, /course, /courses, /test, /admin (redirects unauthenticated to /login)
- `middleware.ts` was removed — Next.js 16 only supports `proxy.ts`

### Navigation & Layout
- `Header` is auth-aware: shows student nav (Dashboard, TestHub, Courses + Log Out) when authenticated, guest nav (Home, Courses, Products + Log In / Create Account) when not
- During auth check (`isAuthed === null`), nav links are hidden to prevent flash of guest nav
- Authenticated-only pages (dashboard, brief, submitted, result, review) do NOT render `<Footer />`
- Public/mixed pages (home, /testhub, /courses) still render `<Footer />`
- `/dashboard` — server-rendered student home with quick links, free test cards, account info
- `/admin/*` additionally enforced server-side via `app/admin/layout.tsx` requiring ADMIN role
- `/testhub/tests/[testId]/brief` and `/attempt` — server-side auth via `getCurrentUser()` + `redirect()`

### Utility Scripts
- `scripts/promoteAdmin.mjs` — promote user to ADMIN by email
- `scripts/makeAdmin.mjs` — alternative admin promotion script
- `scripts/deleteTestUser.mjs` — delete test users
- `scripts/seed-testhub.mjs` — prints seed test data summary (`npm run seed:testhub`)
- `scripts/import-testhub-config-to-db.ts` — imports config tests/questions to DB (`npm run import:testhub`)