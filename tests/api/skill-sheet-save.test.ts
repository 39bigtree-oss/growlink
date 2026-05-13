import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "test-token-xxx";

const state = {
  tokenRecord: null as null | {
    id: string;
    applicantId: string;
    token: string;
    expiresAt: Date;
    revokedAt: Date | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  },
  skillSheet: null as null | { applicantId: string; submittedAt: Date | null },
  applicantStatus: "RECEIVED" as string,
  upserts: 0,
  statusUpdates: 0,
};

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      skillSheetToken: {
        findUnique: vi.fn(async (args: { where: { token: string } }) => {
          return args.where.token === TOKEN ? state.tokenRecord : null;
        }),
        update: vi.fn(async () => state.tokenRecord),
      },
      skillSheet: {
        findUnique: vi.fn(async () => state.skillSheet),
        upsert: vi.fn(async (args: { create?: unknown; update?: unknown }) => {
          state.upserts += 1;
          const data = (args.create ?? args.update) as Record<string, unknown>;
          return {
            applicantId: state.tokenRecord?.applicantId ?? "app",
            savedAt: new Date(),
            ...data,
          };
        }),
      },
      applicant: {
        updateMany: vi.fn(async () => {
          state.statusUpdates += 1;
          return { count: 1 };
        }),
      },
    },
  };
});

import { POST } from "@/app/api/skill-sheet/[token]/save/route";

function req(body: unknown): Request {
  return new Request(`http://localhost/api/skill-sheet/${TOKEN}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/skill-sheet/[token]/save", () => {
  beforeEach(() => {
    state.tokenRecord = {
      id: "tok1",
      applicantId: "app1",
      token: TOKEN,
      expiresAt: new Date(Date.now() + 86400_000),
      revokedAt: null,
      lastSeenAt: null,
      createdAt: new Date(),
    };
    state.skillSheet = null;
    state.applicantStatus = "RECEIVED";
    state.upserts = 0;
    state.statusUpdates = 0;
    vi.clearAllMocks();
  });

  it("有効トークンで本人入力を保存し、status を SKILL_SHEET_INPROGRESS に進める", async () => {
    const res = await POST(req({ educations: [], careers: [], skills: [], desired: {}, selfPR: "頑張ります" }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    expect(state.upserts).toBe(1);
    expect(state.statusUpdates).toBe(1);
  });

  it("不正トークンは 404", async () => {
    const res = await POST(req({}), { params: Promise.resolve({ token: "wrong" }) });
    expect(res.status).toBe(404);
  });

  it("期限切れトークンは 410", async () => {
    state.tokenRecord!.expiresAt = new Date(Date.now() - 1000);
    const res = await POST(req({}), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });

  it("revoke 済みトークンは 410", async () => {
    state.tokenRecord!.revokedAt = new Date();
    const res = await POST(req({}), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });

  it("既に submittedAt が入っていれば 409 ALREADY_SUBMITTED", async () => {
    state.skillSheet = { applicantId: "app1", submittedAt: new Date() };
    const res = await POST(req({}), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ALREADY_SUBMITTED");
  });

  it("Zod 検証エラーは 400", async () => {
    const res = await POST(
      req({ careers: [{ company: "x", role: "y", from: "2020/04", to: "", achievements: "" }] }),
      { params: Promise.resolve({ token: TOKEN }) },
    );
    expect(res.status).toBe(400);
  });
});
