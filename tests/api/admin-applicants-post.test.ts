import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "s_admin", role: "ADMIN", email: "a@x" } })),
}));

const state = {
  callCount: 0,
  lastInput: null as unknown,
  lastStaffId: null as string | null,
};

vi.mock("@/lib/applicants/registerByStaff", () => ({
  registerApplicantByStaff: vi.fn(async (input: object, staffId: string) => {
    state.callCount += 1;
    state.lastInput = input;
    state.lastStaffId = staffId;
    return {
      ok: true,
      applicantId: "ap_new1",
      diagnosisProvider: "mock",
      inviteSent: true,
      pdfAttached: true,
    };
  }),
}));

import { POST } from "@/app/api/admin/applicants/route";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/admin/applicants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validInput = {
  lastName: "テスト",
  firstName: "花子",
  lastNameKana: "テスト",
  firstNameKana: "ハナコ",
  birthDate: "1990-04-12",
  gender: "FEMALE",
  email: "verify-by-staff@example.test",
  phone: "090-0000-0001",
  nationality: "JP",
  language: "ja",
  qualifications: ["看護師"],
  desiredCategories: ["HOMEVISIT_NURSE"],
  wantsDiagnosis: true,
};

describe("POST /api/admin/applicants", () => {
  beforeEach(() => {
    state.callCount = 0;
    state.lastInput = null;
    state.lastStaffId = null;
    vi.clearAllMocks();
  });

  it("ADMIN は登録できる (201)", async () => {
    const res = await POST(jsonReq(validInput));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      applicantId: string;
      inviteSent: boolean;
      pdfAttached: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.applicantId).toBe("ap_new1");
    expect(body.inviteSent).toBe(true);
    expect(body.pdfAttached).toBe(true);
    expect(state.callCount).toBe(1);
    expect(state.lastStaffId).toBe("s_admin");
  });

  it("未認証は 401", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await POST(jsonReq(validInput));
    expect(res.status).toBe(401);
  });

  it("VIEWER は 403 (applicants:write がない)", async () => {
    const authMod = await import("@/auth");
    (authMod.auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "v", role: "VIEWER", email: "v@x" },
    });
    const res = await POST(jsonReq(validInput));
    expect(res.status).toBe(403);
  });

  it("不正な JSON は 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("バリデーションエラーは 400", async () => {
    const res = await POST(jsonReq({ ...validInput, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("既存メールは 409", async () => {
    const mod = await import("@/lib/applicants/registerByStaff");
    (mod.registerApplicantByStaff as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      reason: "ALREADY_REGISTERED",
    });
    const res = await POST(jsonReq(validInput));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("ALREADY_REGISTERED");
  });
});
