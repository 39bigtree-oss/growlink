import { describe, expect, it } from "vitest";

import {
  maskInitials,
  maskAge,
  maskLocation,
  maskApplicantForFax,
} from "@/lib/mask";

describe("maskInitials", () => {
  it("漢字フルネームの先頭 1 字ずつを採る", () => {
    expect(maskInitials("山田", "花子")).toBe("山.花");
  });
  it("ローマ字名でも 1 字目を採る", () => {
    expect(maskInitials("Smith", "John")).toBe("S.J");
  });
  it("片方が空でも片側だけ返す", () => {
    expect(maskInitials("", "花子")).toBe(".花");
    expect(maskInitials("山田", "")).toBe("山.");
  });
  it("両方空なら N.N", () => {
    expect(maskInitials("", "")).toBe("N.N");
    expect(maskInitials(null, undefined)).toBe("N.N");
  });
});

describe("maskAge", () => {
  it("40歳前半 → 40代前半", () => {
    const now = new Date("2026-05-13");
    expect(maskAge(new Date("1984-04-12"), now)).toBe("40代前半");
  });
  it("47歳 → 40代後半", () => {
    const now = new Date("2026-05-13");
    expect(maskAge(new Date("1979-01-01"), now)).toBe("40代後半");
  });
  it("75歳 → 70代以上", () => {
    const now = new Date("2026-05-13");
    expect(maskAge(new Date("1950-01-01"), now)).toBe("70代以上");
  });
  it("不正値は『年代不明』", () => {
    expect(maskAge("not-a-date")).toBe("年代不明");
  });
});

describe("maskLocation", () => {
  it("23区の住所は『都+区』までで打ち切る", () => {
    expect(maskLocation("東京都新宿区西新宿1-2-3")).toBe("東京都新宿区");
  });
  it("市の住所は『県+市』までで打ち切る", () => {
    expect(maskLocation("千葉県船橋市本町0-0-0")).toBe("千葉県船橋市");
  });
  it("町・村も対応", () => {
    expect(maskLocation("北海道余市郡余市町大川町0")).toBe("北海道余市郡余市町");
  });
  it("空・null は『地域不明』", () => {
    expect(maskLocation(null)).toBe("地域不明");
    expect(maskLocation("")).toBe("地域不明");
  });
});

describe("maskApplicantForFax", () => {
  it("氏名・生年月日が直接含まれず、イニシャル / 年代 / 資格 / 希望業態を返す", () => {
    const masked = maskApplicantForFax({
      lastName: "山田",
      firstName: "花子",
      birthDate: new Date("1984-04-12"),
      gender: "FEMALE",
      desiredCategories: ["HOMEVISIT_NURSE"],
      language: "ja",
      nationality: "JP",
      qualifications: [{ name: "看護師" }],
    });
    expect(masked.initials).toBe("山.花");
    expect(masked.ageLabel).toMatch(/^\d+代(前半|後半|以上)$/);
    expect(masked.qualifications).toEqual(["看護師"]);
    expect(masked.desiredCategories).toEqual(["HOMEVISIT_NURSE"]);
    expect(masked.genderLabel).toBe("女性");
    // 氏名そのものは返り値に含めない
    const json = JSON.stringify(masked);
    expect(json).not.toContain("山田");
    expect(json).not.toContain("花子");
    expect(json).not.toContain("1984-04-12");
  });
});
