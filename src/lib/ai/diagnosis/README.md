# AI 適職診断ロジック (Phase 1-4)

このディレクトリは、`src/lib/ai/diagnosis/*` 配下に配置された **決定論的な純粋関数群** を提供します。Claude API への問い合わせは Phase 1-5 で `index.ts` の `buildAllCategoriesScores()` の戻り値を入力として行う予定で、ここでは外部依存ゼロ・同入力同出力を保証します。

## ファイル構成

```
src/lib/ai/diagnosis/
├── index.ts                # 公開 API (buildAllCategoriesScores など)
├── name-score.ts           # 姓名判断スコア (0-30)
├── birth-score.ts          # 生年月日スコア (0-30)
├── qualification-score.ts  # 資格マッチングスコア (0-25)
├── desire-score.ts         # 希望整合度スコア (0-15)
├── aggregate.ts            # 合算 + ランク変換
├── strokes.ts              # 画数計算ユーティリティ
├── types.ts                # 型定義
└── data/
    ├── kanji-strokes.json     # 漢字 → 画数 (~1000 字)
    ├── category-affinity.json # 業態 × (人格画数/五行/Life Path)
    └── qualification-matrix.json # 業態 × 資格 (required/preferred/related)
```

## スコア構成 (100 点満点)

design.md §7.5 と同等。

| 要素 | 配点 | 関数 |
|---|---|---|
| 姓名判断 | 30 | `calculateNameScore` |
| 生年月日 | 30 | `calculateBirthScore` |
| 資格マッチング | 25 | `calculateQualificationScore` |
| 希望整合度 | 15 | `calculateDesireScore` |

### ランク変換 (`toRank`)

| ランク | 点数範囲 |
|---|---|
| S | 85-100 |
| A | 70-84 |
| B | 55-69 |
| C | 40-54 |
| D | 0-39 |

## 各関数の挙動

### `calculateNameScore(lastName, firstName, category)`

1. `strokes.ts` で文字単位の画数 (漢字テーブル + デフォルト 8) を集計
2. 五格 (天格・人格・地格・外格・総格) を計算。81 を超える値は折り返し
3. `category-affinity.json#favoredJinkaku` と人格を照合
   - 完全一致 = 1.0、±1 隣接 = 0.7、それ以外 = 0.35
4. 総格が伝統的吉数 (`LUCKY_GRID_NUMBERS`) なら +0.15 ボーナス
5. 天格・地格の吉数判定で軽い加点
6. **漢字比率 < 50%** の名前 (ローマ字・カナ主体) は中立値 (15/30) を返し、`details.fellOff = true`

### `calculateBirthScore(birthDate, gender, category)`

1. 西暦年から年柱の天干 → 五行 (木火土金水) を求める。`(year - 4) % 10` 方式
2. 生年月日 (YYYY-MM-DD) からライフパスナンバーを算出 (マスター 11/22/33 を保持)
3. 五行: 完全一致 1.0 / 相生関係 0.65 / それ以外 0.35
4. Life Path: 完全一致 1.0 / マスター→単桁互換 0.85 / ±1 隣接 0.6 / その他 0.3
5. 五行 60% : Life Path 40% で合算
6. `gender` は将来の日柱・月柱拡張のために受け取るが Phase 1-4 では未使用

### `calculateQualificationScore(qualifications, category)`

`qualification-matrix.json` の `required / preferred / related` と申込者所持資格を照合し、**最高係数** (required=1.0 / preferred=0.7 / related=0.4) を採用する。マッチが無くても最低 10% (`NONE_FLOOR`) は残し、面接での評価に余地を残す。

### `calculateDesireScore(desiredCategories, category)`

- 希望未選択 → 中立 (50%)
- 完全一致 → 満点
- `category-affinity.adjacent` に含まれる業態を希望 → 部分点 (55%)
- どれにも当たらない → 最低点 (15%)

### `aggregateScore(name, birth, qualification, desire)`

各サブスコアを上限で clamp してから合算。`{ total, breakdown }` の形で返す。`breakdown` には clamp 後の値と元の `details` (五格・五行・matched 資格など) が保持され、Phase 1-5 でプロンプトの根拠データとして使える。

### `buildAllCategoriesScores(applicant, gender)`

`ALL_CATEGORIES` (11 業態) について上記を計算し、配列 `CategoryScore[]` を返す。並び順は `ALL_CATEGORIES` 宣言順で安定。

## エッジケース

- **短い名前 (1 字姓 / 1 字名)**: 人格計算で「霊数 +1」補正を入れて 0 で割れないようにしている
- **外国人風名前**: 漢字比率 < 50% は姓名判断を中立化。生年月日・資格・希望は通常通り計算
- **カナのみの名前**: 漢字 0 字なので姓名判断は中立。`details.fellOff` は false (意図的なカナ名と判定)
- **資格を 1 つも入れない申込**: `NONE_FLOOR` ≒ 2.5 点。完全 0 にしない
- **希望未選択**: 中立 (7-8 点)。記入漏れペナルティを避ける

## チューニング指針

- `category-affinity.json` の `favoredJinkaku / favoredElements / favoredLifePath` を運用ログを見て調整する
- `qualification-matrix.json` の required/preferred/related は spec.md の資格マスタと整合させる
- ゴールデンテストの期待値は意図的に固定しているので、係数を変えた場合は `tests/ai/decisions/golden/` を再生成する必要がある

## ゴールデンテスト

`tests/ai/decisions/golden/` に固定された期待値があり、`tests/ai/decisions/*.test.ts` が同入力 → 同出力を検証する。CLAUDE.md にあるとおりプロンプトを変更した場合や係数調整した場合は、ここを通過しなければ回帰扱いとする。
