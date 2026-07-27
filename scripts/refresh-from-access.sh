#!/usr/bin/env bash
# One-command Access → app refresh. Run from the repo root on the Mac any day
# Kimmie touched Access:
#
#   CUTSHEET_SESSION=<cookie> ./scripts/refresh-from-access.sh
#
# (cookie: DevTools → Application → Cookies → cutsheet_session, while logged
# in as admin.)
#
# What it does, in order:
#   1. Re-converts every .mdb that changed since the last run (first run
#      converts everything). Kimmie edits Access daily — stale conversions
#      are how "the importer doesn't work" happens.
#   2. Emits a dated bundle with the audit report. Any ⚠ warning printed
#      here is REAL (the corpus runs clean) — read it before trusting the
#      push.
#   3. Pushes in --update mode: never inserts, never overwrites app-edited
#      sheets. Edited-skips are listed by app id; unknown (drifted) keys are
#      written to unknown-keys-<date>.txt.
#
# FORCE_ALL=1 removes the edited-sheet guard for this run - Access wins on
# EVERY matched sheet, including ones people edited in the app (their form
# data is overwritten; attachments/drawings survive). Take a backup first
# (/api/backup in the browser). Use for full catch-ups, not routine runs.
#
# Nothing else here is destructive: re-running is always safe.
set -euo pipefail

MDB_DIR="${MDB_DIR:-/Users/austin/Projects/PC Exports/Cutsheets/Cut Sheets 2023}"
BASE_URL="${BASE_URL:-https://cutsheet.metcalfehvac.com}"
STAMP_FILE=".last-access-refresh"
TAG=$(date +%Y-%m-%d-%H%M)

if [ -z "${CUTSHEET_SESSION:-}" ]; then
  echo "Set CUTSHEET_SESSION first:  CUTSHEET_SESSION=<cookie> $0"
  exit 1
fi

echo "== 1/3 converting changed .mdb files from: $MDB_DIR"
if [ -f "$STAMP_FILE" ]; then
  CHANGED=$(find "$MDB_DIR" -maxdepth 1 -name "*.mdb" -newer "$STAMP_FILE")
else
  CHANGED=$(find "$MDB_DIR" -maxdepth 1 -name "*.mdb")
fi
if [ -z "$CHANGED" ]; then
  echo "   no .mdb changed since last run — using existing conversions"
else
  echo "$CHANGED" | while IFS= read -r f; do echo "   $(basename "$f")"; done
  echo "$CHANGED" | tr '\n' '\0' | xargs -0 python3 scripts/mdb-to-tables.py --out legacy-tables
fi
# The known-corrupt export must never ride along in the emit.
rm -f "legacy-tables/2023 U - V - bad 10-12-23.json"

echo "== 2/3 emitting bundle-$TAG.json (audit: audit-$TAG.json)"
npm i -D tsx --no-save >/dev/null 2>&1 || true
node --no-experimental-strip-types --import tsx scripts/import-legacy.mts \
  "legacy-tables/2020 Caruso.json" "legacy-tables/2021-2022 Caruso.json" legacy-tables/2023*.json \
  --emit "bundle-$TAG.json" --audit-report "audit-$TAG.json"

if [ "${FORCE_ALL:-0}" = "1" ]; then
  echo "== 3/3 pushing to $BASE_URL (update mode, FORCE-ALL: Access wins on every matched sheet)"
  node scripts/push-legacy.mts "bundle-$TAG.json" "$BASE_URL" --update --force-edited all
else
  echo "== 3/3 pushing to $BASE_URL (update mode)"
  node scripts/push-legacy.mts "bundle-$TAG.json" "$BASE_URL" --update
fi

touch "$STAMP_FILE"
echo ""
echo "== done. Reading the output above:"
echo "   'updated N'        = refreshed from Access"
echo "   'edited ... by id' = sheets someone saved in the app - Access did NOT overwrite them."
echo "                        To let Access win on specific ones:"
echo "                        CUTSHEET_SESSION=... node scripts/push-legacy.mts bundle-$TAG.json $BASE_URL --update --force-edited id,id"
echo "   unknown-keys-*.txt = sheets whose prop/builder no longer matches the import ledger -"
echo "                        their app copies are going stale every refresh until reconciled."
