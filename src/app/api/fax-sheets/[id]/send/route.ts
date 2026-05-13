import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";

const bodySchema = z.object({
  channel: z.enum(["FAX", "EMAIL", "PRINT"]).default("FAX"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "fax:send")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const sheet = await prisma.faxSheet.findUnique({
    where: { id },
    include: { facility: { select: { name: true, fax: true } } },
  });
  if (!sheet) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (sheet.status === "SENT") {
    return NextResponse.json(
      { ok: false, error: "ALREADY_SENT" },
      { status: 409 },
    );
  }

  // Phase 1-7 はモック。実 FAX/メール送信は Phase 4 以降。
  const provider = process.env.FAX_PROVIDER ?? "mock";
  if (provider === "mock") {
    console.log(
      "[MOCK] FAX を送信しました: ファイル=%s, 宛先=%s (%s), channel=%s, sheetId=%s",
      sheet.pdfKey,
      sheet.facility.name,
      sheet.facility.fax ?? "未登録",
      parsed.data.channel,
      sheet.id,
    );
  }

  const updated = await prisma.faxSheet.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      channel: parsed.data.channel,
    },
  });

  await recordAuditLog({
    staffId: session.user.id,
    action: "fax_sheet.send",
    target: id,
    payload: { channel: parsed.data.channel, provider },
  });

  return NextResponse.json(
    {
      ok: true,
      id: updated.id,
      status: updated.status,
      sentAt: updated.sentAt,
      channel: updated.channel,
    },
    { status: 200 },
  );
}
