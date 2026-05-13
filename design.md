# グロウリンク AI採用・営業自動化システム — Claude Code 開発設計書

> Claude Code で実装することを前提とした開発設計書。
> リポジトリ直下の CLAUDE.md と合わせて読むこと。

## 1. 本書の位置づけ

本書は、株式会社グロウリンクが構築する「AI採用・営業自動化システム」を Anthropic 社の Claude Code で実装することを前提とした開発設計書である。

### 1.1 関連ドキュメント

| ドキュメント | 役割 |
|---|---|
| docs/spec.md | 業務仕様書(上流ドキュメント) |
| docs/design.md(本書) | 実装方針・技術設計・タスク分割 |
| CLAUDE.md(リポジトリ直下) | Claude Code への常時コンテキスト |

---

## 2. システム全体像

### 2.1 フロー

```
①Web申込フォーム
  → ②AI適職診断 自動送付
    → ③スキルシート(本人入力 / 履歴書OCR)
      → ④AI電話面接(24h)
        → ⑤社内承認
          → ⑥FAX送信票自動生成
            → ⑦施設へFAX/メール送信
              → ⑧返信受領・マッチング
```

### 2.2 AI を使う箇所(Claude API 活用ポイント)

| No. | 機能 | 用途 | 推奨モデル |
|---|---|---|---|
| 1 | AI適職診断 コメント生成 | 占術スコア+資格から「向いている/向いていない理由」生成 | claude-sonnet-4-6 |
| 2 | 履歴書OCR後の構造化 | OCRテキストをスキルシートJSONに転記 | claude-sonnet-4-6 |
| 3 | AI電話面接 質問生成 | スキルシートを読み込み、次の質問を動的生成 | claude-sonnet-4-6 |
| 4 | 面接通話 要約 | 文字起こしから要約・条件抽出 | claude-sonnet-4-6 |
| 5 | FAX送信票 本文生成 | 求職者×施設の組合せで提案文を生成 | claude-sonnet-4-6 |
| 6 | 多言語翻訳(外国人対応) | 母語入力 → 日本語自動翻訳 | claude-haiku-4-5 |
| 7 | リマインドメール本文 | 状況に応じた自然な日本語生成 | claude-haiku-4-5 |

> Claude API は Anthropic SDK 経由で呼び出す。モデルは環境変数で切替可能にする。

---

## 3. 推奨技術スタック

| 分類 | 採用技術 |
|---|---|
| フロントエンド | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| UIライブラリ | shadcn/ui + Radix UI + lucide-react |
| フォーム | React Hook Form + Zod |
| バックエンド | Next.js API Routes |
| DB | PostgreSQL 16(Supabase or AWS RDS) |
| ORM | Prisma |
| 認証 | Auth.js (NextAuth) |
| AI(LLM) | Anthropic Claude API (@anthropic-ai/sdk) |
| 音声(STT) | Whisper / Deepgram |
| 音声(TTS) | ElevenLabs / VOICEVOX |
| 電話 | Twilio Programmable Voice |
| OCR | Google Document AI |
| メール | Resend |
| FAX | InterFAX API |
| ジョブキュー | BullMQ + Redis |
| ストレージ | AWS S3 / Supabase Storage |
| インフラ | 初期: Railway / 本番: Vercel + AWS |
| テスト | Vitest + Playwright + msw |
| 国際化 | next-intl |

---

## 4. ディレクトリ構造

```
growlink/
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   ├── skills/
│   │   ├── diagnosis-prompt/
│   │   ├── interview-prompt/
│   │   └── fax-generator/
│   └── agents/
│       ├── data-modeler.md
│       ├── ui-builder.md
│       └── api-tester.md
├── docs/
│   ├── spec.md
│   └── design.md
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── apply/page.tsx
│   │   │   ├── skill-sheet/[token]/page.tsx
│   │   │   └── interview/[token]/page.tsx
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   ├── applicants/
│   │   │   ├── facilities/
│   │   │   └── fax-sheets/
│   │   └── api/
│   │       ├── applicants/route.ts
│   │       ├── diagnosis/route.ts
│   │       ├── skill-sheets/route.ts
│   │       ├── interviews/
│   │       │   ├── twilio-webhook/route.ts
│   │       │   └── transcribe/route.ts
│   │       ├── fax-sheets/route.ts
│   │       └── webhooks/email/route.ts
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts
│   │   │   ├── diagnosis.ts
│   │   │   ├── interview.ts
│   │   │   └── fax.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── email.ts
│   │   ├── fax.ts
│   │   ├── ocr.ts
│   │   ├── pdf.ts
│   │   ├── stt.ts
│   │   ├── tts.ts
│   │   └── twilio.ts
│   ├── prompts/
│   │   ├── diagnosis.system.md
│   │   ├── diagnosis.user.md
│   │   ├── interview.system.md
│   │   ├── interview.next-question.md
│   │   ├── interview.summary.md
│   │   ├── fax.cover.md
│   │   └── fax.detail.md
│   ├── jobs/
│   │   ├── diagnosis.worker.ts
│   │   ├── ocr.worker.ts
│   │   └── transcribe.worker.ts
│   ├── types/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── .env.example
└── package.json
```

---

## 5. データモデル(Prisma スキーマ)

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Gender { MALE FEMALE OTHER }
enum Rank { S A B C D }
enum ApplicantStatus {
  RECEIVED
  DIAGNOSED
  SKILL_SHEET_INPROGRESS
  SKILL_SHEET_DONE
  INTERVIEW_DONE
  SALES_READY
  IN_INTRODUCTION
  CONTRACTED
  REJECTED
}
enum FacilityCategory {
  HOSPITAL_ACUTE
  HOSPITAL_GENERAL
  CLINIC
  DAYCARE_ELDERLY
  REHAB_DAY
  HOMEVISIT_NURSE
  HOMEVISIT_NURSE_PSYCHIATRY
  HOMEVISIT_CARE
  DAYCARE_DISABILITY
  HOMEVISIT_DISABILITY
  GROUP_HOME_DISABILITY
}

model Applicant {
  id              String   @id @default(cuid())
  lastName        String
  firstName       String
  lastNameKana    String
  firstNameKana   String
  birthDate       DateTime
  gender          Gender
  email           String   @unique
  phone           String
  nationality     String?
  language        String?  @default("ja")
  wantsDiagnosis  Boolean  @default(true)
  status          ApplicantStatus @default(RECEIVED)
  qualifications  Qualification[]
  diagnoses       Diagnosis[]
  skillSheet      SkillSheet?
  interview       Interview?
  faxSheets       FaxSheet[]
  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Qualification {
  id          String   @id @default(cuid())
  applicantId String
  applicant   Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  name        String
  acquiredOn  DateTime?
  number      String?
}

model Diagnosis {
  id          String   @id @default(cuid())
  applicantId String
  applicant   Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  category    FacilityCategory
  score       Int
  rank        Rank
  proComment  String
  conComment  String
  generatedAt DateTime @default(now())
  @@unique([applicantId, category])
}

model SkillSheet {
  id            String   @id @default(cuid())
  applicantId   String   @unique
  applicant     Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  educations    Json
  careers       Json
  skills        Json
  desired       Json
  selfPR        String?
  rawResumeKey  String?
  completedAt   DateTime?
  updatedAt     DateTime @updatedAt
}

model Interview {
  id           String   @id @default(cuid())
  applicantId  String   @unique
  applicant    Applicant @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  callSid      String?
  startedAt    DateTime?
  endedAt      DateTime?
  durationSec  Int?
  transcript   String?
  summary      Json?
  audioKey     String?
}

model Facility {
  id           String   @id @default(cuid())
  name         String
  category     FacilityCategory
  prefecture   String
  city         String
  address      String
  fax          String?
  email        String?
  isFaxPublic  Boolean  @default(false)
  notes        String?
  faxSheets    FaxSheet[]
  reactions    FaxReaction[]
  createdAt    DateTime @default(now())
}

model FaxSheet {
  id          String   @id @default(cuid())
  applicantId String
  facilityId  String
  applicant   Applicant @relation(fields: [applicantId], references: [id])
  facility    Facility  @relation(fields: [facilityId], references: [id])
  pdfKey      String
  sentAt      DateTime?
  channel     String
  status      String
  reaction    FaxReaction?
  createdAt   DateTime @default(now())
}

model FaxReaction {
  id          String   @id @default(cuid())
  faxSheetId  String   @unique
  facilityId  String
  faxSheet    FaxSheet @relation(fields: [faxSheetId], references: [id])
  facility    Facility @relation(fields: [facilityId], references: [id])
  interested  Boolean
  comment     String?
  receivedAt  DateTime @default(now())
}

model Staff {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      String   // admin | consultant | sales | viewer
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  staffId   String?
  action    String
  target    String?
  payload   Json?
  createdAt DateTime @default(now())
}
```

---

## 6. API 設計

| メソッド | パス | 用途 |
|---|---|---|
| POST | /api/applicants | 申込受付(reCAPTCHA検証込み) |
| GET | /api/applicants | 申込一覧(管理画面用) |
| GET | /api/applicants/[id] | 申込詳細 |
| PATCH | /api/applicants/[id] | ステータス・項目更新 |
| POST | /api/diagnosis | AI診断実行 |
| GET | /api/diagnosis/[applicantId] | 診断結果取得 |
| GET | /api/diagnosis/[applicantId]/pdf | A4 1枚 PDF |
| POST | /api/skill-sheets/upload-resume | 履歴書OCR → 構造化 |
| POST | /api/skill-sheets | 本人入力 submit |
| GET | /api/skill-sheets/[applicantId] | スキルシート取得 |
| POST | /api/interviews/start | AI 面接開始(Twilio 発信) |
| POST | /api/interviews/twilio-webhook | Twilio TwiML |
| POST | /api/interviews/transcribe | 通話終了→文字起こし→要約 |
| POST | /api/fax-sheets | FAX 送信票生成 |
| POST | /api/fax-sheets/[id]/send | FAX/メール送信実行 |
| GET | /api/facilities | 施設マスタ検索 |
| POST | /api/facilities/bulk-import | CSV取込 |

### 例: POST /api/diagnosis

リクエスト:
```json
{ "applicantId": "ckxxxx..." }
```

レスポンス:
```json
{
  "applicantId": "ckxxxx...",
  "results": [
    {
      "category": "HOSPITAL_ACUTE",
      "score": 78,
      "rank": "A",
      "proComment": "...",
      "conComment": "..."
    }
  ],
  "pdfUrl": "/api/diagnosis/ckxxxx.../pdf"
}
```

---

## 7. AI 統合設計

### 7.1 共通クライアント

```typescript
// src/lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = {
  smart: process.env.MODEL_SMART ?? "claude-sonnet-4-6",
  fast:  process.env.MODEL_FAST  ?? "claude-haiku-4-5",
};

export async function complete(opts: {
  system: string;
  user: string;
  model?: keyof typeof MODEL;
  jsonSchema?: object;
  maxTokens?: number;
}) {
  const res = await anthropic.messages.create({
    model: MODEL[opts.model ?? "smart"],
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");
  if (opts.jsonSchema) return JSON.parse(extractJson(text));
  return text;
}
```

### 7.2 AI 適職診断ロジック

1. 姓名判断・四柱推命などのスコア計算は決定論的に TypeScript で実装
2. 計算結果(各業態の生スコア)を Claude に渡し、自然なコメントを生成
3. Claude の出力は JSON スキーマで強制し、必ず proComment / conComment を得る

```typescript
// src/lib/ai/diagnosis.ts
export async function buildDiagnosis(applicant: ApplicantInput) {
  const rawScores = scoreByOccultism(applicant); // 決定論的
  const adjusted  = adjustByQualifications(rawScores, applicant.qualifications);
  const ranked    = toRanked(adjusted); // S/A/B/C/D

  const commentary = await complete({
    model: "smart",
    system: readFile("src/prompts/diagnosis.system.md"),
    user: JSON.stringify({ applicant, ranked }),
    jsonSchema: diagnosisCommentSchema,
  });
  return ranked.map(r => ({ ...r, ...commentary[r.category] }));
}
```

### 7.3 AI 電話面接の構造

```
1. ユーザ発信 → /api/interviews/start で Call 開始(Twilio.calls.create)
2. Twilio が webhook 呼出 → TwiML <Say> で挨拶 → <Gather input="speech">
3. ユーザ音声 → Whisper で文字起こし
4. 既に得た回答 + スキルシート を Claude に渡し、次の質問を生成
   - 上限15-20分 / 8-12問程度で打ち切り
5. 通話終了 → 全文文字起こし & 要約 → SkillSheet に差分マージ
```

### 7.4 AI 適職診断 ランク基準

| ランク | 点数範囲 | 判定 |
|---|---|---|
| S | 85～100点 | 非常に高い適性 |
| A | 70～84点 | 高い適性 |
| B | 55～69点 | 標準的な適性 |
| C | 40～54点 | やや適性に課題あり |
| D | 39点以下 | 適性低め |

### 7.5 スコア構成(100点満点)

| 要素 | 配点 | 説明 |
|---|---|---|
| 姓名判断 適性スコア | 30点 | 姓名の画数から導く性格傾向と業態相性 |
| 生年月日 適性スコア | 30点 | 四柱推命・数秘術等による性格・行動傾向 |
| 資格マッチング | 25点 | 保有資格と業態必要資格の一致度 |
| 希望整合度 | 15点 | 本人の希望職種との整合 |

### 7.6 診断対象業態

- 病院: 急性期 / 総合
- クリニック
- 高齢者: デイサービス / 通所リハ
- 訪問: 訪問看護(一般) / 訪問看護(精神科) / 訪問介護
- 障害福祉: 障害デイ / 障害訪問介護 / グループホーム

夜勤有無は本フェーズでは診断要素に含めない。

---

## 8. プロンプト設計

すべて `src/prompts/*.md` に配置し、コードから `readFile` で読む。

### 8.1 diagnosis.system.md(雛形)

```
あなたはグロウリンクのキャリアコンサルタントです。
求職者の属性(氏名・生年月日・資格)と、業態ごとの適性スコア(0-100)が
与えられます。各業態について以下のJSONで返してください。

{
  "HOSPITAL_ACUTE": {
    "proComment": "(50字以内の向いている理由)",
    "conComment": "(50字以内の向いていないかもしれない理由)"
  },
  ...
}

# 制約
- 求職者が前向きになれる表現を優先する
- ランクD(40点未満)でも人格否定をしない
- 医療職としての専門用語は控えめに、本人に伝わる表現で書く
- 「占いだから当たらない」とは書かない
```

### 8.2 interview.next-question.md(雛形)

```
# 役割
あなたはグロウリンクの採用担当 AI です。
求職者と音声通話中で、これまでの会話履歴と
スキルシートを踏まえて「次の1問」を返します。

# 入力(JSON)
{
  "skillSheet": {...},
  "history": [
    { "role": "ai", "text": "..." },
    { "role": "applicant", "text": "..." }
  ],
  "elapsedSec": 540
}

# 出力(JSON)
{
  "question": "(1-2文の質問。日本語、丁寧語)",
  "shouldEnd": false,
  "reasonForEnding": null
}

# ルール
- 同じ質問を繰り返さない
- 求職者の回答が曖昧ならその場で言い換えて確認
- 個人を尊重する表現
- 退職理由を聞く時は配慮ある言い回し
```

### 8.3 FAX 関連

- `fax.cover.md`: 1枚目(タイトル・求職者サマリ・適職ランク・希望条件・返信欄案内)
- `fax.detail.md`: 2枚目(AI面接サマリ・職務経歴ハイライト・強み・通勤エリア・開始時期)

---

## 9. UI/UX 設計

### 9.1 求職者画面

- `/apply` — シングルカラム、4ステップ(基本情報→資格→希望→確認)。スマホファースト
- `/skill-sheet/[token]` — 入力タブ式(基本/学歴/職歴/資格/希望/PR)。途中保存
- `/interview/[token]` — 「電話を受ける/今すぐ発信する」の2ボタン。所要15-20分の説明

### 9.2 管理画面

- `/dashboard` — KPI(申込数/診断完了/面接完了/送信数/返信率/成約率)
- `/applicants` — ステータス別タブ、検索、ステータス遷移ボタン
- `/applicants/[id]` — タイムライン、診断結果、スキルシート、面接ログ、FAX 送信履歴
- `/facilities` — マスタ管理、CSV 取込、反応履歴
- `/fax-sheets` — 一括生成、プレビュー、承認、送信

---

## 10. 開発タスク分割(Phase ごと)

### Phase 1: MVP(目安4週間)

| No. | タスク | 完了条件 |
|---|---|---|
| 1-1 | Next.js + Prisma + Auth.js 雛形 | プロジェクトが起動、ログインができる |
| 1-2 | DB スキーマ実装 & マイグレーション | Applicant 等のテーブルが作成される |
| 1-3 | /apply フォーム実装 | 送信で DB 登録、確認メール送信 |
| 1-4 | AI 診断ロジック(スコア計算) | テストでスコアが期待値を返す |
| 1-5 | AI 診断 Claude 統合 & PDF 生成 | /diagnosis/[id]/pdf で A4 1枚出力 |
| 1-6 | 管理画面: 申込一覧/詳細/承認 | ステータス遷移が動作 |
| 1-7 | FAX 送信票 PDF テンプレ(手動入力) | 管理画面で PDF ダウンロード |

### Phase 2: スキルシート自動化(目安3週間)

| No. | タスク |
|---|---|
| 2-1 | スキルシート本人入力フォーム(途中保存対応) |
| 2-2 | 履歴書アップロード & OCR |
| 2-3 | Claude による履歴書 → スキルシート転記 |
| 2-4 | Resend でメール自動配信 |

### Phase 3: AI 電話面接(目安5週間)

| No. | タスク |
|---|---|
| 3-1 | Twilio セットアップ + 発信 |
| 3-2 | Whisper / Deepgram で STT |
| 3-3 | Claude による次質問生成 |
| 3-4 | TTS で音声生成 |
| 3-5 | 通話終了 → 文字起こし全文 + 要約 → SkillSheet へ |

### Phase 4: 営業自動化(目安4週間)

| No. | タスク |
|---|---|
| 4-1 | 施設マスタ管理(CSV/手入力/反応履歴) |
| 4-2 | FAX 送信票 個別自動生成 + Claude で本文生成 |
| 4-3 | InterFAX API で一括送信 |
| 4-4 | 返信受付(メール/フォーム)とトラッキング |

### Phase 5: 外国人対応 & 仕上げ(目安3週間)

| No. | タスク |
|---|---|
| 5-1 | next-intl で多言語化 |
| 5-2 | AI 面接の多言語対応 |
| 5-3 | 在留資格項目の追加 |
| 5-4 | 監視・ログ・障害対応 |

---

## 11. 環境構築

### 11.1 必要なもの

- Node.js 20+ / pnpm 9+
- PostgreSQL 16(ローカルは Docker)
- Redis 7(ローカルは Docker)
- Anthropic API Key
- Twilio / Resend / InterFAX / Google Document AI のキー

### 11.2 セットアップ

```bash
git clone <repo> growlink && cd growlink
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

### 11.3 .env.example

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/growlink
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-xxxx
MODEL_SMART=claude-sonnet-4-6
MODEL_FAST=claude-haiku-4-5
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER=+81xxxx
RESEND_API_KEY=
INTERFAX_USER=
INTERFAX_PASS=
GCP_DOCAI_PROJECT=
GCP_DOCAI_LOCATION=us
GCP_DOCAI_PROCESSOR_ID=
S3_BUCKET=growlink-prod
AUTH_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 12. テスト戦略

- ユニット(Vitest):lib/* と prompts の純粋関数
- AI 回帰: `tests/ai/decisions/golden/` に入出力を保管
- 統合(Vitest + supertest):API Routes を DB 込みでテスト
- E2E(Playwright):申込 → 診断 → スキルシート → 面接 を一気通貫
- TDD 前提:「テストを書いてから実装」

---

## 13. セキュリティ・コンプライアンス

- 個人情報は暗号化保管(pg_crypto + S3 SSE-KMS)
- 管理画面は IP 制限 + SSO(Phase 4 以降)
- AI 入出力ログは個人情報マスク後に保管
- AI API へ送るデータは最小限。FAX 本文生成時は事前マスク必須
- 求職者の削除申し出 → soft-delete → 30日後物理削除
- 外国人在留資格は別テーブルで権限分離

---

## 14. KPI

| 指標 | 目標 |
|---|---|
| 申込 → 診断完了率 | 90%以上 |
| 診断 → スキルシート完了率 | 70%以上 |
| スキルシート → 面接完了率 | 60%以上 |
| 面接完了 → 紹介開始率 | 80%以上 |
| FAX送信 → 返信率 | 5%以上 |
| 返信 → 成約率 | 30%以上 |
| AI 診断 PDF 生成エラー率 | 1%未満 |
| AI 電話面接 通話完了率 | 85%以上 |

---

## 15. リスクと対策

| リスク | 対策 |
|---|---|
| AI 出力の不適切表現 | プロンプトに禁止表現、NG ワード検出、人間承認 |
| 占術ロジックへの信頼性 | 「参考情報」表記、生年月日を出力しない、重み調整可 |
| 個人情報漏洩 | AI API 送信前マスク、ログ匿名化、ダブルチェック |
| Twilio/Whisper 品質 | 再発信導線、文字起こしの人手レビュー |
| FAX 文字化け | PDF Outline 化、機種依存文字を排除 |
| Claude API 障害 | 再試行・サーキットブレーカ・Haiku フォールバック |
| コスト超過 | バッチ化、回数上限、モデル切替 |
