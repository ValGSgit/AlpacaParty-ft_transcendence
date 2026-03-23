# Lightweight GitHub CLI container — no local install needed.
# Usage:
#   docker build -t alpacaparty-gh gh/
#   docker run --rm -e GH_TOKEN="<your-pat>" alpacaparty-gh issue list
#
# Or use the Makefile helpers:
#   make gh CMD="issue list"
FROM alpine:3.20

RUN apk add --no-cache github-cli

ENTRYPOINT ["gh", "--repo", "ValGSgit/AlpacaParty"]
CMD ["issue", "list"]
