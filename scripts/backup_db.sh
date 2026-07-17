#!/usr/bin/env bash
# Backup PostgreSQL (MarineAnalytics) using pg_basebackup (physical) + pg_dump (logical)
# Usage: ./scripts/backup_db.sh [output_dir]
# Default output: ./backups/YYYYMMDD_HHMMSS/
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-marine}"
DB_NAME="${DB_NAME:-marineanalytics}"
BACKUP_ROOT="${1:-./backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

echo "=== MarineAnalytics DB Backup ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Database: ${DB_NAME}"
echo "Output: ${BACKUP_DIR}"
echo ""

echo "[1/2] Logical backup (pg_dump)..."
PGPASSWORD=marine pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --file="${BACKUP_DIR}/marineanalytics.dump"

LOGICAL_SIZE=$(du -h "${BACKUP_DIR}/marineanalytics.dump" | cut -f1)
echo "  -> Done: marineanalytics.dump (${LOGICAL_SIZE})"

echo "[2/2] Schema-only backup (for quick restore reference)..."
PGPASSWORD=marine pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --schema-only \
  --file="${BACKUP_DIR}/schema.sql"

SCHEMA_SIZE=$(du -h "${BACKUP_DIR}/schema.sql" | cut -f1)
echo "  -> Done: schema.sql (${SCHEMA_SIZE})"

echo ""
echo "=== Backup complete ==="
echo "Files in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"
echo ""
echo "To restore: ./scripts/restore_db.sh ${BACKUP_DIR}/marineanalytics.dump"
