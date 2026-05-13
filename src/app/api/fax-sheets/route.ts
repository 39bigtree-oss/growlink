import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { createFaxSheetsBatch } from "@/lib/fax/createFaxSheet";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.union([
  z.object({
    applicantId: z.string().min(1),
    facilityId: z.string().min(1),
  }),
  z.object({
    applicantId: z.string().min(1),
    facilityIds: z.array(z.string().min(1)).min(1).max(100),
  }),
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "fax:create")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
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

  const applicantId = parsed.data.applicantId;
  const facilityIds =
    "facilityId" in parsed.data ? [parsed.data.facilityId] : parsed.data.facilityIds;

  const { created, errors } = await createFaxSheetsBatch(applicantId, facilityIds);

  await recordAuditLog({
    staffId: session.user.id,
    action: "fax_sheet.create",
    target: applicantId,
    payload: {
      count: created.length,
      errorCount: errors.length,
      facilityIds,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      created: created.map((c) => ({
        id: c.faxSheet.id,
        applicantId: c.faxSheet.applicantId,
        facilityId: c.faxSheet.facilityId,
        pdfKey: c.pdfKey,
        status: c.faxSheet.status,
        pdfUrl: `/api/fax-sheets/${c.faxSheet.id}/pdf`,
      })),
      errors,
    },
    { status: created.length > 0 ? 201 : 207 },
  );
}
