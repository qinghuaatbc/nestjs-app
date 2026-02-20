#!/usr/bin/env bash
# Restore PostgreSQL database only when it is empty (run from project root)
# Usage: ./scripts/restore-db.sh <backup.sql>

set -e
CONTAINER="${POSTGRES_CONTAINER:-nestjs-postgres}"
USER="${POSTGRES_USER:-nest}"
DB="${POSTGRES_DB:-nestdb}"
INPUT="${1:?Usage: $0 <backup.sql>}"

if [ ! -f "$INPUT" ]; then
  echo "File not found: $INPUT"
  exit 1
fi

# Check if database has any rows in user tables (public schema)
ROWS=$(docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -t -A -c \
  "SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public';" 2>/dev/null || echo "1")
ROWS="${ROWS//[[:space:]]/}"
if [ -z "$ROWS" ]; then ROWS=1; fi

if [ "$ROWS" -gt 0 ]; then
  echo "Restore skipped: database is not empty (has $ROWS row(s) in user tables)."
  echo "Restore only runs for an empty database. Clear tables or use a fresh DB to restore."
  exit 1
fi

echo "Restoring $DB from $INPUT ..."
docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" < "$INPUT"
echo "Done."
