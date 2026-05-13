# Phase 2〜v1 仕上げ 作業ログ (時系列)

朝確認用の運用ログです。深夜の自動進行で残したもの。

## 凡例

- ✅ 完了 / 🔧 進行中 / 📝 メモ
- 各エントリは UTC 表記 + 完了内容。詳細は対応する PR 本文を参照。

---

## 2026-05-13 (UTC)

### ✅ 12:00 〜 Phase 1-7 (FAX 送信票 + モック送信) → PR #7 マージ済み

### ✅ 14:30 〜 Phase 2 (スキルシート自動化) + Phase 3 (AI 面接 + BullMQ) → PR #8 マージ済み

- 同一ブランチで連続コミットしたため Phase 2 + 3 結合 PR となり、ユーザー承認 (オプション A) で merge
- 215/215 tests passed、tsc/lint clean
- main HEAD: `f0f600c`

### ✅ Phase 4 (営業自動化) 完了 — PR #9 マージ済み (`main` HEAD: `175cbbe`)

### ✅ v1.1 Tsumugi ブランド + 本番品質仕上げ — `claude/v1.1-tsumugi-brand`

実装内容:

- **プロダクト名「Tsumugi (紡)」採用** — タグライン「AI が、人と現場を丁寧に紡ぐ。」、運営は引き続き株式会社グロウリンク
- ブランド定数を `src/lib/brand.ts` に集約 → metadata / OpenGraph / メール / PDF / Sidebar / Footer に統一適用
- `<TsumugiLogo />` SVG ロゴコンポーネント (角丸藍 + 山吹 / 生成の糸)
- ランディングページ `/` を Hero + 機能 8 種 + 利用シーン 2 ブロック + Footer の完全構成にリデザイン (a11y skip-link 込み)
- ログイン画面を 2 カラム (ブランド + フォーム) に再構築
- デザイントークン刷新 (深紺 + 生成 + 山吹) + ダークモード対応 + フォーカスリング + スクロールバー
- Toast を skill-sheet の手動保存・提出に統合 (silent フラグで自動保存は無音)
- `Skeleton` / `EmptyState` 共通コンポーネント
- ドキュメント大幅追加: `ARCHITECTURE.md` / `SECURITY.md` / `DEPLOY.md` / `TESTING.md` / `BRAND.md` (+ README / CHANGELOG 全面刷新)

テスト 245 → 249 件 (+4: BRAND + landing E2E)。
tsc/lint clean、249/249 passed。

---

### ✅ v1-final-polish 完了 — `claude/v1-final-polish` (PR #11 予定)

実装内容:
- Gemini プロバイダ (`AI_PROVIDER=gemini` + `@google/generative-ai`)
- Toast コンポーネント + `ToastProvider` を root layout に
- レート制限 (memory bucket、ipKey ヘルパ) を /apply と /feedback に適用
- CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy
- 文書一式: README 刷新、QUICKSTART, operations, api, providers, CHANGELOG, RELEASE_NOTES, LICENSE, CONTRIBUTING
- デモシード拡張 (CONSULTANT/SALES/VIEWER 各 1 名 + 申込 6 件 + 施設 18 件)
- `scripts/backup-db.sh` (pg_dump → gz、7 日超は削除)
- `tests/e2e/{feedback,health,not-found,login,skill-sheet-link}.spec.ts` (+5)
- `.github/workflows/ci.yml` (lint + typecheck + test + next build)
- PR テンプレ + Issue テンプレ + CONTRIBUTING

テスト 240 → 245 件 (+5: gemini-provider + rate-limit)。
tsc/lint clean。

---

### ✅ Phase 5 (外国人対応 + 仕上げ) 完了 — `claude/phase-5-i18n-polish`

実装内容:
- 多言語 (ja/en/vi/id/zh) のメッセージ追加 + SUPPORTED_LOCALES 拡張
- 在留資格テーブル (ResidenceStatus) + 管理 API (`PUT/DELETE /api/admin/applicants/[id]/residence-status`)
- AI 面接の母語切替 (interview.next-question + STT mock を 5 言語対応)
- エラー (`error.tsx` / `global-error.tsx`) / `not-found.tsx` / `loading.tsx`
- Sentry スタブ (`src/lib/observability/sentry.ts`) + `/api/health`
- email テンプレは vi/id/zh では ja フォールバック (受信側のメールクライアントで文字化けリスクを避ける選択)

テスト 222 → 240 件 (+18: i18n-5locales / visa-types / stt-mock-multilang / i18n 既存テスト更新)。
tsc/lint clean。

---

(以降の PR #9 旧本文)

### ✅ Phase 4 (営業自動化) 完了 — `claude/phase-4-sales-automation`

実装内容:

- 施設マスタ CSV インポート (UTF-8 / RFC4180 風自前パーサ / upsert)
- 施設一覧の検索フィルタ強化 (q / 都道府県 / 市区町村 / 業態 / FAX 公開)
- listFacilities + countFacilities (新規)
- FAX 一括送信のジョブ化 (`fax-sheet.batch-create` / `fax-sheet.send`)
  - 既存 API は同期維持 + `?async=1` でジョブ経由 (202)
- 署名付き反応トークン (HMAC SHA256) + `/feedback/[token]` 公開フォーム
- sales-metrics: 施設別反応率 + 日次トレンド + 全体 KPI
- ダッシュボード: 8 KPI カード + 30 日トレンド (recharts) + 施設別 Top 20 テーブル
- `/admin/sales` 営業フローハブ (SALES_READY / IN_INTRODUCTION / 興味あり反応)
- サイドバーに「営業フロー」追加

テスト 215 → 222 件 (+7: CSV 4 / Reaction Token 3)。
tsc/lint clean。

### 📝 運用ルール (ユーザー指示)

- 1 Phase = 1 新ブランチ = 1 PR
- 質問はしない、Recommended で判断、コメントに理由を残す
- 各 PR は CI 完了確認後に自分でマージ
- マージ後、main を pull してから次の新ブランチを切る
- すべて mock provider で課金ゼロ
