# Runbook 01: DB ダウン時の対応

## 症状
- `https://[base-url]/api/health` が `db` を `ok` 以外で返す
- 管理画面で「データの取得に失敗しました」エラーが頻発
- Sentry / Datadog に大量のエラー

## 初期対応 (5 分以内)

1. **状態確認**
   ```bash
   curl -s https://[base-url]/api/health | jq .
   ```
2. **Railway / Supabase / RDS のダッシュボード**で Postgres 稼働状態を確認
3. **直近のメンテナンス通知**を確認 (provider のステータスページ)
4. アクティブなクエリで詰まっていないか確認:
   ```sql
   SELECT pid, now() - query_start AS dur, state, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY dur DESC
   LIMIT 10;
   ```

## 完全停止の場合

1. **Status ページを更新** (社内 + 顧客向け Slack へアナウンス)
2. **読み取り専用モード**に切り替え (`MAINTENANCE_MODE=read_only` 環境変数 → `prisma client` を `findMany` 専用にする middleware を有効化、v1.9 で実装予定)
3. **provider に復旧 ETA を確認**

## 復旧後

1. `/api/health/deep` で全項目 ok を確認
2. **監査ログのチェックポイント**を取り、整合性を確認:
   `/admin/audit` → 「チェックポイントを保存」
3. ナーチャシナリオの滞留を解消:
   `/admin/nurture` → 「scan を今すぐ実行」
4. ポストモーテムを作成 (`docs/postmortems/YYYY-MM-DD.md`)

## バックアップからのリストア

`scripts/backup-db.sh` で取得した dump を使う:

```bash
# 1. 新規 DB を作成
createdb growlink_restore_$(date +%Y%m%d)

# 2. リストア
pg_restore -d growlink_restore_$(date +%Y%m%d) backups/latest.dump

# 3. アプリの DATABASE_URL を一時的に切り替え
# 4. /api/health で正常確認後、本番 DATABASE_URL を切り戻す
```

## エスカレーション基準

- 1 時間以上 ダウン → CTO 連絡
- データ損失の疑い → 経営陣 + 弁護士連絡
