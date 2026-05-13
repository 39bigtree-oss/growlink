import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "interview-token-test";
const state = {
  token: null as null | {
    id: string;
    interviewId: string;
    token: string;
    expiresAt: Date;
    revokedAt: Date | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  },
  interview: null as null | { id: string; status: string },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    interviewToken: {
      findUnique: vi.fn(async (args: { where: { token: string } }) =>
        args.where.token === TOKEN ? state.token : null,
      ),
      update: vi.fn(async () => state.token),
    },
    interview: {
      findUnique: vi.fn(async () => state.interview),
    },
  },
}));

vi.mock("@/lib/interview/service", () => ({
  startInterview: vi.fn(async (id: string) => ({ id, status: "in_progress" })),
  generateNextQuestion: vi.fn(async () => ({
    question: "How are you?",
    intent: "icebreak",
    shouldClose: false,
    turn: { id: "t1", turnIndex: 0, role: "ai", text: "How are you?" },
    audioKey: "tts/x.mp3",
  })),
  submitAnswer: vi.fn(async () => ({ id: "t2", turnIndex: 1, role: "applicant", text: "fine" })),
}));

import { POST } from "@/app/api/interview/[token]/turn/route";

function req(body: unknown): Request {
  return new Request(`http://localhost/api/interview/${TOKEN}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview/[token]/turn", () => {
  beforeEach(() => {
    state.token = {
      id: "tok1",
      interviewId: "iv1",
      token: TOKEN,
      expiresAt: new Date(Date.now() + 86400_000),
      revokedAt: null,
      lastSeenAt: null,
      createdAt: new Date(),
    };
    state.interview = { id: "iv1", status: "scheduled" };
    vi.clearAllMocks();
  });

  it("start で in_progress に遷移", async () => {
    const res = await POST(req({ action: "start" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("ask で AI 質問を返す", async () => {
    const res = await POST(req({ action: "ask" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { question: string; shouldClose: boolean };
    expect(body.question.length).toBeGreaterThan(0);
    expect(body.shouldClose).toBe(false);
  });

  it("answer で求職者ターンを記録", async () => {
    const res = await POST(req({ action: "answer", text: "ok" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(201);
  });

  it("不正トークンは 404", async () => {
    const res = await POST(req({ action: "start" }), { params: Promise.resolve({ token: "wrong" }) });
    expect(res.status).toBe(404);
  });

  it("期限切れトークンは 410", async () => {
    state.token!.expiresAt = new Date(Date.now() - 1000);
    const res = await POST(req({ action: "start" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });

  it("Interview が completed なら 409", async () => {
    state.interview = { id: "iv1", status: "completed" };
    const res = await POST(req({ action: "start" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(409);
  });

  it("answer with no text は 400", async () => {
    const res = await POST(req({ action: "answer" }), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(400);
  });
});
