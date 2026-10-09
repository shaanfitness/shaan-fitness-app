#!/usr/bin/env bash
# Runs the migrations, seed and access-rule tests on a throwaway local Postgres.
# Usage: scripts/test-db.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="$(mktemp -d)"
PORT="${PORT:-54330}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then RUN_AS=(runuser -u postgres --); chown postgres "$DATA"; fi

cleanup() { "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

"${RUN_AS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DATA/log" start >/dev/null
PSQL=("${RUN_AS[@]}" psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/fixtures/test-plans.sql"
for t in "$ROOT"/supabase/tests/0[1-9]_*.sql; do "${PSQL[@]}" -f "$t"; done

# The real setup: Shaan Fitness's YDL plans and batches load on a fresh database.
"${RUN_AS[@]}" psql -h /tmp -p "$PORT" -U postgres -d postgres -q -c "create database ydlcheck"
PSQL2=("${RUN_AS[@]}" psql -h /tmp -p "$PORT" -U postgres -d ydlcheck -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL2[@]}" -f "$ROOT/supabase/tests/00_supabase_stubs.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL2[@]}" -f "$f" >/dev/null; done
"${PSQL2[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
"${PSQL2[@]}" -f "$ROOT/supabase/seed-ydl.sql" >/dev/null
"${PSQL2[@]}" -f "$ROOT/supabase/seed-ydl-offers.sql" >/dev/null
"${PSQL2[@]}" -f "$ROOT/supabase/seed-ydl-center.sql" >/dev/null
"${PSQL2[@]}" -f "$ROOT/supabase/seed-ydl-center.sql" >/dev/null   # twice: must change nothing the second time
"${PSQL2[@]}" -c "select format('YDL setup: %s plans (%s active, %s personal training), %s batches, every batch has services: %s, %s coupons (%s active), %s combo offer',
  (select count(*) from public.plans), (select count(*) from public.plans where active), (select count(*) from public.plans where kind = 'pt'),
  (select count(*) from public.batches), (select bool_and(cardinality(service_ids) > 0) from public.batches),
  (select count(*) from public.coupons), (select count(*) from public.coupons where active and service_id is not null), (select count(*) from public.combo_offers where cardinality(plan_ids) = 2))"
"${PSQL2[@]}" -c "select format('YDL center: %s, %s, invoices %s…%s, %s app items, %s notices, %s device, website shows %s session(s)',
  (select street1 || ', ' || locality from public.studios), (select settings->'center'->>'dashboard_design' from public.studios),
  (select settings->'invoice'->>'prefix' from public.studios), (select settings->'invoice'->>'suffix' from public.studios),
  (select count(*) from public.app_actions), (select count(*) from public.notices), (select count(*) from public.biometric_devices),
  (select jsonb_array_length(public.site_info()->'studio'->'timings'->'sessions')))"
