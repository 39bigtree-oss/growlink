import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  interested: z.boolean(),
  comment: z.string().max(2000).optional(),
});

/**
 * 施設からの返信受付。Phase 4 で完成する想定だが、Phase 1-7 で雛形だけ用意する。
 * 認証なしの公開エンドポイントだが、FaxSheet が存在する場合のみ受理する。
 * 同じ FaxSheet には 1 件しか反応を残さない (FaxReaction.faxSheetId は unique)。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
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
    select: { id: true, facilityId: true },
  });
  if (!sheet) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const reaction = await prisma.faxReaction.upsert({
    where: { faxSheetId: id },
    create: {
      faxSheetId: id,
      facilityId: sheet.facilityId,
      interested: parsed.data.interested,
      comment: parsed.data.comment,
    },
    update: {
      interested: parsed.data.interested,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json(
    { ok: true, id: reaction.id, interested: reaction.interested },
    { status: 201 },
  );
}
