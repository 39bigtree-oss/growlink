# Architecture — Tsumugi (紡)

> *AI が、人と現場を丁寧に紡ぐ。*

このドキュメントは Tsumugi の全体構造、主要な抽象、設計判断の根拠をまとめます。
コードを読む前にここから入ってください。

---

## 1. レイヤー

```
┌──────────────────────────────────────────────────────────────┐
│ Web (Next.js 15 App Router, React 19)                        │
│  ├ /apply             求職者の申込フォーム (公開)             │
│  ├ /skill-sheet/[t]   スキルシート入力 (公開、トークン)       │
│  ├ /interview/[t]     AI 面接 UI (公開、トークン)             │
│  ├ /feedback/[t]      FAX 反応フォーム (公開、署名トークン)   │
│  └ /admin/*           社内管理画面 (Auth.js + RBAC)           │
├──────────────────────────────────────────────────────────────┤
│ HTTP API (Next.js Route Handlers, Node runtime)              │
│  ├ /api/applicants        申込登録                            │
│  ├ /api/diagnosis         AI 適職診断 (sync / ?async=1)      │
│  ├ /api/skill-sheet/*     入力 / 提出 / 履歴書アップロード    │
│  ├ /api/interview/*       面接ターン進行                      │
│  ├ /api/fax-sheets/*      送信票生成 / 送信                   │
│  ├ /api/feedback/*        FAX 反応受付                        │
│  ├ /api/twilio/*          TwiML / status callback             │
│  ├ /api/admin/*           社内エンドポイント                  │
│  └ /api/health            ヘルスチェック                      │
├──────────────────────────────────────────────────────────────┤
│ Domain Services (src/lib/*)                                   │
│  ├ ai/         LLM プロバイダ抽象 (mock / anthropic / gemini) │
│  ├ ocr/        OCR プロバイダ抽象 (mock / docai)              │
│  ├ stt/, tts/  音声プロバイダ抽象 (mock / whisper / 11labs)   │
│  ├ twilio/     Programmable Voice 抽象 (mock / twilio)       │
│  ├ email/      送信プロバイダ抽象 (mock / resend) + テンプレ │
│  ├ fax/        送信票生成 + 反応トークン                      │
│  ├ skill-sheet/ 履歴書処理オーケストレータ                    │
│  ├ interview/   面接オーケストレータ + finalize ジョブ        │
│  ├ jobs/        BullMQ / memory provider 切替                 │
│  ├ repositories/ Prisma ラッパ (薄い)                         │
│  ├ schemas/    Zod スキーマ集約                              │
│  └ security/   レート制限 / 反応 HMAC                         │
├──────────────────────────────────────────────────────────────┤
│ Persistence                                                   │
│  ├ Postgres 16 (Prisma 6)                                     │
│  ├ Local FS storage (.storage/) — PDF / EML / TTS mp3        │
│  └ Redis (BullMQ 本番時のみ)                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 主要フロー

### 2.1 求職者の応募 → 面接 → 提案

```
[求職者] /apply
  │ POST /api/applicants
  ↓
[システム] Applicant 作成
  │ ├ メール: applicant.receipt
  │ ├ メール: applicant.skill_sheet_invite (token 同梱)
  │ └ メール: staff.notification
  ↓
[スタッフ] /admin/applicants/[id]
  │ 「AI 診断を実行」(同期 or ?async=1)
  ↓
[システム] buildDiagnosis → Diagnosis × 11 行
  │ メール: applicant.diagnosis_ready (skill-sheet URL 同梱)
  ↓
[求職者] /skill-sheet/[token]
  │ POST /save (途中保存、30 秒自動)
  │ POST /resume (履歴書 → OCR → Claude → SkillSheet マージ)
  │ POST /submit → SKILL_SHEET_DONE
  ↓
[スタッフ] 申込詳細「面接タブ」→「面接を予約」
  │ POST /api/admin/interviews → Interview + Token
  │ メール: applicant.interview_invite (token 同梱)
  ↓
[求職者] /interview/[token]
  │ POST /turn × 5 (ai / applicant 交互)
  │ POST /end → enqueueJob("interview.finalize")
  ↓
[ジョブ] finalizeInterview
  │ summarize → SkillSheet 差分マージ → INTERVIEW_DONE
  │ メール: applicant.interview_completed
  ↓
[スタッフ] /admin/sales (SALES_READY リスト)
  │ /admin/fax-sheets/new で施設複数選択 → 一括生成
  ↓
[スタッフ] /admin/fax-sheets で送信
  │ POST /api/fax-sheets/[id]/send (?async=1) → mock console.log
  │ FaxSheet.status = SENT
  ↓
[施設] /feedback/[token] (FAX に QR で印刷予定)
  │ POST /api/feedback/[token]
  │ FaxReaction.upsert
  ↓
[KPI] /admin/dashboard で日次集計 + 施設別反応率を確認
```

### 2.2 PII の流れ

```
原データ (Applicant)
  │
  ├── DB (フル保存、deletedAt で論理削除 → 30 日 cron)
  │
  ├── lib/mask.ts でマスク (氏名→イニシャル、生年月日→年代、住所→市区まで)
  │     │
  │     ├── AI Provider (mock / anthropic / gemini)
  │     │     ↑ ここに渡る前に必ず通す
  │     │
  │     ├── FAX PDF
  │     │     ↑ 候補者欄は "T.S 様" 等のマスク済みだけ
  │     │
  │     └── ログ / Sentry
  │
  └── スタッフのみ生データを管理画面で参照可
```

---

## 3. 抽象とプロバイダ

各種外部 API はインターフェースに揃え、`*_PROVIDER` env で切替。
本番化までは mock で 100% の機能カバレッジを担保。

| カテゴリ | env | mock | 本番候補 |
|---|---|---|---|
| AI / LLM | `AI_PROVIDER` | 決定論的テンプレ | `anthropic` (Claude) / `gemini` (Gemini 2.5) |
| OCR | `OCR_PROVIDER` | 履歴書 3 サンプル | `docai` (Google Document AI) |
| STT | `STT_PROVIDER` | 質問 idx で固定回答 | `whisper` / `deepgram` |
| TTS | `TTS_PROVIDER` | 無音 mp3 | `elevenlabs` / `voicevox` |
| 電話 | `TWILIO_PROVIDER` | console.log | `twilio` |
| メール | `EMAIL_PROVIDER` | `.eml` 書き出し | `resend` |
| FAX | `FAX_PROVIDER` | console.log | `interfax` |
| ジョブ | `QUEUE_PROVIDER` | in-process setImmediate | `bullmq` + Redis |

切替詳細は [`docs/providers.md`](./providers.md)。

---

## 4. データモデルの肝

- **Applicant**: 公開申込 → 状態遷移を `ApplicantStatus` enum で表現 (`status-machine.ts`)
- **SkillSheet**: `educations` / `careers` / `skills` / `desired` は Json + Zod で構造化。本人入力欄は AI で上書きしない (`mergeParsedIntoContent`, `mergeInterviewIntoContent`)
- **Interview** + **InterviewTurn** + **InterviewToken**: 1 求職者 1 面接、Q&A は turnIndex 連番
- **FaxSheet** + **FaxReaction**: 同一 (applicant, facility) は upsert で 1 件に集約。反応は HMAC 署名トークンで識別
- **JobLog**: queued → active → completed / failed の遷移を全件記録。失敗ジョブはここから再投入できる設計
- **EmailLog**: queued → sent / failed。全メール送信を監査可能
- **ResidenceStatus**: 在留資格を分離テーブル化、権限を絞れる構造

---

## 5. RBAC

`src/lib/auth/rbac.ts` の `AdminCapability` 一覧:

| Capability | ADMIN | CONSULTANT | SALES | VIEWER |
|---|---|---|---|---|
| applicants:read | ✓ | ✓ | ✓ | ✓ |
| applicants:write | ✓ | ✓ |  |  |
| applicants:approve | ✓ | ✓ |  |  |
| facilities:read | ✓ | ✓ | ✓ | ✓ |
| facilities:write | ✓ |  |  |  |
| fax:read | ✓ | ✓ | ✓ | ✓ |
| fax:create | ✓ | ✓ | ✓ |  |
| fax:send | ✓ |  | ✓ |  |
| interviews:read | ✓ | ✓ | ✓ | ✓ |
| interviews:write | ✓ | ✓ |  |  |
| settings:read / write | ✓ |  |  |  |

すべての書き込み系操作は `recordAuditLog` で `AuditLog` に保存される。

---

## 6. テスト構造

- **`tests/unit/`**: 純粋関数・スキーマ・サービス層 (Vitest + Prisma vi.mock)
- **`tests/ai/decisions/`**: AI 出力の golden データ (回帰テスト)
- **`tests/ai/*/`**: 各 AI ユースケース (diagnosis / fax / skill-sheet / interview)
- **`tests/api/`**: Route Handler の vi.mock 統合テスト
- **`tests/e2e/`**: Playwright (申込フロー / health / not-found / login / token)

各 PR で `pnpm typecheck && pnpm lint && pnpm test` が CI で gating。

---

## 7. 性能と運用前提

- ホット API: `/api/diagnosis`、`/api/skill-sheet/[t]/resume`、`/api/fax-sheets` POST は **同期** 動作も保持しつつ `?async=1` でジョブ化可能
- Vercel 等サーバレスでは `QUEUE_PROVIDER=memory` の場合プロセスをまたがないので、本番は `bullmq` + 別プロセスワーカー (Phase 6 で起動スクリプト整備)
- DB クエリは `Applicant` の status と createdAt にインデックス。50K 件規模までは index scan で対応
- PDF 生成は `@react-pdf/renderer` でフォント初回ロードに 60〜80 秒。production はサーバ再起動を抑える + warm-up を強く推奨

---

## 8. 拡張ポイント

| 領域 | 追加方法 |
|---|---|
| AI プロバイダを足す | `src/lib/ai/providers/<name>.ts` を作り `client.ts` の resolveProvider に分岐 |
| メール文面を増やす | `src/lib/email/templates/<name>.ts` を追加 + `EmailLog.template` に新 ID |
| 新業態を増やす | `prisma/schema.prisma` の `FacilityCategory` enum + diagnosis-comments.json + fax-bodies.json |
| 言語を増やす | `messages/<locale>.json` + `lib/i18n/config.ts` の `SUPPORTED_LOCALES` + ALL_MESSAGES |
| 在留資格を増やす | `lib/constants/visa-types.ts` の VISA_TYPE_OPTIONS |

---

## 9. 設計判断ログ (主要なもの)

| 決定 | 理由 |
|---|---|
| Provider 切替を env だけで完結 | 開発 / ステージング / 本番でコード差分ゼロ |
| mock provider に決定論ハッシュを使う | 同じ入力で同じ出力 → 回帰テストが書ける |
| AI 出力で本人入力を上書きしない | 本人の文脈と意図を最優先、AI は補完だけ |
| ジョブを `?async=1` で opt-in | 既存テスト互換と段階移行を両立 |
| 反応トークンに期限なし | FAX 反応は数か月後でもあり得るため、revoke は `FaxSheet.status` で別管理 |
| Sentry を install せず stub | DSN なしでも壊れない、本番時のみ `@sentry/nextjs` 追加 |
| CSP に `unsafe-inline` 許可 | recharts / react-pdf が必要、X-Frame-Options 等は厳格化で補う |
