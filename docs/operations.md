# 運用マニュアル

## 1. KPI モニタリング

`/admin/dashboard` で以下を毎日チェック。

| KPI | 目標値 (初期) | 是正アクション |
|---|---|---|
| 今日の申込数 | 5 件以上 | 求人原稿の刷新、SEO 改善 |
| 診断完了率 | 95% 以上 | エラー監視ログを確認 |
| 平均診断スコア | 60 以上 | スコアロジック調整 |
| FAX 返信率 | 15% 以上 | テンプレートの A/B、施設リスト見直し |
| 興味あり率 | 8% 以上 | マッチング業態見直し |
| 成約率 | 5% 以上 | 営業フォローアップ |

## 2. ヘルスチェック

```bash
curl https://<host>/api/health
# {"ok":true,"checks":{"server":"ok","db":"ok"},"ts":"..."}
```

ロードバランサ・cron で 1 分間隔で叩いてください。`ok=false` のときアラート。

## 3. ジョブキュー

メモリ provider (デフォルト) は **同一プロセス内** で実行。Vercel 等のサーバレスでは
1 リクエスト = 1 プロセスなので、長時間処理はタイムアウトに注意。

本番は `QUEUE_PROVIDER=bullmq` + `REDIS_URL` を設定 → ワーカーは別プロセスで起動:

```bash
WORKER_INLINE=1 pnpm dev      # Next と同居 (開発)
# or
pnpm tsx src/lib/jobs/worker.ts  # 別プロセス (本番、Phase 6 で実装予定)
```

`JobLog` テーブルで全ジョブを追跡できます。

```sql
SELECT queue, jobName, status, attempts, errorMessage, createdAt
FROM "JobLog"
WHERE status='failed'
ORDER BY createdAt DESC LIMIT 50;
```

## 4. AuditLog の確認

スタッフが「誰が」「何を」「いつ」操作したかは `AuditLog` で全件記録。

- `applicant.status_changed` ステータス変更
- `diagnosis.run` AI 診断実行
- `fax_sheet.create` / `fax_sheet.send` FAX 関連
- `interview.scheduled` / `interview.completed`
- `skill_sheet.invite_resent` 入力リンク再送
- `residence_status.updated` 在留資格更新
- `facilities.imported` CSV インポート

## 5. メール送信トラブル

`EmailLog` テーブルで結果を確認:

```sql
SELECT template, status, errorMessage, sentAt FROM "EmailLog"
WHERE applicantId = '...' ORDER BY createdAt DESC;
```

`mock` 設定時は `.storage/sent-emails/*.eml` をローカルで開けます。

## 6. PII 取扱

- ログには絶対に氏名・電話・生年月日を出さない (マスク済みのみ)
- AI 呼び出し前に `lib/mask.ts` を通す
- 削除依頼は `Applicant.deletedAt` を set → 30 日後に物理削除 (Phase 6 cron)

## 7. データバックアップ

```bash
scripts/backup-db.sh   # pg_dump で .sql.gz を生成 (Phase v1 雛形)
```

S3 への自動アップロードは Phase 6 で実装予定。

## 8. インシデント対応

| 症状 | 一次対応 |
|---|---|
| API が 500 を返す | `/api/health` 確認 → `JobLog` で関連ジョブ確認 → Sentry (SENTRY_DSN 設定時) を見る |
| FAX 送信ジョブが失敗続き | `FAX_PROVIDER=mock` で疎通確認 → InterFAX キーを確認 |
| AI 診断が `mock` から `anthropic` に切替えた直後 429 | API レート制限。指数バックオフ済みなので待機 |
| メールが届かない | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` 確認 |

## 9. ロール変更

`User` を Auth.js で作成 → `Staff` レコードを作成 (1:1) → `Staff.role` で権限調整:
`ADMIN` / `CONSULTANT` / `SALES` / `VIEWER`。詳細は [`spec.md`](../spec.md) §3.6。

## 10. リリース手順

1. `main` で `pnpm test && pnpm typecheck && pnpm lint`
2. `git tag v<x.y.z>` → `git push origin v<x.y.z>`
3. GitHub Releases に `CHANGELOG.md` の該当節を投稿
4. Railway / AWS の Production 環境変数を更新
5. デプロイ完了後 `/api/health` で疎通確認
