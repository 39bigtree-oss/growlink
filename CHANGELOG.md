# Changelog

このプロジェクトの主要な変更履歴。本ドキュメントは [Keep a Changelog](https://keepachangelog.com/) に従う。

## [Unreleased]

## [1.8.0] — 2026-05-14

### Added — 辛口評価への正面突破

71/100 評価を 80+ に持ち上げるための 7 領域同時投入。
**27 新規テスト / 計 367 passing**、新規ルート 5 件、新規 lib 8 本、Runbook 4 本、新規仕様書 2 本。

#### 1. 施設ポータル (片側 SaaS 解消)

- **`/portal/[token]`** — HMAC 署名 URL でログイン不要の施設専用ページ
- 施設は自分宛 FAX 一覧 / 案件 / 請求書を閲覧可能
- 「興味あり / 見送り」を **施設側から直接送信** (signed URL の reaction フォーム)
- `/admin/facilities/[id]` 下部に「ポータル URL を発行」ボタン (有効期限 90 日 + クリップボードコピー)
- 新規モデル: `FacilityPortalToken` (アクセスログ + revoke 機能)
- 新規 lib: `src/lib/portal/token.ts` — HMAC sign/verify + DB 連携

#### 2. ナーチャ自動化エンジン (営業自動化)

- 新規モデル: `NurtureSequence` + `NurtureStepExecution`
- **5 種のシナリオ定義** (FAX 未反応 / スキルシート未提出 / 興味あり 24h / 入社 1ヶ月 / 3ヶ月)
- ステップ kind: `WAIT` / `EMAIL` / `STAFF_TODO`
- `runNurtureScan()` で `nextRunAt <= now` の active シナリオを進行
- 新規 BullMQ ハンドラ `compliance:nurture.scan` 登録
- 管理画面: `/admin/nurture` (シナリオ定義 + 実行履歴 + 手動 scan ボタン)

#### 3. 退職実績入力 + 6/12 ヶ月生存率 (ML 教師データ収集)

- Placement 詳細に「退職を記録」フォーム (`AttritionForm`)
- 退職日入力 / 解除アクション `setAttritionAction` (audit 二重記録付き)
- 新規 lib: `src/lib/analytics/survival-rate.ts` (Kaplan-Meier の簡易版)
- ダッシュボードに **6ヶ月生存率 / 12ヶ月生存率** カードを追加 (評価可能件数 + 在籍率)

#### 4. マッチング v2 (Haversine + スキル階層)

- `Facility.lat` / `lng` カラムを追加
- 新規 lib: `src/lib/matching/geo.ts` — Haversine 距離 + 距離スコア変換
- 新規 lib: `src/lib/matching/skill-hierarchy.ts` — `SKILL_SUBSUMPTION` で「看護師」要件に「認定看護師」もマッチ
- `scoreMatch()` を更新: 緯度経度があれば Haversine、無ければ行政区フォールバック
- 推奨資格判定も階層化

#### 5. 監査ログ チェックポイント (検証スケール解消)

- 新規モデル: `AuditCheckpoint` (lastEventHash + eventCountAtCp スナップショット)
- 新規 lib: `src/lib/audit/checkpoint.ts` — `captureAuditCheckpoint()` で差分検証 + 保存
- `/admin/audit` に「チェックポイントを保存」ボタンを追加
- 1 万件 → 10 万件にスケールしても **差分のみ検証** で常時定速度

#### 6. 観測性 + Runbook 4 本

- **`/api/health/deep`** — DB / Storage / Email / Queue / AI / Sentry の状態を 1 つの endpoint で確認
- `docs/runbook/00-on-call-handover.md` — オンコール引き継ぎ
- `docs/runbook/01-db-down.md` — DB ダウン対応 (リストア手順含む)
- `docs/runbook/02-fax-stuck.md` — FAX 詰まり対応
- `docs/runbook/03-ai-quota-exceeded.md` — AI クォータ超過

#### 7. First Real Run Guide

- **`docs/first-real-run.md`** — Phase A〜G の実 AI / 実メール / 実ポータル接続チェックリスト
- 「全部 mock のまま」を脱出するための明確な手順
- AI 品質チェック完了の判定基準 5 項目

#### サイドバー + Feature Registry

- サイドバーに「ナーチャ自動化」ナビ追加
- `src/lib/system-status/features.ts` に 8 新規機能登録 (`portal.facility_view`, `nurture.engine`, `analytics.attrition_record` 等)
- `/admin/system-status` で新機能の状態が一覧表示

### テスト (新規 27 / 計 367 passing)

- `tests/unit/portal-token.test.ts` (6) — HMAC sign/verify, 改ざん検知, 期限切れ
- `tests/unit/matching-haversine.test.ts` (5) — 東京-大阪 ≒ 400km, スコア変換
- `tests/unit/skill-hierarchy.test.ts` (6) — 上位資格マッチ, 完全一致, missing 報告
- `tests/unit/nurture-sequences.test.ts` (6) — 定義整合性, nextRunAt 計算

### Non-Goals (v1.8 で意図的にやらないこと)

- ❌ ナーチャシナリオの **自動トリガー起動** (現在は手動 + scan、v1.9 で FAX 送信時自動起動)
- ❌ ナーチャ EMAIL ステップの実 sendEmail 接続 (v1.9)
- ❌ チェックポイントの BullMQ 自動スケジュール化 (v1.9)
- ❌ Facility 緯度経度の Geocoding API 自動取得 (v1.9)
- ❌ 施設ポータルの **案件更新リクエスト** 機能 (v1.9)

## [1.7.0] — 2026-05-14

### Added — フィーチャ状態の可視化 (スタッフが使える / 使えないが一目で分かる)

スタッフが画面に入った瞬間に「これは本物? mock? 制限あり?」が分かる状態を作る。
**16 新規テスト / 計 340 passing**、新規ルート 1 件、新規 lib 1 本、新規コンポーネント 2 本。

#### フィーチャ状態レジストリ (`src/lib/system-status/features.ts`)

- **シングル・ソース・オブ・トゥルース** で全 36 機能の状態を一元管理
- 5 状態: `READY` (本番運用可) / `MOCK` / `LIMITED` / `PLANNED` / `ROADMAP`
- 各機能のメタ情報: 名前 / カテゴリ / 説明 / 制限内容 / プロバイダ / 本番コスト目安 / 接続予定バージョン
- 環境変数を見て状態を動的判定する `runtimeState()` を実装
  - `AI_PROVIDER=gemini` → AI 機能群が READY に切り替わる
  - `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` 設定済 → email.send が READY
  - `BIAS_EVAL_PROVIDER=claude_haiku` → ai.bias_eval が READY

#### UI コンポーネント

- **`<FeatureStatusBadge>`** — 機能の状態を 1 行のバッジで表示 (mock / limited / planned)
- **`<FeatureStatusBanner>`** — 機能の制限を「アイコン + タイトル + 説明 + 制限リスト + 本番コスト + 予定バージョン」のリッチカードで表示
- **`<OperatingModePanel>`** — ダッシュボード上部の "運用モード" カード (READY / MOCK / LIMITED / PLANNED / ROADMAP の件数 + mock 中の代表機能)

#### `/admin/system-status` 一覧ページ

- 全 36 機能を **11 カテゴリ別**にテーブル表示
- 状態別件数の 5 つのサマリカード (色分け済)
- 制限内容 / プロバイダ / 本番コスト / 接続予定バージョンを各行に表示
- サイドバーに「機能状態」ナビ項目を追加

#### バナー設置箇所

- **ダッシュボード** — OperatingModePanel で全体サマリ
- **AI 適職診断タブ** (`/admin/applicants/[id]` → 診断タブ) — `ai.diagnosis` バナー
- **FAX 送信票** (`/admin/fax-sheets`) — `fax.send` バナー
- **取引契約** (`/admin/contracts`) — `integration.e_sign` バナー (e-Sign mock)
- **請求書** (`/admin/invoices`) — `integration.accounting` バナー (freee/MF mock)
- **マイナンバー登録** (`/admin/my-numbers/[id]/new`) — `ocr.my_number_card` バナー
- **紹介成立ウィザード** (`/admin/placements/new`) — invoice / e_sign / accounting の 3 バナー (作成時に内部で何が走るか明示)

#### テスト (新規 16)

- `tests/unit/feature-status.test.ts` — レジストリ整合性 (key 一意性, 必須フィールド), runtimeState 動的判定 (AI/Email/Bias 各種), Phase 6 主要機能の登録カバレッジ

### Non-Goals (v1.7 で意図的にやらないこと)

- ❌ 各機能の "切替トグル" を UI から実行 (環境変数経由のみ、安全側)
- ❌ Slack/PagerDuty への状態変化通知 (v1.8)
- ❌ 月利用量メーター (Resend 残枠など、v1.8 で各 provider の usage API 連携時)

## [1.6.0] — 2026-05-14

### Added — Phase 6 拡張 (退職予兆 / 在留期限 / マイナンバー OCR / 紹介ウィザード / AI bias / モバイル / RLS 準備)

7 領域を 1 PR に同梱。**21 新規テスト / 計 324 passing**、新規ルート 2 件、新規 lib 5 本。

#### 退職予兆スコアリング (Attrition Risk)

- **`src/lib/analytics/attrition-risk.ts`** — ルールベース 5 軸モデル
  - 在籍月数カーブ (1/3/6/12 ヶ月で重みが変わる退職率カーブ)
  - 雇用形態 (派遣 > 紹介予定派遣 > パート > 常勤)
  - 給与ギャップ (希望比 20% 以上低い → +20)
  - シフトミスマッチ (一致軸数 ≤ 1 で +15)
  - 業界経験不足 (1 年未満 +12)
  - 退職実績ありなら確定スコア (1 ヶ月以内退職 = 100, CRITICAL)
- Placement 詳細ページに **スコア + バンド + 寄与内訳 + 注釈**を表示
- 8 新規テスト

#### 在留期限アラートメール (Compliance Alert Job)

- **`src/lib/compliance/residence-expiry-job.ts`** — 90 / 30 / 7 日前にスキャン → 担当営業へ通知
- **`src/lib/email/templates/residence-expiry-alert.ts`** — PII 最小化 (氏名はイニシャル表記)
- `compliance` queue を追加 + handler 登録
- 重複送信防止 (`ResidenceStatus.alertSentAt` を cooldown ベースで判定)
- 手動実行スクリプト: `pnpm tsx scripts/run-residence-expiry-job.ts`
- 2 新規テスト

#### マイナンバー登録フォーム + OCR mock

- **`src/lib/compliance/my-number-ocr.ts`** — マイナンバーカード OCR の provider 抽象 + mock
- `/admin/my-numbers/[applicantId]/new` — 手入力 / OCR 取込のタブ切替フォーム
- mock: ファイル名に `test-card` が含まれていれば 12 桁を返す。本番は Google Document AI を v1.8 で
- ADMIN のみ登録可、即座に AES-256-GCM 暗号化
- 3 新規テスト

#### 紹介成立ウィザード (3-step)

- `/admin/placements/new` — 3 ステップフォーム
  - Step 1: 求職者 + 施設 (営業対象 status のみ)
  - Step 2: 求人案件 + 取引契約 (施設で絞り込み)
  - Step 3: 入社日 + 月給 + 派遣台帳情報 (派遣形態のみ表示)
- 作成時に **Invoice 自動発行** (紹介手数料形式の契約なら) + **DispatchLedger 自動生成** (派遣形態なら) を 1 トランザクションで
- 紹介手数料は契約の feeRate × 年収で自動プレビュー

#### AI Bias Evaluator

- **`src/lib/ai/bias-eval.ts`** — AI 出力の差別表現チェック層
- 検出カテゴリ: age / gender / nationality / disability / religion / marriage
- severity: ok / warn / block
- false positive 回避のため「属性語 + 帰属推論語」の連結を要求
- v1.7 で Claude Haiku ベースのジャッジに切替予定 (環境変数 `BIAS_EVAL_PROVIDER`)
- 9 新規テスト

#### モバイル対応

- サイドバーを **client component に変更**、モバイルでは下隅 FAB ボタンから **ドロワー**として開閉
- 全管理ページの padding を `p-6` → `p-4 md:p-6` に統一
- 自動でドロワーは画面遷移時に閉じる
- 派遣台帳 list の操作列も「2 ボタン縦並びでも崩れない」ように検証済

#### マルチテナント / RLS 準備

- **`docs/multi-tenant-rls-plan.md`** — 発動条件 + 移行ランブック (4 ステップ)
- **`src/lib/tenant/types.ts`** — `TenantContext` 型のスタブ + `DEFAULT_TENANT_ID`
- 内部システム前提では RLS は導入しないことを明文化 (`internal-system-spec.md` 設計哲学 #2)
- グループ会社 2 社目 / 外部 SaaS 提供 / 法令で物理分離必須 になった時点で発動

### Non-Goals (v1.6 で意図的にやらないこと)

- ❌ Claude Haiku による本物の bias eval (mock のみ。v1.7 で API キー入ったら切替)
- ❌ 退職予兆の ML モデル (ルールベースのみ。v2.0 で LightGBM)
- ❌ 実 RLS マイグレーション (発動条件を満たすまで保留)
- ❌ マイナンバーカード OCR の本番 API 連携 (Google Document AI は v1.8)

## [1.5.0] — 2026-05-14

### Added — Phase 6 内部システムの UI 完成

v1.4 で組んだ DB スキーマ + ロジックの上に、運用可能な管理画面を一気に載せた。
**19 新規ルート** (12 ページ + 7 server actions / API routes) を追加。

#### サイドバー拡張

- 6 つの新規ナビゲーション項目: 求人案件 / 取引契約 / 紹介成立 / 請求書 / マイナンバー / 監査ログ
- ロール別に表示制御 (RBAC 拡張)

#### RBAC 12 capability 追加

- `job-orders:read|write` / `contracts:read|write` / `invoices:read|write`
- `placements:read|write` / `dispatch-ledger:read`
- `my-number:read|write` (ADMIN 専用) / `audit:read` (ADMIN 専用)
- 4 ロール × 12 capability のマトリクスを `tests/unit/rbac-phase6.test.ts` で固定

#### 求人案件 (JobOrder)

- 一覧 `/admin/job-orders` — 緊急度別バッジ + 給与帯表示
- 新規 `/admin/job-orders/new` — 全フィールド入力フォーム (職種・雇用形態・時給/月給帯・シフト・必須/推奨資格・経験年数・座標)
- 詳細 `/admin/job-orders/[id]` — 編集フォーム + **マッチングパネル** (営業対象求職者の上位 10 名をスコア順)
- 紹介成立タブで関連 Placement 一覧

#### 取引契約 (Contract) + 返金規定 (RefundPolicy)

- 契約 一覧 / 新規 / 詳細 — 手数料率・入金サイト・e-Sign プロバイダ表示
- 契約 ステータス遷移ボタン (DRAFT → SENT → SIGNED / EXPIRED / CANCELLED)
- 返金規定 一覧 / 新規 / 詳細 — 段階返金 (`30:100, 60:50, 90:20` 形式の入力)
- 適用契約数のクロスリンク

#### 紹介成立 (Placement)

- 一覧 — 求職者 × 施設 × 案件 × 契約のステータステーブル
- 詳細 — 月収・紹介手数料・手数料状況 + **返金規定シミュレーション** (本日 / 実退職日で何 % 返金になるか自動計算)
- 関連 Invoice / DispatchLedger へクロスリンク

#### 請求書 (Invoice)

- 一覧 — 発行済 / 入金済 / 遅延 の 3 つの合計サマリ + 詳細テーブル
- 詳細 — 小計 / 消費税 / 合計 + 入金済化ボタン
- **CSV エクスポート** `/api/invoices/export` — freee / Money Forward へインポート可能な最小フォーマット

#### 派遣台帳 (DispatchLedger)

- 一覧 — 抵触日 90 日以内のものを **danger バッジ** でアラート
- 詳細 — 台帳情報 + **PDF iframe プレビュー**
- **PDF route** `/api/dispatch-ledgers/[id]/pdf` — react-pdf でラベル + 抵触日アラート付き A4 1 枚を動的生成
- PDF 出力時は AuditEvent に記録 (誰がいつ何の台帳を出力したか証跡)

#### マイナンバー (MyNumber)

- 一覧 — 登録済求職者の用途 / 暗号化日時 / 保管期限
- 求職者別ページ — **理由必須の閲覧申請モーダル**
- 閲覧時にアクセスログを自動記録 + AuditEvent にも書き込み
- 表示権限: ADMIN は平文閲覧可、CONSULTANT 以下はマスク表示のみ
- アクセス履歴 (直近 50 件) を時系列で表示

#### 監査ログ (AuditEvent) ビューア

- 一覧 — 操作者 / action / entityType / hash (前 8 桁) を時系列表示
- **整合性検証ボタン** — 全件 sha256 ハッシュチェーンを再計算して改ざん検知。改ざん位置 (brokenAt index) も返す
- searchParams で action / entityType フィルタ

#### Repository / Server Action 層

- `src/lib/repositories/` に 8 新規ファイル: `job-order` / `contract` / `refund-policy` / `invoice` / `placement` / `dispatch-ledger` / `my-number` / `audit-event`
- 全 mutation で `recordAuditEvent` (新 hash チェーン) と `recordAuditLog` (旧互換) の二重書き込み
- マイナンバー閲覧は専用 `recordMyNumberAccess` + AuditEvent + AuditLog の 3 重記録

#### PDF

- `src/lib/pdf/dispatchLedgerPdf.tsx` — 派遣業法 第 31 条準拠の派遣元管理台帳テンプレ。NotoSansJP / 抵触日アラート色強調

#### テスト (8 新規 / 計 303 passing)

- `tests/unit/rbac-phase6.test.ts` (6) — Phase 6 capability マトリクス
- `tests/ai/fax/dispatch-ledger-pdf.test.ts` (2) — PDF 生成 + magic header 検証

### Non-Goals (v1.5 で意図的にやらないこと)

- ❌ Placement の手動新規作成画面 (v1.6 で「紹介成立フロー」として独立)
- ❌ MyNumber 登録フォーム (機微なので別途設計、v1.6)
- ❌ 在留期限アラートメール (v1.6)
- ❌ 退職予兆スコアリング (v1.6)
- ❌ 本番 e-Sign / 会計 API 接続 (v1.7 で CloudSign / freee に切替)

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
