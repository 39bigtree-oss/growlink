# Tsumugi (紡) — 完璧な内部システム仕様書 (Phase 6 マスター)

> v1.4 ドラフト · 2026-05-14 · "派遣紹介会社 IT 世界一" を目指す内部システムの設計
>
> 本書は `docs/design.md` / `docs/ARCHITECTURE.md` の上流に位置する**仕様マスター**。
> Phase 1〜5 + v1.0〜v1.3 (リッチプレビュー) までで「動くデモ」までは到達済み。
> Phase 6 では **法令・収益・運用・連携** の 4 本柱を埋め、内部システムとして実運用に
> 投入できる完成度に引き上げる。

---

## 0. 設計哲学

1. **業界標準を裏切らない** — 派遣業法・職業安定法・個人情報保護法に**システム側で先回り**で従う。
2. **内部システムなのでマルチテナント禁止** — 単一会社専用。`tenantId` を全テーブルに付けない。
   将来 SaaS 化する場合は別ブランチ。
3. **mock 一式は必ず残す** — 本番プロバイダの代わりにいつでも mock に切り替えられる。CI は mock で完結。
4. **AI は出力品質・バイアス・PII の 3 ゲートを通る** — 通らないものは出さない。
5. **監査ログは append-only でハッシュチェーン** — 法的証跡として改ざん検知できる状態にする。
6. **モバイル対応とアクセシビリティは "営業外回り" のユースケース基準** — スマホ 1 台で 1 日が回ること。

---

## 1. ロードマップと優先順位

### v1.4 (本ドラフトの実装範囲) — Phase 6 基盤

DB スキーマ + ロジック層 + テスト + seed まで。UI は v1.5 で載せる前提。

- **JobOrder** (求人案件) と **Placement** (紹介成立) の独立エンティティ化
- **Contract** (取引契約) + **RefundPolicy** (返金規定) + **Invoice** (請求書)
- **DispatchLedger** (派遣台帳) + 抵触日計算
- **MyNumberRecord** (マイナンバー専用テーブル / AES-GCM 暗号化) + アクセスログ
- **AuditEvent** (append-only ハッシュチェーン監査ログ)
- **加重マッチング** (距離・時給・シフト・資格・経験の 5 軸)
- **紹介手数料計算** (返金規定の段階適用含む)
- **e-Sign mock** (CloudSign / GMO サイン互換 IF)
- **会計連携 mock** (freee / Money Forward 互換 IF)

### v1.5 (UI 完成)

- 管理画面に上記の CRUD と詳細を載せる
- 派遣台帳 PDF 出力 (抵触日アラート印付き)
- 請求書 PDF / 請求書 CSV 一括出力
- マッチング画面 (求職者 × 案件のスコアテーブル)
- e-Sign 送信 UI (mock 状態でフロー再現)

### v1.6 (運用品質)

- AuditEvent ビューア (検索 + チェーン整合性検証)
- マイナンバー閲覧フロー (理由必須 + アクセスログ)
- 在留期限アラート (BullMQ 日次ジョブ)
- 退職予兆スコア (Placement.attritionAt 入力 + 経過月で predict)
- 入社後フォローシナリオ (3 日 / 1 週 / 1 ヶ月 / 3 ヶ月)

### v1.7 (外部連携 mock → 本番)

- LINE 公式アカウント (求職者連絡)
- Google Calendar / Outlook (面談調整)
- CloudSign / GMO サイン (電子契約) 本番化
- freee / Money Forward (会計連携) 本番化
- Indeed / 看護のお仕事 / マイナビ看護師 (求人 ATS 連携)

### v1.8 (セキュリティ / 認証強化)

- MFA (TOTP + WebAuthn)
- SSO (SAML / OIDC) for 法人グループ運用
- WAF / IP 許可リスト
- AWS KMS / Secrets Manager 統合
- Pマーク / ISMS / SOC 2 Type I ロードマップ整備

### v1.9 (AI 品質)

- 出力前 bias eval (Claude Haiku で年齢・性別・国籍の差別表現を自動チェック)
- Hallucination ガード (出力 → groundedness eval)
- PII リーク検知 (出力に元データの PII が出ていないか)
- A/B プロンプト管理 (`PromptVersion` テーブル + メトリクス)

### v2.0 (KPI / 経営ダッシュボード)

- 入社後 6 ヶ月生存率
- 営業 LTV / CAC
- ヒット率 (FAX 100 通 → 反応 N 件 → 内定 M 件 → 入社 K 件)
- 月次経営レポート PDF 自動配信

---

## 2. ドメインモデル (v1.4 で追加するもの)

### 2.1 JobOrder — 求人案件 (Facility:1 → JobOrder:N)

```
JobOrder
├ facilityId        Facility → JobOrder
├ title             例: "病棟 看護師 (夜勤あり)"
├ position          JobPosition (NURSE / CARE_WORKER / PT_OT_ST / SOCIAL_WORKER / OTHER)
├ employmentType    EmploymentType (DISPATCH / DIRECT / TEMP_TO_PERM / PART_TIME)
├ hourlyWageMin     Int?   時給帯下限 (派遣・パート)
├ hourlyWageMax     Int?
├ monthlyWageMin    Int?   月給帯下限 (常勤)
├ monthlyWageMax    Int?
├ shiftPattern      Json   { dayShift: true, nightShift: false, oncall: false, weeklyDays: 4 }
├ requiredQualifications  String[]  例: ["看護師"]
├ preferredQualifications String[]
├ minExperienceYears Int @default(0)
├ headcount         Int @default(1)
├ status            JobOrderStatus (OPEN / HOLD / FILLED / CLOSED)
├ urgency           JobOrderUrgency (NORMAL / URGENT / CRITICAL)
├ startDate         DateTime?
├ endDate           DateTime?
├ nearestStation    String?
├ lat               Float?
├ lng               Float?
├ notes             String?
└ placements        Placement[]
```

**設計判断**: `Facility` を案件入れ物にしない。施設は法人実体、案件は個別募集。FAX 一括送信
の対象は **JobOrder** に変更され、closing 状態の案件には送信しない。

### 2.2 Placement — 紹介成立 (Applicant × Facility × JobOrder × Contract)

```
Placement
├ applicantId       Applicant
├ facilityId        Facility
├ jobOrderId        JobOrder
├ contractId        Contract
├ startDate         DateTime   入社日
├ endDate           DateTime?  退社日 (CONTRACTED でも未退社なら null)
├ monthlyWage       Decimal    決定月収 (税込)
├ introductionFee   Decimal    紹介手数料 (税抜)
├ feeStatus         PlacementFeeStatus (PENDING / INVOICED / PAID / REFUNDED)
├ refundDueDate     DateTime?  返金規定の最終適用期限 (例: 入社から 180 日後)
├ attritionAt       DateTime?  早期退職時刻 (退職予兆 / 返金計算に使う)
└ invoices          Invoice[]
```

### 2.3 Contract / RefundPolicy — 取引契約と返金規定

```
RefundPolicy
├ name              "標準 90 日段階返金"
├ description
└ tiers             Json [{ withinDays: 30, refundRate: 1.0 }, { withinDays: 60, refundRate: 0.5 }, { withinDays: 90, refundRate: 0.2 }]
                     入社から N 日以内に退職した場合の返金率を段階定義

Contract
├ facilityId        Facility
├ contractType      ContractType (DISPATCH_AGREEMENT / INTRODUCTION_FEE / TEMP_TO_PERM)
├ feeRate           Decimal   紹介手数料率 (年収 % または時給上乗せ %)
├ refundPolicyId    RefundPolicy
├ paymentTermDays   Int       入金サイト (default 60)
├ startDate         DateTime
├ endDate           DateTime?
├ signedAt          DateTime?
├ signedBy          String?   先方サインしたキーパーソン名
├ eSignProvider     ESignProvider (MOCK / CLOUDSIGN / GMO_SIGN)
├ eSignDocId        String?   e-Sign プロバイダの ID
├ status            ContractStatus (DRAFT / SENT / SIGNED / EXPIRED / CANCELLED)
└ placements        Placement[]
```

### 2.4 Invoice — 請求書

```
Invoice
├ facilityId        Facility
├ placementId       Placement?
├ invoiceNumber     String @unique  例: "INV-2026-05-0001"
├ issuedAt          DateTime
├ dueAt             DateTime
├ paidAt            DateTime?
├ amount            Decimal  小計 (税抜)
├ tax               Decimal  消費税
├ totalAmount       Decimal  合計 (税込)
├ status            InvoiceStatus (DRAFT / ISSUED / PAID / OVERDUE / VOID)
├ pdfKey            String?  PDF 保存先
└ externalId        String?  freee / MF のレコード ID
```

### 2.5 DispatchLedger — 派遣台帳 (派遣業法対応)

派遣形態 (`EmploymentType.DISPATCH`) で成立した Placement に **必ず** 1 件作る。

```
DispatchLedger
├ placementId       Placement @unique
├ applicantId       Applicant (snapshot)
├ facilityId        Facility (snapshot)
├ jobOrderId        JobOrder (snapshot)
├ antiteishokuDate  DateTime   抵触日 (派遣開始日 + 3 年 - 1 日)
├ dispatchPeriodStart DateTime
├ dispatchPeriodEnd   DateTime
├ dispatchManagerName String   派遣元責任者
├ receivingManagerName String  派遣先責任者
├ socialInsuranceEnrolled Boolean
├ contractCount     Int @default(1)  契約締結回数
└ notes             String?
```

**抵触日 = `dispatchPeriodStart + 3 年 - 1 日`**。同一事業所単位での 3 年ルール対応。
契約延長で `dispatchPeriodEnd` を更新するたびに `contractCount` をインクリメント。

### 2.6 MyNumberRecord — マイナンバー (特定個人情報)

- **別エンティティに分離 + AES-256-GCM で暗号化**してから DB に格納
- 鍵 (32 byte) は `MYNUMBER_ENCRYPTION_KEY` 環境変数 (本番では KMS から取得)
- アクセス時は必ず `MyNumberAccessLog` に理由付きで記録

```
MyNumberRecord
├ applicantId         Applicant @unique
├ encryptedNumber     String   AES-256-GCM 暗号文 (iv:tag:ciphertext の hex)
├ encryptedAt         DateTime
├ purpose             MyNumberPurpose (WITHHOLDING / SOCIAL_INSURANCE / EMPLOYMENT_INSURANCE)
├ retentionUntil      DateTime  保管期限 (個人情報保護法準拠 / 通常 7 年)
├ deletedAt           DateTime?
└ accessLogs          MyNumberAccessLog[]

MyNumberAccessLog
├ myNumberRecordId    MyNumberRecord
├ staffId             Staff
├ action              MyNumberAccessAction (VIEW / UPDATE / DELETE / EXPORT)
├ reason              String   "源泉徴収票発行のため" など (必須)
├ ipAddress           String?
└ accessedAt          DateTime @default(now())
```

### 2.7 AuditEvent — append-only ハッシュチェーン

既存の `AuditLog` は互換のために残す (旧 record 用)。**今後の書き込みは `AuditEvent`**。

```
AuditEvent
├ actorStaffId       Staff?
├ actorEmail         String?   snapshot (Staff 削除後も追跡)
├ action             String    "applicant.created" / "fax.sent" / "mynumber.viewed" など
├ entityType         String    "Applicant" / "FaxSheet" など
├ entityId           String?
├ before             Json?
├ after              Json?
├ ipAddress          String?
├ userAgent          String?
├ requestId          String?
├ prevHash           String    1 つ前のレコードの hash (Genesis は "0".repeat(64))
├ hash               String    sha256(prevHash || serialize(this))
└ createdAt          DateTime @default(now())
```

**改ざん検知**: 任意の連続区間で `prevHash → hash → 次レコードの prevHash` の整合性を再計算
すれば、途中でレコードが書き換えられたか削除されたかが検出できる。

**書き込み API**: `recordAuditEvent({ action, entityType, ... })` を全 mutation の最後に呼ぶ
ヘルパとして提供。

### 2.8 残置: ResidenceStatus.alertSentAt (追加)

外国人申込者の在留期限が **90 日前 / 30 日前 / 7 日前** に達したら自動アラート。
最終送信時刻を `alertSentAt` で重複送信防止。

---

## 3. ロジック層 (v1.4 で実装)

### 3.1 加重マッチング (`src/lib/matching/score.ts`)

```ts
scoreMatch(applicant, jobOrder): {
  total: number;       // 0-100
  breakdown: {
    distance: number;  // 通勤時間 (簡易: 都道府県 + 市区町村一致)
    wage:     number;  // 希望時給/月給とのフィット
    shift:    number;  // 希望シフトとのフィット
    qual:     number;  // 必須資格保持
    exp:      number;  // 経験年数
  };
  reasoning: string[]; // 各軸の根拠 (UI/監査ログ用)
}
```

**重み**: distance 20% / wage 25% / shift 20% / qual 25% / exp 10%。
必須資格未保持なら **total = 0** (ハードフィルタ)。

### 3.2 紹介手数料計算 (`src/lib/billing/calc.ts`)

```ts
calculateIntroductionFee({ monthlyWage, feeRate }): Decimal
applyRefund({ placement, attritionDate, refundPolicy }): {
  refundAmount: Decimal;
  withinDays:   number;
  tierApplied:  RefundTier | null;
}
```

### 3.3 抵触日 (`src/lib/compliance/anti-teishoku.ts`)

```ts
calcAntiteishokuDate(dispatchPeriodStart: Date): Date  // start + 3y - 1day
daysUntilAntiteishoku(date: Date, now = new Date()): number
isApproaching(date: Date, thresholdDays = 90): boolean
```

### 3.4 マイナンバー暗号化 (`src/lib/compliance/my-number.ts`)

```ts
encryptMyNumber(plain: string): string  // "iv:tag:cipher" hex
decryptMyNumber(packed: string): string
validateMyNumberFormat(s: string): boolean   // 12 桁 + チェックデジット (簡易)
```

鍵は `MYNUMBER_ENCRYPTION_KEY` (hex 64 文字 = 32 byte) を想定。
test/dev 用の固定鍵を `.env.example` に書く (本番は **絶対上書き必須**)。

### 3.5 監査チェーン (`src/lib/audit/event.ts`)

```ts
recordAuditEvent({
  prisma: PrismaClient,
  actorStaffId, actorEmail,
  action, entityType, entityId,
  before?, after?,
  ipAddress?, userAgent?, requestId?,
}): Promise<AuditEvent>

verifyChain(events: AuditEvent[]): { valid: boolean; brokenAt?: number }
```

`recordAuditEvent` は内部でトランザクション + 直前レコード取得 + hash 計算を行う。
書き込み失敗時は元 mutation も失敗させる (整合性優先)。

### 3.6 e-Sign mock (`src/lib/integrations/e-sign/mock.ts`)

```ts
ESignProvider {
  sendForSignature(doc: { pdfBuffer; signers; subject }): Promise<{ docId: string }>;
  getStatus(docId: string): Promise<{ status: "pending" | "signed" | "declined" | "expired" }>;
  downloadSigned(docId: string): Promise<Buffer>;
}
```

CloudSign / GMO サインを後で挿せるよう Provider 抽象化。mock は `.storage/e-sign/` に
入出力を保存し、状態は in-memory + ファイル。

### 3.7 会計 mock (`src/lib/integrations/accounting/mock.ts`)

```ts
AccountingProvider {
  createInvoice(invoice: Invoice): Promise<{ externalId: string }>;
  markPaid(externalId: string, paidAt: Date): Promise<void>;
  exportCsv(range: { from: Date; to: Date }): Promise<string>;
}
```

freee / Money Forward を後で挿せる Provider 抽象化。

---

## 4. セキュリティ要件 (v1.4 で必須化)

| 項目 | v1.4 で実装 | v1.5+ |
|---|---|---|
| AuditEvent ハッシュチェーン | ✅ | UI ビューア + 整合性検証ジョブ |
| マイナンバー暗号化 | ✅ AES-GCM | KMS 統合 |
| マイナンバーアクセスログ | ✅ 理由必須 | UI |
| 監査ログ append-only | ✅ ロジック層 | DB トリガで物理的に防止 |
| Rate limit | 既存 | API キー別 / IP 別の細粒度化 |
| MFA | — | v1.8 |
| SSO | — | v1.8 |
| 暗号化 at rest | DB レベル (PostgreSQL TDE) | KMS envelope |

---

## 5. テスト戦略

### v1.4 で追加するテスト

- `tests/unit/matching-score.test.ts` — 加重スコア決定論
- `tests/unit/billing-calc.test.ts` — 手数料 / 返金規定の段階適用
- `tests/unit/anti-teishoku.test.ts` — 3 年抵触日計算 (うるう年含む)
- `tests/unit/my-number-crypto.test.ts` — 暗号 / 復号ラウンドトリップ + 鍵差し替えで失敗
- `tests/unit/audit-chain.test.ts` — チェーン整合性 + 改ざん検知

### 既存テストを壊さないために

- `AuditLog` は残す。古いコードはそのまま動く。
- 既存 Prisma マイグレーションは temper しない。新規マイグレーション 1 本だけ追加。
- seed は冪等性を維持。

---

## 6. オペレーション (運用 SOP, v1.6 で完成)

- マイナンバー閲覧 → 必ず理由入力 → `MyNumberAccessLog` 自動記録 → 月次レポートに集計
- 抵触日 90 / 30 / 7 日前に自動メールで担当営業に通知
- 返金期限超過の Placement は週次レポートで可視化
- AuditEvent のチェーン整合性は **日次** ジョブで自動検証 (失敗で Slack/PagerDuty)

---

## 7. やらないこと (v1.4 の非ゴール)

- ❌ マルチテナント化 (`tenantId` 全付け) — 内部システムだから不要
- ❌ UI 実装 (v1.5 で別 PR)
- ❌ 本番 e-Sign / 会計 API 接続 (mock のみ)
- ❌ MFA / SSO (v1.8)
- ❌ 在留期限の自動メール送信 (v1.6)
- ❌ KPI ダッシュボードの新指標 (v2.0)

---

## 8. ファイル配置 (v1.4)

```
prisma/
  schema.prisma                   ← JobOrder / Contract / Invoice / Placement / DispatchLedger / MyNumberRecord / MyNumberAccessLog / AuditEvent を追加
  migrations/
    YYYYMMDDHHMMSS_phase6_foundation/ ← 自動生成

src/lib/
  schemas/
    job-order.ts                  ← Zod
    contract.ts
    invoice.ts
    placement.ts
    dispatch-ledger.ts
    my-number.ts
  matching/
    score.ts                      ← 加重マッチング
  billing/
    calc.ts                       ← 手数料 / 返金規定
    invoice-number.ts             ← 採番ロジック
  compliance/
    anti-teishoku.ts              ← 抵触日計算
    my-number.ts                  ← AES-GCM 暗号化
  audit/
    event.ts                      ← AuditEvent 書き込み + ハッシュチェーン
  integrations/
    e-sign/
      types.ts
      mock.ts
    accounting/
      types.ts
      mock.ts

tests/unit/
  matching-score.test.ts
  billing-calc.test.ts
  anti-teishoku.test.ts
  my-number-crypto.test.ts
  audit-chain.test.ts

docs/
  internal-system-spec.md         ← 本書
```

---

## 9. 既存仕様との互換性

- 既存 `AuditLog` モデル → 残置。新規記録は `AuditEvent` に集約 (`recordAuditEvent` 経由)
- 既存 `FaxSheet` モデル → 残置。将来 `JobOrder` 紐付けに拡張する場合は v1.5 で `jobOrderId?` 追加
- 既存 `Facility` の `category` → 残置。`JobOrder` は同じ `FacilityCategory` を継承利用
- 既存 `Applicant.desiredCategories` → そのまま。マッチング軸の 1 つとして使う

---

## 10. 完了の定義 (v1.4)

- [ ] 本書 (`docs/internal-system-spec.md`) コミット
- [ ] Prisma schema 9 モデル + 6 enum 追加
- [ ] `prisma migrate dev --name phase6_foundation` 成功
- [ ] Zod schemas 6 ファイル追加
- [ ] lib helpers (matching / billing / compliance / audit / integrations) 全実装
- [ ] seed が冪等で動き、サンプル Placement / Invoice / DispatchLedger / Contract / JobOrder を作る
- [ ] 新規 unit テスト 5 本 (matching / billing / anti-teishoku / my-number / audit-chain) 全 pass
- [ ] 既存 258 tests 全 pass
- [ ] `pnpm lint && pnpm typecheck && pnpm build` 全 0 warnings / 0 errors
- [ ] CHANGELOG.md に v1.4 セクション追加
