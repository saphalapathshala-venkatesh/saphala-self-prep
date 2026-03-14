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
- Located at `/dashboard`, featuring a collapsible sidebar for navigation.
- Displays user-specific information and access to different platform sections.

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