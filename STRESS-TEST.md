# AlpacaParty — Stress & Security Testing Guide

This guide covers the containerized stress and security test suite for AlpacaParty. All tools run inside Docker—no local installation required.

## Quick Start

```bash
# Start the full development stack
make up

# Run stress tests (takes ~2–5 minutes)
make stress-test

# View results
cat stress-test-results/report_YYYYMMDD_HHMMSS.txt
```

## What Gets Tested

The stress test suite covers:

1. **Connectivity & Health** — Verify all endpoints respond
2. **Security Headers Audit** — Check for HSTS, CSP, X-Frame-Options, etc.
3. **Authentication Flow** — Register users, obtain tokens, verify auth
4. **Rate-Limit Probe** — Burst 150 requests; verify 429 responses triggered
5. **Oversized Payload Probe** — Send 11 MB to 10 MB limit endpoint; verify 413/400
6. **Injection & Bad-Input Probes** — SQL injection, XSS, missing fields, invalid JSON, null bytes
7. **Nikto Security Scan** — Automated web security vulnerability scanner (slow, optional)
8. **Nmap Port Scan** — Check for unexpected open ports (slow, optional)
9. **Siege (Public Load Test)** — Concurrent unauthenticated requests
10. **Siege (Authenticated Load Test)** — Concurrent authenticated API requests
11. **wrk / ab Throughput Test** — Raw throughput and latency baseline
12. **Crash Recovery** — Verify server health after sustained load

## Available Commands

### Full Test Suite

```bash
make stress-test
```

- Ensures stack is running (starts it if needed)
- Builds stress-test container image
- Runs all 12 test categories
- Collects results to `stress-test-results/`
- Displays summary

### Build Only (Skip Tests)

```bash
make stress-test-build
```

Pre-builds the stress-test Docker image without running tests. Useful for CI/CD pipeline setup.

### Extended Test with Live Monitoring

```bash
make stress-test-live
```

- Runs tests with 5-minute duration (vs. default 30s)
- Higher concurrency (50 vs. 25)
- Tails the report file as it completes
- Useful for deep performance profiling

### Custom Invocation

```bash
# Via make
bash scripts/run-stress-test.sh [BASE_URL] [DURATION] [CONCURRENCY] [SKIP_BUILD]

# Examples:
bash scripts/run-stress-test.sh https://localhost:8443 1m 50     # 1 min, 50 threads
bash scripts/run-stress-test.sh https://nginx:443 30s 25 true    # Skip rebuild
```

## Understanding Test Results

### Success Criteria

All tests pass when:
- Health endpoints respond with 200
- Security headers are present
- Bad inputs rejected with 4xx (not 5xx)
- Rate limiter triggers on burst
- Availability ≥ 99% under load
- Server recovers post-load (no 5xx errors)

### Report Structure

Each test generates a timestamped report in `stress-test-results/`:

```
stress-test-results/
├── report_20260406_125000.txt         ← Main summary
├── nikto_20260406_125000.txt          ← Nikto findings (if run)
├── nmap_20260406_125000.txt           ← Port scan results (if run)
├── siege_public_20260406_125000.txt   ← Public load test metrics
├── siege_auth_20260406_125000.txt     ← Authenticated load test metrics
├── wrk_20260406_125000.txt            ← wrk throughput baseline (if available)
└── ab_20260406_125000.txt             ← Apache Bench results (fallback)
```

### Key Metrics to Monitor

**Availability** (Siege)
- Target: ≥ 99%
- Below 99% indicates instability or rate-limiting too aggressive

**Response Time** (Siege)
- Typical for /api/health: < 100ms
- Indicates backend latency; spike suggests bottleneck

**Requests/sec** (wrk/ab)
- Baseline metric for production performance
- Compare across releases to detect regressions

**Security Headers**
- All 5 critical headers must be present:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Content-Security-Policy`
  - `X-XSS-Protection`

**Rate Limiting**
- Should trigger 429 within 150 rapid requests
- If not triggered, verify `rateLimit.windowMs` and `rateLimit.max` in config

### Manual Pre-Deployment

Before pushing to production:

```bash
# 1. Deploy to staging
docker compose -f compose.prod.yaml up -d

# 2. Run extended stress tests
bash scripts/run-stress-test.sh https://staging.alpacaparty.test 5m 100

# 3. Review report
cat stress-test-results/report_*.txt | tail -100

# 4. Check for no 5xx errors
grep -i "500\|502\|503" stress-test-results/report_*.txt || echo "✓ No server errors"
```

## Troubleshooting

### "docker not found" / "Docker Compose not found"

Ensure Docker and Docker Compose are installed:

```bash
docker --version
docker compose version
```

### "Required services not running"

The orchestrator tries to start missing services. If it fails:

```bash
make up  # Start the full stack manually
make stress-test  # Then re-run tests
```

### "Nikto/Nmap missing" (warnings in output)

These tools are optional. The test suite skips them gracefully if unavailable inside the container. If you want them included, rebuild:

```bash
docker build --no-cache -t alpacaparty-stress-test scripts/
```

### High failure rate or 5xx errors during tests

Increase resource limits or reduce concurrency:

```bash
bash scripts/run-stress-test.sh https://nginx:443 30s 10  # Reduce from 25 to 10
```

### "No 429 responses" warning

Either rate limiting isn't configured or the window is too large. Check backend config:

```bash
make shell-backend
cat src/config/index.js | grep -A 3 rateLimit
```

Should show:

```javascript
rateLimit: {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                 // 1000 requests per window
}
```

## Performance Baselines

These are reference metrics for a healthy setup (on modern hardware):

| Metric | Target | Unit |
|--------|--------|------|
| Health endpoint latency | < 50ms | p99 |
| Authenticated endpoint latency | < 150ms | p99 |
| Availability under 25 concurrent users | ≥ 99% | % |
| Requests/sec (health endpoint) | ≥ 500 | req/s |
| Rate limit trigger threshold | < 200 requests | # |

Adjust expectations based on your infrastructure and concurrent user count.

## Customization

### Adding Custom Test Endpoints

Edit `scripts/stress-test.sh` and add URLs to the Siege URL lists:

```bash
# Line ~340: Public endpoints
SIEGE_URLS="${REPORT_DIR}/urls_public_${TIMESTAMP}.txt"
cat > "$SIEGE_URLS" <<EOF
${BASE_URL}/api/health
${BASE_URL}/api/posts
${BASE_URL}/api/users   # ← Add new endpoints
${BASE_URL}/api/games
EOF
```

### Adjusting Test Duration for CI

In your CI config:

```bash
# Quick smoke test (2 min)
bash scripts/run-stress-test.sh https://nginx:443 2m 10

# Extended soak test (15 min) — run nightly
bash scripts/run-stress-test.sh https://nginx:443 15m 50
```

## Cleanup

Remove all stress-test artifacts:

```bash
rm -rf stress-test-results/
docker volume rm $(docker volume ls -q --filter "name=stress_test_results")
```

## Further Reading

- [Siege Documentation](https://www.joedog.org/siege-home/)
- [wrk GitHub](https://github.com/wg/wrk)
- [Nikto Security Scanner](https://cirt.net/Nikto2)
- [Nmap Documentation](https://nmap.org/book/man.html)
- [OWASP Load Testing](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/11-Client-side_Testing/11.1-Testing_for_DOM-based_Cross_Site_Scripting)

---

**Questions?** Check the reports in `stress-test-results/` or open an issue on the project repo.
