#!/usr/bin/env bash
# Builds one file to paste into Supabase's SQL editor on a brand-new project:
# every migration, then the Shaan Fitness starting setup, then a check.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/setup-all.sql"
{
  echo "-- Shaan Fitness · database setup (run once, on a new Supabase project)"
  echo "-- Paste everything into Supabase → SQL Editor → New query, then click Run."
  echo
  for f in "$ROOT"/supabase/migrations/*.sql; do echo "-- ===== $(basename "$f") ====="; cat "$f"; echo; done
  echo "-- ===== seed.sql ====="; cat "$ROOT/supabase/seed.sql"; echo
  echo "-- ===== check ====="
  echo "select (select count(*) from public.plans) as plans,"
  echo "       (select count(*) from public.slots) as slots,"
  echo "       (select count(*) from public.staff) as staff,"
  echo "       'Shaan Fitness database is ready' as status;"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
