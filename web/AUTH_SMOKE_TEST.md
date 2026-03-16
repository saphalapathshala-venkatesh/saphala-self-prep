# Auth Smoke Test Checklist

Run this checklist before every deploy and after any auth-related change.

## Pre-requisites
- App running at localhost:5000 (or deployed URL)
- At least one student account in the DB
- At least one blocked/inactive account (or temporarily set one)

---

## 1. Valid login
- [ ] Navigate to `/login`
- [ ] Enter correct email/mobile and password
- [ ] Confirm: "Logged in successfully!" green card appears
- [ ] Confirm: redirect to `/dashboard` within ~1 second
- [ ] Confirm: dashboard loads with student name visible

## 2. Wrong password
- [ ] Navigate to `/login`
- [ ] Enter correct email but wrong password
- [ ] Confirm: red error box shows "Incorrect email/mobile or password."
- [ ] Confirm: NO redirect occurs, form stays on login page

## 3. Blocked / inactive user
- [ ] Set a test user's `isBlocked = true` in DB (or `isActive = false`)
- [ ] Navigate to `/login` and enter that user's credentials
- [ ] Blocked: confirm red error "Your account has been blocked. Please contact support."
- [ ] Inactive: confirm red error "Your account is inactive. Please contact support."
- [ ] Confirm: NO session is created, user stays on login page

## 4. One-device policy (active session block)
- [ ] Log in successfully on Browser A
- [ ] Without logging out, open Browser B (or private window) and navigate to `/login`
- [ ] Enter the same credentials on Browser B
- [ ] Confirm: amber warning block appears — "Account already active on another device"
- [ ] Confirm: NO second session is created

## 5. Logout then login again
- [ ] Log in successfully
- [ ] Click logout (from dashboard sidebar or profile)
- [ ] Confirm: redirect to `/` or `/login`
- [ ] Navigate to `/login` again
- [ ] Enter correct credentials
- [ ] Confirm: login succeeds normally (no one-device block, since previous session was deleted)

## 6. Protected route access after login
- [ ] Log in successfully
- [ ] Navigate to `/dashboard` — confirm: page loads correctly
- [ ] Navigate to `/learn/lessons` — confirm: page loads correctly
- [ ] Navigate to `/learn/flashcards` — confirm: page loads correctly

## 7. Protected route redirect when logged out
- [ ] Make sure you are NOT logged in (clear cookies or use private window)
- [ ] Navigate to `/dashboard` directly
- [ ] Confirm: redirect to `/login?from=%2Fdashboard`
- [ ] Log in — confirm: redirect back to `/dashboard`

## 8. API health check
- [ ] GET `/api/health` → should return `{ ok: true, db: "ok" }`
- [ ] GET `/api/auth/status` (with valid session cookie) → `{ isAuthed: true }`
- [ ] GET `/api/auth/status` (no cookie) → `{ isAuthed: false }`

---

## 9. Forgot Password — valid flow
- [ ] Navigate to `/login`, click "Forgot password?"
- [ ] Confirm: redirect to `/forgot-password`
- [ ] Enter registered email/mobile and correct last 4 digits of mobile
- [ ] Confirm: Step 2 (set new password) appears
- [ ] Enter new password (8+ chars, 1 letter, 1 number) and confirm it
- [ ] Confirm: success screen "Password reset successful. Please log in with your new password."
- [ ] Navigate to `/login`, log in with OLD password → confirm: fails with "Incorrect email/mobile or password."
- [ ] Log in with NEW password → confirm: succeeds normally

## 10. Forgot Password — verification failure
- [ ] Navigate to `/forgot-password`
- [ ] Enter valid identifier but wrong last 4 digits
- [ ] Confirm: red error "Details do not match our records."
- [ ] Confirm: NO password is changed

## 11. Forgot Password — expired token
- [ ] Complete Step 1 (identity verify) to get a reset token
- [ ] Wait 16+ minutes (or mock token with past expiry)
- [ ] Attempt to submit Step 2
- [ ] Confirm: error "Reset link is invalid or has expired. Please start over."

---

## Notes
- Session idle timeout: **15 minutes** — sessions expire after 15 min of inactivity (rolling window per request)
- Cookie max-age: **7 days** — cookie stays in browser; DB session must still be valid
- One-device policy: applies to all accounts where `allowMultiDevice = false` (default)
- Blocked check: both `isBlocked` and `infringementBlocked` are checked on login AND on every request (`getCurrentUser`)
- Revoked sessions: `getSession()` checks `revokedAt: null` — admin-revoked sessions are immediately invalid
- Edge protection: `proxy.ts` is the Next.js 16 equivalent of `middleware.ts` — it runs at the edge before page render
- Admin can clear a user's sessions via `DELETE /api/admin/users/[id]/sessions`
- Health check: `GET /api/health` confirms DB connectivity
