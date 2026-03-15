# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed to enhance exam preparation through self-paced learning and simulated tests. It offers four main products: Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials). The platform aims to provide a comprehensive and effective learning experience for students.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with **Next.js 16** (App Router, TypeScript, React 19) and styled using **Tailwind CSS 4**, complemented by custom CSS and design tokens. Icons are provided by **lucide-react**. Canonical layout components are centralized in `web/components/layout/`, ensuring consistency. The `app/(student)/layout.tsx` provides server-side authentication and wraps student-facing pages in a dashboard shell. Homepage sections are modular, database-driven where applicable, and responsive design is a core principle. Key terminology and navigation labels are managed in `config/terminology.ts`.

### Backend & Database
The backend utilizes **Prisma 7** ORM with **Neon PostgreSQL**. User authentication is cookie-based, with sessions stored in PostgreSQL, secured with `bcrypt` for password hashing. The system supports `STUDENT`, `ADMIN`, and `SUPER_ADMIN` roles. User registration includes `fullName`, `email`, `mobile`, `state`, `gender`, and `password`, with legal acceptance (`legalAccepted`, `legalVersion`) enforced. A "one-device login" feature blocks concurrent logins for users who opt out of multi-device access. Mobile numbers are normalized to 10 digits. XP calculation for TestHub incorporates an `xpMultiplier` based on attempt number.

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

#### Learn Routes (Student Content Reflection Layer)
All learning content routes are dynamically generated from the database. This includes:
- **Lesson Notes (`/learn/lessons`)**: A public listing of published `ContentPage` rows, displaying taxonomy breadcrumbs. Authenticated users can view individual lessons with HTML content.
- **PDF Study Materials (`/learn/pdfs`)**: A public listing of published `PdfAsset` rows. Logged-in users can download files directly, while guests are prompted to log in.
- **Flashcard Decks (`/learn/flashcards`)**: A public listing of published `FlashcardDeck` rows with card counts. Authenticated users can study decks using an interactive flip-card UI.

#### Course Catalog (`/courses`)
A database-driven server component that dynamically queries and displays published content from `TestSeries`, `PdfAsset`, `FlashcardDeck`, and `ContentPage`, organized by product type. It replaces previous hardcoded course listings.

### APIs
- **Public APIs**: For daily quotes, categories, and contact form submissions.
- **Authenticated APIs**: For TestHub operations (starting tests, saving answers, submitting, generating results, reviewing, reporting questions, feedback).
- **Admin APIs**: For user and role management.

### Legal Config
Legal constants like `LEGAL_VERSION`, `LEGAL_TERMS_URL`, and `LEGAL_REFUND_URL` are defined in `web/config/legal.ts` and used across the platform for signup and future checkout flows. Policy pages exist as placeholders.

### Route Protection
A `proxy.ts` mechanism redirects unauthenticated users from protected routes to the login page.

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