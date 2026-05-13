import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "staff_admin", role: "ADMIN", email: "a@x" } })),
}));

vi.mock("@/lib/fax/createFaxSheet", () => ({
  createFaxSheet: vi.fn(),
  createFaxSheetsBatch: vi.fn(async (applicantId: string, facilityIds: string[]) => {
    return {
      created: facilityIds
        .filter((id) => id !== "fac_fail")
        .map((id) => ({
          faxSheet: {
            id: `fs_${id}`,
            applicantId,
            facilityId: id,
            status: "DRAFT",
          },
          pdfKey: `fax-sheets/${applicantId}_${id}.pdf`,
          provider: "mock",
        })),
      errors: facilityIds.includes("fac_fail")
        ? [{ applicantId, facilityId: "fac_fail", error: "boom" }]
        : [],
    };
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "audit", ...(data as object) })),
    },
  },
}));

import { POST } from "@/app/api/fax-sheets/route";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/fax-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/fax-sheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("単件: facilityId 1 つを受けて 201 で created を返す", async () => {
    const res = await POST(jsonReq({ applicantId: "app_1", facilityId: "fac_1" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; created: unknown[]; errors: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.created).toHaveLength(1);
    expect(body.errors).toHaveLength(0);
  });

  it("一括: 複数 facilityIds を受けて全件作成", async () => {
    const res = await POST(
      jsonReq({ applicantId: "app_1", facilityIds: ["fac_1", "fac_2", "fac_3"] }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { created: unknown[]; errors: unknown[] };
    expect(body.created).toHaveLength(3);
  });

  it("一括: 一部失敗でも残りは成功し errors に積まれる", async () => {
    const res = await POST(
      jsonReq({ applicantId: "app_1", facilityIds: ["fac_1", "fac_fail", "fac_2"] }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { created: unknown[]; errors: unknown[] };
    expect(body.created).toHaveLength(2);
    expect(body.errors).toHaveLength(1);
  });

  it("全件失敗時は 207 を返す", async () => {
    const res = await POST(jsonReq({ applicantId: "app_1", facilityIds: ["fac_fail"] }));
    expect(res.status).toBe(207);
  });

  it("未認証は 401", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await POST(jsonReq({ applicantId: "app_1", facilityId: "fac_1" }));
    expect(res.status).toBe(401);
  });

  it("VIEWER は 403 (fax:create 権限なし)", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "v", role: "VIEWER", email: "v@x" },
    });
    const res = await POST(jsonReq({ applicantId: "app_1", facilityId: "fac_1" }));
    expect(res.status).toBe(403);
  });

  it("不正な JSON は 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/fax-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("facilityIds 空は 400", async () => {
    const res = await POST(jsonReq({ applicantId: "app_1", facilityIds: [] }));
    expect(res.status).toBe(400);
  });
});
