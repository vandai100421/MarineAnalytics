#!/usr/bin/env bash
# Restore PostgreSQL (MarineAnalytics) from pg_dump backup
# Usage: ./scripts/restore_db.sh <backup_file.dump> [target_db_name]
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore_db.sh <backup_file.dump> [target_db_name]}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-marine}"
DB_NAME="${2:-marineanalytics}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=== MarineAnalytics DB Restore ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Database: ${DB_NAME}"
echo "Backup: ${BACKUP_FILE}"
echo ""

echo "[1/2] Dropping existing connections..."
PGPASSWORD=marine psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

echo "[2/2] Restoring from backup..."
PGPASSWORD=marine pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${BACKUP_FILE}"

echo ""
echo "=== Restore complete ==="
echo "Verifying row counts:"
PGPASSWORD=marine psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -c "SELECT 'vessels' as tbl, count(*) FROM vessels UNION ALL SELECT 'position_reports', count(*) FROM position_reports UNION ALL SELECT 'ports', count(*) FROM ports UNION ALL SELECT 'port_arrivals', count(*) FROM port_arrivals UNION ALL SELECT 'fleets', count(*) FROM fleets UNION ALL SELECT 'idle_events', count(*) FROM idle_events;"
