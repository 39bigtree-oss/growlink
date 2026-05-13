import { describe, it, expect } from "vitest";

import { ageFromBirthDate, parseApplicantListFilter } from "@/lib/applicants/list-query";

describe("parseApplicantListFilter", () => {
  it("空の検索パラメータでデフォルト値を返す", () => {
    expect(parseApplicantListFilter({})).toEqual({
      status: undefined,
      q: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });

  it("status=ALL は明示的に保持し、不正値は undefined", () => {
    expect(parseApplicantListFilter({ status: "ALL" }).status).toBe("ALL");
    expect(parseApplicantListFilter({ status: "RECEIVED" }).status).toBe("RECEIVED");
    expect(parseApplicantListFilter({ status: "garbage" }).status).toBeUndefined();
  });

  it("page は数字のみ採用、最低 1", () => {
    expect(parseApplicantListFilter({ page: "3" }).page).toBe(3);
    expect(parseApplicantListFilter({ page: "0" }).page).toBe(1);
    expect(parseApplicantListFilter({ page: "abc" }).page).toBe(1);
  });

  it("q は trim される / 空文字なら undefined", () => {
    expect(parseApplicantListFilter({ q: "  山田  " }).q).toBe("山田");
    expect(parseApplicantListFilter({ q: "" }).q).toBeUndefined();
  });

  it("配列値は最初の要素を採用 (Next の searchParams 仕様に対応)", () => {
    expect(parseApplicantListFilter({ q: ["山田", "second"] }).q).toBe("山田");
  });
});

describe("ageFromBirthDate", () => {
  it("誕生日前後で 1 歳差が出る", () => {
    const now = new Date("2026-05-13");
    expect(ageFromBirthDate(new Date("1990-04-12"), now)).toBe(36);
    expect(ageFromBirthDate(new Date("1990-06-01"), now)).toBe(35);
  });
});
