# Database backup and restore

PostgreSQL runs in Docker (container `nestjs-postgres`). Credentials: user `nest`, password `nest`, database `nestdb`.

## Backup

**One-off (custom path):**
```bash
docker exec nestjs-postgres pg_dump -U nest -d nestdb --no-owner --no-acl > my-backup.sql
```

**Using the script (saves to `./backups/` with timestamp):**
```bash
./scripts/backup-db.sh
# or to a specific file:
./scripts/backup-db.sh ./backups/my-backup.sql
```

Backups are plain SQL; you can inspect and edit them if needed.

## Restore

**One-off:**
```bash
docker exec -i nestjs-postgres psql -U nest -d nestdb < my-backup.sql
```

**Using the script:**
```bash
./scripts/restore-db.sh ./backups/nestdb_20250219_120000.sql
```

**Note:** Restore **overwrites** the current database content (it does not merge). Stop or avoid using the app during restore if possible.

## Optional: exclude seed re-runs

After restore, tables already have data, so the app’s Person/Device seed (on empty table) will not run again.
