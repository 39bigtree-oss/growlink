# グロウリンク AI採用・営業自動化システム

## プロジェクト概要

グロウリンクのホームページから求職者の申込を受け付け、AI 適職診断、スキルシート生成(履歴書OCR or 本人入力)、AI 電話面接(24時間)、営業用 FAX 送信票の自動生成までを一括で行うシステム。

主な対象は医療福祉系(看護師・介護職等)の求職者と求人施設。日本人・外国人いずれにも対応する。

## 技術スタック

- フロント/バック: Next.js 14 (App Router) + TypeScript
- UI: Tailwind CSS + shadcn/ui + Radix UI + lucide-react
- フォーム: React Hook Form + Zod
- ORM: Prisma + PostgreSQL 16
- 認証: Auth.js (NextAuth)
- AI(LLM): Anthropic Claude API (@anthropic-ai/sdk)
  - 主モデル: claude-sonnet-4-6(診断コメント/面接質問/要約/FAX文)
  - 軽量モデル: claude-haiku-4-5(翻訳/メール本文)
- STT: Whisper or Deepgram / TTS: ElevenLabs or VOICEVOX
- 電話: Twilio Programmable Voice
- OCR: Google Document AI
- メール: Resend / FAX: InterFAX API
- ジョブキュー: BullMQ + Redis
- インフラ: 初期は Railway 一本化、本番は Vercel + AWS
- テスト: Vitest + Playwright + msw

## ディレクトリ構造

```
growlink/
├── CLAUDE.md           # 本ファイル
├── .claude/
│   ├── settings.json
│   ├── skills/         # 繰り返し利用するスキル
│   └── agents/         # サブエージェント定義
├── docs/               # 仕様書・設計書
├── prisma/schema.prisma
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── (public)/   # 求職者向け公開ページ
│   │   ├── (admin)/    # 社内管理画面
│   │   └── api/        # API Routes
│   ├── components/
│   ├── lib/            # ai/, db, email, fax, ocr, pdf, stt, tts, twilio
│   ├── prompts/        # *.md でClaude プロンプトを管理
│   ├── jobs/           # BullMQ ワーカ
│   ├── types/
│   └── utils/
└── tests/              # unit / integration / e2e
```

## よく使うコマンド

```bash
pnpm install
pnpm dev                  # 開発サーバ(http://localhost:3000)
pnpm build && pnpm start
pnpm prisma migrate dev
pnpm prisma db seed
pnpm prisma studio
pnpm test                 # vitest
pnpm test:e2e             # playwright
pnpm lint && pnpm typecheck
```

## コーディング規約

- TypeScript strict 必須(`noImplicitAny` / `strictNullChecks` ON)
- API Route は `route.ts` 1ファイル1エンドポイント
- ファイル名: ケバブケース(例: `fax-sheet-preview.tsx`)
- コンポーネント: PascalCase の名前付きエクスポート
- 関数: 動詞始まり(`buildDiagnosis`, `sendFax`)
- Zod スキーマは `src/lib/schemas/*.ts` に集約
- DB アクセスは Server Component または API Route のみ
- クライアントコンポーネントは `"use client"` を冒頭に明記

## AI 機能の編集手順

- プロンプトは `src/prompts/*.md` に置く。コードから `readFile` で読む
- プロンプトを変更したら必ず `tests/ai/decisions/golden/` の回帰テストを実行
- Claude API 呼び出しは `src/lib/ai/client.ts` の `complete()` を経由
- モデル切り替えは環境変数 `MODEL_SMART` / `MODEL_FAST` で行う
- JSON 出力が必要な場合は `jsonSchema` を必ず渡す

## 個人情報(PII)取り扱い

- ログには **絶対に** 氏名/生年月日/連絡先を出さない(マスク済みのみ)
- AI API に送信する前に `lib/mask.ts` でマスク
- テスト用フィクスチャは `tests/fixtures/anonymized/` を使う
- 実本番データをローカルに持ち出さない
- 求職者が「削除して」と申し出たら `Applicant.deletedAt` をセット → 30日後に物理削除

## 開発フェーズ

詳細は `docs/design.md` を参照。

- Phase 1: MVP(申込フォーム+AI診断+FAX手動生成) ✅ 完了
- Phase 2: スキルシート自動化(本人入力+履歴書OCR) ✅ 完了
- Phase 3: AI 電話面接(Twilio + Whisper + Claude + TTS) ✅ 完了
- Phase 4: 営業自動化(FAX一括送信+返信トラッキング)
- Phase 5: 外国人対応(多言語化+在留資格管理)

## テストの方針

- 「テストを書いてから実装」(TDD)を原則とする
- 純粋関数は Vitest でユニットテスト
- API Route は supertest で統合テスト(DBはテスト用Postgres)
- 主要な画面遷移は Playwright で E2E
- AI 出力は `tests/ai/decisions/` に golden データを置き回帰テスト

## デプロイ

```bash
# Vercel(フロント)
vercel --prod

# AWS(API/Job Worker)
pnpm build:worker
docker build -t growlink-worker .
# Push & ECS デプロイ
```

## サブエージェントとスキル

- `.claude/agents/data-modeler.md` — Prismaスキーマ変更・マイグレーション専門
- `.claude/agents/ui-builder.md` — shadcn/ui ベースの画面構築専門
- `.claude/agents/api-tester.md` — テスト作成専門
- `.claude/agents/ai-prompt-tuner.md` — プロンプト改善・A/B評価専門
- `.claude/skills/diagnosis-prompt/` — 適職診断プロンプト修正フロー
- `.claude/skills/interview-prompt/` — 面接質問プロンプト修正フロー
- `.claude/skills/fax-generator/` — FAX送信票テンプレ修正フロー

## 関連ドキュメント

- `docs/spec.docx` — 業務仕様書(上流ドキュメント)
- `docs/design.docx` — Claude Code 開発設計書(本書の親文書)

## やってほしくないこと

- `prisma migrate reset` をユーザ確認なく実行しない
- 本番DBへの直接アクセスをしない
- Anthropic API への大量バースト送信をしない(レート制限注意)
- 個人情報をプロンプトに含めず、必ずマスクする
- 機種依存文字(①〜⑩等の丸囲み数字、㊤等)は FAX 用 PDF に使わない
