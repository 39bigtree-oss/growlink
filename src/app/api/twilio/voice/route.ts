import { NextResponse } from "next/server";

import { generateNextQuestion, startInterview } from "@/lib/interview/service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Twilio が音声通話で叩く Webhook。
 * - 初回 (Gather なし) は AI 第一問を <Say> + <Gather> で返す
 * - Gather 結果 (SpeechResult) を InterviewTurn (role=applicant) として保存し、次の質問を <Say> + <Gather>
 * - 5 ターン完了 or shouldClose で <Hangup>
 *
 * Phase 3 のモックでも TwiML を返す。ngrok 経由で実 Twilio が動かすことも可能。
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const interviewId = url.searchParams.get("interviewId");
  if (!interviewId) {
    return new NextResponse(errorTwiml("interviewId is missing"), {
      headers: { "Content-Type": "text/xml" },
      status: 400,
    });
  }
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) {
    return new NextResponse(errorTwiml("interview not found"), {
      headers: { "Content-Type": "text/xml" },
      status: 404,
    });
  }

  // 通話開始時点で in_progress に
  if (interview.status !== "in_progress" && interview.status !== "completed") {
    await startInterview(interviewId, "voice");
  }

  // 直前の応答 (Speech) を保存。
  const form = await safeFormData(req);
  const speech = form?.get("SpeechResult");
  if (typeof speech === "string" && speech.trim().length > 0) {
    // 直接 InterviewTurn を作るのではなく、submitAnswer (text 経路) を使うのが正攻法だが、
    // ここでは「TwiML フローはモック」なので最小限の保存に留める。
    await prisma.interviewTurn.create({
      data: {
        interviewId,
        turnIndex: interview.turnCount,
        role: "applicant",
        text: speech.slice(0, 2000),
        provider: "twilio:speech",
      },
    });
  }

  try {
    const q = await generateNextQuestion(interviewId);
    if (q.shouldClose) {
      return new NextResponse(closingTwiml(q.question), {
        headers: { "Content-Type": "text/xml" },
      });
    }
    return new NextResponse(askTwiml(q.question, interviewId), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    return new NextResponse(errorTwiml((err as Error).message), {
      headers: { "Content-Type": "text/xml" },
      status: 500,
    });
  }
}

async function safeFormData(req: Request): Promise<FormData | null> {
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

function askTwiml(question: string, interviewId: string): string {
  const next = `/api/twilio/voice?interviewId=${encodeURIComponent(interviewId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">${escapeXml(question)}</Say>
  <Gather input="speech" language="ja-JP" speechTimeout="auto" action="${next}" method="POST">
    <Say language="ja-JP">それではお話しください。</Say>
  </Gather>
  <Redirect>${next}</Redirect>
</Response>`;
}

function closingTwiml(question: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">${escapeXml(question)}</Say>
  <Pause length="1" />
  <Say language="ja-JP">本日は AI 面接にご協力いただきありがとうございました。失礼いたします。</Say>
  <Hangup />
</Response>`;
}

function errorTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">エラーが発生しました。担当者にお問い合わせください。</Say>
  <Hangup />
  <!-- ${escapeXml(message)} -->
</Response>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
