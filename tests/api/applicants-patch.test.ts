import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "staff_admin", role: "ADMIN", email: "admin@x" } })),
}));

vi.mock("@/lib/db", () => {
  const state = {
    applicantStatus: "RECEIVED" as string,
    updates: [] as Array<{ data: unknown }>,
    auditLogs: [] as unknown[],
    notFound: false,
  };
  return {
    prisma: {
      applicant: {
        findFirst: vi.fn(async () => {
          if (state.notFound) return null;
          return { id: "app_x", status: state.applicantStatus };
        }),
        update: vi.fn(async ({ data }: { data: unknown }) => {
          state.updates.push({ data });
          return data;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          state.auditLogs.push(data);
          return { id: "audit", ...(data as object) };
        }),
      },
      $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
      __state: state,
    },
  };
});

import { prisma } from "@/lib/db";
import { PATCH } from "@/app/api/applicants/[id]/route";

type State = {
  applicantStatus: string;
  updates: Array<{ data: unknown }>;
  auditLogs: unknown[];
  notFound: boolean;
};
function st(): State {
  return (prisma as unknown as { __state: State }).__state;
}

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/applicants/app_x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx() {
  return { params: Promise.resolve({ id: "app_x" }) };
}

describe("PATCH /api/applicants/[id]", () => {
  beforeEach(() => {
    st().applicantStatus = "RECEIVED";
    st().updates.length = 0;
    st().auditLogs.length = 0;
    st().notFound = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("有効な遷移は 200 で更新され、監査ログが記録される", async () => {
    const res = await PATCH(patchReq({ status: "DIAGNOSED" }), ctx());
    expect(res.status).toBe(200);
    expect(st().updates).toHaveLength(1);
    expect(st().auditLogs).toHaveLength(1);
    expect((st().auditLogs[0] as { payload: unknown }).payload).toEqual({
      from: "RECEIVED",
      to: "DIAGNOSED",
    });
  });

  it("無効な遷移 (RECEIVED → CONTRACTED) は 422", async () => {
    const res = await PATCH(patchReq({ status: "CONTRACTED" }), ctx());
    expect(res.status).toBe(422);
    expect(st().updates).toHaveLength(0);
  });

  it("同状態への遷移は 200 で何もせず終わる (no-op)", async () => {
    const res = await PATCH(patchReq({ status: "RECEIVED" }), ctx());
    expect(res.status).toBe(200);
    expect(st().updates).toHaveLength(0);
    expect(st().auditLogs).toHaveLength(0);
  });

  it("未認証は 401", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await PATCH(patchReq({ status: "DIAGNOSED" }), ctx());
    expect(res.status).toBe(401);
  });

  it("VIEWER は権限不足で 403", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "viewer", role: "VIEWER", email: "v@x" },
    });
    const res = await PATCH(patchReq({ status: "DIAGNOSED" }), ctx());
    expect(res.status).toBe(403);
  });

  it("SALES も applicants:write を持たないので 403", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "sales", role: "SALES", email: "s@x" },
    });
    const res = await PATCH(patchReq({ status: "DIAGNOSED" }), ctx());
    expect(res.status).toBe(403);
  });

  it("存在しない申込は 404", async () => {
    st().notFound = true;
    const res = await PATCH(patchReq({ status: "DIAGNOSED" }), ctx());
    expect(res.status).toBe(404);
  });

  it("無効な JSON は 400", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/applicants/app_x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });
});
