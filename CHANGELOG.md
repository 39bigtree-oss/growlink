# Changelog

このプロジェクトの主要な変更履歴。本ドキュメントは [Keep a Changelog](https://keepachangelog.com/) に従う。

## [Unreleased]

## [1.4.0] — 2026-05-14

### Added — Phase 6: 完璧な内部システム化の基盤

- **仕様マスター文書**: `docs/internal-system-spec.md` を新設。v1.4〜v2.0 までのロードマップ、ドメインモデル、ロジック層、セキュリティ要件、テスト戦略を集約
- **Prisma スキーマ拡張**: 9 新規モデル + 11 新規 enum を追加
  - `JobOrder` — 求人案件 (Facility:1 → JobOrder:N)。職種・雇用形態・時給/月給帯・シフト・必須/推奨資格・最低経験年数・headcount・urgency・座標 (lat/lng) まで
  - `RefundPolicy` — 返金規定 (段階返金 tiers JSON)
  - `Contract` — 取引契約 (紹介手数料 / 派遣契約 / TtP)。e-Sign プロバイダ、入金サイトを含む
  - `Placement` — 紹介成立 (Applicant × Facility × JobOrder × Contract)。手数料ステータス・退職日まで
  - `Invoice` — 請求書 (請求書番号 unique / 税抜・税・税込)
  - `DispatchLedger` — 派遣台帳 (派遣業法対応、抵触日 + 派遣元/先責任者 + 社保加入)
  - `MyNumberRecord` — マイナンバー (特定個人情報)。AES-256-GCM 暗号化文字列で保管
  - `MyNumberAccessLog` — マイナンバーアクセスログ (理由必須)
  - `AuditEvent` — append-only ハッシュチェーン監査ログ (sha256(prevHash || canonical(this)))
- **ResidenceStatus.alertSentAt** — 在留期限アラートの重複送信防止フィールド追加
- **マイグレーション**: `prisma/migrations/20260514120000_phase_6_internal_foundation/` を同梱

### Added — ロジック層 (src/lib/)

- **`matching/score.ts`** — 加重マッチング (5 軸: distance 20% / wage 25% / shift 20% / qual 25% / exp 10%)。必須資格未保持なら total=0 のハードフィルタ
- **`billing/calc.ts`** — 紹介手数料計算 (年収 × feeRate) + 段階返金規定の適用 (`applyRefund`) + 税計算
- **`billing/invoice-number.ts`** — 請求書番号採番フォーマッタ (`INV-YYYY-MM-NNNN`) + parse
- **`compliance/anti-teishoku.ts`** — 派遣業法 3 年ルール抵触日計算 + 残日数 + 接近判定
- **`compliance/my-number.ts`** — マイナンバー AES-256-GCM 暗号化 / 復号 / 形式チェック / マスク (下 4 桁のみ表示)
- **`audit/event.ts`** — `recordAuditEvent` (Serializable トランザクションで前 hash を読み hash を伸ばす) + `verifyChain` (改ざん検知)
- **`integrations/e-sign/`** — 電子契約プロバイダ抽象 + mock (CloudSign / GMO サイン差し替え予定)
- **`integrations/accounting/`** — 会計プロバイダ抽象 + mock (freee / Money Forward 差し替え予定)

### Added — Zod スキーマ

- `src/lib/schemas/job-order.ts` (求人案件フォーム + 応募者マッチングプロファイル + シフトパターン)
- `src/lib/schemas/contract.ts` (取引契約フォーム + RefundTier + RefundPolicy)
- `src/lib/schemas/placement.ts` (紹介成立フォーム)
- `src/lib/schemas/invoice.ts` (請求書フォーム + 請求書番号正規表現)
- `src/lib/schemas/dispatch-ledger.ts` (派遣台帳フォーム)
- `src/lib/schemas/my-number.ts` (マイナンバー入力 + アクセス理由スキーマ)

### Added — テスト (新規 37 ケース)

- `tests/unit/matching-score.test.ts` (6 ケース) — 加重スコア決定論 + ハードフィルタ + 距離/月給/経験各軸
- `tests/unit/billing-calc.test.ts` (12 ケース) — 紹介手数料 / 段階返金 / 税 / 請求書番号 round trip
- `tests/unit/anti-teishoku.test.ts` (6 ケース) — 3 年抵触日計算 (うるう年含む) + 接近判定
- `tests/unit/my-number-crypto.test.ts` (8 ケース) — AES-GCM round trip + 鍵差し替えで復号失敗 + マスク
- `tests/unit/audit-chain.test.ts` (5 ケース) — Genesis チェーン + 改ざん検知 (after 書換 / 中間削除)

合計 **295 / 295 tests passing** (258 既存 + 37 新規)。

### Added — seed 拡張

- `seedPhase6Foundation()` を `main()` 末尾に追加
  - 標準 90 日段階返金規定 (30/60/90 日)
  - 紹介手数料 30% 契約 × 1 + 派遣手数料 25% 契約 × 1
  - 求人案件 (訪問看護 常勤 / デイサービス 派遣) × 2
  - CONTRACTED 求職者 1 名 → Placement + Invoice (INV-2026-05-0001, 発行済)
  - IN_INTRODUCTION 求職者 1 名 → 派遣 Placement + DispatchLedger (抵触日付き)
- 全て冪等 (再投入しても重複しない)

### Non-Goals (v1.4 で意図的にやらないこと)

- ❌ マルチテナント (`tenantId` 全付け) — 内部システムだから不要
- ❌ UI 実装 (v1.5 で別 PR に分割)
- ❌ 本番 e-Sign / 会計 API 接続 (mock のみ)
- ❌ MFA / SSO (v1.8)
- ❌ 在留期限の自動メール送信 (v1.6)

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
