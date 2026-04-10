# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed for comprehensive exam preparation, offering self-paced learning, simulated tests, premium video lessons, and a library of study materials. Its core purpose is to equip students with effective tools for academic success through features like Smart Learning, TestHub, Pathshala, and Prep Library. The platform aims to be a leading resource for students seeking to excel in their academic pursuits, focusing on academic excellence and market potential in the educational technology sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with Next.js 16 (App Router, TypeScript, React 19), styled using Tailwind CSS 4, custom CSS, and `lucide-react` for icons. It emphasizes modularity, responsiveness, and server-side authentication. The UI/UX prioritizes a clean, intuitive design.

### Backend & Database
The backend uses Prisma 7 ORM with Neon PostgreSQL. User authentication is cookie-based with sessions stored in PostgreSQL and `bcrypt` for password hashing. User roles include `STUDENT`, `ADMIN`, and `SUPER_ADMIN`. The system includes an XP architecture for tracking progress and awarding points, and supports a "one-device login" feature. Content availability is managed via `unlockAt` fields. All time-sensitive data is handled in IST (Asia/Kolkata, UTC+5:30).

### Core Features

#### XP Architecture
An experience point (XP) system tracks user progress for various learning activities (attempts, flashcards, content pages, videos). XP awards follow a diminishing return pattern (e.g., 1st attempt: 100%, 2nd: 50%, 3rd+: 0%). The system maintains `UserXpSourceProgress`, `XpLedgerEntry` (immutable log), and `UserXpWallet` (live balance) for robust XP management.

#### Admin Panel
An administrative interface at `/admin` allows `ADMIN` users to manage users, roles, videos, and doubts.

#### TestHub
Offers simulated exams with features like language selection, question palette, real-time timers, and auto-submission. Post-exam analysis includes XP, rank, percentile, leaderboard, and detailed insights. Supports English, a secondary language (e.g., Telugu), and a bilingual (stacked) display mode, with content fallbacks. Access to tests is determined by `isFree` status, direct entitlements, or derived from course purchases.

#### Student Dashboard
The dashboard at `/dashboard` provides an overview of student progress, metrics, recent attempts, personalized daily practice suggestions, and an integrated XP summary.

#### Content Library
Dynamically generated learning content includes:
-   **Ebooks (`/learn/lessons`)**: Paginated, multi-chapter readers with XP awards.
-   **PDFs (`/learn/pdfs`)**: Downloadable study materials with entitlement enforcement for free and paid content.
-   **Flashcard Decks (`/learn/flashcards`)**: Interactive study UIs.

#### Course Architecture
Courses are organized by `Exam Category` and `Product Category` within a 5-level curriculum tree. `unlockAt` controls scheduled release, and free demo courses are available. Course pricing is managed by `sellingPrice` and `mrp`, with integration for payment gateways like Cashfree and coupon support. Course entitlements can grant access to linked test series.

#### Video Content
-   **Live Classes (`/live-classes`)**: Listings of live classes (LIVE NOW, Upcoming, Past) with entitlement checks.
-   **Recorded Videos (`/videos`)**: A video library with entitlement-based access, YouTube embeds, and HLS streaming. XP is awarded on first watch. The video player handles robust playback (HLS.js, native Safari HLS) and progress tracking, with server-side signed URLs for secure access. Students can ask doubts via an integrated `DoubtModal`.

#### Authentication & Security
Cookie-based session authentication with `bcrypt` for password hashing. Protected routes redirect unauthenticated users. Includes a secure forgot/reset password flow using Resend for email delivery and stateless HMAC-SHA256 signed tokens. Session validation includes comprehensive checks (`revokedAt`, `isBlocked`, `isActive`, `deletedAt`, `infringementBlocked`).

#### Communication
Contact forms (homepage and `/contact`) use `POST /api/public/contact` to send emails via Resend, incorporating rate limiting and honeypot checks.

## External Dependencies

-   Next.js 16
-   React 19
-   Tailwind CSS 4
-   TypeScript 5
-   Prisma 7
-   Neon PostgreSQL
-   lucide-react
-   canvas-confetti
-   resend (email delivery)
-   Cashfree (payment gateway)
-   Geist font family
-   Bunny CDN (for video streaming)