# Tsumugi (紡) — AI 採用・営業自動化プラットフォーム

> AI が、人と現場を丁寧に紡ぐ。 / 運営: 株式会社グロウリンク (Growlink Inc.)

## プロジェクト概要

プロダクト名は **Tsumugi (紡)** (略称 Tsumugi)。グロウリンクのホームページから求職者の申込を受け付け、AI 適職診断、スキルシート生成 (履歴書 OCR or 本人入力)、AI 電話面接 (24 時間)、営業用 FAX 送信票の自動生成、紹介成立後の契約・請求・派遣台帳までを一括で行う SaaS。

主な対象は医療福祉系 (看護師・介護職等) の求職者と求人施設。日本人・外国人いずれにも対応する。

## 開発フェーズ (現状)

**真の進捗記録は `docs/PROGRESS.md`**。本セクションは概観のみ。

- Phase 1: MVP (申込フォーム + AI 診断 + FAX 手動生成) ✅ 完了 (PR #7)
- Phase 2: スキルシート自動化 (本人入力 + 履歴書 OCR) ✅ 完了 (PR #8)
- Phase 3: AI 電話面接 (Twilio + Whisper + Claude + TTS + BullMQ) ✅ 完了 (PR #8 同梱)
- Phase 4: 営業自動化 (FAX 一括送信 + 反応トークン + 営業ダッシュボード) ✅ 完了 (PR #9)
- Phase 5: 外国人対応 (ja/en/vi/id/zh + 在留資格管理 + 多言語面接) ✅ 完了
- Phase 6: 紹介成立フロー (JobOrder / Contract / Placement / Invoice / DispatchLedger / RefundPolicy / e-sign) — schema + admin 画面実装済み、運用検証中
- 追加機能 (Phase 番号未付与): MyNumber 管理 (AES-256-GCM + アクセスログ)、AuditEvent (SHA-256 ハッシュチェーン監査)、NurtureSequence (求職者育成)、AiReview (AI レビュー)、施設ポータル (FacilityPortalToken)
- v2.x: PDF リデザイン / 申込者編集 + AI 診断やり直し + 修正履歴 UI (PR #24-28)

ロードマップの上流は `spec.md` (業務仕様) と `design.md` (設計書)。

## 技術スタック

- フロント / バック: Next.js 14 (App Router) + TypeScript strict
- UI: Tailwind CSS + shadcn/ui + Radix UI + lucide-react
- フォーム: React Hook Form + Zod
- ORM: Prisma + PostgreSQL 16
- 認証: Auth.js (NextAuth) — Credentials + Magic Link、RBAC は capability ベース
- AI (LLM): Anthropic Claude API (`@anthropic-ai/sdk`) + Gemini プロバイダ (`AI_PROVIDER=gemini`)
  - 主モデル: claude-sonnet-4-6 (診断コメント / 面接質問 / 要約 / FAX 文)
  - 軽量モデル: claude-haiku-4-5 (翻訳 / メール本文)
  - 開発時は mock provider (`AI_PROVIDER=mock`) で API 課金ゼロ
- STT: Whisper or Deepgram (mock あり) / TTS: ElevenLabs or VOICEVOX (mock あり)
- 電話: Twilio Programmable Voice
- OCR: Google Document AI (mock あり)
- メール: Resend (mock provider が .eml 出力) / FAX: InterFAX API (mock provider)
- ジョブキュー: BullMQ + Redis (本番) / インメモリ (開発、`src/lib/jobs/memory.ts`)
- 監視: Sentry スタブ (`src/lib/observability/sentry.ts`) + `/api/health`
- PII 暗号化: AES-256-GCM / 機密トークン: HMAC-SHA256
- インフラ: 初期は Railway 一本化、本番は Vercel + AWS
- テスト: Vitest + Playwright + msw

## ディレクトリ構造 (実体)

```
growlink/
├── CLAUDE.md           # 本ファイル
├── spec.md             # 業務仕様書 (上流)
├── design.md           # 設計書 (親文書)
├── .claude/
│   └── settings.local.json   # ローカル設定のみ。agents/ skills/ は未整備
├── docs/
│   ├── PROGRESS.md     # ⭐ 真の進捗ログ (時系列)
│   ├── ARCHITECTURE.md # 全体構成
│   ├── SECURITY.md     # PII / RBAC / 監査
│   ├── DEPLOY.md       # デプロイ手順
│   ├── TESTING.md      # テスト方針
│   ├── BRAND.md        # ブランド規定
│   ├── QUICKSTART.md
│   ├── api.md / providers.md / operations.md / first-real-run.md
│   ├── glossary.md / internal-system-spec.md / multi-tenant-rls-plan.md
│   └── runbook/
├── prisma/schema.prisma  # 35+ モデル
├── scripts/
│   ├── auto-update.sh           # 開発機 Tab 3 常駐 (origin/main pull)
│   ├── backup-db.sh             # pg_dump → gz、7 日超は削除
│   └── run-residence-expiry-job.ts
├── src/
│   ├── app/
│   │   ├── apply/               # 求職者向け公開申込フォーム
│   │   ├── skill-sheet/[token]/ # 求職者のスキルシート入力
│   │   ├── interview/           # AI 面接 (求職者導線)
│   │   ├── feedback/[token]/    # 施設からの反応収集
│   │   ├── portal/              # 施設ポータル
│   │   ├── login/ / dashboard/ / applicants/
│   │   ├── admin/               # 社内管理画面 (22 サブセクション)
│   │   │   ├── applicants/ facilities/ interviews/ fax-sheets/
│   │   │   ├── job-orders/ contracts/ placements/ invoices/
│   │   │   ├── dispatch-ledgers/ refund-policies/ my-numbers/
│   │   │   ├── nurture/ ai-reviews/ audit/ sales/
│   │   │   ├── dashboard/ settings/ system-status/
│   │   │   └── _components/
│   │   ├── api/                 # API Routes
│   │   └── _shared/ error.tsx / not-found.tsx / loading.tsx
│   ├── components/
│   ├── lib/
│   │   ├── ai/ analytics/ applicants/ audit/ auth/
│   │   ├── billing/ brand.ts compliance/ constants/ dashboard/
│   │   ├── db.ts email/ facilities/ fax/ i18n/
│   │   ├── integrations/ interview/ jobs/ mask.ts matching/
│   │   ├── nurture/ observability/ ocr/ pdf/ portal/
│   │   ├── repositories/ schemas/ security/ skill-sheet/
│   │   ├── storage/ stt/ system-status/ tenant/ tts/ twilio/
│   │   └── utils/ utils.ts
│   ├── prompts/        # diagnosis.system.md / fax.cover.md / fax.detail.md
│   │                   # interview.next-question.md / interview.summary.md / resume.parse.md
│   ├── types/
│   └── utils/
└── tests/              # unit / integration / e2e / ai/decisions/ ai/fax/ ai/interview/
```

## よく使うコマンド

```bash
pnpm install
pnpm dev                  # 開発サーバ (http://localhost:3000)
pnpm build && pnpm start
pnpm prisma migrate dev
pnpm prisma db seed
pnpm prisma studio
pnpm test                 # vitest (404 tests / ~55s)
pnpm test:e2e             # playwright
pnpm lint && pnpm typecheck
```

## 品質ゲート (push 前必須)

```bash
pnpm typecheck && pnpm lint && pnpm test
```

1 つでも落ちたら **push しない**。原因を直してから。`--no-verify` 等のスキップは禁止。

## コーディング規約

- TypeScript strict 必須 (`noImplicitAny` / `strictNullChecks` ON)
- API Route は `route.ts` 1 ファイル 1 エンドポイント
- ファイル名: ケバブケース (例: `fax-sheet-preview.tsx`)
- コンポーネント: PascalCase の名前付きエクスポート
- 関数: 動詞始まり (`buildDiagnosis`, `sendFax`)
- Zod スキーマは `src/lib/schemas/*.ts` に集約
- DB アクセスは Server Component / API Route / Server Action のみ
- クライアントコンポーネントは `"use client"` を冒頭に明記
- generic コメント禁止 (「中程度」「適切に処理」など中身ゼロは絶対書かない)
- 数値表示は `Math.floor` + 「○点」「○件」表記
- PII はマスク or イニシャル化 (氏名 → カナ → ローマ字 1 文字、例: `H.N.`)
- PDF に機種依存文字禁止 (`①〜⑩` `㊤` `℡` `㈱` 等)
- PDF にイタリック日本語禁止 (NotoSansJP がイタリックバリアントを持たないため)

## AI 機能の編集手順

- プロンプトは `src/prompts/*.md` に置く。コードから `readFile` で読む
- プロンプトを変更したら必ず `tests/ai/decisions/golden/` の回帰テストを実行
- Claude API 呼び出しは `src/lib/ai/client.ts` の `complete()` を経由
- モデル切り替えは環境変数 `MODEL_SMART` / `MODEL_FAST` で行う
- JSON 出力が必要な場合は `jsonSchema` を必ず渡す
- 開発時は **API 課金ゼロ** を死守。`AI_PROVIDER=mock` で切り替え

## 個人情報 (PII) 取り扱い

- ログには **絶対に** 氏名 / 生年月日 / 連絡先を出さない (マスク済みのみ)
- AI API に送信する前に `src/lib/mask.ts` でマスク
- テスト用フィクスチャは `tests/fixtures/anonymized/` を使う
- 実本番データをローカルに持ち出さない
- 求職者が「削除して」と申し出たら `Applicant.deletedAt` をセット → 30 日後に物理削除
- マイナンバーは AES-256-GCM で暗号化、アクセスログ (`MyNumberAccessLog`) を必ず残す

## 主要モデル (Prisma)

詳細は `prisma/schema.prisma`。主要 35+ モデル:

- 採用フロー: `Applicant` `Diagnosis` `SkillSheet` `Interview` `InterviewTurn` `Qualification` `ResidenceStatus`
- 施設 / 営業: `Facility` `FaxSheet` `FaxReaction` `FacilityPortalToken`
- 紹介成立 (Phase 6): `JobOrder` `Contract` `Placement` `Invoice` `DispatchLedger` `RefundPolicy`
- セキュリティ / 監査: `AuditEvent` (ハッシュチェーン) `AuditLog` `AuditCheckpoint` `MyNumberRecord` `MyNumberAccessLog`
- ユーザー / 認証: `User` `Staff` `Account` `Session` `VerificationToken`
- 育成 / AI レビュー: `NurtureSequence` `NurtureStepExecution` `AiReview`
- その他: `JobLog` `EmailLog` `ResumeUpload` `SkillSheetToken` `InterviewToken`

## 自動配信パイプライン

開発機では `scripts/auto-update.sh` が常駐し 30 秒ごとに `origin/main` を pull → `prisma generate` → `prisma migrate deploy` → HMR で反映する。**main に merge するだけ** で配信完了とみなしてよい。

## ブランチ / コミット / PR 運用

- ブランチ命名: `claude/<version>-<short-description>` (例: `claude/v2.1-edit-and-history`)
- 1 Phase / 1 機能 = 1 新ブランチ = 1 PR
- commit message は日本語 + 先頭にバージョンタグ
- PR body は固定セクション: `## 概要` / `## 変更内容` / `## 検証` / `## ロールアウト`
- 質問はしない、Recommended で判断、コメントに理由を残す
- 各 PR は CI 完了確認後にマージ。draft は使わない
- マージ後、main を pull してから次の新ブランチを切る
- すべて mock provider で課金ゼロ

## テストの方針

- 「テストを書いてから実装」(TDD) を原則とする
- 純粋関数は Vitest でユニットテスト
- API Route は統合テスト (DB はテスト用 Postgres)
- 主要な画面遷移は Playwright で E2E
- AI 出力は `tests/ai/decisions/` に golden データを置き回帰テスト
- 現状: 59 ファイル / 404 tests passed (`pnpm test` で ~55s)

## デプロイ

```bash
# Vercel (フロント)
vercel --prod

# AWS (API / Job Worker)
pnpm build:worker
docker build -t growlink-worker .
# Push & ECS デプロイ
```

## 関連ドキュメント

- `spec.md` — 業務仕様書 (上流ドキュメント、ルート直下)
- `design.md` — Claude Code 開発設計書 (本書の親文書、ルート直下)
- `docs/PROGRESS.md` — ⭐ 時系列の作業ログ (Phase / PR 単位の真の進捗)
- `docs/ARCHITECTURE.md` — 全体構成
- `docs/SECURITY.md` — PII / RBAC / 監査の実装方針
- `docs/DEPLOY.md` — デプロイ手順
- `docs/TESTING.md` — テスト戦略
- `docs/BRAND.md` — ブランド規定 (色 / 命名 / トーン)

## やってほしくないこと

- `prisma migrate reset` をユーザー確認なく実行しない
- 本番 DB への直接アクセスをしない
- Anthropic / Gemini API への大量バースト送信をしない (レート制限注意)
- 個人情報をプロンプトに含めず、必ずマスクする
- 機種依存文字 (`①〜⑩` 等の丸囲み数字、`㊤` 等) は FAX 用 PDF に使わない
- `git push --force` を main / master に対して行わない
- v1 と v2 で別計算ロジックを併存させない (画面と PDF で数字が違うのは禁忌)
- 実機未検証で「完成しました」と言わない
