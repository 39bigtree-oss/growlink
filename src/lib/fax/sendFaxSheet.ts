import "server-only";

import { prisma } from "@/lib/db";

/**
 * Phase 4: FAX 送信を 1 件分実行する (mock)。
 * 同期 API (Phase 1-7 の `/api/fax-sheets/[id]/send`) の中身を共通化したので、
 * ジョブ経由でも同じ振る舞いになる。実 InterFAX 連携は Phase 5 以降で差し替え予定。
 */
export async function sendFaxSheet(
  faxSheetId: string,
  channel: "FAX" | "EMAIL" | "PRINT" | string,
): Promise<{ ok: boolean; status: string }> {
  const sheet = await prisma.faxSheet.findUnique({
    where: { id: faxSheetId },
    include: { facility: { select: { name: true, fax: true } } },
  });
  if (!sheet) throw new Error(`FaxSheet not found: ${faxSheetId}`);
  if (sheet.status === "SENT") return { ok: true, status: "SENT" };

  const provider = process.env.FAX_PROVIDER ?? "mock";
  if (provider === "mock") {
    console.log(
      "[MOCK] FAX を送信しました: ファイル=%s, 宛先=%s (%s), channel=%s, sheetId=%s",
      sheet.pdfKey,
      sheet.facility.name,
      sheet.facility.fax ?? "未登録",
      channel,
      sheet.id,
    );
  }
  const updated = await prisma.faxSheet.update({
    where: { id: faxSheetId },
    data: { status: "SENT", sentAt: new Date(), channel },
  });
  return { ok: true, status: updated.status };
}
