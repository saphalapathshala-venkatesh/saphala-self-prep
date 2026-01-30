# Saphala Self Prep

## Overview

Saphala Self Prep is an educational platform designed to help students prepare for exams through self-paced learning modules and test simulations. The platform offers two core products: a Self-Prep Module (study materials, PDFs, cheat sheets) and a TestHub Simulator (topic/subject/grand tests). The frontend is built with Next.js and Tailwind CSS, following a clean, study-friendly design with a purple brand color scheme.

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
- No external UI component libraries - only Tailwind + custom components

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

### No Backend/Database Currently
- All data is mock/static in config files
- No authentication system implemented yet
- No API routes defined