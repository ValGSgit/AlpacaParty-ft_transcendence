#!/usr/bin/env bash
# =============================================================================
# AlpacaParty — Stress Test Orchestrator
# =============================================================================
# Automates running stress tests in a Docker container against the live stack.
#
# Usage:
#   bash scripts/run-stress-test.sh [BASE_URL] [DURATION] [CONCURRENCY] [SKIP_BUILD]
#
# Defaults:
#   BASE_URL     https://nginx:443 (inside docker, localhost outside)
#   DURATION     30s
#   CONCURRENCY  25
#   SKIP_BUILD   false (rebuild image always)
#
# Examples:
#   bash scripts/run-stress-test.sh
#   bash scripts/run-stress-test.sh https://localhost:8443 1m 50
#   bash scripts/run-stress-test.sh https://localhost:8443 1m 50 true
#
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL="${1:-https://nginx:443}"
DURATION="${2:-30s}"
CONCURRENCY="${3:-25}"
SKIP_BUILD="${4:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${PROJECT_ROOT}/stress-test-results"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${RESET}"; }
ok()      { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET} $*"; }
fail()    { echo -e "  ${RED}✗${RESET} $*"; exit 1; }
info()    { echo -e "  ${BOLD}→${RESET} $*"; }

# ── Helpers ───────────────────────────────────────────────────────────────────
is_container_running() {
  docker ps --filter "name=$1" --filter "status=running" --format "{{.Names}}" | grep -q "^$1$" 2>/dev/null || return 1
}

docker_compose() {
  # Run docker compose from project root with all included services + stress-test profile
  docker compose \
    --file "$PROJECT_ROOT/compose.yaml" \
    --file "$PROJECT_ROOT/scripts/compose.yaml" \
    --profile dev \
    --profile stress-test \
    "$@"
}

# =============================================================================
# Pre-flight checks
# =============================================================================
header "Pre-flight Checks"

# Check for Docker
if ! command -v docker &>/dev/null; then
  fail "Docker not found — please install Docker"
fi
ok "Docker found"

# Check for docker-compose
if ! command -v docker &>/dev/null || ! docker compose version &>/dev/null; then
  fail "Docker Compose not found or not functional"
fi
ok "Docker Compose available"

# Verify stack is running
info "Checking for running application stack..."
REQUIRED_SERVICES=("postgres" "backend" "frontend" "nginx")
MISSING=()

for service in "${REQUIRED_SERVICES[@]}"; do
  if is_container_running "alpacaparty_${service}" || is_container_running "${service}"; then
    ok "$service is running"
  else
    MISSING+=("$service")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  warn "Required services not running: ${MISSING[*]}"
  info "Starting application stack..."
  docker_compose up -d postgres backend frontend nginx
  info "Waiting for services to be healthy (30s)..."
  sleep 30
fi

# Verify nginx is healthy (the external entry point)
info "Verifying nginx health..."
for attempt in {1..10}; do
  if docker_compose exec -T nginx nginx -t >/dev/null 2>&1; then
    ok "nginx is healthy"
    break
  elif [ $attempt -eq 10 ]; then
    fail "nginx failed health check after 10 attempts"
  else
    warn "nginx still starting... (attempt $attempt/10)"
    sleep 3
  fi
done

# =============================================================================
# Build stress-test image
# =============================================================================
if [ "$SKIP_BUILD" != "true" ]; then
  header "Building Stress-Test Image"
  info "Building stress-test container image..."
  docker_compose build --no-cache stress-test || fail "Failed to build stress-test image"
  ok "Stress-test image built successfully"
else
  header "Skipping Image Build"
  ok "Using existing stress-test image (SKIP_BUILD=true)"
fi

# =============================================================================
# Create results directory
# =============================================================================
mkdir -p "$RESULTS_DIR"
info "Results will be saved to: $RESULTS_DIR"

# =============================================================================
# Run stress test
# =============================================================================
header "Running Stress Tests"
info "Target URL:  $BASE_URL"
info "Duration:    $DURATION"
info "Concurrency: $CONCURRENCY"
info "Results will be written directly to host: $RESULTS_DIR"
echo ""

# Run the stress-test container
set +e
docker_compose run --rm \
  --volume "$RESULTS_DIR:/app/stress-test-results" \
  -e "BASE_URL=$BASE_URL" \
  -e "DURATION=$DURATION" \
  -e "CONCURRENCY=$CONCURRENCY" \
  stress-test "$BASE_URL" "$DURATION" "$CONCURRENCY"
STRESS_TEST_EXIT_CODE=$?
set -e

# =============================================================================
# Copy results from container to local filesystem
# =============================================================================
header "Collecting Results"

info "Verifying results in host directory..."
# Get the last stress-test container (completed or running)
CONTAINER_ID=$(docker ps -a --filter "ancestor=alpacaparty-stress-test" --filter "label=com.docker.compose.service=stress-test" -q | head -1)

if [ -z "$CONTAINER_ID" ]; then
  # Fallback: find by name pattern
  CONTAINER_ID=$(docker ps -a --filter "name=alpacaparty_stress_test" -q | head -1)
fi

if [ -n "$CONTAINER_ID" ]; then
  # Copy from container
  mkdir -p "$RESULTS_DIR"
  if docker cp "$CONTAINER_ID:/app/stress-test-results/." "$RESULTS_DIR/" 2>/dev/null; then
    ok "Results synced from container $CONTAINER_ID"
  else
    warn "Container copy skipped (expected when using --rm with host bind mount)"
  fi
else
  warn "No stress-test container found to copy from (reports should already be in host folder)"
fi

# Display latest report
if [ -n "$(ls -A "$RESULTS_DIR" 2>/dev/null)" ]; then
  LATEST_REPORT=$(ls -t "$RESULTS_DIR"/report_*.txt 2>/dev/null | head -1)
  if [ -n "$LATEST_REPORT" ]; then
    header "Test Report Summary"
    echo ""
    tail -50 "$LATEST_REPORT"
    echo ""
    ok "Full report saved: $LATEST_REPORT"
  fi
else
  warn "No results found in $RESULTS_DIR"
fi

# =============================================================================
# Exit with stress-test result
# =============================================================================
header "Summary"
echo "Tests completed at: $(date)"
echo "Results directory: $RESULTS_DIR"
echo ""

if [ $STRESS_TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All stress tests PASSED${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ Stress tests FAILED (exit code: $STRESS_TEST_EXIT_CODE)${RESET}"
  echo ""
  echo "Review the full report above or check: $RESULTS_DIR"
  exit 1
fi
