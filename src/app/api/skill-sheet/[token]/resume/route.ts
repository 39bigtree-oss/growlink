import { NextResponse } from "next/server";

import { ResumeError, processResume, storeResume } from "@/lib/skill-sheet/processResume";
import { consumeSkillSheetToken } from "@/lib/skill-sheet/token";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

/** 履歴書アップロード → OCR → AI 構造化 → SkillSheet マージ。同期処理 (Phase 3 でジョブ化)。 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const auth = await consumeSkillSheetToken(token);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
  }
  if (auth.status !== "ok") {
    return NextResponse.json({ ok: false, error: auth.status }, { status: 410 });
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
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "TOO_LARGE" }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const upload = await storeResume({
      applicantId: auth.token.applicantId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });
    const result = await processResume(upload.id);
    return NextResponse.json(
      {
        ok: true,
        uploadId: result.upload.id,
        status: result.upload.status,
        parsedSnippet: result.parsedSnippet,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ResumeError) {
      const code = err.code;
      const status = code === "UNSUPPORTED_TYPE" ? 415 : code === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ ok: false, error: code, message: err.message }, { status });
    }
    console.error("[skill-sheet:resume] processing failed", err);
    return NextResponse.json(
      { ok: false, error: "PROCESSING_FAILED", message: (err as Error).message },
      { status: 500 },
    );
  }
}
