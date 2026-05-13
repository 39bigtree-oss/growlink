#!/usr/bin/env bash
# Phase v1 final: PostgreSQL のフルバックアップを取る雛形スクリプト。
# 本番では cron + S3 アップロードを Phase 6 (v1.1) で組み合わせる予定。
#
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/backup-db.sh
# 出力: backups/growlink-<YYYYMMDDHHMMSS>.sql.gz

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p backups
ts="$(date +%Y%m%d%H%M%S)"
out="backups/growlink-${ts}.sql.gz"

# pg_dump は environment-aware なので URL を直接渡せる。pg_dump v15+ 推奨。
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$out"

bytes=$(stat -c%s "$out" 2>/dev/null || stat -f%z "$out")
echo "Backup written: $out ($bytes bytes)"

# 古いバックアップを 7 日で削除
find backups -name "growlink-*.sql.gz" -mtime +7 -delete || true
