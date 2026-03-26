# Saphala Pathshala

## Overview
Saphala Pathshala is an educational platform designed to provide a comprehensive learning experience for exam preparation. It offers self-paced learning, simulated tests, premium video lessons, and a library of study materials. The platform aims to empower students with effective tools for academic success through features like Smart Learning (concept lessons, flashcards), TestHub (exam simulations), Pathshala (premium video lessons), and Prep Library (PDFs, study materials).

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with Next.js 16 (App Router, TypeScript, React 19) and styled using Tailwind CSS 4, custom CSS, and `lucide-react` for icons. It features a modular and responsive design, with standard layout components and server-side authentication handled in `app/(student)/layout.tsx`. Key terminology is centrally defined.

### Backend & Database
The backend utilizes Prisma 7 ORM with Neon PostgreSQL. User authentication is cookie-based, storing sessions in PostgreSQL with `bcrypt` for password hashing. The database client uses `@prisma/adapter-neon` for serverless compatibility. User roles include `STUDENT`, `ADMIN`, and `SUPER_ADMIN`. The system supports robust user registration, a "one-device login" feature, and an XP architecture that tracks user progress and awards points for various learning activities. The student frontend shares its database with the admin application, with schema governance ensuring that the student's `schema.prisma` is a superset of the admin schema and direct production database alterations are forbidden. Content availability is controlled by `unlockAt` fields.

### XP Architecture
XP is managed via `XpLedgerEntry` rows, tracking points, reason, and reference type (`Attempt`, `FlashcardDeck`, `ContentPage`, `Video`). The dashboard displays total XP and a breakdown by `refType`. Idempotency checks prevent duplicate XP awards. XP celebrations are triggered via a reusable utility.

### Admin APIs
Admin APIs facilitate user session management, multi-device access control, and retrieval of user attempt records.

### Learner Attempt Visibility APIs
APIs provide data for learner attempts, including summaries, earned XP, and detailed breakdowns.

### Concurrent Test Protection
The `Attempt` model uses `lockedSessionToken` to prevent simultaneous test access, returning a `409 Conflict` for concurrent attempts.

### Core Features

#### Admin Panel
An administrative interface at `/admin` allows `ADMIN` users to manage users and roles.

#### TestHub
Provides simulated exams with language selection, question palette, real-time timers, and auto-submission. Post-exam analysis includes XP, rank, percentile, topper comparison, leaderboard, correctness visualization, timing insights, heat maps, focus areas, and mentor suggestions. Result pages offer Summary, Full Report, and Suggestions tabs. Rank and leaderboard are DB-based, calculated on first attempts only. Per-question timing analysis is available in review.

#### Student Dashboard
Located at `/dashboard`, it offers an overview of student progress, metrics, recent attempts, and a profile summary. It includes a "Your Daily Practice" card, providing personalized content suggestions (tests, flashcards, ebooks) based on completion status and performance.

#### Homepage
A dynamic layout featuring a hero slider, database-driven exam categories, featured courses, product types, and a contact form. Most content is accessible to guests, with learning materials requiring login.

#### Content Library (Student Content Reflection Layer)
Learning content routes under `app/(student)/` are dynamically generated from the database and require login. This includes:
- **Ebooks (`/learn/lessons`)**: Listings of published `ContentPage` rows with a paginated, multi-chapter reader. XP is awarded upon completion.
- **PDFs (`/learn/pdfs`)**: Listings of published `PdfAsset` rows for download.
- **Flashcard Decks (`/learn/flashcards`)**: Listings of published `FlashcardDeck` rows with an interactive study UI.

#### Course Architecture
Courses are organized by `Exam Category` and `Product Category`. A 5-level curriculum tree (`Course → CourseSubjectSection → Chapter → Lesson → LessonItem`) defines the structure. `LessonItem.itemType` determines the viewer (ebook, PDF, flashcard, video, external link). `unlockAt` controls scheduled release. Free demo courses are accessible to all logged-in students. Course APIs use raw SQL for admin-owned tables.

#### Live Classes (`/live-classes`)
Student-facing live class feature with listings grouped by `LIVE NOW`, `Upcoming`, and `Past`. Join window for live classes is calculated server-side. Join credentials are only revealed when `canJoin = true && isEntitled = true`. Entitlement check: FREE classes always accessible; PAID classes require active `UserEntitlement` matching `courseId` or `course.productCategory`. `liveStatus` states: `UPCOMING | LIVE_NOW | ENDED | COMPLETED | LOCKED`. Dashboard shows nearest published class via `getDashboardLiveClass(userId)` with state-aware CTA.

#### Recorded Videos (`/videos`, `/videos/[id]`)
Student-facing video library from the `Video` table (admin-owned, queried via raw SQL). Lists published videos with duration, faculty, and entitlement badge. Detail page embeds YouTube via `providerVideoId` for YOUTUBE provider; other providers use `hlsUrl`/`playbackUrl`. Non-entitled students see preview if `allowPreview=true`. XP awarded on first watch. Protected by `proxy.ts`.

#### Course Pricing Architecture
`Course.sellingPrice` (admin-set, stored in rupees) is the authoritative base price for all student-facing surfaces. `Course.mrp` (rupees) is the original price for strikethrough display. `discountPercent` is computed via `computeDiscount(mrp, sellingPrice)`. The paise columns (`mrpPaise`, `sellingPricePaise`) are always NULL and must not be used. Prices are formatted as `₹${value.toLocaleString("en-IN")}` — no division by 100.

`courseDb.ts` selects `mrp`, `sellingPrice`, and `packageId` in both `getActiveCourses()` and `getCourseWithCurriculum()`, via LEFT JOIN LATERAL on `ProductPackage` (selecting `id` only) to resolve the checkout URL. `packagePricePaise` is NOT fetched and NOT used for any pricing display.

**ProductPackage role**: Used for entitlement/product mapping (`packageId` → checkout URL) only. Its `pricePaise` does NOT override course pricing anywhere in the student frontend.

**Checkout flow**: The course detail CTA links to `/checkout?packageId=<id>&courseId=<id>`. `checkout/page.tsx` fetches `Course.sellingPrice` using `courseId`, converts to paise (`Math.round(sellingPrice * 100)`), and passes it as `basePricePaise` to `CheckoutClient`. Without `courseId` (e.g., from `/plans` page), it falls back to `pkg.pricePaise`. The price label is "Course price" (from course entry) or "Package price" (from plans entry).

**Coupon flow**: `validateCoupon()` accepts an optional `overrideBasePaise`. The coupon API accepts `basePricePaise` query param and forwards it as `overrideBasePaise`. PERCENT coupons compute against `basePricePaise` (course selling price); FLAT coupons are capped at `basePricePaise`. `CheckoutClient` passes `basePricePaise` when calling the coupon API so the displayed discount always matches the course selling price.

All student surfaces (course catalog, dashboard courses, course detail, featured courses on homepage) display `sellingPrice` as buy price, MRP as strikethrough, `discountPercent`%, validity, and "Buy Now →" CTA. Free courses (`productCategory === "FREE_DEMO"` or `isFree = true`) always show "Start Free →". Validity is shown from `validityType`, `validityDays`, `validityMonths`, `validUntil` on course cards and the detail page. `getCourseWithCurriculum` parallelizes the course header + sections queries with `Promise.all`.

#### Checkout & Orders (`/plans`, `/checkout`, `/checkout/result`, `/orders`)
- **Plans page** (`/plans`): Fetches active `ProductPackage` rows via `listActivePackages()` in `paymentOrderDb.ts`. Uses a reverse LATERAL JOIN on `Course` (matching `pp.entitlementCodes @> ARRAY[Course.productCategory]`) to resolve `linkedCourseId` and `linkedCourseSellingPrice`. Displays `linkedCourseSellingPrice` (rupees) when a linked course exists; falls back to `pricePaise÷100`. CTA links to `/checkout?packageId=x&courseId=x` when linked course exists, so checkout uses `Course.sellingPrice` as the authoritative amount. Admin does not store a `courseId` on packages — the link is purely by matching `entitlementCodes` to `productCategory`.
- **Checkout page** (`/checkout?packageId=xxx&courseId=xxx`): Server component fetches package via `getActivePackage()`, reads `Course.sellingPrice` when `courseId` is present, derives `cashfreeMode` server-side (never via `NEXT_PUBLIC_`). Renders `CheckoutClient.tsx` with coupon input, price summary, and Cashfree JS SDK integration.
- **Result page** (`/checkout/result?orderId=xxx`): Polls GET /api/student/orders/[id] every 3s (up to 30 polls) until PAID/FAILED/CANCELLED; redirects to /orders on PAID.
- **Orders page** (`/orders`): Client component. Fetches GET /api/student/orders and GET /api/student/refund-requests. Shows order history with status badges; PAID orders show "Request Refund" button which opens `RefundModal.tsx`.
- **POST /api/student/orders**: Creates Cashfree order server-side using `CASHFREE_APP_ID` + `CASHFREE_SECRET_KEY` via `lib/cashfreeClient.ts`. Handles resume of open orders, zero-amount fast path, entitlement grants. Returns only `{ orderId, paymentSessionId }` — no secrets to client.
- **POST /api/student/refund-requests**: Inserts `RefundRequest` row directly into DB; enforces 3-day eligibility gate and deduplication.
- **Webhook** (`/api/student/orders/webhook`): Verifies Cashfree signature via `CASHFREE_WEBHOOK_SECRET` (HMAC-SHA256). Updates `PaymentOrder` status and grants `UserEntitlement` rows on `PAYMENT_SUCCESS_WEBHOOK`.
- **Coupon validation** (`/api/student/coupon?code=&packageId=&basePricePaise=`): Read-only — validates against `Coupon` table and computes discount paise against `basePricePaise` (course selling price).
- **`lib/cashfreeClient.ts`**: Server-only module. `createCashfreeOrder()` calls Cashfree PG API. `verifyCashfreeWebhook()` verifies HMAC. `sanitizePhone()` normalises Indian mobiles. Mode controlled by `CASHFREE_ENV` env var (default `sandbox`).
- **`lib/paymentOrderDb.ts`**: All read helpers (`getActivePackage`, `listOrdersForUser`, `getOrderById`, `getOpenRefundRequest`, `listRefundRequestsForUser`, `validateCoupon`, `listActivePackages`) use `$queryRawUnsafe` parameterized queries against admin-owned tables.
- **Security**: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET` are backend-only secrets. No `NEXT_PUBLIC_CASHFREE*` variables exist. Frontend only receives `orderId` + `paymentSessionId`.

#### Course Catalog (`/courses`)
A database-driven server component displaying active courses with stackable server-side filters for `category`, `productCategory`, and `exam`. An exam filter row dynamically appears when a category with associated exams is selected.

### APIs
Public APIs provide daily quotes, categories, and contact form functionality. Authenticated APIs support TestHub operations (start, save, submit, results, review, reporting, feedback). Admin APIs manage user and role data.

### Legal Config
Legal constants (`LEGAL_VERSION`, `LEGAL_TERMS_URL`, `LEGAL_REFUND_URL`) are defined in `web/config/legal.ts` for signup and checkout flows.

### Route Protection
`proxy.ts` redirects unauthenticated guests from protected routes (`/dashboard`, `/learn`, `/admin`) to `/login`.

### Forgot Password Flow
Students can reset passwords at `/forgot-password` using registered email/mobile and the last 4 digits of their mobile number. This generates a short-lived HMAC-SHA256 token, revoking all existing sessions upon successful reset.

### Student Test Panel
The TestHub student test panel (`components/testhub/TestAttemptClient.tsx`) utilizes a 7-route student API layer at `/api/student/`. It supports sections, multiple timer modes, and fully DB-persisted pause/resume functionality. Answers are tracked by `selectedOptionId`. The pause/resume design creates `AttemptPause` rows and atomically updates `Attempt.status`, ensuring accurate remaining time.

### Auth Hardening
`getSession()` checks `revokedAt: null` to invalidate sessions. `getCurrentUser()` and `getCurrentUserAndSession()` re-check `isBlocked`, `isActive`, `deletedAt`, and `infringementBlocked` on every request. The login API returns explicit error codes for robust error handling.

## External Dependencies

- Next.js 16.1.6
- React 19.2.3
- Tailwind CSS 4
- TypeScript 5
- Prisma 7
- Neon PostgreSQL
- lucide-react
- canvas-confetti
- Geist font family