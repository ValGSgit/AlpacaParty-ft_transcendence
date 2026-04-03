#!/usr/bin/env bash
# =============================================================================
# AlpacaParty — Stress, Performance & Security Test Suite
# =============================================================================
#
# Runs a battery of tests against a live AlpacaParty stack:
#   1. Connectivity & health checks
#   2. Security scan        (nikto)
#   3. Port scan            (nmap)
#   4. HTTP header audit    (curl)
#   5. Load test — public   (siege, unauthenticated)
#   6. Load test — auth API (siege, authenticated)
#   7. Throughput test      (wrk or ab — first available)
#   8. Rate-limit probe     (curl burst)
#   9. Large-payload probe  (curl oversized body)
#  10. Crash recovery check (rapid restart probe)
#
# Usage:
#   bash scripts/stress-test.sh [BASE_URL] [DURATION] [CONCURRENCY]
#
# Defaults:
#   BASE_URL     https://localhost:8443
#   DURATION     30s
#   CONCURRENCY  25
#
# Requirements (install what you need; missing tools are skipped):
#   siege   — apt install siege        / brew install siege
#   wrk     — apt install wrk          / brew install wrk
#   nikto   — apt install nikto        / brew install nikto
#   nmap    — apt install nmap         / brew install nmap
#   ab      — apt install apache2-utils / brew install httpd (fallback if no wrk)
#   jq      — apt install jq           / brew install jq
#
# =============================================================================
set -euo pipefail

# ── Parameters ────────────────────────────────────────────────────────────────
BASE_URL="${1:-https://localhost:8443}"
DURATION="${2:-30s}"
CONCURRENCY="${3:-25}"
REPORT_DIR="./stress-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/report_${TIMESTAMP}.txt"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${RESET}"; }
ok()      { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET} $*"; }
fail()    { echo -e "  ${RED}✗${RESET} $*"; }
info()    { echo -e "  ${BOLD}→${RESET} $*"; }

# ── Tool detection ────────────────────────────────────────────────────────────
has() { command -v "$1" &>/dev/null; }

# ── Logging: tee everything to report file ───────────────────────────────────
mkdir -p "$REPORT_DIR"
exec > >(tee -a "$REPORT_FILE") 2>&1

echo -e "${BOLD}AlpacaParty Stress & Security Test${RESET}"
echo "Target:      $BASE_URL"
echo "Duration:    $DURATION"
echo "Concurrency: $CONCURRENCY"
echo "Report:      $REPORT_FILE"
echo "Started:     $(date)"

# ── Tool availability summary ─────────────────────────────────────────────────
header "Tool Availability"
for tool in curl siege wrk ab nikto nmap jq; do
  if has "$tool"; then ok "$tool"; else warn "$tool not found — step will be skipped"; fi
done

# =============================================================================
# 1. Connectivity & Health
# =============================================================================
header "1. Connectivity & Health Checks"

check_endpoint() {
  local label="$1" url="$2" expected_status="${3:-200}"
  local status
  status=$(curl -skL -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status" -eq "$expected_status" ]; then
    ok "$label — HTTP $status"
  else
    fail "$label — expected $expected_status, got $status"
    FAILURES=$((FAILURES + 1))
  fi
}

FAILURES=0
check_endpoint "Root endpoint"       "${BASE_URL}/"
check_endpoint "Health endpoint"     "${BASE_URL}/api/health"
check_endpoint "API docs (Swagger)"  "${BASE_URL}/api/docs" 200
check_endpoint "Unknown route → 404" "${BASE_URL}/api/this-does-not-exist" 404

echo ""
info "Full health response:"
curl -sk --max-time 10 "${BASE_URL}/api/health" | (has jq && jq . || cat)

# =============================================================================
# 2. Security Headers Audit
# =============================================================================
header "2. Security Headers Audit"

HEADERS=$(curl -skI --max-time 10 "${BASE_URL}/api/health")

check_header() {
  local name="$1"
  if echo "$HEADERS" | grep -qi "^${name}:"; then
    ok "$name present"
  else
    warn "$name MISSING"
  fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Content-Security-Policy"
check_header "X-XSS-Protection"

echo ""
info "All response headers:"
echo "$HEADERS"

# =============================================================================
# 3. Authentication Flow
# =============================================================================
header "3. Authentication — Register & Login"

# Generate a unique test user
TEST_USER="stresstest_$(date +%s)"
TEST_EMAIL="${TEST_USER}@stress.test"
TEST_PASS="StressTest1!"

info "Registering test user: $TEST_USER"
REG_RESPONSE=$(curl -sk -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${TEST_USER}\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASS}\"}" \
  --max-time 15)

if echo "$REG_RESPONSE" | grep -qi '"token"'; then
  ok "Registration succeeded"
  ACCESS_TOKEN=$(echo "$REG_RESPONSE" | (has jq && jq -r '.token // .accessToken // empty' || grep -o '"token":"[^"]*"' | cut -d'"' -f4))
else
  warn "Registration returned: $REG_RESPONSE"
  info "Attempting login with existing user..."
  LOGIN_RESPONSE=$(curl -sk -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TEST_USER}\",\"password\":\"${TEST_PASS}\"}" \
    --max-time 15)
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | (has jq && jq -r '.token // .accessToken // empty' || grep -o '"token":"[^"]*"' | cut -d'"' -f4))
fi

if [ -n "${ACCESS_TOKEN:-}" ]; then
  ok "Auth token obtained (${#ACCESS_TOKEN} chars)"
else
  warn "Could not obtain auth token — authenticated load tests will be skipped"
  ACCESS_TOKEN=""
fi

# =============================================================================
# 4. Rate-Limit Probe
# =============================================================================
header "4. Rate-Limit Probe (burst 150 requests to /api)"

info "Sending 150 rapid requests — expecting 429 before all complete..."
RATE_LIMIT_HIT=0
for i in $(seq 1 150); do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/api/health" 2>/dev/null || echo "000")
  if [ "$code" -eq 429 ]; then
    RATE_LIMIT_HIT=$((RATE_LIMIT_HIT + 1))
  fi
done

if [ "$RATE_LIMIT_HIT" -gt 0 ]; then
  ok "Rate limiting triggered after burst ($RATE_LIMIT_HIT × 429)"
else
  warn "No 429 responses received in 150-request burst (windowMs=15m, max=1000 — may need larger burst)"
fi

# =============================================================================
# 5. Large-Payload Probe (should be rejected before hitting business logic)
# =============================================================================
header "5. Oversized Payload Probe"

info "Sending 11 MB body to /api/auth/login (limit is 10 MB)..."
OVERSIZED_CODE=$(dd if=/dev/urandom bs=1M count=11 2>/dev/null | base64 | \
  curl -sk -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d @- \
    -o /dev/null -w "%{http_code}" --max-time 20 2>/dev/null || echo "000")

if [ "$OVERSIZED_CODE" -eq 413 ] || [ "$OVERSIZED_CODE" -eq 400 ]; then
  ok "Oversized payload rejected — HTTP $OVERSIZED_CODE"
else
  warn "Unexpected response to oversized payload: HTTP $OVERSIZED_CODE"
fi

# =============================================================================
# 6. Injection & Bad-Input Probes
# =============================================================================
header "6. Bad-Input & Injection Probes"

probe_bad() {
  local label="$1" url="$2" data="$3"
  local code
  code=$(curl -sk -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$data" \
    -o /dev/null -w "%{http_code}" --max-time 10 2>/dev/null || echo "000")
  if [ "$code" -ge 400 ] && [ "$code" -lt 500 ]; then
    ok "$label → HTTP $code (rejected)"
  elif [ "$code" -eq 500 ]; then
    fail "$label → HTTP 500 — SERVER ERROR on bad input!"
    FAILURES=$((FAILURES + 1))
  else
    warn "$label → HTTP $code (unexpected)"
  fi
}

probe_bad "SQL injection in login"  "${BASE_URL}/api/auth/login"    '{"username":"admin'\'' OR 1=1--","password":"x"}'
probe_bad "XSS in register"         "${BASE_URL}/api/auth/register"  '{"username":"<script>alert(1)</script>","email":"x@x.com","password":"P@ss1word"}'
probe_bad "Missing required fields" "${BASE_URL}/api/auth/login"     '{}'
probe_bad "Invalid JSON"            "${BASE_URL}/api/auth/login"     'not-json-at-all'
probe_bad "Null-byte in field"      "${BASE_URL}/api/auth/login"     "{\"username\":\"admin\\u0000\",\"password\":\"x\"}"

# =============================================================================
# 7. Nikto Security Scan (if available)
# =============================================================================
if has nikto; then
  header "7. Nikto Security Scan"
  info "Running nikto against $BASE_URL (this may take a few minutes)..."
  NIKTO_OUT="${REPORT_DIR}/nikto_${TIMESTAMP}.txt"
  nikto -h "$BASE_URL" -ssl -output "$NIKTO_OUT" -Format txt -nointeractive 2>&1 || true
  ok "Nikto report saved to $NIKTO_OUT"
  # Flag any high-severity findings
  if grep -qi "OSVDB\|CVE\|critical\|dangerous" "$NIKTO_OUT" 2>/dev/null; then
    warn "Nikto found potential issues — review $NIKTO_OUT"
  else
    ok "No critical findings in nikto scan"
  fi
else
  warn "7. Nikto skipped (not installed)"
fi

# =============================================================================
# 8. Nmap Port Scan (if available)
# =============================================================================
if has nmap; then
  header "8. Nmap Port Scan"
  HOST=$(echo "$BASE_URL" | sed 's|https\?://||; s|/.*||; s|:.*||')
  info "Scanning $HOST for open ports..."
  NMAP_OUT="${REPORT_DIR}/nmap_${TIMESTAMP}.txt"
  nmap -sV --open -T4 "$HOST" -oN "$NMAP_OUT" 2>&1 || true
  ok "Nmap report saved to $NMAP_OUT"
  # Flag unexpected open ports (only 80/443/8443 expected)
  UNEXPECTED=$(grep "^[0-9]" "$NMAP_OUT" 2>/dev/null | grep -v "80/\|443/\|8443/" || true)
  if [ -n "$UNEXPECTED" ]; then
    warn "Unexpected open ports detected:"
    echo "$UNEXPECTED"
  else
    ok "Only expected ports open (80/443/8443)"
  fi
else
  warn "8. Nmap skipped (not installed)"
fi

# =============================================================================
# 9. Siege — Unauthenticated Load Test
# =============================================================================
if has siege; then
  header "9. Siege — Unauthenticated Load Test"

  # Build URL list for siege
  SIEGE_URLS="${REPORT_DIR}/urls_public_${TIMESTAMP}.txt"
  cat > "$SIEGE_URLS" <<EOF
${BASE_URL}/api/health
${BASE_URL}/api/posts
${BASE_URL}/
EOF

  info "siege -c $CONCURRENCY -t $DURATION --no-follow -k -R /dev/null (public endpoints)"
  SIEGE_OUT="${REPORT_DIR}/siege_public_${TIMESTAMP}.txt"
  siege -c "$CONCURRENCY" -t "$DURATION" --no-follow -k \
    --content-type="application/json" \
    -f "$SIEGE_URLS" \
    2>&1 | tee "$SIEGE_OUT" || true

  # Parse key metrics from siege output
  AVAIL=$(grep -i "availability" "$SIEGE_OUT" | grep -oP '[\d.]+%' | head -1 || echo "N/A")
  RPS=$(grep -i "transaction rate" "$SIEGE_OUT" | grep -oP '[\d.]+' | head -1 || echo "N/A")
  RESP=$(grep -i "response time" "$SIEGE_OUT" | grep -oP '[\d.]+' | head -1 || echo "N/A")
  info "Availability: $AVAIL  |  Trans/sec: $RPS  |  Avg response: ${RESP}s"

  if [ "$AVAIL" != "N/A" ] && [ "$(echo "$AVAIL" | tr -d '%' | cut -d. -f1)" -lt 99 ]; then
    fail "Availability below 99%: $AVAIL"
    FAILURES=$((FAILURES + 1))
  else
    ok "Availability: $AVAIL"
  fi
else
  warn "9. Siege skipped (not installed)"
fi

# =============================================================================
# 10. Siege — Authenticated Load Test
# =============================================================================
if has siege && [ -n "${ACCESS_TOKEN:-}" ]; then
  header "10. Siege — Authenticated Load Test"

  # Write a siege config with auth header
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

  SIEGE_AUTH_URLS="${REPORT_DIR}/urls_auth_${TIMESTAMP}.txt"
  cat > "$SIEGE_AUTH_URLS" <<EOF
${BASE_URL}/api/users/me
${BASE_URL}/api/posts
${BASE_URL}/api/notifications
${BASE_URL}/api/friends
${BASE_URL}/api/game/stats
EOF

  info "siege -c $CONCURRENCY -t $DURATION (authenticated endpoints)"
  SIEGE_AUTH_OUT="${REPORT_DIR}/siege_auth_${TIMESTAMP}.txt"
  siege -c "$CONCURRENCY" -t "$DURATION" --no-follow -k \
    --rc="$SIEGE_RC" \
    -f "$SIEGE_AUTH_URLS" \
    2>&1 | tee "$SIEGE_AUTH_OUT" || true

  AVAIL_A=$(grep -i "availability" "$SIEGE_AUTH_OUT" | grep -oP '[\d.]+%' | head -1 || echo "N/A")
  RPS_A=$(grep -i "transaction rate" "$SIEGE_AUTH_OUT" | grep -oP '[\d.]+' | head -1 || echo "N/A")
  info "Availability: $AVAIL_A  |  Trans/sec: $RPS_A"
elif ! has siege; then
  warn "10. Authenticated siege skipped (siege not installed)"
else
  warn "10. Authenticated siege skipped (no auth token)"
fi

# =============================================================================
# 11. wrk / ab — Raw Throughput Test
# =============================================================================
header "11. Throughput Test (wrk / ab)"

if has wrk; then
  info "wrk -t4 -c$CONCURRENCY -d$DURATION ${BASE_URL}/api/health"
  WRK_OUT="${REPORT_DIR}/wrk_${TIMESTAMP}.txt"
  wrk -t4 -c"$CONCURRENCY" -d"$DURATION" \
    --timeout 10s \
    "${BASE_URL}/api/health" 2>&1 | tee "$WRK_OUT" || true

  LATENCY=$(grep -i "latency" "$WRK_OUT" | head -1 | awk '{print $2}' || echo "N/A")
  REQ_SEC=$(grep -i "requests/sec" "$WRK_OUT" | awk '{print $2}' || echo "N/A")
  ok "wrk — Latency: $LATENCY  |  Req/sec: $REQ_SEC"

elif has ab; then
  TOTAL_REQUESTS=500
  info "ab -n $TOTAL_REQUESTS -c $CONCURRENCY -k ${BASE_URL}/api/health"
  AB_OUT="${REPORT_DIR}/ab_${TIMESTAMP}.txt"
  ab -n "$TOTAL_REQUESTS" -c "$CONCURRENCY" -k \
    -H "Accept: application/json" \
    "${BASE_URL}/api/health" 2>&1 | tee "$AB_OUT" || true

  RPS_AB=$(grep "Requests per second" "$AB_OUT" | awk '{print $4}' || echo "N/A")
  P99=$(grep "99%" "$AB_OUT" | awk '{print $2}' || echo "N/A")
  ok "ab — Req/sec: $RPS_AB  |  p99 latency: ${P99}ms"
else
  warn "wrk and ab both not installed — throughput test skipped"
fi

# =============================================================================
# 12. Crash Recovery Check
# =============================================================================
header "12. Crash Recovery / Availability After Load"

info "Waiting 5s after load tests then checking health..."
sleep 5
RECOVERY_CODE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/health" || echo "000")
if [ "$RECOVERY_CODE" -eq 200 ]; then
  ok "Server healthy after load (HTTP 200)"
else
  fail "Server not responding after load — HTTP $RECOVERY_CODE"
  FAILURES=$((FAILURES + 1))
fi

# Check for any 5xx responses by probing a few endpoints
for endpoint in "/api/health" "/api/posts" "/api/auth/me"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${endpoint}" || echo "000")
  if [ "$code" -eq 500 ] || [ "$code" -eq 502 ] || [ "$code" -eq 503 ]; then
    fail "$endpoint returned HTTP $code — possible crash or overload"
    FAILURES=$((FAILURES + 1))
  fi
done

# =============================================================================
# Summary
# =============================================================================
header "Summary"
echo "Completed: $(date)"
echo "Report saved to: $REPORT_FILE"
echo ""

if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed — no critical failures detected.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAILURES critical check(s) FAILED — review the report above.${RESET}"
  exit 1
fi
