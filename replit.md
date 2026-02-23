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

### Authentication
- Cookie-based sessions using `saphala_session` cookie
- Database-backed session store (`lib/sessionStore.ts`) — sessions persist in PostgreSQL Session table
- Sessions expire after 7 days; expired sessions are cleaned up on access
- Server-side auth helpers: `lib/serverAuth.ts`, `lib/requireRole.ts`
- API auth helpers: `lib/apiAuth.ts` (requireAuth, requireRole)
- Registration validates +91 Indian mobile format (10 digits)
- bcrypt password hashing

### Admin Panel
- `/admin` redirects to `/admin/users`
- `/admin/users` — lists users with role dropdown, ADMIN-only (server-side role guard via layout.tsx)
- API: `GET /api/admin/users`, `PATCH /api/admin/users/[id]/role`
- Promote script: `node scripts/promoteAdmin.mjs <email>`

### Route Protection
- `proxy.ts` protects: /dashboard, /course, /courses, /test, /admin (redirects unauthenticated to /login)
- `/admin/*` additionally enforced server-side via `app/admin/layout.tsx` requiring ADMIN role

### Utility Scripts
- `scripts/promoteAdmin.mjs` — promote user to ADMIN by email
- `scripts/makeAdmin.mjs` — alternative admin promotion script
- `scripts/deleteTestUser.mjs` — delete test users