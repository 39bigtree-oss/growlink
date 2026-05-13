# Deploy — Tsumugi 本番化手順

## 1. 推奨構成

| 役割 | サービス例 |
|---|---|
| Web / API | Vercel (Next.js 15) / Railway / AWS ECS |
| DB | Neon / Railway Postgres / AWS RDS PostgreSQL 16 |
| Redis | Upstash / Railway Redis |
| Storage | AWS S3 / Cloudflare R2 (Phase 6 で対応) |
| メール | Resend |
| LLM | Anthropic Claude / Google Gemini |
| OCR | Google Document AI |
| 電話 | Twilio |
| 監視 | Sentry |

## 2. 環境変数 (本番最小セット)

```env
# 必須
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-host
APP_BASE_URL=https://your-host

# AI (どちらか)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# or
AI_PROVIDER=gemini
GEMINI_API_KEY=...

# メール
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Tsumugi <no-reply@your-host>

# 電話 (Phase 3 を本番化する場合)
TWILIO_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=+8150...

# OCR (Phase 2 を本番化する場合)
OCR_PROVIDER=docai
GCP_DOCAI_PROJECT=...
GCP_DOCAI_LOCATION=us
GCP_DOCAI_PROCESSOR_ID=...

# FAX
FAX_PROVIDER=interfax
INTERFAX_USER=...
INTERFAX_PASS=...

# ジョブ
QUEUE_PROVIDER=bullmq

# 監視
SENTRY_DSN=https://...
```

## 3. Vercel デプロイ手順

```bash
# 1. Vercel プロジェクトを作成 (GitHub 連携)
# 2. Environment Variables に上記を全て設定
# 3. Build Command: pnpm build
# 4. Install Command: pnpm install --frozen-lockfile=false
# 5. Output Directory: .next
# 6. Node 22 LTS を選択

# Deploy
vercel --prod
```

注意: Vercel のサーバレス制約で `QUEUE_PROVIDER=memory` は **プロセス間で共有されない**。
ジョブ実行は別途 Railway / Fly.io でワーカー専用プロセスを立てる前提です:

```bash
# ワーカー専用 (Phase 6 で `src/lib/jobs/worker.ts` を整備予定)
QUEUE_PROVIDER=bullmq REDIS_URL=... pnpm tsx src/lib/jobs/worker.ts
```

## 4. Railway デプロイ手順

Railway は Web + Worker + Postgres + Redis を 1 プロジェクトで完結できます:

```bash
# Railway CLI で初期化
railway init
railway add        # postgres / redis を選択
railway up         # 自動で next build → next start
```

`Procfile` 相当の設定:

```
web: pnpm start
worker: pnpm tsx src/lib/jobs/worker.ts   # Phase 6 で追加予定
```

## 5. Prisma マイグレーション

```bash
# 本番デプロイ前に必ず実行
pnpm prisma migrate deploy
```

`migrate dev` は本番では絶対に使わないこと。

## 6. ヘルスチェック

ロードバランサ・cron で `GET /api/health` を 1 分間隔で監視。
`ok=false` のときアラート。

## 7. データバックアップ

```bash
# crontab
0 4 * * * cd /app && DATABASE_URL=$DATABASE_URL ./scripts/backup-db.sh
```

Phase 6 で `aws s3 cp` 連携を追加予定。

## 8. ローカルから本番への切替手順 (チェックリスト)

- [ ] `AUTH_SECRET` を生成して環境変数にセット
- [ ] `AI_PROVIDER` を `mock` → `anthropic` or `gemini` に
- [ ] `EMAIL_PROVIDER` を `mock` → `resend` に + `RESEND_API_KEY`
- [ ] `OCR_PROVIDER` / `STT_PROVIDER` / `TTS_PROVIDER` / `TWILIO_PROVIDER` / `FAX_PROVIDER` を必要に応じて
- [ ] `QUEUE_PROVIDER=bullmq` + `REDIS_URL`
- [ ] `SENTRY_DSN` + `@sentry/nextjs` install
- [ ] `prisma migrate deploy` 実行
- [ ] `pnpm prisma:seed` は本番では実行しない (デモデータが入る)
- [ ] DNS の MX/SPF/DKIM/DMARC 設定 (メール送信元)
- [ ] `/api/health` で疎通確認

## 9. ロールバック手順

1. Vercel: 前デプロイの Production rollback
2. Railway: 前リリースの `redeploy`
3. DB マイグレーション: 破壊的変更を含むときは `prisma migrate resolve` で down 戦略を事前準備
4. 重要: 全リリースは `CHANGELOG.md` に記録、Releases に紐付ける
