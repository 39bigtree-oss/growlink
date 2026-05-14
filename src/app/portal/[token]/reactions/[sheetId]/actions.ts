"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/event";
import { prisma } from "@/lib/db";
import { verifyPortalTokenWithDb } from "@/lib/portal/token";

export type PortalReactionState = { ok: boolean; message?: string };

export async function submitPortalReactionAction(
  token: string,
  sheetId: string,
  _prev: PortalReactionState,
  formData: FormData,
): Promise<PortalReactionState> {
  const verified = await verifyPortalTokenWithDb(token);
  if (!verified.ok) return { ok: false, message: "トークンが無効です" };

  const sheet = await prisma.faxSheet.findFirst({
    where: { id: sheetId, facilityId: verified.facilityId },
    select: { id: true, facilityId: true, reaction: { select: { id: true } } },
  });
  if (!sheet) return { ok: false, message: "対象が見つかりません" };
  if (sheet.reaction) return { ok: false, message: "既に反応をいただいています" };

  const interested = formData.get("interested") === "yes";
  const comment = String(formData.get("comment") ?? "").slice(0, 1000) || null;

  await prisma.faxReaction.create({
    data: {
      faxSheetId: sheet.id,
      facilityId: sheet.facilityId,
      interested,
      comment,
    },
  });
  await recordAuditEvent(prisma, {
    actorStaffId: null,
    actorEmail: "facility-portal",
    action: "fax.reaction.facility_submit",
    entityType: "FaxSheet",
    entityId: sheet.id,
    after: { interested, hasComment: !!comment, via: "portal" },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/portal/${token}/reactions/${sheetId}`);
  return { ok: true, message: "ご反応を記録しました。ありがとうございます。" };
}
