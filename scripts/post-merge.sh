#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
cd web && npm install --ignore-scripts

echo "[post-merge] Applying safe schema migrations..."
# Safe ADD COLUMN IF NOT EXISTS — idempotent, never destructive
psql "$DATABASE_URL" <<'SQL'
ALTER TABLE "Subject"      ADD COLUMN IF NOT EXISTS "subjectColor" TEXT;
ALTER TABLE "FlashcardDeck" ADD COLUMN IF NOT EXISTS "subjectColor" TEXT;
SQL

echo "[post-merge] Regenerating Prisma client..."
npx prisma generate

echo "[post-merge] Done."
