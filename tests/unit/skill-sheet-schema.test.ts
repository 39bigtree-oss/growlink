import { describe, expect, it } from "vitest";

import {
  emptySkillSheetContent,
  mergeParsedIntoContent,
  skillSheetContentSchema,
} from "@/lib/schemas/skill-sheet";

describe("skillSheetContentSchema", () => {
  it("空入力でも欠落キーは default に埋められる", () => {
    const parsed = skillSheetContentSchema.parse({});
    expect(parsed.educations).toEqual([]);
    expect(parsed.careers).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.desired.areas).toEqual([]);
    expect(parsed.selfPR).toBe("");
  });

  it("graduatedOn は YYYY-MM 形式以外を拒否する", () => {
    const r = skillSheetContentSchema.safeParse({
      educations: [{ schoolName: "A高校", department: "普通科", graduatedOn: "2020/03" }],
    });
    expect(r.success).toBe(false);
  });

  it("空文字の YYYY-MM フィールドは許容する (未入力扱い)", () => {
    const r = skillSheetContentSchema.safeParse({
      careers: [{ company: "X", role: "Y", from: "2020-04", to: "", achievements: "" }],
    });
    expect(r.success).toBe(true);
  });

  it("skill.level は 1-5 に強制される", () => {
    const r = skillSheetContentSchema.safeParse({
      skills: [{ name: "A", level: 7 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("mergeParsedIntoContent", () => {
  it("本人入力済の欄は AI 結果で上書きしない", () => {
    const current = {
      ...emptySkillSheetContent(),
      careers: [
        { company: "本人入力", role: "本人", from: "2020-04", to: "", achievements: "" },
      ],
      selfPR: "本人自己PR",
    };
    const merged = mergeParsedIntoContent(current, {
      educations: [{ schoolName: "AI 抽出高校", department: "", graduatedOn: "2010-03" }],
      careers: [
        { company: "AI 抽出会社", role: "AI", from: "2010-04", to: "2020-03", achievements: "" },
      ],
      skills: [{ name: "AI スキル", level: 4 }],
      selfPR: "AI 自己PR",
    });
    expect(merged.careers[0].company).toBe("本人入力");
    expect(merged.selfPR).toBe("本人自己PR");
    expect(merged.educations[0].schoolName).toBe("AI 抽出高校");
    expect(merged.skills[0].name).toBe("AI スキル");
  });
});
