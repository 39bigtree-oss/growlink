# Changelog

このプロジェクトの主要な変更履歴。本ドキュメントは [Keep a Changelog](https://keepachangelog.com/) に従う。

## [Unreleased]

## [1.0.0] — 2026-05-13

初版リリース。すべての主要機能を mock provider で完結させ、外部 API キーゼロで動作するベースラインを提供します。

### Added

- **Phase 1 (#1〜#7)**: Next.js + Prisma + Auth.js 基盤、申込フォーム、AI 適職診断 (mock)、PDF 出力、管理画面 + RBAC、FAX 送信票 (A4 2 枚)
- **Phase 2 (#8)**: スキルシート (タブ式 / 30 秒自動保存)、履歴書 OCR + Claude 構造化、メールテンプレ 5 種、i18n (ja / en) 基盤
- **Phase 3 (#8)**: AI 電話面接 (5 ターン)、Twilio TwiML フロー、テキストシミュレータ、BullMQ ジョブキュー (memory / bullmq)、STT / TTS mock
- **Phase 4 (#9)**: 施設 CSV インポート、エリア / 業態フィルタ強化、FAX 一括送信ジョブ化、署名付き返信フォーム (`/feedback/[token]`)、KPI ダッシュボード拡張 (8 指標 + 30 日トレンド + 施設別 Top 20)、営業フローハブ
- **Phase 5 (#10)**: 多言語 5 言語 (vi / id / zh 追加)、在留資格テーブル、AI 面接の母語切替、global-error / not-found / loading / health / Sentry 雛形
- **v1 final (#11)**: Gemini プロバイダ、Toast、レート制限、CSP + セキュリティヘッダ、ドキュメント一式 (README / QUICKSTART / operations / api / providers)、デモシード拡張、Playwright E2E、GitHub Actions CI

### Security

- 申込・反応 API にレート制限 (固定窓カウンタ)
- CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy
- 反応トークン HMAC SHA256 署名 (`AUTH_SECRET` 派生)

### Notes

- すべての外部 API (Claude / Gemini / Twilio / Whisper / TTS / Resend / Document AI / InterFAX) に mock provider を同梱。本番切替手順は [`docs/providers.md`](./docs/providers.md)
