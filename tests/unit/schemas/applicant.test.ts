import { describe, it, expect } from "vitest";

import {
  applicantApiSchema,
  applicantFormSchema,
  applicantStep1Schema,
  applicantStep2Schema,
  applicantStep3Schema,
  applicantStep4Schema,
} from "@/lib/schemas/applicant";

const validBase = {
  lastName: "山田",
  firstName: "花子",
  lastNameKana: "ヤマダ",
  firstNameKana: "ハナコ",
  birthDate: "1995-04-12",
  gender: "FEMALE" as const,
};

describe("applicantStep1Schema", () => {
  it("正常系は通る", () => {
    const r = applicantStep1Schema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("フリガナにひらがなが混ざるとエラー", () => {
    const r = applicantStep1Schema.safeParse({ ...validBase, lastNameKana: "やまだ" });
    expect(r.success).toBe(false);
  });

  it("生年月日が未来日だとエラー", () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const iso = next.toISOString().slice(0, 10);
    const r = applicantStep1Schema.safeParse({ ...validBase, birthDate: iso });
    expect(r.success).toBe(false);
  });

  it("16 歳未満はエラー", () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    const iso = recent.toISOString().slice(0, 10);
    const r = applicantStep1Schema.safeParse({ ...validBase, birthDate: iso });
    expect(r.success).toBe(false);
  });
});

describe("applicantStep2Schema", () => {
  it("メール形式不正はエラー", () => {
    const r = applicantStep2Schema.safeParse({
      email: "not-an-email",
      phone: "090-0000-0000",
      language: "ja",
    });
    expect(r.success).toBe(false);
  });

  it("電話番号にアルファベットが混ざるとエラー", () => {
    const r = applicantStep2Schema.safeParse({
      email: "ok@example.com",
      phone: "abc1234",
      language: "ja",
    });
    expect(r.success).toBe(false);
  });
});

describe("applicantStep3Schema", () => {
  it("どちらも空配列で通る", () => {
    const r = applicantStep3Schema.safeParse({ qualifications: [], desiredCategories: [] });
    expect(r.success).toBe(true);
  });

  it("無効な FacilityCategory はエラー", () => {
    const r = applicantStep3Schema.safeParse({
      qualifications: ["看護師"],
      desiredCategories: ["NOT_A_CATEGORY"],
    });
    expect(r.success).toBe(false);
  });
});

describe("applicantStep4Schema", () => {
  it("agreedToTerms が true でないと通らない", () => {
    const r = applicantStep4Schema.safeParse({ wantsDiagnosis: true, agreedToTerms: false });
    expect(r.success).toBe(false);
  });
  it("両方 true で通る", () => {
    const r = applicantStep4Schema.safeParse({ wantsDiagnosis: true, agreedToTerms: true });
    expect(r.success).toBe(true);
  });
});

describe("applicantFormSchema (合成)", () => {
  it("全項目が揃って通る", () => {
    const r = applicantFormSchema.safeParse({
      ...validBase,
      email: "ok@example.com",
      phone: "090-0000-0000",
      nationality: "JP",
      language: "ja",
      qualifications: ["看護師"],
      desiredCategories: ["HOMEVISIT_NURSE"],
      wantsDiagnosis: true,
      agreedToTerms: true,
    });
    expect(r.success).toBe(true);
  });
});

describe("applicantApiSchema", () => {
  it("agreedToTerms 抜きで通り、recaptchaToken は任意", () => {
    const r = applicantApiSchema.safeParse({
      ...validBase,
      email: "ok@example.com",
      phone: "090-0000-0000",
      language: "ja",
      qualifications: [],
      desiredCategories: [],
      wantsDiagnosis: false,
    });
    expect(r.success).toBe(true);
  });

  it("agreedToTerms が含まれていても omit されるため通る (passthrough せず)", () => {
    const r = applicantApiSchema.safeParse({
      ...validBase,
      email: "ok@example.com",
      phone: "090-0000-0000",
      language: "ja",
      qualifications: [],
      desiredCategories: [],
      wantsDiagnosis: false,
      // 余計なフィールドは strip される
      agreedToTerms: true,
    });
    if (!r.success) throw new Error("expected success");
    expect((r.data as Record<string, unknown>).agreedToTerms).toBeUndefined();
  });
});
