#!/usr/bin/env bash
# Audit the Atlassian Marketplace Privacy & Security questionnaire for Mini Sites for Confluence
# via the PUBLIC REST endpoint (no auth). Prints the live SUBMITTED/APPROVED state and flags
# deviations from the canonical target (the answers approved 2026-07; see SKILL.md).
#
# Usage:  verify-ps.sh [minisite|appKey] [--json]
#   default : com.zenuml.confluence.minisite
#   --json  : dump the full raw JSON instead of the field summary
#
# `formStatus`: SUBMITTED = awaiting Atlassian review; APPROVED = last approved answers
# (if you just edited and it still says APPROVED with old values, your change did NOT land).
# This endpoint is the authoritative post-edit check. It is NOT the same as the listing
# JSON's endUserLicenseAgreementUrl, which is dormant/stale — never judge the EULA from that.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

arg="${1:-minisite}"
[ "$arg" = "--json" ] && { arg="minisite"; set -- minisite --json; }

case "$arg" in
  minisite|mini-site|mini-sites) KEY="com.zenuml.confluence.minisite"; SUBS=1 ;;   # Cloudflare only
  *)                             KEY="$arg";                            SUBS=0 ;;   # raw appKey; unknown expected sub count
esac

URL="https://marketplace.atlassian.com/rest/2/addons/${KEY}/privacy-and-security?cb=${RANDOM}${RANDOM}"
JSON="$(curl -s "$URL")"
[ -z "$JSON" ] && { echo "empty response for $KEY"; exit 1; }

if [ "${2:-}" = "--json" ]; then echo "$JSON" | python3 -m json.tool; exit 0; fi
echo "$JSON" | python3 "$here/_summarize_ps.py" "$KEY" "$SUBS"
