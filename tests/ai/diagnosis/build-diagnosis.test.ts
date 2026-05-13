import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => {
  const upserts: Array<{ where: unknown; create: Record<string, unknown> }> = [];
  const applicantUpdates: Array<{ where: unknown; data: unknown }> = [];
  return {
    prisma: {
      applicant: {
        findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === "missing") return null;
          return {
            id: where.id,
            lastName: "山田",
            firstName: "花子",
            birthDate: new Date("1990-04-12"),
            gender: "FEMALE",
            desiredCategories: ["HOMEVISIT_NURSE"],
            status: "RECEIVED",
            deletedAt: null,
            qualifications: [{ name: "看護師" }],
          };
        }),
        update: vi.fn(async ({ where, data }: { where: unknown; data: unknown }) => {
          applicantUpdates.push({ where, data });
          return data;
        }),
      },
      diagnosis: {
        upsert: vi.fn(async ({ where, create }: { where: unknown; create: Record<string, unknown> }) => {
          upserts.push({ where, create });
          return {
            id: `diag_${(create as { category: string }).category}`,
            ...create,
            generatedAt: new Date("2026-05-13T00:00:00Z"),
          };
        }),
      },
      __testState: { upserts, applicantUpdates },
    },
  };
});

import { __resetAiClientForTests } from "@/lib/ai/client";
import { buildDiagnosis } from "@/lib/ai/diagnosis/buildDiagnosis";
import { prisma } from "@/lib/db";

describe("buildDiagnosis (mock provider)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
    (prisma as unknown as { __testState: { upserts: unknown[]; applicantUpdates: unknown[] } }).__testState.upserts.length = 0;
    (prisma as unknown as { __testState: { upserts: unknown[]; applicantUpdates: unknown[] } }).__testState.applicantUpdates.length = 0;
  });

  it("11 業態すべてに対して Diagnosis を upsert する", async () => {
    const r = await buildDiagnosis("app_test_1");
    expect(r.applicantId).toBe("app_test_1");
    expect(r.provider).toBe("mock");
    expect(r.rows).toHaveLength(11);
    const state = (prisma as unknown as {
      __testState: { upserts: Array<{ create: { category: string } }> };
    }).__testState;
    expect(state.upserts.map((u) => u.create.category).sort()).toEqual(
      [
        "CLINIC",
        "DAYCARE_DISABILITY",
        "DAYCARE_ELDERLY",
        "GROUP_HOME_DISABILITY",
        "HOMEVISIT_CARE",
        "HOMEVISIT_DISABILITY",
        "HOMEVISIT_NURSE",
        "HOMEVISIT_NURSE_PSYCHIATRY",
        "HOSPITAL_ACUTE",
        "HOSPITAL_GENERAL",
        "REHAB_DAY",
      ].sort(),
    );
  });

  it("各業態の proComment / conComment が 80 字以内", async () => {
    const r = await buildDiagnosis("app_test_1");
    for (const row of r.rows) {
      expect(row.proComment.length).toBeLessThanOrEqual(80);
      expect(row.conComment.length).toBeLessThanOrEqual(80);
      expect(row.proComment.length).toBeGreaterThan(0);
      expect(row.conComment.length).toBeGreaterThan(0);
    }
  });

  it("ステータス RECEIVED の申込は DIAGNOSED に進む", async () => {
    await buildDiagnosis("app_test_1");
    const state = (prisma as unknown as {
      __testState: { applicantUpdates: Array<{ data: { status: string } }> };
    }).__testState;
    expect(state.applicantUpdates).toHaveLength(1);
    expect(state.applicantUpdates[0].data.status).toBe("DIAGNOSED");
  });

  it("存在しない applicantId はエラー", async () => {
    await expect(buildDiagnosis("missing")).rejects.toThrow(/Applicant not found/);
  });
});
