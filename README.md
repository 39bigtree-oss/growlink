# Tsumugi (紡) — AI 採用・営業自動化プラットフォーム

> **AI が、人と現場を丁寧に紡ぐ。**
> *Weave people into the right place, with care.*

医療・福祉に特化した、求職者の Web 申込から AI 適職診断・スキルシート (本人入力 + 履歴書 OCR)・AI 電話面接・営業用 FAX 送信票の生成・送信・反応集計までを **一気通貫** で扱う社内システムです。

すべての外部 API (Claude / Gemini / Twilio / Whisper / TTS / Resend / Document AI / InterFAX) には **mock provider** が同梱されており、API キーゼロでもフル機能を試せます。

運営: **株式会社グロウリンク (Growlink Inc.)** / オープンソース ([MIT](./LICENSE))

---

## 機能ハイライト

- ✅ **求職者向け公開フォーム** — `/apply` (4 ステップ + 5 言語 + 入力途中保存)
- ✅ **AI 適職診断** — 11 業態 × ランク S/A/B/C/D + PDF 生成
- ✅ **スキルシート (タブ式 6 タブ)** — 30 秒自動保存、履歴書 PDF/画像 → OCR → LLM 構造化 → 自動マージ (本人入力を上書きしない)
- ✅ **AI 電話面接** — 5 ターン、Twilio TwiML 互換フロー + 管理者シミュレータ + 文字起こし要約
- ✅ **FAX 送信票** — A4 2 枚、業態別テンプレ、Mock 送信 + 署名付き反応 URL
- ✅ **KPI ダッシュボード** — 8 指標 + 30 日トレンド (recharts) + 施設別反応率 Top 20
- ✅ **営業フローハブ** — SALES_READY / IN_INTRODUCTION + 興味あり反応の優先処理
- ✅ **多言語 UI** — ja / en / vi / id / zh + 在留資格管理
- ✅ **ジョブキュー** — BullMQ + メモリ provider + JobLog 全件追跡
- ✅ **RBAC** — ADMIN / CONSULTANT / SALES / VIEWER + 全 PATCH/POST/DELETE で AuditLog
- ✅ **セキュリティ** — レート制限 + CSP + 反応トークン HMAC + a11y スキップリンク

## クイックスタート

[`docs/QUICKSTART.md`](./docs/QUICKSTART.md) — 5 分でローカル起動 + デモシナリオ。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`docs/QUICKSTART.md`](./docs/QUICKSTART.md) | 5 分起動 + デモシナリオ |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 全体構造・主要フロー・データモデル |
| [`docs/operations.md`](./docs/operations.md) | KPI / ヘルスチェック / インシデント対応 |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | 脅威モデル + チェックリスト |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Vercel / Railway 本番化手順 |
| [`docs/TESTING.md`](./docs/TESTING.md) | テスト戦略 + リリース前チェックリスト |
| [`docs/api.md`](./docs/api.md) | REST API リファレンス |
| [`docs/providers.md`](./docs/providers.md) | AI / メール / FAX / OCR の本番切替手順 |
| [`docs/BRAND.md`](./docs/BRAND.md) | プロダクト名・カラー・ロゴ・ライティング指針 |
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | 開発時系列ログ |
| [`CHANGELOG.md`](./CHANGELOG.md) | リリースノート |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 開発参加ガイド |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 用コンテキスト |

## デモアカウント

`pnpm prisma:seed` で以下が作成されます (本番では必ず変更してください):

| ロール | Email | Password |
|---|---|---|
| ADMIN | `admin@growlink.local` | `growlink-admin-pass` |
| CONSULTANT | `consultant@growlink.local` | `growlink-consultant-pass` |
| SALES | `sales@growlink.local` | `growlink-sales-pass` |
| VIEWER | `viewer@growlink.local` | `growlink-viewer-pass` |

求職者 6 名 + 施設 18 件 + 各種ステータスのサンプルデータも同梱。

## AI プロバイダ切替

```bash
# デフォルト (課金ゼロ / 決定論)
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

詳細: [`docs/providers.md`](./docs/providers.md)

## 技術スタック

- **Next.js 15** App Router + **TypeScript 5** + **React 19**
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** + **lucide-react**
- **Prisma 6** + **PostgreSQL 16**
- **Auth.js v5** (Credentials + Magic Link)
- **AI**: Anthropic Claude / Google Gemini / mock
- **STT**: Whisper / Deepgram (雛形) / mock
- **TTS**: ElevenLabs / VOICEVOX (雛形) / mock
- **Twilio Programmable Voice** / mock
- **Resend** / mock
- **BullMQ + Redis** / in-memory provider
- **PDF**: `@react-pdf/renderer` + Noto Sans JP
- **テスト**: Vitest + Playwright + msw

## ライセンス

[MIT License](./LICENSE) — 商用利用可、無保証。
