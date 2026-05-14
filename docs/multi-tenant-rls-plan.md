# マルチテナント化 + Row Level Security 移行計画

> v1.6 ドラフト · 2026-05-14 · 単一テナント前提を残しつつ、将来の多事業所運用を見据えた準備

## 現状の前提 (v1.6 時点)

- Tsumugi は **単一の派遣紹介会社が内部で使う SaaS** として設計
- スキーマ全モデルに `tenantId` を **付けていない** (`docs/internal-system-spec.md` 第 0 章「設計哲学 #2」)
- Auth.js は `User` 単位のセッション、`Staff.role` で RBAC

## なぜ将来 RLS が必要になりうるか

1. **複数事業所運用** — グループ会社や複数支店で「データを混ぜたくないが、システムは 1 個」のニーズ
2. **派遣業法の事業所単位管理** — 抵触日や派遣台帳は **事業所単位** で管理することが法令上要求される
3. **クライアント (施設) ごとのデータ分離** — 大手医療法人グループに SaaS 提供する場合
4. **アプリケーション層のバグでテナント越境が起きないように Postgres レベルで防御**

## 移行ステップ (将来発動する場合)

### Step 0: tenantId カラムを追加 (1 マイグレーション)

すべての主要モデルに `tenantId String` (NOT NULL) を追加。default は `'default'` で既存データを移行。

```sql
ALTER TABLE "Applicant" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Facility"  ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "JobOrder"  ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Contract"  ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Placement" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Invoice"   ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "DispatchLedger"      ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "MyNumberRecord"      ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "MyNumberAccessLog"   ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AuditEvent"          ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
-- 各テーブルにインデックスも追加
CREATE INDEX "Applicant_tenantId_idx" ON "Applicant"("tenantId");
-- (他テーブル同様)
```

Staff にも `tenantId` を追加し、ログイン後にセッションへ載せる。

### Step 1: アプリ層で tenant context を必須化

```ts
// src/lib/tenant/context.ts
export type TenantContext = { tenantId: string; staffId: string };

export async function withTenantContext<T>(
  ctx: TenantContext,
  fn: () => Promise<T>,
): Promise<T> {
  return AsyncLocalStorage.run(currentContext, ctx, fn);
}
```

API Route / Server Action の最初で `withTenantContext` を必ず呼ぶ規約を作る。
Repository 層は `tenantId` を必ず where に入れる。

### Step 2: Postgres RLS を有効化

```sql
ALTER TABLE "Applicant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_applicant" ON "Applicant"
  USING ("tenantId" = current_setting('app.tenant_id'));
-- (他テーブル同様)
```

Prisma クエリ実行前に `SET LOCAL app.tenant_id = 'xxx'` を発行する middleware を仕込む:

```ts
prisma.$use(async (params, next) => {
  if (params.action !== "raw") {
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.tenant_id = '${currentTenant()}'`
    );
  }
  return next(params);
});
```

これでアプリ層でうっかり `tenantId` を where に入れ忘れても、Postgres が物理的に
他テナントのレコードを返さなくなる (Defense in depth)。

### Step 3: 監査ログのテナント分離

`AuditEvent` も `tenantId` で分割。verifyChain は **テナント別チェーン** に変更する必要あり
(ハッシュチェーンを 1 本通すと、別テナントの operation が前 hash になってしまい
情報リークになる)。

### Step 4: テスト

- `tests/integration/rls.test.ts` で「テナント A のセッションがテナント B のレコードを取れないこと」を検証
- すべての既存 unit / integration テストを 2 テナント環境で再実行

## v1.6 で同梱する準備

- 本ドキュメント (将来発動するときの **ランブック**)
- `src/lib/tenant/types.ts` に空の型定義スタブ (実体はゼロ、将来 ALS を入れる枠だけ)
- RBAC 文書化: 「マルチテナント化したら `Staff.tenantId` の検証も `requireAdminSession` に必須」
- E2E テストフィクスチャを **マルチテナント to single tenant** で書き換えしやすい構造にする

## 結論 — 内部システム前提では RLS を **今は導入しない**

`docs/internal-system-spec.md` の設計哲学 #2 で明言したとおり、内部システムでは
マルチテナントは不要。RLS を導入すると:

- すべての mutation で tenant context を必須にする手間が発生
- 監査チェーンが複雑化 (テナント別チェーン管理)
- Prisma の middleware 設定が必要 (現状 raw SQL を避けている)

得られる便益 (テナント越境の物理防御) は **複数事業所の SaaS 提供を始めるとき** に
初めて必要になる。本ドキュメントを **発動条件** として、必要なときに 1 スプリント
かけてマイグレーションする。

## 発動条件 (このドキュメントが現実化するタイミング)

- グループ会社 2 社目を Tsumugi に乗せたいとき
- 外部の派遣会社に Tsumugi を SaaS 提供することが決まったとき
- 監査要件で物理データ分離が法令上必須になったとき

それまでは「内部システム = 単一テナント」を貫く。
