# Changelog

このプロジェクトの主要な変更履歴。本ドキュメントは [Keep a Changelog](https://keepachangelog.com/) に従う。

## [Unreleased]

## [1.3.0] — 2026-05-14

### Added — 運用イメージのリッチプレビュー

- **AI 診断タブの表示を全面強化**:
  - 11 業態のスコアを **横棒バー (ランク別色分け)** で視覚化
  - 各業態に「向いている点 / 留意点」コメントを併記
  - 求職者に送信される **診断 PDF を iframe で画面内に直接プレビュー** (A4 2 枚)
- **FAX タブの表示を強化**:
  - 最新の FAX 送信票を **iframe で画面内プレビュー** (実際に施設へ送信される現物)
  - 送信履歴テーブルは併存
- **Seed を全 status 別サンプルに強化**:
  - 既存の applicant1 / applicant2 と追加 6 名の各 status に対応する完成データ
  - `SKILL_SHEET_INPROGRESS` / `SKILL_SHEET_DONE` / `INTERVIEW_DONE` / `SALES_READY` / `IN_INTRODUCTION` / `CONTRACTED` ごとに想定される実運用データが入る
  - **11 業態フル診断** (mock provider のロジックを seed で決定論的に再現)
  - 各サンプルに対応する SkillSheet / Interview (5 ターン + サマリ) / FaxSheet (3 件) / FaxReaction を生成

### Changed — セキュリティヘッダ

- `X-Frame-Options: DENY` → **`SAMEORIGIN`** に変更 (同一オリジン内の PDF iframe を許可)
- CSP に `frame-src 'self'` と `frame-ancestors 'self'` を追加
- これにより `/admin/applicants/[id]` 内で診断 PDF / FAX PDF を iframe で表示できる

## [1.2.0] — 2026-05-14

### Changed — 完全社内向け SaaS にリブート

- **トップページ (`/`) を社内営業 LP に刷新**: 求職者向け CTA を削除し、業務フロー 5 ステップ + 機能 8 種を「紹介会社 / 派遣会社」目線で再構成
- Login / Footer から「求職者として応募」リンクを削除
- 既存の `/apply` (公開フォーム) は **将来の HP 連動用に残置** (トップ・ログイン画面からは導線なし)

### Added — スタッフ代理登録フロー

- **`/admin/applicants/new`** — スタッフが氏名・連絡先・希望業態・保有資格を 1 画面で代理入力
- **`POST /api/admin/applicants`** — `applicants:write` 必須、`registerApplicantByStaff` を呼ぶ
- 登録時に自動で:
  1. Applicant 作成 (`status=RECEIVED`)
  2. AI 適職診断を即時実行 (`buildDiagnosis`)
  3. 診断 PDF を Buffer 生成 (`generateDiagnosisPdfBuffer`)
  4. **招待メールに診断 PDF を添付** して送信
  5. `AuditLog` (`applicant.registered_by_staff`) 記録

### Added — メール添付ファイル対応

- `EmailMessage.attachments?: EmailAttachment[]` (filename / content: Buffer / contentType)
- mock provider: **multipart/mixed** で `.eml` に添付を埋め込む (RFC 2045 base64)
- resend provider: Resend API の `attachments` フィールドへブリッジ
- `buildSkillSheetInviteEmail` に attachments を受け渡し可能化、本文に「PDF を添付しました」の一文を自動挿入

## [1.1.0] — 2026-05-14

### Added — Tsumugi ブランド + 本番品質仕上げ

- **プロダクト名「Tsumugi (紡)」採用** — タグライン「AI が、人と現場を丁寧に紡ぐ。」
- ロゴコンポーネント (`<TsumugiLogo />`) + Footer / Sidebar / Login / メール / FAX PDF を統一
- ランディングページ `/` を Hero + 機能 8 種 + 利用シーン + Footer の完全構成にリデザイン
- ログイン画面を 2 カラム + ブランドメッセージで再構築
- デザイントークン刷新: 深紺 + 生成 + 山吹のブランドカラー、ダークモード、ARIA フォーカス、スキップリンク
- Toast を skill-sheet の保存・提出に統合 (`silent` フラグで自動保存は無音)
- `Skeleton` / `EmptyState` 共通コンポーネント
- ドキュメント大幅追加: `ARCHITECTURE.md` / `SECURITY.md` / `DEPLOY.md` / `TESTING.md` / `BRAND.md`

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
