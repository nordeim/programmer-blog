#!/bin/bash
# start_server.sh — Fresh-clone → production server for /dev/log
#
# Brings the standalone Next.js server up on https://programmer-blog.jesspete.shop
# starting from a freshly `git clone`d repo (no node_modules, no devlog.db,
# no .env.local). Handles the full R-47 checklist:
#   - absolute DATABASE_PATH (C-36)
#   - BETTER_AUTH_SECRET + SIGNED_TOKEN_SECRET ≥32 (R-5)
#   - DEV_AUTHOR_PASSWORD random-generated if absent (R-57, audit C-38)
#   - NEXT_PUBLIC_SITE_URL prod at build + runtime (H-37 / R-49 / R-52)
#   - DB init (migrate + seed)
#   - type/lint/test gate + build (postbuild copies static)
#   - standalone start with correct env sourcing (bash `set -a; . .env.local`)
#   - health check (archive/posts/rss/sitemap/robots/admin)
#
# Usage:  ./start_server.sh          # from repo root
#         bash start_server.sh        # same
# Idempotent: safe to re-run; kills any prior server on :3000 first.
# Logs:   ./server.log
# PID:    ./server.pid

set -euo pipefail

# ── repo layout ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
APP_DIR="$REPO_ROOT/apps/web"
DB_FILE_DEFAULT="$APP_DIR/devlog.db"
LOG_FILE="$REPO_ROOT/server.log"
PID_FILE="$REPO_ROOT/server.pid"
PROD_URL="https://programmer-blog.jesspete.shop"

# ── helpers ──────────────────────────────────────────────────────────────
log()  { printf "\033[1;34m[start]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*" >&2; }
die()  { printf "\033[1;31m[fail]\033[0m %s\n" "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

gen_secret() {
  if have openssl; then
    openssl rand -hex 32
  else
    # fallback: 64 hex chars via /dev/urandom
    hexdump -vn32 -e ' /1 "%02x"' /dev/urandom
  fi
}

# ── 0. prerequisites ─────────────────────────────────────────────────────
check_prereqs() {
  log "Checking prerequisites …"
  have node    || die "node not found — install Node ≥20"
  have pnpm    || die "pnpm not found — install pnpm ≥9.15 (npm i -g pnpm)"
  have openssl || warn "openssl not found — falling back to /dev/urandom for secrets"

  local node_maj
  node_maj="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$node_maj" -lt 20 ]]; then
    die "Node $node_maj < 20 — upgrade to Node ≥20"
  fi

  local pnpm_ver
  pnpm_ver="$(pnpm --version 2>/dev/null || echo 0)"
  ok "node $(node --version) / pnpm $pnpm_ver / $(openssl version 2>/dev/null || echo openssl-ok)"
}

# ── 1. env file — ensure production-ready .env.local ─────────────────────
ensure_env() {
  log "Ensuring .env.local (production) …"

  # If neither .env.local nor .env.local.example exists, start from .env.example
  local template=""
  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    template="$REPO_ROOT/.env.local"
  elif [[ -f "$REPO_ROOT/.env.local.example" ]]; then
    log ".env.local missing — creating from .env.local.example"
    cp "$REPO_ROOT/.env.local.example" "$REPO_ROOT/.env.local"
    template="$REPO_ROOT/.env.local"
  elif [[ -f "$REPO_ROOT/.env.example" ]]; then
    log ".env.local missing — creating from .env.example"
    cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env.local"
    template="$REPO_ROOT/.env.local"
  else
    die "No env template found (.env.example / .env.local.example)"
  fi

  # Helper: ensure a key exists and (for secrets) is ≥32 chars. If not, set it.
  # Uses `grep -E "^KEY="` to avoid matching comments.
  ensure_var() {
    local key="$1" val="$2" min_len="${3:-0}"
    local cur=""
    if grep -qE "^${key}=" "$REPO_ROOT/.env.local"; then
      cur="$(grep -E "^${key}=" "$REPO_ROOT/.env.local" | tail -n1 | cut -d= -f2- | tr -d $'\r')"
      # strip surrounding quotes/spaces
      cur="$(echo "$cur" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
    fi

    local need_set=0
    if [[ -z "$cur" ]]; then
      need_set=1
    elif [[ "$min_len" -gt 0 && "${#cur}" -lt "$min_len" ]]; then
      need_set=1
    fi

    # For URL vars, also force prod value if localhost in production
    if [[ "$key" == "NEXT_PUBLIC_SITE_URL" || "$key" == "BETTER_AUTH_URL" ]]; then
      if [[ "$cur" == *"localhost"* || "$cur" == *"127.0.0.1"* ]]; then
        need_set=1
      fi
      if [[ -z "$cur" || "$cur" == *"localhost"* ]]; then
        val="$PROD_URL"
      fi
    fi

    if [[ "$need_set" -eq 1 ]]; then
      if [[ -z "$val" && "$min_len" -gt 0 ]]; then
        val="$(gen_secret)"
      fi
      if grep -qE "^${key}=" "$REPO_ROOT/.env.local"; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$REPO_ROOT/.env.local"
      else
        echo "${key}=${val}" >> "$REPO_ROOT/.env.local"
      fi
      log "  set $key"
    fi
  }

  # Absolute DATABASE_PATH — the #1 standalone trap (C-36). Relative ./devlog.db
  # resolves inside .next/standalone after `process.chdir(__dirname)` at runtime.
  local abs_db
  abs_db="$DB_FILE_DEFAULT"
  ensure_var "DATABASE_PATH" "$abs_db" 0
  # Force-absolutize if user had a relative value
  local cur_db
  cur_db="$(grep -E "^DATABASE_PATH=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [[ "$cur_db" == "./"* || "$cur_db" == "../"* || "$cur_db" != /* ]]; then
    sed -i "s|^DATABASE_PATH=.*|DATABASE_PATH=${abs_db}|" "$REPO_ROOT/.env.local"
    log "  absolutized DATABASE_PATH → $abs_db"
  fi

  ensure_var "BETTER_AUTH_SECRET"  "" 32
  ensure_var "SIGNED_TOKEN_SECRET" "" 32
  ensure_var "NEXT_PUBLIC_SITE_URL" "$PROD_URL" 0
  ensure_var "BETTER_AUTH_URL"       "$PROD_URL" 0

  # R-57 (audit C-38): the seeded author account must never use the publicly-known
  # dev default in a production deployment. seed.ts refuses to run without this var
  # when NODE_ENV=production; here we generate a strong random one and print it ONCE
  # so the operator can store it (no in-app password-change UI exists yet).
  if ! grep -qE "^DEV_AUTHOR_PASSWORD=" "$REPO_ROOT/.env.local"; then
    local gen_pw
    gen_pw="$(openssl rand -base64 24 2>/dev/null || head -c 24 /dev/urandom | base64)"
    printf 'DEV_AUTHOR_PASSWORD=%s\n' "$gen_pw" >> "$REPO_ROOT/.env.local"
    # R-91 (Pass 7, L-54): never echo the credential itself — it would land
    # in terminal scrollback and any captured deploy logs. Point at the
    # storage location instead.
    log "  generated DEV_AUTHOR_PASSWORD (stored in $REPO_ROOT/.env.local — store it in your secrets manager now)"
  fi

  # Ensure the Next.js build sees the same env regardless of cwd.
  # Next.js loads apps/web/.env.local when run via `pnpm --filter @devlog/web`.
  # Keep the two files in sync for fresh-clone correctness.
  cp "$REPO_ROOT/.env.local" "$APP_DIR/.env.local"
  ok ".env.local ready (DATABASE_PATH absolute, secrets ≥32, NEXT_PUBLIC_SITE_URL=$PROD_URL)"

  # Validate lengths
  local b s u
  b="$(grep -E "^BETTER_AUTH_SECRET=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '\r')"
  s="$(grep -E "^SIGNED_TOKEN_SECRET=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '\r')"
  u="$(grep -E "^NEXT_PUBLIC_SITE_URL=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '\r')"
  if [[ "${#b}" -lt 32 ]]; then die "BETTER_AUTH_SECRET still <32 after ensure"; fi
  if [[ "${#s}" -lt 32 ]]; then die "SIGNED_TOKEN_SECRET still <32 after ensure"; fi
  if [[ "$u" != "$PROD_URL" ]]; then die "NEXT_PUBLIC_SITE_URL=$u, want $PROD_URL"; fi
}

# ── 2. dependencies ──────────────────────────────────────────────────────
install_deps() {
  log "Installing dependencies (pnpm install) …"
  if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
    log "  node_modules missing — fresh clone, running pnpm install"
  fi
  pnpm install --frozen-lockfile 2>&1 | tail -n 20
  ok "deps installed"
}

# ── 3. database (fresh DB if missing) ───────────────────────────────────
setup_db() {
  log "Database setup (migrate + seed) …"
  # Load env for this shell so DATABASE_PATH is available to the DB client
  set -a; . "$REPO_ROOT/.env.local"; set +a

  # Migrations are committed (packages/db/migrations). Never db:push in prod.
  # For a fresh clone the file does not exist — runMigrations() would create it
  # only via openDatabaseForMigrations(); the normal client refuses to boot
  # against a missing file (R-38 fail-fast). So we always run migrate.
  pnpm db:migrate 2>&1 | tail -n 20
  pnpm db:seed 2>&1 | tail -n 20

  # Verify counts (best-effort — sqlite3 may not be installed, fall back to log)
  if have sqlite3; then
    local db_path
    db_path="$(grep -E "^DATABASE_PATH=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '\r')"
    log "  verifying $db_path"
    sqlite3 "$db_path" "select status, count(*) from posts group by status;" 2>&1 | sed 's/^/  /' || true
  else
    log "  sqlite3 not installed — skipping DB count check (seed log above is sufficient)"
  fi
  ok "database ready"
}

# ── 4. quality gate (tests) ─────────────────────────────────────────────
run_tests() {
  log "Running quality gate (check-types + lint + test) …"
  pnpm check-types 2>&1 | tail -n 10
  pnpm lint 2>&1 | tail -n 10
  # Full test suite — must be green before we ship a build
  pnpm test 2>&1 | tail -n 30
  ok "tests green"
}

# ── 5. build ─────────────────────────────────────────────────────────────
build_app() {
  log "Building (pnpm build → standalone + postbuild) …"
  # Source .env.local into the build env so NEXT_PUBLIC_ vars bake correctly.
  # pnpm build runs turbo which spawns `next build` — env must be exported.
  set -a; . "$REPO_ROOT/.env.local"; set +a
  # Also ensure apps/web/.env.local is in sync (done in ensure_env)
  pnpm build 2>&1 | tail -n 60
  # postbuild is wired as `pnpm --filter @devlog/web build` post script, but
  # double-ensure when invoked via turbo
  if [[ ! -f "$APP_DIR/.next/standalone/apps/web/server.js" ]]; then
    die "Standalone server not found at $APP_DIR/.next/standalone/apps/web/server.js — build failed"
  fi
  if [[ ! -d "$APP_DIR/.next/standalone/apps/web/.next/static" ]]; then
    warn "Standalone static missing — running postbuild copy manually"
    pnpm --filter @devlog/web exec tsx src/scripts/copy-standalone-assets.ts 2>&1 | tail -n 5
  fi
  ok "build complete → $APP_DIR/.next/standalone/apps/web/server.js"
}

# ── 6. start server ──────────────────────────────────────────────────────
start_server() {
  log "Starting standalone server on :3000 (prod, $PROD_URL) …"

  # Kill any prior server on :3000 (idempotent)
  if have fuser; then
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 1
  elif have lsof; then
    local pids
    pids="$(lsof -ti:3000 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      log "  killing prior pids $pids"
      kill $pids 2>/dev/null || true
      sleep 1
    fi
  fi

  # Also kill any bg terminals we started via `pnpm start` / `node …/server.js`
  pkill -f "standalone/apps/web/server.js" 2>/dev/null || true
  sleep 1

  # Remove stale pid/log
  rm -f "$PID_FILE"

  # Start with prod env — standalone does NOT auto-load .env.local at runtime,
  # so we must source it into the server process. Use bash `set -a; . file`
  # (dash/sh `source` is not portable — that was the `source: not found` trap).
  # shellcheck disable=SC1091
  bash -c "set -a; . \"$REPO_ROOT/.env.local\"; set +a; nohup node \"$APP_DIR/.next/standalone/apps/web/server.js\" > \"$LOG_FILE\" 2>&1 & echo \$! > \"$PID_FILE\""
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || echo "?")"
  log "  server pid $pid → $LOG_FILE"

  # Wait for ready
  local i
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/api/robots.txt >/dev/null 2>&1 || curl -sf http://localhost:3000/ >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! curl -sf http://localhost:3000/ >/dev/null 2>&1; then
    warn "Server not responding after 30s — tail $LOG_FILE:"
    tail -n 50 "$LOG_FILE" 2>&1 | sed 's/^/  /' || true
    die "Server failed to become ready"
  fi
  ok "server ready at http://localhost:3000 (canonical $PROD_URL)"
}

# ── 7. health check (README 5-line smoke + canonical) ────────────────────
health_check() {
  log "Health check …"
  local fail=0

  check() {
    local label="$1" url="$2" want="${3:-}"
    local code
    code="$(curl -s -o /tmp/hc_body.html -w "%{http_code}" "$url" 2>&1 || echo 000)"
    if [[ "$code" != "200" && "$code" != "307" && "$code" != "308" ]]; then
      warn "  $label $url → HTTP $code (want 200/307)"
      fail=1
      return
    fi
    if [[ -n "$want" ]]; then
      if ! grep -q "$want" /tmp/hc_body.html 2>&1; then
        warn "  $label $url → HTTP $code but missing '$want'"
        fail=1
        return
      fi
    fi
    log "  ✓ $label $url → $code"
  }

  check "archive"   "http://localhost:3000/archive" "essays"
  # pick a real slug from the seeded DB via the archive HTML
  local slug
  slug="$(grep -oE '/posts/[a-z0-9-]+' /tmp/hc_body.html 2>/dev/null | head -n1 | cut -d/ -f3 || echo "on-the-quiet-violence-of-implicit-conversions")"
  check "post"      "http://localhost:3000/posts/$slug" "$slug"
  # single H1
  local h1c
  h1c="$(grep -c "<h1" /tmp/hc_body.html 2>/dev/null || echo 0)"
  if [[ "$h1c" != "1" ]]; then
    warn "  post H1 count $h1c ≠ 1"
    fail=1
  else
    log "  ✓ post H1 count 1"
  fi
  check "rss"       "http://localhost:3000/rss.xml" "<item>"
  check "sitemap"   "http://localhost:3000/sitemap.xml" "<loc>https://"
  check "robots"    "http://localhost:3000/robots.txt" "Sitemap: https://"
  # admin should redirect to login when unauthenticated
  local adm_code
  adm_code="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin 2>&1 || echo 000)"
  if [[ "$adm_code" != "307" ]]; then
    warn "  admin /admin → HTTP $adm_code (want 307 to /admin/login)"
    fail=1
  else
    log "  ✓ admin /admin → 307"
  fi
  # canonical must be prod, not localhost (H-37)
  if ! curl -s http://localhost:3000/ | grep -q "canonical.*$PROD_URL"; then
    warn "  canonical not $PROD_URL — still localhost?"
    curl -s http://localhost:3000/ | grep -o "canonical.*" | head -n 1 | sed 's/^/    /' || true
    fail=1
  else
    log "  ✓ canonical $PROD_URL"
  fi

  if [[ "$fail" -ne 0 ]]; then
    die "Health check failed — see warnings above and $LOG_FILE"
  fi
  ok "all health checks passed"
}

# ── main ─────────────────────────────────────────────────────────────────
main() {
  log "=== /dev/log — fresh-clone production start ==="
  log "repo: $REPO_ROOT"
  log "prod URL: $PROD_URL"
  log "db: $DB_FILE_DEFAULT"
  echo ""

  check_prereqs
  ensure_env
  install_deps
  setup_db
  run_tests
  build_app
  start_server
  health_check

  echo ""
  ok "=== Server live ==="
  echo "  URL:        http://localhost:3000  (canonical $PROD_URL)"
  echo "  PID file:   $PID_FILE  (pid $(cat "$PID_FILE" 2>/dev/null || echo ?))"
  echo "  Log:        $LOG_FILE  (tail -f $LOG_FILE)"
  echo "  Health:     curl http://localhost:3000/archive  # 9 essays"
  echo "  Stop:       kill \$(cat $PID_FILE)  # or: fuser -k 3000/tcp"
  echo ""
  log "Done."
}

main "$@"
