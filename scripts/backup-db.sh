#!/usr/bin/env bash
# Backup PostgreSQL database (run from project root)
# Usage: ./scripts/backup-db.sh [output_file]
# Default: backup nestdb to ./backups/nestdb_YYYYMMDD_HHMMSS.sql

set -e
CONTAINER="${POSTGRES_CONTAINER:-nestjs-postgres}"
USER="${POSTGRES_USER:-nest}"
DB="${POSTGRES_DB:-nestdb}"
BACKUP_DIR="./backups"
STAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="${1:-$BACKUP_DIR/${DB}_${STAMP}.sql}"

mkdir -p "$BACKUP_DIR"
echo "Backing up $DB to $OUTPUT ..."
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" --no-owner --no-acl > "$OUTPUT"
echo "Done. Size: $(du -h "$OUTPUT" | cut -f1)"
