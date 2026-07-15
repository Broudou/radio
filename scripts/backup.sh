#!/usr/bin/env bash
# Nightly backup of the radio app's MongoDB database and uploaded files.
# Intended to run via cron, e.g.:
#   0 3 * * * /opt/radio/scripts/backup.sh >> /var/log/radio-backup.log 2>&1
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${RADIO_BACKUP_ROOT:-$HOME/backups/radio}"
DATE="$(date +%F)"
RETENTION_DAYS=14

mkdir -p "$BACKUP_ROOT/$DATE"

mongodump --db=radio --out="$BACKUP_ROOT/$DATE/mongo"

# Incremental — a growing MP3 library shouldn't be re-copied in full nightly.
rsync -a --delete "$APP_DIR/uploads/" "$BACKUP_ROOT/latest-uploads/"

find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} \;

echo "[$(date -Iseconds)] Backup complete: $BACKUP_ROOT/$DATE"
