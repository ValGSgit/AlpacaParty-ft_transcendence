#!/usr/bin/env bash
# =============================================================================
# AlpacaParty — Stress, Performance & Security Test Suite
# =============================================================================
#
# Covers every endpoint listed in check.txt, tests security edge-cases, and
# pushes siege to the limit across public GET, authenticated GET, and
# authenticated POST/PUT/DELETE workloads.
#
# Usage:
#   bash scripts/stress-test.sh [BASE_URL] [DURATION] [CONCURRENCY]
#
# Defaults:
#   BASE_URL     https://localhost:8443
#   DURATION     60s
#   CONCURRENCY  50
#
# Requirements (missing tools are skipped, not fatal):
#   siege   — apt install siege
#   wrk     — apt install wrk
#   nikto   — apt install nikto
#   nmap    — apt install nmap
#   ab      — apt install apache2-utils
#   jq      — apt install jq
#   websocat — cargo install websocat  (or prebuilt binary)
# =============================================================================
set -euo pipefail

# ── Parameters ────────────────────────────────────────────────────────────────
BASE_URL="${1:-https://localhost:8443}"
DURATION="${2:-60s}"
CONCURRENCY="${3:-50}"
REPORT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/report_${TIMESTAMP}.txt"
TOOL_DIR="${REPORT_DIR}/tools_${TIMESTAMP}"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

header() { echo -e "\n${CYAN}${BOLD}══ $* ══${RESET}"; }
ok()     { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET} $*"; }
fail()   { echo -e "  ${RED}✗${RESET} $*"; }
info()   { echo -e "  ${BOLD}→${RESET} $*"; }
has()    { command -v "$1" &>/dev/null; }

mkdir -p "$REPORT_DIR" "$TOOL_DIR"
exec > >(tee -a "$REPORT_FILE") 2>&1

echo -e "${BOLD}AlpacaParty Stress & Security Test Suite${RESET}"
echo "Target:      $BASE_URL"
echo "Duration:    $DURATION"
echo "Concurrency: $CONCURRENCY"
echo "Report:      $REPORT_FILE"
echo "Started:     $(date)"

# ── Tool availability ─────────────────────────────────────────────────────────
header "Tool Availability"
for tool in curl siege wrk ab nikto nmap jq websocat; do
  if has "$tool"; then ok "$tool"; else warn "$tool not found — step will be skipped"; fi
done

FAILURES=0

# =============================================================================
# 1. Health & Connectivity
# =============================================================================
header "1. Connectivity & Health"

curl_get() {
  curl -skL -o /dev/null -w "%{http_code}" --max-time 10 "$@" 2>/dev/null || echo "000"
}
curl_get_auth() {
  curl -skL -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer ${ACCESS_TOKEN:-}" "$@" 2>/dev/null || echo "000"
}
curl_get_apikey() {
  curl -skL -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "X-API-Key: ${API_KEY:-}" "$@" 2>/dev/null || echo "000"
}
curl_post() {
  curl -sk -X POST -H "Content-Type: application/json" --max-time 15 "$@" 2>/dev/null || echo ""
}
curl_post_auth() {
  curl -sk -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ACCESS_TOKEN:-}" --max-time 15 "$@" 2>/dev/null || echo ""
}

# Any 5xx is always an unconditional failure regardless of the expected set
is_5xx() { [ "$1" -ge 500 ] && [ "$1" -lt 600 ] 2>/dev/null; }

check() {
  local label="$1" url="$2" expected="${3:-200}"
  local got; got=$(curl_get "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  if [ "$got" -eq "$expected" ] 2>/dev/null; then ok "$label — $got"
  else fail "$label — expected $expected, got $got"; FAILURES=$((FAILURES+1)); fi
}
check_any() {
  local label="$1" url="$2"; shift 2
  local got; got=$(curl_get "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  for e in "$@"; do [ "$got" -eq "$e" ] 2>/dev/null && { ok "$label — $got"; return 0; }; done
  fail "$label — expected one of [$*], got $got"; FAILURES=$((FAILURES+1))
}
check_auth() {
  local label="$1" url="$2" expected="${3:-200}"
  local got; got=$(curl_get_auth "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  if [ "$got" -eq "$expected" ] 2>/dev/null; then ok "$label — $got"
  else fail "$label — expected $expected, got $got"; FAILURES=$((FAILURES+1)); fi
}
check_auth_any() {
  local label="$1" url="$2"; shift 2
  local got; got=$(curl_get_auth "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  for e in "$@"; do [ "$got" -eq "$e" ] 2>/dev/null && { ok "$label — $got"; return 0; }; done
  fail "$label — expected one of [$*], got $got"; FAILURES=$((FAILURES+1))
}
check_apikey() {
  local label="$1" url="$2" expected="${3:-200}"
  local got; got=$(curl_get_apikey "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  if [ "$got" -eq "$expected" ] 2>/dev/null; then ok "$label — $got"
  else fail "$label — expected $expected, got $got"; FAILURES=$((FAILURES+1)); fi
}
check_apikey_any() {
  local label="$1" url="$2"; shift 2
  local got; got=$(curl_get_apikey "$url")
  if is_5xx "$got"; then fail "$label — server 5xx ($got)"; FAILURES=$((FAILURES+1)); return; fi
  for e in "$@"; do [ "$got" -eq "$e" ] 2>/dev/null && { ok "$label — $got"; return 0; }; done
  fail "$label — expected one of [$*], got $got"; FAILURES=$((FAILURES+1))
}

check_any  "Root"          "${BASE_URL}/"                          200 301 302 403
check      "Health"        "${BASE_URL}/api/health"
check      "Swagger docs"  "${BASE_URL}/api/docs"
check      "404 on unknown route" "${BASE_URL}/api/this-does-not-exist" 404

info "Health response:"
HEALTH_BODY=$(curl -sk --max-time 10 "${BASE_URL}/api/health")
printf "%s\n" "$HEALTH_BODY" > "${TOOL_DIR}/health_${TIMESTAMP}.json"
if has jq; then printf "%s\n" "$HEALTH_BODY" | jq . ; else printf "%s\n" "$HEALTH_BODY"; fi

# =============================================================================
# 2. Security Headers Audit
# =============================================================================
header "2. Security Headers"

HEADERS=$(curl -skI --max-time 10 "${BASE_URL}/api/health" 2>/dev/null || true)
printf "%s\n" "$HEADERS" > "${TOOL_DIR}/headers_${TIMESTAMP}.txt"

check_header() {
  local h="$1"
  if printf "%s\n" "$HEADERS" | grep -qi "^${h}:"; then ok "$h present"
  else warn "$h MISSING"; fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Content-Security-Policy"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
check_header "Permissions-Policy"

echo ""
info "Full response headers:"
printf "%s\n" "$HEADERS"

# =============================================================================
# 3. Authentication — Primary Test User
# =============================================================================
header "3. Authentication"

TS=$(date +%s)
USER1="stress_${TS}"
EMAIL1="${USER1}@stress.test"
PASS="StressTest1!"

info "Registering primary test user: $USER1"
REG=$(curl_post "${BASE_URL}/api/auth/register" \
  -d "{\"username\":\"${USER1}\",\"email\":\"${EMAIL1}\",\"password\":\"${PASS}\"}")
printf "%s\n" "$REG" > "${TOOL_DIR}/register1_${TIMESTAMP}.json"

ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER1_ID=""

extract_token() {
  local body="$1"
  if has jq; then
    printf "%s\n" "$body" | jq -r '.token // .accessToken // .data.token // .data.accessToken // empty' 2>/dev/null || true
  else
    printf "%s\n" "$body" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4 || true
  fi
}
extract_refresh() {
  local body="$1"
  if has jq; then
    printf "%s\n" "$body" | jq -r '.refreshToken // .data.refreshToken // empty' 2>/dev/null || true
  else
    printf "%s\n" "$body" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4 || true
  fi
}
extract_id() {
  local body="$1"
  if has jq; then
    printf "%s\n" "$body" | jq -r '
      .user.id //
      .post.id // .data.post.id //
      .comment.id // .data.comment.id //
      .notification.id //
      .upload.id //
      .data.id // .id //
      empty' 2>/dev/null || true
  else
    printf "%s\n" "$body" | grep -oE '"id":[ ]*[0-9"]+' | head -1 | sed -E 's/.*"id":[ ]*"?([0-9]+)"?/\1/' || true
  fi
}

ACCESS_TOKEN=$(extract_token "$REG")
REFRESH_TOKEN=$(extract_refresh "$REG")
USER1_ID=$(extract_id "$REG")

if [ -z "$ACCESS_TOKEN" ]; then
  warn "Register returned no token — trying login"
  LOGIN=$(curl_post "${BASE_URL}/api/auth/login" \
    -d "{\"email\":\"${EMAIL1}\",\"password\":\"${PASS}\"}")
  printf "%s\n" "$LOGIN" > "${TOOL_DIR}/login1_${TIMESTAMP}.json"
  ACCESS_TOKEN=$(extract_token "$LOGIN")
  REFRESH_TOKEN=$(extract_refresh "$LOGIN")
  USER1_ID=$(extract_id "$LOGIN")
fi

if [ -n "$ACCESS_TOKEN" ]; then
  ok "Primary auth token obtained (${#ACCESS_TOKEN} chars)"
  # Resolve user ID from /api/auth/me if not captured from register/login
  if [ -z "$USER1_ID" ]; then
    ME=$(curl -sk -H "Authorization: Bearer ${ACCESS_TOKEN}" "${BASE_URL}/api/auth/me" 2>/dev/null || true)
    USER1_ID=$(extract_id "$ME")
  fi
  [ -n "$USER1_ID" ] && info "User1 ID: $USER1_ID"
else
  warn "Could not obtain auth token — authenticated tests will be skipped"
fi

# ── Secondary user for IDOR testing ──────────────────────────────────────────
USER2="stress2_${TS}"
EMAIL2="${USER2}@stress.test"
REG2=$(curl_post "${BASE_URL}/api/auth/register" \
  -d "{\"username\":\"${USER2}\",\"email\":\"${EMAIL2}\",\"password\":\"${PASS}\"}")
printf "%s\n" "$REG2" > "${TOOL_DIR}/register2_${TIMESTAMP}.json"
TOKEN2=$(extract_token "$REG2")
USER2_ID=$(extract_id "$REG2")
if [ -z "$TOKEN2" ]; then
  L2=$(curl_post "${BASE_URL}/api/auth/login" -d "{\"email\":\"${EMAIL2}\",\"password\":\"${PASS}\"}")
  TOKEN2=$(extract_token "$L2"); USER2_ID=$(extract_id "$L2")
fi
[ -n "$TOKEN2" ] && ok "Secondary user registered (ID: ${USER2_ID:-unknown})"

# ── Pre-create test resources to get real IDs ─────────────────────────────────
POST1_ID="" NOTIF1_ID="" API_KEY=""
if [ -n "$ACCESS_TOKEN" ]; then
  info "Creating test post..."
  POST_RESP=$(curl_post_auth "${BASE_URL}/api/posts" \
    -d '{"title":"Stress Test Post","content":"Load testing content — ignore this post."}')
  POST1_ID=$(extract_id "$POST_RESP")
  [ -n "$POST1_ID" ] && ok "Test post created: $POST1_ID" || warn "Post creation returned: $(printf "%s\n" "$POST_RESP" | head -c 200)"

  # Provision an X-API-Key for the /api/public/* tests. The public API
  # middleware (backend/src/middleware/apiKey.js) ONLY accepts X-API-Key —
  # there is no Bearer-JWT fallback.
  info "Provisioning public-API key (POST /api/users/me/api-key)..."
  KEY_RESP=$(curl_post_auth "${BASE_URL}/api/users/me/api-key" -d '{}')
  printf "%s\n" "$KEY_RESP" > "${TOOL_DIR}/apikey_${TIMESTAMP}.json"
  if has jq; then
    API_KEY=$(printf "%s\n" "$KEY_RESP" | jq -r '.apiKey // .data.apiKey // empty' 2>/dev/null || true)
  else
    API_KEY=$(printf "%s\n" "$KEY_RESP" | grep -o '"apiKey":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  fi
  if [ -n "$API_KEY" ]; then
    ok "API key provisioned (${#API_KEY} chars)"
  else
    warn "Could not provision API key — /api/public/* checks will be skipped"
  fi
fi

# =============================================================================
# 4. All Endpoints — Connectivity Smoke Test (from check.txt)
# =============================================================================
header "4. Endpoint Connectivity Smoke Test"

if [ -n "$ACCESS_TOKEN" ]; then
  # ── Auth endpoints ──────────────────────────────────────────────────────────
  check_auth     "GET /api/auth/me"                                "${BASE_URL}/api/auth/me"

  # ── User endpoints ──────────────────────────────────────────────────────────
  check_auth     "GET /api/users/me"                               "${BASE_URL}/api/users/me"
  check_auth_any "GET /api/users"                                  "${BASE_URL}/api/users" 200 403
  check_auth_any "GET /api/users/:id (self)"                       "${BASE_URL}/api/users/${USER1_ID:-0}" 200 404
  check_auth_any "GET /api/users/me/export JSON"                   "${BASE_URL}/api/users/me/export?format=json" 200 202
  check_auth     "GET /api/users/me/data-requests"                 "${BASE_URL}/api/users/me/data-requests"

  # ── Posts ──────────────────────────────────────────────────────────────────
  check_auth     "GET /api/posts"                                  "${BASE_URL}/api/posts"
  check_auth_any "GET /api/posts/:id"                              "${BASE_URL}/api/posts/${POST1_ID:-0}" 200 404
  check_auth_any "GET /api/posts/user/:id"                         "${BASE_URL}/api/posts/user/${USER1_ID:-0}" 200 404
  check_auth_any "GET /api/posts/:id/comments"                     "${BASE_URL}/api/posts/${POST1_ID:-0}/comments" 200 404

  # ── Friends ────────────────────────────────────────────────────────────────
  check_auth     "GET /api/friends"                                "${BASE_URL}/api/friends"
  check_auth     "GET /api/friends/online"                         "${BASE_URL}/api/friends/online"
  check_auth     "GET /api/friends/requests"                       "${BASE_URL}/api/friends/requests"
  check_auth     "GET /api/friends/blocked"                        "${BASE_URL}/api/friends/blocked"

  # ── Chat ───────────────────────────────────────────────────────────────────
  check_auth     "GET /api/chat/conversations"                     "${BASE_URL}/api/chat/conversations"
  check_auth     "GET /api/chat/unread"                            "${BASE_URL}/api/chat/unread"
  # /api/chat/rooms is not implemented — confirm it 404s rather than silently
  # 200ing (which would suggest a route was added without test coverage).
  check_auth     "GET /api/chat/rooms (unimplemented — expect 404)" "${BASE_URL}/api/chat/rooms" 404

  # ── Notifications ──────────────────────────────────────────────────────────
  check_auth     "GET /api/notifications"                          "${BASE_URL}/api/notifications?unreadOnly=false&limit=30&offset=0"

  # ── Game ───────────────────────────────────────────────────────────────────
  check_auth_any "GET /api/game/stats"                             "${BASE_URL}/api/game/stats?gameType=spit_royale" 200 404
  check_auth_any "GET /api/game/history"                           "${BASE_URL}/api/game/history?gameType=spit_royale&limit=20&offset=0" 200 404
  check_auth_any "GET /api/game/leaderboard"                       "${BASE_URL}/api/game/leaderboard?gameType=spit_royale&limit=20" 200 404
  check_auth_any "GET /api/game/farm"                              "${BASE_URL}/api/game/farm" 200 404
  check_auth_any "GET /api/game/achievements"                      "${BASE_URL}/api/game/achievements" 200 404
  check_auth_any "GET /api/game/challenges"                        "${BASE_URL}/api/game/challenges" 200 404

  # ── Uploads ────────────────────────────────────────────────────────────────
  check_auth     "GET /api/uploads"                                "${BASE_URL}/api/uploads"

  # ── Admin module ───────────────────────────────────────────────────────────
  # This codebase has no admin route module (see backend/src/routes/index.js).
  # Confirm /api/admin/* returns 404 — surfaces silent additions later.
  check_auth     "GET /api/admin/stats (no admin module — expect 404)"  "${BASE_URL}/api/admin/stats" 404
  check_auth     "GET /api/admin/users (no admin module — expect 404)"  "${BASE_URL}/api/admin/users" 404

  # ── Public endpoints (X-API-Key required) ──────────────────────────────────
  # The public middleware (backend/src/middleware/apiKey.js) only honours
  # X-API-Key — Bearer JWT is NOT accepted as a fallback. Use the API key we
  # provisioned for the primary user.
  if [ -n "$API_KEY" ]; then
    check_apikey     "GET /api/public/users"                       "${BASE_URL}/api/public/users?search=&limit=20&offset=0"
    check_apikey_any "GET /api/public/users/:id"                   "${BASE_URL}/api/public/users/${USER1_ID:-0}" 200 404
    check_apikey     "GET /api/public/posts"                       "${BASE_URL}/api/public/posts?limit=20&offset=0"
    # These two are documented in the / payload of public.js but never wired
    # up to a router.get() — they should 404. The test enforces that gap so it
    # fails loudly the day they get wired up without coverage.
    check_apikey     "GET /api/public/leaderboard (documented, unwired — expect 404)" "${BASE_URL}/api/public/leaderboard?gameType=spit_royale" 404
    check_apikey     "GET /api/public/mock (documented, unwired — expect 404)"        "${BASE_URL}/api/public/mock" 404
  else
    warn "Public API checks skipped — no X-API-Key provisioned"
  fi

  # Confirm the X-API-Key gate still rejects calls with no credentials AND
  # calls that only carry a Bearer JWT (no apikey fallback).
  PUB_UNAUTH=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    "${BASE_URL}/api/public/posts?limit=1" 2>/dev/null || echo "000")
  if [ "$PUB_UNAUTH" -eq 401 ]; then
    ok "Public API rejects missing X-API-Key (401)"
  else
    fail "Public API unauth probe returned $PUB_UNAUTH (expected 401)"; FAILURES=$((FAILURES+1))
  fi
  PUB_BEARER_ONLY=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer ${ACCESS_TOKEN:-}" \
    "${BASE_URL}/api/public/posts?limit=1" 2>/dev/null || echo "000")
  if [ "$PUB_BEARER_ONLY" -eq 401 ]; then
    ok "Public API rejects Bearer-only (no apikey fallback) — 401"
  else
    fail "Public API Bearer-only probe returned $PUB_BEARER_ONLY (expected 401)"; FAILURES=$((FAILURES+1))
  fi
  # Probe a tampered API key
  PUB_BAD_KEY=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "X-API-Key: not.a.real.key" \
    "${BASE_URL}/api/public/posts?limit=1" 2>/dev/null || echo "000")
  if [ "$PUB_BAD_KEY" -eq 401 ]; then
    ok "Public API rejects invalid X-API-Key (401)"
  else
    fail "Public API bad-key probe returned $PUB_BAD_KEY (expected 401)"; FAILURES=$((FAILURES+1))
  fi
else
  warn "4. Endpoint smoke test skipped (no auth token)"
fi

# =============================================================================
# 5. Token Refresh Test
# =============================================================================
header "5. Token Refresh"

if [ -n "${REFRESH_TOKEN:-}" ]; then
  REFRESH_RESP=$(curl_post "${BASE_URL}/api/auth/refresh" \
    -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")
  REFRESH_CODE=$(curl -sk -X POST -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}" \
    -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/auth/refresh" 2>/dev/null || echo "000")
  printf "%s\n" "$REFRESH_RESP" > "${TOOL_DIR}/refresh_${TIMESTAMP}.json"
  NEW_TOKEN=$(extract_token "$REFRESH_RESP")
  if [ "$REFRESH_CODE" = "200" ] && [ -n "$NEW_TOKEN" ]; then
    ok "Token refresh works — new token issued"
    # Use the new token going forward
    ACCESS_TOKEN="$NEW_TOKEN"
    REFRESH_TOKEN=$(extract_refresh "$REFRESH_RESP")
  else
    warn "Token refresh returned HTTP $REFRESH_CODE"
  fi
else
  warn "No refresh token captured — skipping refresh test"
fi

# =============================================================================
# 6. Security Header + Auth Guard Probes
# =============================================================================
header "6. Security Probes"

# ── 6a. Unauthenticated access to protected endpoints ────────────────────────
info "6a. Auth guard — protected endpoints must reject unauthenticated requests"
for ep in "/api/users/me" "/api/posts" "/api/friends" "/api/notifications" \
          "/api/game/stats" "/api/chat/conversations" \
          "/api/uploads"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${ep}" 2>/dev/null || echo "000")
  if [ "$code" -eq 401 ] || [ "$code" -eq 403 ]; then
    ok "Unauth $ep → $code (protected)"
  elif [ "$code" -eq 404 ]; then
    warn "Unauth $ep → 404 (endpoint may not exist)"
  else
    fail "Unauth $ep → $code (should be 401/403)"; FAILURES=$((FAILURES+1))
  fi
done

# ── 6b. JWT tampering ────────────────────────────────────────────────────────
info "6b. JWT tampering probes"
PROBES_FILE="${TOOL_DIR}/security_probes_${TIMESTAMP}.tsv"
printf "probe\thttp_code\n" > "$PROBES_FILE"

tamper_probe() {
  local label="$1" token="$2"
  local code
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer ${token}" \
    "${BASE_URL}/api/users/me" 2>/dev/null || echo "000")
  if [ "$code" -eq 401 ] || [ "$code" -eq 403 ]; then
    ok "$label → $code (rejected)"
  else
    fail "$label → $code (should reject invalid token)"; FAILURES=$((FAILURES+1))
  fi
  printf "%s\t%s\n" "$label" "$code" >> "$PROBES_FILE"
}

tamper_probe "Blank token"         ""
tamper_probe "Garbage token"       "not.a.jwt.token"
tamper_probe "Truncated token"     "${ACCESS_TOKEN:0:20}"
tamper_probe "None-alg token"      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiJ9."
tamper_probe "Modified payload"    "$(echo -n "${ACCESS_TOKEN}" | sed 's/\.[^.]*\./\.AAAAAAAAAA\./1')"

# 6b was organization test

# ── 6d. Injection & bad-input ─────────────────────────────────────────────────
info "6d. Injection & bad-input probes"

bad_input() {
  local label="$1" url="$2" data="$3"
  local code
  code=$(curl -sk -X POST -H "Content-Type: application/json" \
    -d "$data" -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$code" -ge 400 ] && [ "$code" -lt 500 ]; then
    ok "$label → $code (rejected)"
  elif [ "$code" -eq 500 ]; then
    fail "$label → 500 SERVER ERROR on bad input!"; FAILURES=$((FAILURES+1))
  else
    warn "$label → $code (unexpected)"
  fi
  printf "%s\t%s\n" "$label" "$code" >> "$PROBES_FILE"
}

bad_input "SQL inject login"       "${BASE_URL}/api/auth/login"    '{"email":"admin'\''OR 1=1--@x.com","password":"x"}'
bad_input "XSS in register"        "${BASE_URL}/api/auth/register" '{"username":"<script>alert(1)</script>","email":"xss@x.com","password":"P@ssword1"}'
bad_input "Empty body login"       "${BASE_URL}/api/auth/login"    '{}'
bad_input "Invalid JSON"           "${BASE_URL}/api/auth/login"    'not-json'
bad_input "Null byte in field"     "${BASE_URL}/api/auth/login"    "{\"email\":\"admin\\u0000@x.com\",\"password\":\"x\"}"
bad_input "No email field"         "${BASE_URL}/api/auth/register" '{"username":"nomail","password":"P@ssword1"}'
bad_input "Extremely long username" "${BASE_URL}/api/auth/register" "{\"username\":\"$(head -c 10000 /dev/urandom | base64 | tr -dc 'a-zA-Z' | head -c 5000)\",\"email\":\"long@x.com\",\"password\":\"P@ssword1\"}"

# ── 6e. Oversized payload ──────────────────────────────────────────────────────
info "6e. Oversized payload probe (11 MB → limit 10 MB)"
OVERSIZED_CODE=$(dd if=/dev/urandom bs=1M count=11 2>/dev/null | base64 | \
  curl -sk -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" -d @- \
    -o /dev/null -w "%{http_code}" --max-time 20 2>/dev/null || echo "000")
echo "oversized_payload_status=$OVERSIZED_CODE" > "${TOOL_DIR}/oversized_${TIMESTAMP}.txt"
if [ "$OVERSIZED_CODE" -eq 413 ] || [ "$OVERSIZED_CODE" -eq 400 ] || [ "$OVERSIZED_CODE" -eq 403 ]; then
  ok "Oversized payload rejected — HTTP $OVERSIZED_CODE"
else
  warn "Oversized payload returned HTTP $OVERSIZED_CODE (expected 413/400/403)"
fi

# ── 6f. HTTP method override attempt ─────────────────────────────────────────
info "6f. HTTP method override header probe"
METHOD_CODE=$(curl -sk -X GET -H "X-HTTP-Method-Override: DELETE" \
  -H "Authorization: Bearer ${ACCESS_TOKEN:-}" \
  -o /dev/null -w "%{http_code}" --max-time 10 \
  "${BASE_URL}/api/users/me" 2>/dev/null || echo "000")
if [ "$METHOD_CODE" -eq 200 ] || [ "$METHOD_CODE" -eq 405 ]; then
  ok "Method override ignored/rejected — HTTP $METHOD_CODE"
else
  warn "Method override returned HTTP $METHOD_CODE"
fi

# =============================================================================
# 7. Rate-Limit Probe
# =============================================================================
header "7. Rate-Limit Probe"
# config/index.js: max=1000, windowMs=15m — need >1000 requests to trigger
# Target the login endpoint which may have its own stricter limiter
info "Sending 1100 rapid requests to /api/auth/login (rate limit max=1000)..."
RATE_HIT=0
RL_FILE="${TOOL_DIR}/rate_limit_${TIMESTAMP}.txt"
: > "$RL_FILE"
for i in $(seq 1 1100); do
  code=$(curl -sk -X POST -H "Content-Type: application/json" \
    -d '{"email":"ratelimit@test.com","password":"wrong"}' \
    -o /dev/null -w "%{http_code}" --max-time 5 \
    "${BASE_URL}/api/auth/login" 2>/dev/null || echo "000")
  echo "$code" >> "$RL_FILE"
  [ "$code" -eq 429 ] && RATE_HIT=$((RATE_HIT+1))
  [ "$RATE_HIT" -ge 5 ] && break  # confirmed, no need to continue
done
if [ "$RATE_HIT" -gt 0 ]; then
  ok "Rate limiting triggered ($RATE_HIT × 429 responses)"
else
  warn "No 429s in 1100 requests — verify rate limit config (windowMs=15m, max=1000)"
fi

# =============================================================================
# 8. WebSocket Connectivity
# =============================================================================
header "8. WebSocket Connectivity"

if [ -n "${ACCESS_TOKEN:-}" ]; then
  WS_URL="${BASE_URL/https/wss}/socket.io/?EIO=4&transport=websocket"
  if has websocat; then
    WS_OUT="${TOOL_DIR}/ws_${TIMESTAMP}.txt"
    info "Testing WebSocket: $WS_URL"
    if timeout 5 websocat --no-close -k "$WS_URL" \
        --header "Authorization: Bearer ${ACCESS_TOKEN}" \
        <<< '42["ping"]' > "$WS_OUT" 2>&1; then
      ok "WebSocket connection established"
    else
      warn "WebSocket connection failed (check ws_*.txt for details)"
    fi
  else
    warn "websocat not installed — skipping WebSocket test"
    echo "ws_skipped=no_websocat" > "${TOOL_DIR}/ws_${TIMESTAMP}.txt"
  fi
else
  warn "8. Skipped (no auth token)"
fi

# =============================================================================
# 9. Siege — Public Unauthenticated Load Test (all public GET endpoints)
# =============================================================================
if has siege; then
  header "9. Siege — Public Endpoints"

  # Two URL files: truly-unauthenticated endpoints, and X-API-Key endpoints.
  # Mixing them in one siege run would corrupt the availability stat because
  # the apikey routes 401 without the header.
  SIEGE_PUBLIC="${REPORT_DIR}/urls_public_${TIMESTAMP}.txt"
  cat > "$SIEGE_PUBLIC" <<EOF
${BASE_URL}/api/health
${BASE_URL}/api/docs
${BASE_URL}/api/public
${BASE_URL}/
EOF

  info "siege -c $CONCURRENCY -t $DURATION — anonymous endpoints"
  SIEGE_PUB_OUT="${REPORT_DIR}/siege_public_${TIMESTAMP}.txt"
  siege -c "$CONCURRENCY" -t "$DURATION" --no-follow \
    --content-type="application/json" \
    -f "$SIEGE_PUBLIC" 2>&1 | tee "$SIEGE_PUB_OUT" || true

  # X-API-Key load test — only run if a key was provisioned
  if [ -n "${API_KEY:-}" ]; then
    SIEGE_RC_KEY="${REPORT_DIR}/siegerc_apikey_${TIMESTAMP}"
    cat > "$SIEGE_RC_KEY" <<EOF
verbose = false
show-logfile = false
logging = false
protocol = HTTP/1.1
chunked = true
cache = false
connection = keep-alive
header = X-API-Key: ${API_KEY}
EOF
    SIEGE_KEY_URLS="${REPORT_DIR}/urls_apikey_${TIMESTAMP}.txt"
    cat > "$SIEGE_KEY_URLS" <<EOF
${BASE_URL}/api/public/users?search=&limit=20&offset=0
${BASE_URL}/api/public/posts?limit=20&offset=0
EOF
    [ -n "${USER1_ID:-}" ] && printf "%s\n" "${BASE_URL}/api/public/users/${USER1_ID}" >> "$SIEGE_KEY_URLS"

    info "siege -c $CONCURRENCY -t $DURATION — X-API-Key endpoints"
    SIEGE_KEY_OUT="${REPORT_DIR}/siege_apikey_${TIMESTAMP}.txt"
    siege -c "$CONCURRENCY" -t "$DURATION" --no-follow \
      --rc="$SIEGE_RC_KEY" \
      -f "$SIEGE_KEY_URLS" 2>&1 | tee "$SIEGE_KEY_OUT" || true

    AVAIL_K=$(grep -i "availability" "$SIEGE_KEY_OUT" | grep -o "[0-9.]*" | tail -1 || echo "N/A")
    RPS_K=$(grep -Ei "transaction[ _]rate" "$SIEGE_KEY_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
    info "X-API-Key — Availability: ${AVAIL_K}%  |  Trans/sec: $RPS_K"
    if [ "$AVAIL_K" != "N/A" ] && [ "${AVAIL_K%.*}" -lt 99 ] 2>/dev/null; then
      fail "X-API-Key availability below 99%: ${AVAIL_K}%"; FAILURES=$((FAILURES+1))
    else
      ok "X-API-Key availability: ${AVAIL_K}%"
    fi
  else
    warn "Siege X-API-Key test skipped — no API key provisioned"
  fi

  AVAIL=$(grep -i "availability" "$SIEGE_PUB_OUT" | grep -o "[0-9.]*" | tail -1 || echo "N/A")
  RPS=$(grep -Ei "transaction[ _]rate" "$SIEGE_PUB_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
  RESP=$(grep -Ei "response[ _]time" "$SIEGE_PUB_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
  info "Public — Availability: ${AVAIL}%  |  Trans/sec: $RPS  |  Avg response: ${RESP}s"
  if [ "$AVAIL" != "N/A" ] && [ "${AVAIL%.*}" -lt 99 ] 2>/dev/null; then
    fail "Public availability below 99%: ${AVAIL}%"; FAILURES=$((FAILURES+1))
  else
    ok "Public availability: ${AVAIL}%"
  fi
else
  warn "9. Siege skipped (not installed)"
fi

# =============================================================================
# 10. Siege — Authenticated GET Load Test (all auth GET endpoints)
# =============================================================================
if has siege && [ -n "${ACCESS_TOKEN:-}" ]; then
  header "10. Siege — Authenticated GETs (all auth endpoints)"

  # Write siegerc with auth header
  SIEGE_RC="${REPORT_DIR}/siegerc_${TIMESTAMP}"
  cat > "$SIEGE_RC" <<EOF
verbose = false
show-logfile = false
logging = false
protocol = HTTP/1.1
chunked = true
cache = false
connection = keep-alive
header = Authorization: Bearer ${ACCESS_TOKEN}
EOF

  SIEGE_AUTH_URLS="${REPORT_DIR}/urls_auth_get_${TIMESTAMP}.txt"
  # All GET endpoints from check.txt that don't need path params, plus ones with resolved IDs
  cat > "$SIEGE_AUTH_URLS" <<EOF
${BASE_URL}/api/auth/me
${BASE_URL}/api/users/me
${BASE_URL}/api/users/me/data-requests
${BASE_URL}/api/users/me/export?format=json
${BASE_URL}/api/posts
${BASE_URL}/api/posts?page=2&limit=20
${BASE_URL}/api/friends
${BASE_URL}/api/friends/online
${BASE_URL}/api/friends/requests
${BASE_URL}/api/friends/blocked
${BASE_URL}/api/chat/conversations
${BASE_URL}/api/chat/unread
${BASE_URL}/api/chat/rooms
${BASE_URL}/api/notifications?unreadOnly=false&limit=30&offset=0
${BASE_URL}/api/notifications?unreadOnly=true&limit=30&offset=0
${BASE_URL}/api/game/stats?gameType=spit_royale
${BASE_URL}/api/game/history?gameType=spit_royale&limit=20&offset=0
${BASE_URL}/api/game/leaderboard?gameType=spit_royale&limit=20
${BASE_URL}/api/game/farm
${BASE_URL}/api/game/achievements
${BASE_URL}/api/game/challenges
${BASE_URL}/api/uploads
${BASE_URL}/api/health
EOF
  # Add ID-based endpoints if we have IDs
  [ -n "$POST1_ID" ] && printf "%s\n" "${BASE_URL}/api/posts/${POST1_ID}" >> "$SIEGE_AUTH_URLS"
  [ -n "$POST1_ID" ] && printf "%s\n" "${BASE_URL}/api/posts/${POST1_ID}/comments" >> "$SIEGE_AUTH_URLS"
  [ -n "$USER1_ID" ] && printf "%s\n" "${BASE_URL}/api/users/${USER1_ID}" >> "$SIEGE_AUTH_URLS"
  [ -n "$USER1_ID" ] && printf "%s\n" "${BASE_URL}/api/posts/user/${USER1_ID}" >> "$SIEGE_AUTH_URLS"

  info "siege -c $CONCURRENCY -t $DURATION — authenticated GETs ($(wc -l < "$SIEGE_AUTH_URLS") URLs)"
  SIEGE_AUTH_OUT="${REPORT_DIR}/siege_auth_get_${TIMESTAMP}.txt"
  siege -c "$CONCURRENCY" -t "$DURATION" --no-follow \
    --rc="$SIEGE_RC" \
    -f "$SIEGE_AUTH_URLS" 2>&1 | tee "$SIEGE_AUTH_OUT" || true

  AVAIL_A=$(grep -i "availability" "$SIEGE_AUTH_OUT" | grep -o "[0-9.]*" | tail -1 || echo "N/A")
  RPS_A=$(grep -Ei "transaction[ _]rate" "$SIEGE_AUTH_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
  RESP_A=$(grep -Ei "response[ _]time" "$SIEGE_AUTH_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
  info "Auth GETs — Availability: ${AVAIL_A}%  |  Trans/sec: $RPS_A  |  Avg response: ${RESP_A}s"
  if [ "$AVAIL_A" != "N/A" ] && [ "${AVAIL_A%.*}" -lt 99 ] 2>/dev/null; then
    fail "Auth GET availability below 99%: ${AVAIL_A}%"; FAILURES=$((FAILURES+1))
  else
    ok "Auth GET availability: ${AVAIL_A}%"
  fi

elif ! has siege; then
  warn "10. Siege skipped (not installed)"
else
  warn "10. Authenticated GET siege skipped (no auth token)"
fi

# =============================================================================
# 11. Siege — Authenticated POST/Mutation Load Test
# =============================================================================
if has siege && [ -n "${ACCESS_TOKEN:-}" ]; then
  header "11. Siege — Authenticated Mutation Endpoints (POST/PUT)"

  # siegerc with JSON content-type AND auth header
  SIEGE_RC_POST="${REPORT_DIR}/siegerc_post_${TIMESTAMP}"
  cat > "$SIEGE_RC_POST" <<EOF
verbose = false
show-logfile = false
logging = false
protocol = HTTP/1.1
chunked = true
cache = false
connection = keep-alive
header = Authorization: Bearer ${ACCESS_TOKEN}
header = Content-Type: application/json
EOF

  SIEGE_POST_URLS="${REPORT_DIR}/urls_auth_post_${TIMESTAMP}.txt"
  # siege URL file POST format: URL POST body
  # Mix mutations with fast GETs to avoid filling DB with junk on every request
  cat > "$SIEGE_POST_URLS" <<EOF
${BASE_URL}/api/posts GET
${BASE_URL}/api/notifications?unreadOnly=false&limit=10&offset=0 GET
${BASE_URL}/api/friends GET
EOF

  # Add mutations with ID guards
  if [ -n "$POST1_ID" ]; then
    printf "%s PUT %s\n" \
      "${BASE_URL}/api/posts/${POST1_ID}" \
      '{"content":"Updated by siege stress tester"}' >> "$SIEGE_POST_URLS"
    printf "%s POST %s\n" \
      "${BASE_URL}/api/posts/${POST1_ID}/comments" \
      '{"content":"Siege test comment"}' >> "$SIEGE_POST_URLS"
  fi
  if [ -n "$USER1_ID" ]; then
    printf "%s POST %s\n" \
      "${BASE_URL}/api/friends/requests" \
      "{\"userId\":\"${USER2_ID:-nonexistent}\"}" >> "$SIEGE_POST_URLS"
  fi

  # Use lower concurrency for mutations to avoid overwhelming the write path
  WRITE_CONCURRENCY=$(( CONCURRENCY / 2 ))
  [ "$WRITE_CONCURRENCY" -lt 5 ] && WRITE_CONCURRENCY=5

  info "siege -c $WRITE_CONCURRENCY -t $DURATION — mutations ($(wc -l < "$SIEGE_POST_URLS") URLs)"
  SIEGE_POST_OUT="${REPORT_DIR}/siege_auth_post_${TIMESTAMP}.txt"
  siege -c "$WRITE_CONCURRENCY" -t "$DURATION" --no-follow \
    --rc="$SIEGE_RC_POST" \
    -f "$SIEGE_POST_URLS" 2>&1 | tee "$SIEGE_POST_OUT" || true

  AVAIL_P=$(grep -i "availability" "$SIEGE_POST_OUT" | grep -o "[0-9.]*" | tail -1 || echo "N/A")
  RPS_P=$(grep -Ei "transaction[ _]rate" "$SIEGE_POST_OUT" | grep -o "[0-9.]*" | head -1 || echo "N/A")
  info "Mutations — Availability: ${AVAIL_P}%  |  Trans/sec: $RPS_P"
  if [ "$AVAIL_P" != "N/A" ] && [ "${AVAIL_P%.*}" -lt 95 ] 2>/dev/null; then
    fail "Mutation availability below 95%: ${AVAIL_P}%"; FAILURES=$((FAILURES+1))
  else
    ok "Mutation availability: ${AVAIL_P}%"
  fi

elif ! has siege; then
  warn "11. Siege mutation test skipped (not installed)"
else
  warn "11. Siege mutation test skipped (no auth token)"
fi

# =============================================================================
# 12. wrk / ab — Raw Throughput
# =============================================================================
header "12. Throughput Test (wrk / ab)"

if has wrk; then
  info "wrk -t4 -c${CONCURRENCY} -d${DURATION} ${BASE_URL}/api/health"
  WRK_OUT="${REPORT_DIR}/wrk_${TIMESTAMP}.txt"
  wrk -t4 -c"$CONCURRENCY" -d"$DURATION" \
    --timeout 10s \
    "${BASE_URL}/api/health" 2>&1 | tee "$WRK_OUT" || true

  LATENCY=$(grep -i "latency" "$WRK_OUT" | head -1 | awk '{print $2}' || echo "N/A")
  REQ_SEC=$(grep -i "requests/sec" "$WRK_OUT" | awk '{print $2}' || echo "N/A")
  ok "wrk — Latency: $LATENCY  |  Req/sec: $REQ_SEC"

  if [ -n "$ACCESS_TOKEN" ]; then
    # Authenticated wrk via Lua script (inline temp file)
    WRK_LUA="${REPORT_DIR}/wrk_auth_${TIMESTAMP}.lua"
    cat > "$WRK_LUA" <<EOF
wrk.headers["Authorization"] = "Bearer ${ACCESS_TOKEN}"
wrk.headers["Content-Type"]  = "application/json"
EOF
    WRK_AUTH_OUT="${REPORT_DIR}/wrk_auth_${TIMESTAMP}.txt"
    info "wrk (auth) -t4 -c${CONCURRENCY} -d${DURATION} /api/users/me"
    wrk -t4 -c"$CONCURRENCY" -d"$DURATION" \
      --timeout 10s \
      --script "$WRK_LUA" \
      "${BASE_URL}/api/users/me" 2>&1 | tee "$WRK_AUTH_OUT" || true
    REQ_AUTH=$(grep -i "requests/sec" "$WRK_AUTH_OUT" | awk '{print $2}' || echo "N/A")
    ok "wrk (auth) — Req/sec: $REQ_AUTH"
  fi

elif has ab; then
  TOTAL_REQUESTS=$((CONCURRENCY * 20))
  info "ab -n $TOTAL_REQUESTS -c $CONCURRENCY -k ${BASE_URL}/api/health"
  AB_OUT="${REPORT_DIR}/ab_${TIMESTAMP}.txt"
  ab -n "$TOTAL_REQUESTS" -c "$CONCURRENCY" -k \
    -H "Accept: application/json" \
    "${BASE_URL}/api/health" 2>&1 | tee "$AB_OUT" || true
  RPS_AB=$(grep "Requests per second" "$AB_OUT" | awk '{print $4}' || echo "N/A")
  P99=$(grep "99%" "$AB_OUT" | awk '{print $2}' || echo "N/A")
  ok "ab — Req/sec: $RPS_AB  |  p99 latency: ${P99}ms"
else
  warn "12. wrk and ab not installed — throughput test skipped"
fi

# =============================================================================
# 13. Nikto Security Scan
# =============================================================================
if has nikto; then
  header "13. Nikto Security Scan"
  info "Scanning $BASE_URL (takes 2-5 minutes)..."
  NIKTO_OUT="${REPORT_DIR}/nikto_${TIMESTAMP}.txt"
  nikto -h "$BASE_URL" -ssl -output "$NIKTO_OUT" -Format txt -nointeractive 2>&1 || true
  ok "Nikto report → $NIKTO_OUT"
  if grep -qi "OSVDB\|CVE\|critical\|dangerous\|XSS\|injection" "$NIKTO_OUT" 2>/dev/null; then
    warn "Nikto found potential issues — review $NIKTO_OUT"
  else
    ok "No critical findings in nikto scan"
  fi
else
  warn "13. Nikto skipped (not installed)"
fi

# =============================================================================
# 14. Nmap Port Scan
# =============================================================================
if has nmap; then
  header "14. Nmap Port Scan"
  HOST=$(printf "%s\n" "$BASE_URL" | sed 's|https\?://||; s|/.*||; s|:.*||')
  info "Scanning $HOST..."
  NMAP_OUT="${REPORT_DIR}/nmap_${TIMESTAMP}.txt"
  nmap -sV --open -T4 "$HOST" -oN "$NMAP_OUT" 2>&1 || true
  ok "Nmap report → $NMAP_OUT"
  UNEXPECTED=$(grep "^[0-9]" "$NMAP_OUT" 2>/dev/null | grep -v "80/\|443/\|8443/" || true)
  if [ -n "$UNEXPECTED" ]; then
    warn "Unexpected open ports:"; echo "$UNEXPECTED"
  else
    ok "Only expected ports open (80/443/8443)"
  fi
else
  warn "14. Nmap skipped (not installed)"
fi

# =============================================================================
# 15. Logout & Cleanup
# =============================================================================
header "15. Logout & Cleanup"

if [ -n "${ACCESS_TOKEN:-}" ]; then
  LOGOUT_CODE=$(curl -sk -X POST -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/auth/logout" 2>/dev/null || echo "000")
  [ "$LOGOUT_CODE" = "200" ] && ok "Logout OK" || warn "Logout returned HTTP $LOGOUT_CODE"
fi

# Verify token is invalidated after logout
if [ -n "${ACCESS_TOKEN:-}" ]; then
  POST_LOGOUT=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${BASE_URL}/api/users/me" 2>/dev/null || echo "000")
  if [ "$POST_LOGOUT" -eq 401 ]; then
    ok "Token correctly invalidated after logout (401)"
  else
    warn "Token still valid after logout — HTTP $POST_LOGOUT (check refresh token invalidation)"
  fi
fi

# =============================================================================
# 16. Crash Recovery / Post-Load Health Check
# =============================================================================
header "16. Crash Recovery Check"

info "Waiting up to 60s for server to be healthy after all load tests..."
RECOVERY_CODE="000"
for i in $(seq 1 12); do
  RECOVERY_CODE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/health" || echo "000")
  if [ "$RECOVERY_CODE" -eq 200 ]; then
    ok "Server healthy after load (HTTP 200)"
    break
  fi
  [ "$RECOVERY_CODE" -eq 429 ] && warn "Health rate-limited (429), retrying ($i/12)..."
  [ "$RECOVERY_CODE" -ge 500 ] && { fail "Server error after load — HTTP $RECOVERY_CODE"; FAILURES=$((FAILURES+1)); break; }
  sleep 5
done

for ep in "/api/health" "/api/public/posts?limit=1" "/api/public/users?limit=1"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${ep}" || echo "000")
  if [ "$code" -ge 500 ]; then
    fail "POST-LOAD: $ep → $code"; FAILURES=$((FAILURES+1))
  else
    ok "POST-LOAD: $ep → $code"
  fi
done

# =============================================================================
# Summary
# =============================================================================
header "Summary"
echo "Completed:    $(date)"
echo "Report:       $REPORT_FILE"
echo "Tool logs:    $TOOL_DIR"
echo ""

# Collect siege results in one place
if has siege; then
  echo "Siege Results:"
  for f in "${REPORT_DIR}"/siege_*_"${TIMESTAMP}".txt; do
    [ -f "$f" ] || continue
    label=$(basename "$f" | sed "s/siege_//; s/_${TIMESTAMP}.txt//")
    avail=$(grep -i "availability" "$f" | grep -o "[0-9.]*" | tail -1 || echo "N/A")
    rps=$(grep -Ei "transaction[ _]rate" "$f" | grep -o "[0-9.]*" | head -1 || echo "N/A")
    resp=$(grep -Ei "response[ _]time" "$f" | grep -o "[0-9.]*" | head -1 || echo "N/A")
    printf "  %-30s  avail=%s%%  rps=%s  resp=%ss\n" "$label" "$avail" "$rps" "$resp"
  done
  echo ""
fi

if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed — no critical failures detected.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAILURES critical check(s) FAILED — review the report above.${RESET}"
  exit 1
fi
