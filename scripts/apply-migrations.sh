#!/usr/bin/env bash
# Applies new database migrations to the live database (run by the GitHub workflow).
# Each migration runs in its own transaction and is recorded in app.schema_migrations,
# so it is applied exactly once. Prints a short status report at the end.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is not set}"
cd "$(dirname "$0")/.."
Q() { psql "$DATABASE_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "$1"; }
RUN() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -1 "$@"; }

# First run on the wave-1 test database: rebuild it (stops by itself if real data exists).
if [ "$(Q "select to_regclass('public.cycles') is not null")" = "t" ]; then
  echo "Removing the wave-1 test tables"
  RUN -f supabase/rebuild-from-wave1.sql
fi

fresh="$(Q "select to_regclass('public.studios') is null")"
if [ "$fresh" = "f" ] && [ "$(Q "select to_regclass('app.schema_migrations') is not null")" = "f" ]; then
  echo "The database has tables but no record of which migrations ran. Stopping to be safe."; exit 1
fi

for f in supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  if [ "$(Q "select to_regclass('app.schema_migrations') is not null")" = "t" ] \
     && [ "$(Q "select exists (select 1 from app.schema_migrations where version = '$v')")" = "t" ]; then
    continue
  fi
  echo "Applying $v"
  RUN -f "$f" -c "create table if not exists app.schema_migrations (version text primary key, applied_at timestamptz not null default now());
                  insert into app.schema_migrations (version) values ('$v');"
done

if [ "$fresh" = "t" ]; then
  echo "Adding the Shaan Fitness starting setup"
  RUN -f supabase/seed.sql
fi

Q "select json_build_object(
  'checked_at', now(),
  'migrations', (select json_agg(version order by version) from app.schema_migrations),
  'studios', (select count(*) from public.studios),
  'dropdown_options', (select count(*) from public.list_items),
  'services', (select count(*) from public.services),
  'plans', (select count(*) from public.plans),
  'batches', (select count(*) from public.batches),
  'staff', (select count(*) from public.staff),
  'linked_staff_logins', (select count(*) from public.staff where user_id is not null),
  'clients', (select count(*) from public.members),
  'subscriptions', (select count(*) from public.subscriptions)
)" > db-status.json
cat db-status.json
