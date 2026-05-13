import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "staff_admin", role: "ADMIN", email: "admin@x" } })),
}));

vi.mock("@/lib/db", () => {
  const state = {
    existingDiagnosis: null as null | { id: string },
    upserts: [] as Array<{ create: Record<string, unknown> }>,
    statusUpdates: [] as unknown[],
    auditLogs: [] as unknown[],
  };
  return {
    prisma: {
      applicant: {
        findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === "missing") return null;
          return {
            id: where.id,
            lastName: "佐藤",
            firstName: "健",
            birthDate: new Date("1985-09-20"),
            gender: "MALE",
            desiredCategories: ["HOMEVISIT_NURSE"],
            status: "RECEIVED",
            deletedAt: null,
            qualifications: [{ name: "看護師" }],
          };
        }),
        update: vi.fn(async ({ data }: { data: unknown }) => {
          state.statusUpdates.push(data);
          return data;
        }),
      },
      diagnosis: {
        findFirst: vi.fn(async () => state.existingDiagnosis),
        upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => {
          state.upserts.push({ create });
          return { id: `d_${(create as { category: string }).category}`, ...create };
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          state.auditLogs.push(data);
          return { id: "audit_x", ...(data as object) };
        }),
      },
      __state: state,
    },
  };
});

import { __resetAiClientForTests } from "@/lib/ai/client";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/diagnosis/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/diagnosis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/diagnosis", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
    const s = (prisma as unknown as { __state: { existingDiagnosis: unknown; upserts: unknown[]; statusUpdates: unknown[]; auditLogs: unknown[] } }).__state;
    s.existingDiagnosis = null;
    s.upserts.length = 0;
    s.statusUpdates.length = 0;
    s.auditLogs.length = 0;
  });

  it("成功時 201 で pdfUrl を返し、Diagnosis を 11 行 upsert", async () => {
    const res = await POST(jsonRequest({ applicantId: "app_ok" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; pdfUrl: string; results: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.pdfUrl).toBe("/api/diagnosis/app_ok/pdf");
    expect(body.results).toHaveLength(11);
    const s = (prisma as unknown as { __state: { upserts: unknown[]; auditLogs: unknown[] } }).__state;
    expect(s.upserts).toHaveLength(11);
    expect(s.auditLogs).toHaveLength(1);
  });

  it("applicantId 不正 → 400", async () => {
    const res = await POST(jsonRequest({ applicantId: "" }));
    expect(res.status).toBe(400);
  });

  it("既存診断あり + regenerate なし → 409", async () => {
    const s = (prisma as unknown as { __state: { existingDiagnosis: unknown } }).__state;
    s.existingDiagnosis = { id: "d_existing" };
    const res = await POST(jsonRequest({ applicantId: "app_ok" }));
    expect(res.status).toBe(409);
  });

  it("既存診断あり + regenerate:true → 201", async () => {
    const s = (prisma as unknown as { __state: { existingDiagnosis: unknown } }).__state;
    s.existingDiagnosis = { id: "d_existing" };
    const res = await POST(jsonRequest({ applicantId: "app_ok", regenerate: true }));
    expect(res.status).toBe(201);
  });

  it("missing applicant → 404", async () => {
    const res = await POST(jsonRequest({ applicantId: "missing" }));
    expect(res.status).toBe(404);
  });

  it("未認証 → 401", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await POST(jsonRequest({ applicantId: "app_ok" }));
    expect(res.status).toBe(401);
  });
});
