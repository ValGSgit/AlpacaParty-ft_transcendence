# ── GITHUB CLI (Dockerized) ────────────────────────────────────────────────
# Build the gh CLI image once; reused by all gh-* targets.
# Requires GH_TOKEN (personal access token) in .env or environment.

gh-build:
	@docker build -q -t alpacaparty-gh gh/

# Run any gh command:  make gh CMD="issue list --state open"
gh: gh-build
	@docker run --rm -e GH_TOKEN=$${GH_TOKEN} alpacaparty-gh $(CMD)

# Shortcut: list open issues
gh-issues: gh-build
	@docker run --rm -e GH_TOKEN=$${GH_TOKEN} alpacaparty-gh issue list


.PHONY: gh-issues gh gh-build