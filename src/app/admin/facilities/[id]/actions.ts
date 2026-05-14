"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { issuePortalToken } from "@/lib/portal/token";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export type IssuePortalTokenState = {
  ok: boolean;
  url?: string;
  message?: string;
};

export async function issuePortalTokenAction(
  facilityId: string,
): Promise<IssuePortalTokenState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "facilities:write")) {
    return { ok: false, message: "発行権限がありません" };
  }
  try {
    const { url, recordId } = await issuePortalToken({
      facilityId,
      expiresInDays: 90,
      createdByStaffId: session.user.id,
    });
    await Promise.all([
      recordAuditLog({
        staffId: session.user.id,
        action: "facility.portal_token.issued",
        target: facilityId,
        payload: { recordId },
      }),
      recordAuditEvent(prisma, {
        actorStaffId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: "facility.portal_token.issued",
        entityType: "FacilityPortalToken",
        entityId: recordId,
        after: { facilityId, expiresInDays: 90 },
      }),
    ]);
    revalidatePath(`/admin/facilities/${facilityId}`);
    return { ok: true, url };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
