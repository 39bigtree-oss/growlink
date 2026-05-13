import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { readObject } from "@/lib/storage/local";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "fax:read")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const sheet = await prisma.faxSheet.findUnique({
    where: { id },
    select: { id: true, pdfKey: true },
  });
  if (!sheet) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  const buf = await readObject(sheet.pdfKey);
  if (!buf) {
    return NextResponse.json({ ok: false, error: "PDF_MISSING" }, { status: 410 });
  }
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fax-sheet-${sheet.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
