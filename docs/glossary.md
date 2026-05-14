# Tsumugi 用語集 (Glossary)

> v1.9 ドラフト · 2026-05-14 · ドキュメント / UI / コードで使う用語を統一する

## ブランド表記

| 用語 | 用法 | 例 |
|---|---|---|
| **Tsumugi** | プロダクト名 (ローマ字、大文字始まり) | "Tsumugi では..." |
| **紡** | プロダクト名 (漢字、副次的) | ロゴ脇に小さく `Tsumugi (紡)` |
| **グロウリンク** | 運営会社の日本語表記 | "運営会社: グロウリンク" |
| **Growlink Inc.** | 運営会社の英語表記 | 英語ドキュメントのみ |

**禁止**:
- "Growlink" 単独でプロダクト名として使う (会社名と混同)
- "つむぎ" "ツムギ" (ひらがな/カタカナ) — 正式表記は "Tsumugi" or "紡"

---

## ドメイン用語 (正規化)

派遣業界・人材紹介業界には類似用語が多く、混同しないよう以下で固定する。

### 派遣 vs 紹介

| 用語 | 定義 | DB エンティティ | 内部コード |
|---|---|---|---|
| **派遣** (haken) | 派遣会社が雇用主、就業先で派遣社員が働く形態 | `EmploymentType.DISPATCH` | `dispatch` |
| **紹介** (shoukai) | 紹介会社が求職者と求人企業を仲介、求人企業が直接雇用 | `EmploymentType.DIRECT` | `direct` |
| **紹介予定派遣** | 派遣期間 → 直接雇用への切替を前提 | `EmploymentType.TEMP_TO_PERM` | `temp_to_perm` |
| **パート** | 就業先の直接雇用、短時間勤務 | `EmploymentType.PART_TIME` | `part_time` |

### 「派遣会社」vs「人材紹介会社」

両者を厳密に区別する。Tsumugi は **両方を扱う**。

- **派遣会社** (haken-gaisha): 自社で派遣社員を雇用、就業先へ派遣する事業者
- **人材紹介会社** (jinzai-shoukai-gaisha): 求職者と求人企業を仲介する事業者 (有料職業紹介事業者)

UI では「派遣・紹介」と並列表記、コードでは `Contract.contractType` で区別:
- `DISPATCH_AGREEMENT`: 派遣基本契約
- `INTRODUCTION_FEE`: 紹介手数料契約
- `TEMP_TO_PERM`: 紹介予定派遣契約

### 求人案件 (Job Order) vs 案件 vs ポジション

- **求人案件** = `JobOrder` (DB)。個別の募集ポジション
- **施設** = `Facility` (DB)。法人実体。1 施設に複数 JobOrder
- **案件** は曖昧表現なので UI/ドキュメントでは使わない → "求人案件" 表記
- 英語: **Job Order** (UI), **JobOrder** (code)

### 紹介成立 (Placement) vs 内定 vs 入社

- **紹介成立** = `Placement` (DB) = 求職者 × 施設 × 求人案件 × 契約 が成立した状態
- 「内定」「入社決定」は **同義** とみなし、UI では「紹介成立」で統一
- "Placement" が成立した日 = `startDate` (入社日)
- 退職 = `attritionAt` (退職日)

### 抵触日 (Antiteishoku-bi)

派遣業法における「同一事業所単位での 3 年ルール」の期限日。
- `DispatchLedger.antiteishokuDate`
- 計算: 派遣開始日 + 3 年 - 1 日
- 英語: "anti-collision date" は逐語訳で意味が通らないので、コードでは `antiteishokuDate` のローマ字を採用

### マイナンバー = 特定個人情報

- 法令上の正式名: 「個人番号」「特定個人情報」
- UI / コード: "マイナンバー" で統一 (一般語のため)
- `MyNumberRecord` (DB) は AES-256-GCM 暗号化で保管

### スキルシート

- 紙の履歴書相当のデジタル版。
- `SkillSheet` (DB)。educations / careers / skills / desired / selfPR を Json で持つ
- 「職務経歴書」とほぼ同義だが、医療福祉業界では「スキルシート」が定着

---

## AI 関連

- **AI 適職診断** = `Diagnosis` (DB)。11 業態 × score + rank + 2 コメント
- **AI 電話面接** = `Interview` (DB)。5 ターン × 母語切替
- **退職予兆スコア** = Attrition Risk Score。ルールベース 5 軸
- **bias eval** = AI 出力の差別表現検査レイヤ (年齢/性別/国籍 etc)
- **AI レビュー** = `AiReview` (DB)。**Responsible AI** の中核ワークフロー

### Responsible AI

AI 出力は **必ず** 人間レビュー (`AiReview`) を経てから公開系処理に進む。
- 状態: `PENDING` / `APPROVED` / `EDITED` / `REJECTED`
- 公開可能 = `APPROVED` または `EDITED`
- `EDITED` の場合、`finalOutput` が公開版 (`aiOutput` は AI の生出力として保存)

---

## 金銭関連

- **紹介手数料** = `Placement.introductionFee` = 年収 × `Contract.feeRate`
- **入金サイト** = `Contract.paymentTermDays` (default 60 日)
- **返金規定** = `RefundPolicy.tiers` (段階返金: 30 日 100% / 60 日 50% / 90 日 20% など)
- **DSO** (Days Sales Outstanding) = 売掛回収日数 = (発行日 → 入金日) の平均
- **AR Aging** = 売掛経過日数別バケット (0-30 / 31-60 / 61-90 / 90+)
- **OVERDUE** = 支払期日 (`dueAt`) を過ぎても未入金の請求書

---

## RBAC 用語

- **ADMIN** = システム管理者 (全機能 + マイナンバー閲覧 + 監査ログ)
- **CONSULTANT** = キャリアコンサルタント (求職者 / 求人案件 / 契約)
- **SALES** = 営業 (FAX 送信 / 反応管理 / 請求書閲覧)
- **VIEWER** = 閲覧専用

---

## 用語ゆれの例 (これは使わない、こっちを使う)

| ❌ ゆれ表現 | ✅ 正規表現 |
|---|---|
| つむぎ / ツムギ | Tsumugi (紡) |
| Growlink (プロダクト名として) | Tsumugi |
| 求職者の方 / 候補者 | 求職者 |
| 案件 (単独) | 求人案件 |
| 内定 / 採用決定 | 紹介成立 |
| 個人番号 | マイナンバー |
| 抵触日数 / 抵触期限 | 抵触日 |
| 派遣社員 / 派遣スタッフ | 派遣労働者 (法令用語) |
| 反応 / リアクション / 返信 | 反応 (FaxReaction) |

---

## ドキュメントを書くときの規約

- 1 ページ目に**ターゲット読者**を明記 (スタッフ向け / 開発者向け / 経営層向け)
- 専門用語が初出のときは **ふりがな or 英語併記**
- 日付は ISO 8601 (`2026-05-14`)
- 金額は ¥ 記号 + 3 桁区切り (`¥1,000,000`)
- 文字列リテラルは `"..."` (バッククォートはコード/コマンドのみ)
