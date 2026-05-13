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
