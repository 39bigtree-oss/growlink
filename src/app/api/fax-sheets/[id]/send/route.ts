import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { sendFaxSheet } from "@/lib/fax/sendFaxSheet";
import { enqueueJob } from "@/lib/jobs/registry";
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

  const provider = process.env.FAX_PROVIDER ?? "mock";
  const url = new URL(req.url);
  const isAsync = url.searchParams.get("async") === "1";

  if (isAsync) {
    const { jobId } = await enqueueJob(
      "fax",
      "fax-sheet.send",
      { faxSheetId: id, channel: parsed.data.channel },
      { target: id, dedupeKey: `fax-send-${id}` },
    );
    await recordAuditLog({
      staffId: session.user.id,
      action: "fax_sheet.send_queued",
      target: id,
      payload: { jobId, channel: parsed.data.channel, provider },
    });
    return NextResponse.json({ ok: true, async: true, jobId, id }, { status: 202 });
  }

  await sendFaxSheet(id, parsed.data.channel);
  await recordAuditLog({
    staffId: session.user.id,
    action: "fax_sheet.send",
    target: id,
    payload: { channel: parsed.data.channel, provider },
  });

  const refreshed = await prisma.faxSheet.findUnique({ where: { id } });
  return NextResponse.json(
    {
      ok: true,
      id,
      status: refreshed?.status,
      sentAt: refreshed?.sentAt,
      channel: refreshed?.channel,
    },
    { status: 200 },
  );
}
