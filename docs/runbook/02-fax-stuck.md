# Runbook 02: FAX 送信が詰まっている

## 症状
- `/admin/fax-sheets?status=PENDING` に長時間 PENDING の FaxSheet が滞留
- 施設から「FAX 届かない」連絡

## 切り分けフロー

### 1. mock provider 運用中の場合 (現状の v1.0〜)
- mock は実 FAX を送らない (`/admin/system-status` で `fax.send` が MOCK)
- 動作確認は `.storage/fax-sheets/*.pdf` の物理ファイル生成だけ
- 施設に「現在 mock 運用中で実送信していない」旨を伝達

### 2. InterFAX 接続後 (v1.7-1.8 以降)
1. `/api/health/deep` で `email` / `queue` を確認
2. BullMQ ダッシュボード (実装後) で `fax` キューの状態を確認
3. `JobLog` (admin DB) で直近 24h の失敗を確認:
   ```sql
   SELECT id, jobName, status, errorMessage, createdAt
   FROM "JobLog"
   WHERE queue='fax' AND status IN ('failed', 'queued')
   ORDER BY createdAt DESC LIMIT 20;
   ```
4. InterFAX 側のステータス確認

### 3. 強制再送
```bash
# 個別の FaxSheet を再送する
curl -X POST https://[base-url]/api/fax-sheets/<id>/send \
  -H "Cookie: <admin session>"
```

または:
- `/admin/fax-sheets/<id>` → 「再送する」ボタン (v1.8 で追加検討)

## 復旧後

1. 滞留していた件数を集計し、施設別に「遅延のお詫び」リストを作成
2. ポストモーテム

## 予防策

- BullMQ の `attempts` を 5 (現状 3) に増やす
- 連続失敗が 10 件超えたら Sentry に critical アラート
