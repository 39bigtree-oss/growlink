import { describe, it, expect } from "vitest";

import {
  ALL_STATUSES,
  canTransition,
  nextStatusOptions,
  statusLabel,
} from "@/lib/applicants/status-machine";

describe("status-machine: 状態遷移", () => {
  it("通常フロー: RECEIVED → DIAGNOSED → SKILL_SHEET_INPROGRESS は可能", () => {
    expect(canTransition("RECEIVED", "DIAGNOSED")).toBe(true);
    expect(canTransition("DIAGNOSED", "SKILL_SHEET_INPROGRESS")).toBe(true);
    expect(canTransition("SKILL_SHEET_INPROGRESS", "SKILL_SHEET_DONE")).toBe(true);
    expect(canTransition("SKILL_SHEET_DONE", "INTERVIEW_DONE")).toBe(true);
    expect(canTransition("INTERVIEW_DONE", "SALES_READY")).toBe(true);
    expect(canTransition("SALES_READY", "IN_INTRODUCTION")).toBe(true);
    expect(canTransition("IN_INTRODUCTION", "CONTRACTED")).toBe(true);
  });

  it("REJECTED へは進行中のどのステータスからでも可能", () => {
    expect(canTransition("RECEIVED", "REJECTED")).toBe(true);
    expect(canTransition("INTERVIEW_DONE", "REJECTED")).toBe(true);
    expect(canTransition("IN_INTRODUCTION", "REJECTED")).toBe(true);
  });

  it("CONTRACTED と REJECTED は終端", () => {
    expect(nextStatusOptions("CONTRACTED")).toEqual([]);
    expect(nextStatusOptions("REJECTED")).toEqual([]);
    expect(canTransition("CONTRACTED", "RECEIVED")).toBe(false);
    expect(canTransition("REJECTED", "RECEIVED")).toBe(false);
  });

  it("無効なジャンプ (例: RECEIVED → CONTRACTED) は弾かれる", () => {
    expect(canTransition("RECEIVED", "CONTRACTED")).toBe(false);
    expect(canTransition("RECEIVED", "SALES_READY")).toBe(false);
    expect(canTransition("DIAGNOSED", "CONTRACTED")).toBe(false);
  });

  it("同状態への遷移は不可", () => {
    for (const s of ALL_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it("statusLabel は日本語ラベルを返す", () => {
    expect(statusLabel("RECEIVED")).toBe("受付");
    expect(statusLabel("CONTRACTED")).toBe("成約");
  });
});
