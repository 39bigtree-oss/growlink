import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { importFacilitiesCsv } from "@/lib/facilities/csv-import";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 施設マスタ CSV 一括インポート。multipart/form-data で `file` を受ける。 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "facilities:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_FORM" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
  }
  const text = await file.text();
  const summary = await importFacilitiesCsv(text);

  await recordAuditLog({
    staffId: session.user.id,
    action: "facilities.imported",
    payload: {
      total: summary.totalRows,
      created: summary.created,
      updated: summary.updated,
      failed: summary.failed,
    },
  });

  return NextResponse.json({ ok: true, ...summary }, { status: 200 });
}
