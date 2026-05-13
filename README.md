# グロウリンク AI 採用・営業自動化システム

求職者の Web 申込から AI 適職診断 → スキルシート (本人入力 + 履歴書 OCR) → AI 電話面接 → 営業用 FAX 送信票の生成・送信・反応集計までを一気通貫で行う、医療福祉系人材紹介向けの社内システムです。

すべての外部 API (Claude / Gemini / Twilio / Whisper / TTS / Resend / Document AI / InterFAX) は **mock provider** が同梱されているため、API キーゼロでも一気通貫の動作確認ができます。

## 機能ハイライト

- ✅ Web 申込フォーム (`/apply` — 4 ステップ + 入力途中保存 + 多言語 5 言語)
- ✅ AI 適職診断 (11 業態、ランク S/A/B/C/D、PDF 生成)
- ✅ スキルシート (タブ式入力 + 履歴書 PDF/画像 → OCR → Claude 構造化 → 自動マージ)
- ✅ AI 電話面接 (5 ターン、Twilio TwiML フロー + 管理者シミュレータ + 文字起こし要約)
- ✅ FAX 送信票 (A4 2 枚、業態別テンプレ、Mock 送信 + 返信フォーム)
- ✅ KPI ダッシュボード (8 指標 + 30 日トレンド + 施設別反応率 Top 20)
- ✅ 営業フローハブ (`/admin/sales` — SALES_READY / IN_INTRODUCTION + 興味あり反応)
- ✅ 多言語 UI (ja / en / vi / id / zh) + 在留資格管理
- ✅ ジョブキュー (BullMQ + メモリ provider) で重い処理を非同期化
- ✅ RBAC (ADMIN / CONSULTANT / SALES / VIEWER) + AuditLog 全記録
- ✅ レート制限 + CSP + 反応トークン HMAC 署名

## クイックスタート

`docs/QUICKSTART.md` をご覧ください。コピペで 5 分以内に起動できます。

## 技術スタック

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** + **lucide-react**
- **Prisma** + **PostgreSQL 16** (`docker compose up -d` 同梱)
- **Auth.js v5** (Credentials + Magic Link)
- **AI**: Anthropic Claude (`AI_PROVIDER=anthropic`) / Google Gemini (`AI_PROVIDER=gemini`) / mock
- **STT**: Whisper / Deepgram (どちらも雛形) / mock
- **TTS**: ElevenLabs / VOICEVOX / mock
- **Twilio Programmable Voice** / mock
- **Resend** / mock (`.storage/sent-emails/*.eml` に書き出し)
- **BullMQ + Redis** / メモリ provider
- **次世代 PDF**: `@react-pdf/renderer` + Noto Sans JP
- **テスト**: Vitest + Playwright + msw

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`docs/QUICKSTART.md`](./docs/QUICKSTART.md) | ローカルで 5 分で起動 |
| [`docs/operations.md`](./docs/operations.md) | 運用マニュアル (KPI / トラブルシュート / 復旧) |
| [`docs/api.md`](./docs/api.md) | REST API リファレンス |
| [`docs/providers.md`](./docs/providers.md) | AI / メール / FAX / OCR の本番切替手順 |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | 開発時系列ログ |
| [`CHANGELOG.md`](./CHANGELOG.md) | リリースノート |
| [`spec.md`](./spec.md) | 業務仕様 |
| [`design.md`](./design.md) | 設計書 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 用コンテキスト |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 開発参加ガイド |

## デモアカウント

`pnpm prisma:seed` で以下が作成されます。**本番環境では必ずパスワードを変更してください**。

| ロール | Email | Password | 権限 |
|---|---|---|---|
| ADMIN | `admin@growlink.local` | `growlink-admin-pass` | すべて |
| CONSULTANT | `consultant@growlink.local` | `growlink-consultant-pass` | 申込編集 / 面接 / FAX 作成 |
| SALES | `sales@growlink.local` | `growlink-sales-pass` | 申込閲覧 / FAX 作成・送信 |
| VIEWER | `viewer@growlink.local` | `growlink-viewer-pass` | 閲覧のみ |

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 等の env で上書き可能。

## AI プロバイダ切替

```bash
# デフォルト (課金ゼロ・決定論的)
AI_PROVIDER=mock

# Anthropic Claude
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
MODEL_SMART=claude-sonnet-4-6
MODEL_FAST=claude-haiku-4-5

# Google Gemini
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL_SMART=gemini-2.5-pro
GEMINI_MODEL_FAST=gemini-2.5-flash
```

詳細は [`docs/providers.md`](./docs/providers.md) を参照。

## ライセンス

[MIT License](./LICENSE) — 商用利用可、無保証。
