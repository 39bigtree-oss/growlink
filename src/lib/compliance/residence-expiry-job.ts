import "server-only";

import { sendEmail } from "@/lib/email/client";
import { buildResidenceExpiryAlertEmail } from "@/lib/email/templates/residence-expiry-alert";
import { prisma } from "@/lib/db";

/**
 * 在留期限アラートジョブ。日次で BullMQ から起動されることを想定。
 *
 * 在留資格 (ResidenceStatus) の expireAt が **90 / 30 / 7 日前** のレコードを拾い、
 * 担当営業 (STAFF_NOTIFICATION_EMAIL) にメールで通知する。
 *
 * - `alertSentAt` が同じ window 内で既に押されているレコードはスキップ (重複送信防止)
 * - 氏名は本文に含めない (PII 最小化)。代わりに「申込 ID + イニシャル」を渡す
 *
 * Returns: 送信件数 (アラート対象だがメール送信に失敗した分は除く)
 */
export async function runResidenceExpiryAlertJob(now: Date = new Date()): Promise<{
  scanned: number;
  sent: number;
  windows: Array<{ days: number; count: number }>;
}> {
  const WINDOWS = [90, 30, 7] as const;

  const records = await prisma.residenceStatus.findMany({
    where: {
      expireAt: {
        not: null,
        gte: now,
        lte: new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      applicant: {
        select: { id: true, lastName: true, firstName: true, deletedAt: true },
      },
    },
  });
  const active = records.filter((r) => !r.applicant.deletedAt);

  let sent = 0;
  const windowCounts: Record<number, number> = { 90: 0, 30: 0, 7: 0 };

  for (const r of active) {
    if (!r.expireAt) continue;
    const remainingDays = Math.floor(
      (r.expireAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const window = WINDOWS.find((w) => remainingDays <= w && remainingDays > (w === 7 ? 0 : WINDOWS[WINDOWS.indexOf(w) + 1] ?? 0));
    if (!window) continue;

    // 既に同 window 内で送信済 (alertSentAt が window 範囲外でない) ならスキップ
    if (r.alertSentAt) {
      const daysSinceLast = Math.floor(
        (now.getTime() - r.alertSentAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      // 90日 window → 60日空けないと再送しない、30 day → 23 日、7 day → 1 日
      const cooldown = window === 90 ? 60 : window === 30 ? 23 : 1;
      if (daysSinceLast < cooldown) continue;
    }

    const initials = `${r.applicant.lastName.slice(0, 1)}.${r.applicant.firstName.slice(0, 1)}.`;
    const msg = buildResidenceExpiryAlertEmail({
      applicantId: r.applicant.id,
      applicantInitials: initials,
      visaType: r.visaType,
      expireAt: r.expireAt,
      daysUntilExpiry: remainingDays,
    });
    const res = await sendEmail(msg);
    if (res.ok) {
      await prisma.residenceStatus.update({
        where: { id: r.id },
        data: { alertSentAt: now },
      });
      sent += 1;
      windowCounts[window] += 1;
    }
  }

  return {
    scanned: active.length,
    sent,
    windows: WINDOWS.map((w) => ({ days: w, count: windowCounts[w] ?? 0 })),
  };
}
