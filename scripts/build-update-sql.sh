#!/usr/bin/env bash
# Builds a paste-in update for a database that is already set up. Every migration newer than
# BASE is in the file, and each one runs only if the database doesn't have it yet, so the same
# file works whichever earlier update was (or wasn't) run, and running it twice changes nothing.
# One transaction: if anything fails, nothing changes.
#   scripts/build-update-sql.sh [BASE]   → supabase/update.sql
#   BASE defaults to 20261008000007_member_billing (the first live setup, 8 Oct 2026).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-20261008000007_member_billing}"
OUT="$ROOT/supabase/update.sql"
NEW=()
for f in "$ROOT"/supabase/migrations/*.sql; do v="$(basename "$f" .sql)"; [[ "$v" > "$BASE" ]] && NEW+=("$f"); done
LATEST="$(basename "${NEW[-1]}" .sql)"
# Data that goes in together with a migration (the real YDL plans and batches came with the registers).
extra_for() {
  case "$1" in
    20261008000008_registers) cat "$ROOT/supabase/replace-starter-plans.sql" "$ROOT/supabase/seed-ydl.sql" ;;
    20261009000010_team) cat "$ROOT/supabase/seed-ydl-offers.sql" ;;
  esac
}
{
  echo "-- Shaan Fitness · database update (up to $LATEST)"
  echo "-- Paste everything into Supabase → SQL Editor → New query, then click Run."
  echo "-- Safe to run more than once: parts the database already has are skipped."
  echo "begin;"
  echo
  echo "do \$guard\$ begin"
  echo "  if to_regclass('app.schema_migrations') is null then raise exception 'This database is not set up yet. Run setup-all.sql instead.'; end if;"
  echo "  if not exists (select 1 from app.schema_migrations where version = '$BASE') then"
  echo "    raise exception 'This update needs % first. Ask Claude for the right update file.', '$BASE'; end if;"
  echo "end \$guard\$;"
  echo
  for f in "${NEW[@]}"; do
    v="$(basename "$f" .sql)"; tag="u${v%%_*}"
    if grep -q "\$$tag\\$" "$f"; then echo "migration $v contains \$$tag\$" >&2; exit 1; fi
    echo "-- ===== $v ====="
    echo "do \$b$tag\$ begin"
    echo "  if exists (select 1 from app.schema_migrations where version = '$v') then raise notice 'already has $v'; return; end if;"
    echo "  execute \$$tag\$"
    cat "$f"
    extra_for "$v"
    echo "\$$tag\$;"
    echo "  insert into app.schema_migrations (version) values ('$v');"
    echo "end \$b$tag\$;"
    echo
  done
  echo "commit;"
  echo
  echo "select (select max(version) from app.schema_migrations) as latest,"
  echo "       (select count(*) from public.plans where active) as active_plans,"
  echo "       (select count(*) from public.batches where active) as active_batches,"
  echo "       'Shaan Fitness database is up to date' as status;"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes, ${#NEW[@]} migrations after $BASE)"
