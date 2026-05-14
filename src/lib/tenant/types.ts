/**
 * テナントコンテキスト型のスタブ。
 *
 * v1.6 では内部システム単一テナント前提のため、実体は使われない。
 * docs/multi-tenant-rls-plan.md の発動条件を満たしたときに、
 * AsyncLocalStorage + Prisma middleware と組み合わせて活性化する。
 *
 * 当面はマルチテナント化を見据えた型定義のみ用意し、コードベースを
 * "tenantId をいつでも乗せられる" 形にしておく。
 */
export type TenantContext = {
  tenantId: string;
  staffId: string;
};

/** 単一テナント運用時のデフォルト値。tenantId カラム未追加までは未使用。 */
export const DEFAULT_TENANT_ID = "default" as const;

/**
 * 将来の実装スタブ。
 * 実体は v1.x で AsyncLocalStorage + Prisma middleware に置換される予定。
 */
export function getCurrentTenant(): TenantContext {
  return { tenantId: DEFAULT_TENANT_ID, staffId: "system" };
}
