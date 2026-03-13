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
- Features a dynamic quote strip, hero banner, product discovery cards, exam categories fetched from the database, feature highlights, and a contact form.

### APIs
- **Public APIs**: For fetching daily quotes (`/api/public/quote-of-the-day`), exam categories (`/api/public/categories`), and handling contact form submissions (`/api/public/contact`).
- **Authenticated APIs**: For TestHub operations (starting/resuming attempts, saving answers, submitting tests, generating/retrieving results, reviewing attempts, reporting questions, feedback).
- **Admin APIs**: For managing users and roles.

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