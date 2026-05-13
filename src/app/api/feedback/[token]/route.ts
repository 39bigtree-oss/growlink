import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { verifyReactionToken } from "@/lib/fax/reaction-token";
import { ipKey, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  interested: z.boolean(),
  comment: z.string().max(2000).optional(),
});

/**
 * 署名付きトークンで FAX 反応を受け付ける公開エンドポイント。
 * Phase 1-7 の `/api/fax-sheets/[id]/reaction` (生の id) は内部用として維持し、
 * こちらは「FAX に印刷された QR コード / URL から踏まれるルート」として運用。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  // 公開エンドポイントなので、同一 IP からのスパムを 30 件 / 1h で制限。
  const limit = rateLimit(ipKey(req, "feedback"), 30, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }
  const id = verifyReactionToken(token);
  if (!id) {
    return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
  }

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
  if (!sheet) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

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
  return NextResponse.json({ ok: true, id: reaction.id, interested: reaction.interested }, { status: 201 });
}
