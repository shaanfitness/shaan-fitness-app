#!/usr/bin/env bash
# Starts a throwaway local database with made-up data and the local API, for testing
# the app's real queries and access rules without touching the live project.
#   scripts/local-stack.sh start   → database on :54329, API on :54321
#   scripts/local-stack.sh stop
# Then run the app with: VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=$(cat .local-stack/anon-key) npm run dev
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
STATE="$ROOT/.local-stack"
DATA="$STATE/pgdata"
PORT=54329
RUN_AS=()
if [ "$(id -u)" = "0" ]; then RUN_AS=(runuser -u postgres --); fi

stop() {
  [ -f "$STATE/api.pid" ] && kill "$(cat "$STATE/api.pid")" 2>/dev/null || true
  [ -d "$DATA" ] && "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$STATE"
}

start() {
  stop
  mkdir -p "$STATE" && chmod 777 "$STATE"
  mkdir -p "$DATA"
  [ "$(id -u)" = "0" ] && chown postgres "$DATA"
  "${RUN_AS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
  "${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$STATE/pg.log" start >/dev/null
  PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
  "${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stubs.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
  "${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
  "${PSQL[@]}" -f "$ROOT/supabase/fixtures/test-plans.sql" >/dev/null
  "${PSQL[@]}" -f "$ROOT/scripts/local-api/demo-data.sql"
  node -e "
    const c=require('crypto');const s='local-dev-secret-not-for-production';
    const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const h=b({alg:'HS256',typ:'JWT'}),p=b({role:'anon',iss:'local',exp:4102444800});
    process.stdout.write(h+'.'+p+'.'+c.createHmac('sha256',s).update(h+'.'+p).digest('base64url'))" > "$STATE/anon-key"
  DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/postgres" nohup node "$ROOT/scripts/local-api/server.mjs" > "$STATE/api.log" 2>&1 &
  echo $! > "$STATE/api.pid"
  sleep 1
  echo "database :$PORT, API http://127.0.0.1:54321"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
esac
