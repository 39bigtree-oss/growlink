# Growlink v1.0.0

医療福祉系人材紹介向け **AI 採用・営業自動化システム** の初版リリースです。

求職者の Web 申込から AI 適職診断・スキルシート (OCR 込み)・AI 電話面接・FAX 送信票生成・反応集計までを一気通貫で動作します。**外部 API キーがなくても** mock provider で全機能を試せます。

## ハイライト

- **モック完結**: Claude / Gemini / Twilio / STT / TTS / Resend / Document AI / InterFAX すべて mock 実装同梱
- **多言語**: ja / en / vi / id / zh の 5 言語に対応 (UI + AI 面接)
- **ジョブキュー**: BullMQ と memory provider の切替を環境変数 1 つで
- **RBAC**: ADMIN / CONSULTANT / SALES / VIEWER + AuditLog 全記録
- **KPI ダッシュボード**: 8 指標 + 30 日トレンド + 施設別反応率 Top 20

## セットアップ

[`docs/QUICKSTART.md`](./docs/QUICKSTART.md) の 5 ステップで起動できます。

## デモアカウント

| ロール | Email | Password |
|---|---|---|
| ADMIN | admin@growlink.local | growlink-admin-pass |
| CONSULTANT | consultant@growlink.local | growlink-consultant-pass |
| SALES | sales@growlink.local | growlink-sales-pass |
| VIEWER | viewer@growlink.local | growlink-viewer-pass |

## 本番化

各プロバイダの env を切替えるだけで実 API を呼べます。詳細は [`docs/providers.md`](./docs/providers.md)。

## 既知の制約

- ジョブワーカー専用プロセス (BullMQ) の起動スクリプトは Phase 6 (v1.1) で
- Document AI / Whisper / Deepgram / ElevenLabs / VOICEVOX / InterFAX は雛形のみ
- Sentry は DSN 設定時に SDK install (`@sentry/nextjs`) 必要

## 貢献

[`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照。
