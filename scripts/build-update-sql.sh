#!/usr/bin/env bash
# Builds a paste-in update for a database that is already set up: every migration newer than
# the last one it has, the YDL plans and batches (only the ones missing), recorded versions,
# and a check. One transaction: if anything fails, nothing changes.
#   scripts/build-update-sql.sh 20261008000007_member_billing   → supabase/update.sql
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAST="${1:?give the last migration the database already has, e.g. 20261008000007_member_billing}"
OUT="$ROOT/supabase/update.sql"
NEW=()
for f in "$ROOT"/supabase/migrations/*.sql; do v="$(basename "$f" .sql)"; [[ "$v" > "$LAST" ]] && NEW+=("$f"); done
FIRST="$(basename "${NEW[0]:-none}" .sql)"
{
  echo "-- Shaan Fitness · database update (after $LAST)"
  echo "-- Paste everything into Supabase → SQL Editor → New query, then click Run."
  echo "begin;"
  echo
  echo "do \$guard\$ begin"
  echo "  if to_regclass('app.schema_migrations') is null then raise exception 'This database is not set up yet. Run setup-all.sql instead.'; end if;"
  echo "  if not exists (select 1 from app.schema_migrations where version = '$LAST') then"
  echo "    raise exception 'This update needs % first. Ask Claude for the right update file.', '$LAST'; end if;"
  [ "$FIRST" != "none" ] && echo "  if exists (select 1 from app.schema_migrations where version = '$FIRST') then raise exception 'This update has already been run. Nothing was changed.'; end if;"
  echo "end \$guard\$;"
  echo
  for f in "${NEW[@]}"; do echo "-- ===== $(basename "$f") ====="; cat "$f"; echo; done
  echo "-- ===== replace-starter-plans.sql ====="; cat "$ROOT/supabase/replace-starter-plans.sql"; echo
  echo "-- ===== seed-ydl.sql ====="; cat "$ROOT/supabase/seed-ydl.sql"; echo
  for f in "${NEW[@]}"; do echo "insert into app.schema_migrations (version) values ('$(basename "$f" .sql)') on conflict do nothing;"; done
  echo
  echo "commit;"
  echo
  echo "select (select string_agg(version, ', ' order by version) from app.schema_migrations where version > '$LAST') as added,"
  echo "       (select count(*) from public.plans where active) as active_plans,"
  echo "       (select count(*) from public.batches where active) as active_batches,"
  echo "       'Shaan Fitness database is up to date' as status;"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes, ${#NEW[@]} migrations)"
