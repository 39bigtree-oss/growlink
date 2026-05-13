# Testing 戦略 — Tsumugi

## 1. ピラミッド

```
   ▲
  / \   Playwright E2E       6本以上 (申込・健康診断・認証・404・トークン)
 / E \
/-----\
|  I  |  API integration    20+ (vi.mock + Prisma stub)
|-----|
|  U  |  Unit (Vitest)      200+ (schema / repos / pure funcs / mocks)
─────────
```

合計 250 件超を **すべて mock provider** で完結させ、外部依存ゼロで CI を回せる設計です。

## 2. テストの書き方

### 2.1 Unit (`tests/unit/`)

純粋関数・スキーマ・サービス層。Prisma は `vi.mock("@/lib/db")` で stub:

```ts
vi.mock("@/lib/db", () => ({
  prisma: {
    applicant: {
      findFirst: vi.fn(async () => ({ id: "a1", status: "RECEIVED" })),
      update: vi.fn(),
    },
  },
}));
```

### 2.2 API integration (`tests/api/`)

Route Handler の `POST`/`PUT` を `new Request(...)` で直接呼ぶ:

```ts
const res = await POST(jsonRequest({ applicantId: "a1" }));
expect(res.status).toBe(201);
```

`auth` も同様に mock:

```ts
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "s1", role: "ADMIN" } })),
}));
```

### 2.3 AI 決定論テスト (`tests/ai/decisions/`)

`AI_PROVIDER=mock` で同じ入力に対し同じ出力が返ることを golden 比較で検証。
プロンプト変更時は意図的に golden を更新する。

### 2.4 E2E (`tests/e2e/`)

`@playwright/test`。`page.route(...)` で API をスタブ。
`webServer: pnpm dev` で起動を CI 管理。

## 3. カバレッジ目標

- 全体: **60%** を最低ライン
- `src/lib/**/*.ts`: **75%** (ドメインロジック)
- `src/app/api/**/*.ts`: **70%**
- UI: ロジックを含むコンポーネントのみ (router/effects)

`pnpm vitest run --coverage` で計測。CI には組み込まないがリリース前は手動で確認。

## 4. PII を含むテストデータ

- `tests/fixtures/anonymized/` のみ使用
- 名前は明らかに架空 (テスト 花子、Le Thi An 等)
- 電話番号は `+81-90-0000-0000` 系のテスト番号

実 PII を fixtures に書くと CI のログに残るので **厳禁**。

## 5. 失敗テストへの対応

- **絶対にスキップしない**。`it.skip` も避ける
- 一時的に環境依存 (重い PDF 生成等) は `beforeAll(..., 180_000)` でタイムアウト拡大
- 仕様変更で壊れた場合は同じ PR でテストを更新する
- フレーキー (たまに失敗) は根本原因を追う

## 6. ローカル実行

```bash
pnpm test                  # 全 Vitest 一発
pnpm test:watch            # 変更時自動再実行
pnpm test:e2e              # Playwright
pnpm vitest run path/to    # 一部だけ
pnpm vitest run --coverage # カバレッジ
```

## 7. CI

`.github/workflows/ci.yml` で PR / push 時に:

1. `pnpm install --frozen-lockfile=false`
2. `pnpm prisma generate`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test`
6. `pnpm build` (mock env)

ジョブが落ちた PR はマージ禁止 (ブランチ保護)。

## 8. リリース前の手動確認 (品質チェックリスト)

- [ ] `/apply` で 4 ステップ完了 → メールリンクが `.storage/sent-emails/` に出る
- [ ] スキルシート: 6 タブ入力 → 自動保存 → 提出
- [ ] 履歴書アップロード → OCR → スキルシート自動入力
- [ ] AI 診断実行 → PDF プレビュー
- [ ] AI 面接シミュレータで 5 ターン進行 → SkillSheet に差分マージ
- [ ] FAX 送信票一括作成 → mock 送信 → reaction URL で「興味あり」を入力
- [ ] ダッシュボードで KPI と日次トレンドが反映される
- [ ] `/admin/sales` に SALES_READY 求職者と興味あり反応が並ぶ
- [ ] `/api/health` が 200 を返す
- [ ] ロケール切替で UI が変わる (ja/en/vi/id/zh)
- [ ] VIEWER アカウントで送信系ボタンが非表示
