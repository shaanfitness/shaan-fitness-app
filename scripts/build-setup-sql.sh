#!/usr/bin/env bash
# Builds one file to paste into Supabase's SQL editor: removes the wave-1 test tables
# (only if present, and only if no real data), builds every migration, adds the
# Shaan Fitness starting setup, records the versions, and ends with a check.
# All in one transaction: if anything fails, nothing changes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/setup-all.sql"
{
  echo "-- Shaan Fitness · database setup"
  echo "-- Paste everything into Supabase → SQL Editor → New query, then click Run."
  echo "begin;"
  echo
  echo "do \$guard\$ begin"
  echo "  if to_regclass('app.schema_migrations') is not null then"
  echo "    raise exception 'This database is already set up. Run the latest update file (update.sql) instead. Nothing was changed.';"
  echo "  end if;"
  echo "end \$guard\$;"
  echo
  echo "-- ===== rebuild-from-wave1.sql ====="; cat "$ROOT/supabase/rebuild-from-wave1.sql"; echo
  for f in "$ROOT"/supabase/migrations/*.sql; do echo "-- ===== $(basename "$f") ====="; cat "$f"; echo; done
  echo "-- ===== seed.sql ====="; cat "$ROOT/supabase/seed.sql"; echo
  echo "-- ===== seed-ydl.sql ====="; cat "$ROOT/supabase/seed-ydl.sql"; echo
  echo "-- ===== versions ====="
  echo "create table if not exists app.schema_migrations (version text primary key, applied_at timestamptz not null default now());"
  for f in "$ROOT"/supabase/migrations/*.sql; do echo "insert into app.schema_migrations (version) values ('$(basename "$f" .sql)') on conflict do nothing;"; done
  echo
  echo "commit;"
  echo
  echo "-- ===== check ====="
  echo "select (select count(*) from public.list_items) as dropdown_options,"
  echo "       (select count(*) from public.services) as services,"
  echo "       (select count(*) from public.plans) as plans,"
  echo "       (select count(*) from public.batches) as batches,"
  echo "       (select count(*) from public.staff where user_id is not null) as linked_logins,"
  echo "       'Shaan Fitness database is ready' as status;"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
