import { StaffRole } from "@prisma/client";

/**
 * 管理画面のアクション粒度の権限定義。spec.md §3.6 の権限マトリクスに対応。
 *
 *  - applicants:read   申込一覧・詳細の閲覧
 *  - applicants:write  申込のステータス遷移・編集
 *  - applicants:approve 承認 (sales も「送信のみ」で可)
 *  - facilities:read   施設マスタの閲覧
 *  - facilities:write  施設マスタの作成・編集
 *  - fax:send          FAX 送信票の送信実行 (Phase 1-7)
 *  - settings:read     設定画面の閲覧 (AI 重み調整など)
 *  - settings:write    設定変更
 */
export type AdminCapability =
  | "applicants:read"
  | "applicants:write"
  | "applicants:approve"
  | "facilities:read"
  | "facilities:write"
  | "fax:read"
  | "fax:create"
  | "fax:send"
  | "interviews:read"
  | "interviews:write"
  | "settings:read"
  | "settings:write";

const ROLE_CAPABILITIES: Record<StaffRole, ReadonlySet<AdminCapability>> = {
  ADMIN: new Set([
    "applicants:read",
    "applicants:write",
    "applicants:approve",
    "facilities:read",
    "facilities:write",
    "fax:read",
    "fax:create",
    "fax:send",
    "interviews:read",
    "interviews:write",
    "settings:read",
    "settings:write",
  ]),
  CONSULTANT: new Set([
    "applicants:read",
    "applicants:write",
    "applicants:approve",
    "facilities:read",
    "fax:read",
    "fax:create",
    "interviews:read",
    "interviews:write",
  ]),
  // 営業: 申込一覧・詳細を見られて、FAX 作成・送信を担当。面接は閲覧のみ。
  SALES: new Set([
    "applicants:read",
    "facilities:read",
    "fax:read",
    "fax:create",
    "fax:send",
    "interviews:read",
  ]),
  VIEWER: new Set(["applicants:read", "facilities:read", "fax:read", "interviews:read"]),
};

export function hasCapability(role: StaffRole | string | null | undefined, cap: AdminCapability): boolean {
  if (!role) return false;
  const set = ROLE_CAPABILITIES[role as StaffRole];
  if (!set) return false;
  return set.has(cap);
}

export function requireCapability(
  role: StaffRole | string | null | undefined,
  cap: AdminCapability,
): void {
  if (!hasCapability(role, cap)) {
    throw new ForbiddenError(`role=${role ?? "unknown"} lacks capability ${cap}`);
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const ALL_ROLES: StaffRole[] = ["ADMIN", "CONSULTANT", "SALES", "VIEWER"];
