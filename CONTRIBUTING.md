# 開発に貢献する

ありがとうございます。本プロジェクトへの貢献ガイドです。

## セットアップ

[`docs/QUICKSTART.md`](./docs/QUICKSTART.md) を参照。

## 開発ルール

- TypeScript strict 必須。`any` は最終手段
- ファイル名はケバブケース (例: `fax-sheet-preview.tsx`)
- コンポーネントは PascalCase、関数は動詞始まり (`buildDiagnosis` / `sendFax`)
- DB アクセスは Server Component または API Route のみ
- すべての PR で `pnpm typecheck && pnpm lint && pnpm test` を pass させる

## ブランチ運用

- 1 機能 = 1 ブランチ = 1 PR
- ブランチ名は `claude/<phase>-<short-name>` または `feat/<name>` / `fix/<name>`
- main へは PR + 1 名以上レビュー + CI green でマージ

## コミットメッセージ

```
<scope>: <what>

<why や設計判断、影響範囲>
```

例: `Phase 4: 営業自動化 (CSV インポート + 一括 FAX ジョブ + KPI 拡張)`

## テスト

- 純粋関数は Vitest でユニット
- API Route は `vi.mock` で auth / db / 外部依存を差し替え
- 主要画面遷移は Playwright E2E (`tests/e2e/`)
- AI 出力は `tests/ai/decisions/` に golden JSON を置き回帰テスト
- 失敗したテストは絶対にスキップせず、根本原因を直す

## PII 取扱

- ログには絶対に氏名・電話・生年月日を出さない
- AI 呼び出し前に `lib/mask.ts` を通す
- テストフィクスチャは `tests/fixtures/anonymized/`

## 質問

- バグ報告は Issue
- 機能提案は Discussions
- セキュリティは security@growlink.example へ非公開連絡
