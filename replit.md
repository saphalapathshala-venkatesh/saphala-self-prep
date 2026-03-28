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
- `app/api/student/videos/[id]/playback`: Protected endpoint — validates session + entitlement, signs Bunny URLs server-side, returns `{ manifestUrl, posterUrl, provider, providerVideoId }`. Signed URL never appears in SSR HTML.
- `lib/video/bunnyPlayback.ts`: `signBunnyUrl()` applies HMAC-SHA256 Bunny token auth when `BUNNY_SECURITY_KEY` is set; passes URL through otherwise. `resolveManifestUrl()` picks best playable URL from a video row.
- `components/video/CourseVideoPlayer.tsx`: Client component. Accepts `playbackApiUrl` (fetches on mount) or direct `manifestUrl`. Handles HLS.js, native Safari HLS, YouTube iframe, loading/error/unsupported states, and 15-second progress tracking.

#### Course Pricing & Checkout
Course pricing is managed by `Course.sellingPrice` and `Course.mrp` (for strikethrough). The checkout flow integrates with Cashfree for payments, supports coupons, and manages `ProductPackage` for entitlement mapping. The system ensures robust security for payment credentials.

#### Course Catalog (`/courses`)
A server component displaying active courses with stackable server-side filters.

#### APIs
Public APIs for daily quotes, categories, and contact forms. Authenticated APIs for TestHub operations, results, and feedback. Admin APIs for user management.

#### Route Protection
Protected routes (`/dashboard`, `/learn`, `/admin`) redirect unauthenticated users to `/login`.

#### Forgot Password Flow
Allows students to reset passwords via email/mobile and mobile number verification, revoking existing sessions upon success.

#### Auth Hardening
Session validation includes checks for `revokedAt`, `isBlocked`, `isActive`, `deletedAt`, and `infringementBlocked` on every request. Login API provides explicit error codes.

## External Dependencies

-   Next.js 16.1.6
-   React 19.2.3
-   Tailwind CSS 4
-   TypeScript 5
-   Prisma 7
-   Neon PostgreSQL
-   lucide-react
-   canvas-confetti
-   Geist font family