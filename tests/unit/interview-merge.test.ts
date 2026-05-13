import { describe, expect, it } from "vitest";

import { mergeInterviewIntoContent } from "@/lib/interview/finalizeInterview";
import { emptySkillSheetContent } from "@/lib/schemas/skill-sheet";

describe("mergeInterviewIntoContent", () => {
  it("本人入力済の選好を上書きしない", () => {
    const current = {
      ...emptySkillSheetContent(),
      desired: {
        areas: ["東京都新宿区"],
        schedule: "週 4 日 / 日勤中心",
        startMonth: "2026-08",
        salary: 600,
        notes: "夜勤可",
      },
      selfPR: "本人の自己 PR",
    };
    const summary = {
      overallScore: 80,
      headline: "",
      strengths: [],
      concerns: [],
      skillsToAdd: [],
      desiredUpdates: {
        schedule: "AI が推測したスケジュール",
        startMonth: "2027-01",
        areas: ["別エリア"],
        notes: "AI 補足",
      },
      selfPRDraft: "AI 草案",
      recommendedNextAction: "",
      provider: "mock",
    };
    const merged = mergeInterviewIntoContent(current, summary);
    expect(merged.desired.areas).toEqual(["東京都新宿区"]);
    expect(merged.desired.schedule).toBe("週 4 日 / 日勤中心");
    expect(merged.desired.startMonth).toBe("2026-08");
    expect(merged.desired.notes).toContain("夜勤可");
    expect(merged.desired.notes).toContain("[AI面接]AI 補足");
    expect(merged.selfPR).toBe("本人の自己 PR");
  });

  it("空欄は AI 草案で埋める", () => {
    const current = emptySkillSheetContent();
    const summary = {
      overallScore: 80,
      headline: "",
      strengths: [],
      concerns: [],
      skillsToAdd: [{ name: "新スキル", level: 4 }],
      desiredUpdates: { schedule: "週 3 日", startMonth: "2026-09", areas: ["千葉県"], notes: "メモ" },
      selfPRDraft: "AI 草案",
      recommendedNextAction: "",
      provider: "mock",
    };
    const merged = mergeInterviewIntoContent(current, summary);
    expect(merged.desired.schedule).toBe("週 3 日");
    expect(merged.desired.areas).toEqual(["千葉県"]);
    expect(merged.selfPR).toBe("AI 草案");
    expect(merged.skills.map((s) => s.name)).toContain("新スキル");
  });

  it("同名スキルは重複追加しない", () => {
    const current = {
      ...emptySkillSheetContent(),
      skills: [{ name: "訪問看護", level: 5 }],
    };
    const summary = {
      overallScore: 80,
      headline: "",
      strengths: [],
      concerns: [],
      skillsToAdd: [{ name: "訪問看護", level: 4 }, { name: "新人指導", level: 4 }],
      desiredUpdates: { schedule: "", startMonth: "", areas: [], notes: "" },
      selfPRDraft: "",
      recommendedNextAction: "",
      provider: "mock",
    };
    const merged = mergeInterviewIntoContent(current, summary);
    expect(merged.skills.filter((s) => s.name === "訪問看護")).toHaveLength(1);
    expect(merged.skills.find((s) => s.name === "訪問看護")?.level).toBe(5);
    expect(merged.skills.find((s) => s.name === "新人指導")?.level).toBe(4);
  });
});
