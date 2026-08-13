#!/usr/bin/env bash
# Pulls all events from the public pack25-calendar API and saves them as a
# timestamped JSON file. Safe to run from any box with outbound HTTPS access
# (no auth needed — GET /api/events is public read-only data).
#
# Usage: ./backup.sh [backup-dir]   (defaults to current directory)
# Override the source with: PACK25_URL=https://... ./backup.sh
#
# Cron example (daily at 3am): 0 3 * * * /path/to/backup.sh /path/to/backups

set -euo pipefail

URL="${PACK25_URL:-https://calendar.pack25mahomet.com}/api/events"
BACKUP_DIR="${1:-.}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
OUTFILE="${BACKUP_DIR}/pack25-events-${TIMESTAMP}.json"

mkdir -p "$BACKUP_DIR"

TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT

HTTP_CODE="$(curl -sS -o "$TMPFILE" -w '%{http_code}' "$URL")"

if [ "$HTTP_CODE" != "200" ]; then
  echo "Backup failed: HTTP $HTTP_CODE from $URL" >&2
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  if ! jq empty "$TMPFILE" >/dev/null 2>&1; then
    echo "Backup failed: response was not valid JSON" >&2
    exit 1
  fi
  COUNT="$(jq 'length' "$TMPFILE")"
else
  # jq not installed — fall back to a much weaker sanity check.
  if [ "$(head -c1 "$TMPFILE")" != "[" ]; then
    echo "Backup failed: response doesn't look like a JSON array" >&2
    exit 1
  fi
  COUNT="unknown (install jq for a real count)"
fi

mv "$TMPFILE" "$OUTFILE"
echo "Saved $COUNT events to $OUTFILE"
