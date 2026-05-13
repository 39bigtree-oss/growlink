import { describe, expect, it } from "vitest";

import { buildDiagnosisPdfInput, buildOverviewText } from "@/lib/pdf/diagnosisPdf.helpers";

const DUMMY_APPLICANT = { lastName: "山田", firstName: "花子" };

const ROWS = [
  {
    id: "diag_a",
    applicantId: "app_1",
    category: "HOMEVISIT_NURSE" as const,
    score: 82,
    rank: "A" as const,
    proComment: "自律性が訪問看護で活きます。",
    conComment: "オンコール体制を確認しましょう。",
    generatedAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "diag_b",
    applicantId: "app_1",
    category: "HOSPITAL_GENERAL" as const,
    score: 68,
    rank: "B" as const,
    proComment: "落ち着いた対応が総合病院で活きます。",
    conComment: "業務範囲が広いので情報整理が鍵です。",
    generatedAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "diag_c",
    applicantId: "app_1",
    category: "GROUP_HOME_DISABILITY" as const,
    score: 35,
    rank: "D" as const,
    proComment: "現時点の入力では強いシグナルは出ていません。",
    conComment: "他業態の方が当面合いやすい可能性があります。",
    generatedAt: new Date("2026-05-13T00:00:00Z"),
  },
];

describe("buildDiagnosisPdfInput", () => {
  it("スコア降順で並び、カテゴリラベルが日本語化される", () => {
    const input = buildDiagnosisPdfInput(
      DUMMY_APPLICANT,
      ROWS,
      "overview",
      new Date("2026-05-13T00:00:00Z"),
    );
    expect(input.applicantFullName).toBe("山田 花子");
    expect(input.rows.map((r) => r.category)).toEqual([
      "HOMEVISIT_NURSE",
      "HOSPITAL_GENERAL",
      "GROUP_HOME_DISABILITY",
    ]);
    expect(input.rows[0].categoryLabel).toBe("訪問看護（一般）");
    expect(input.rows[1].score).toBe(68);
  });

  it("構造スナップショット", () => {
    const input = buildDiagnosisPdfInput(
      DUMMY_APPLICANT,
      ROWS,
      "overview",
      new Date("2026-05-13T00:00:00Z"),
    );
    expect(input).toMatchInlineSnapshot(`
      {
        "applicantFullName": "山田 花子",
        "generatedAt": 2026-05-13T00:00:00.000Z,
        "organization": {
          "contact": "https://growlink.example / info@growlink.example",
          "name": "株式会社グロウリンク",
        },
        "overview": "overview",
        "rows": [
          {
            "category": "HOMEVISIT_NURSE",
            "categoryLabel": "訪問看護（一般）",
            "conComment": "オンコール体制を確認しましょう。",
            "proComment": "自律性が訪問看護で活きます。",
            "rank": "A",
            "score": 82,
          },
          {
            "category": "HOSPITAL_GENERAL",
            "categoryLabel": "総合病院",
            "conComment": "業務範囲が広いので情報整理が鍵です。",
            "proComment": "落ち着いた対応が総合病院で活きます。",
            "rank": "B",
            "score": 68,
          },
          {
            "category": "GROUP_HOME_DISABILITY",
            "categoryLabel": "グループホーム（障害）",
            "conComment": "他業態の方が当面合いやすい可能性があります。",
            "proComment": "現時点の入力では強いシグナルは出ていません。",
            "rank": "D",
            "score": 35,
          },
        ],
      }
    `);
  });
});

describe("buildOverviewText", () => {
  it("上位カテゴリの日本語ラベルとランクを含む", () => {
    const text = buildOverviewText(ROWS);
    expect(text).toContain("訪問看護（一般）");
    expect(text).toContain("総合病院");
    expect(text).toContain("ランク A");
  });

  it("空配列でも例外を投げない", () => {
    expect(buildOverviewText([])).toMatch(/まだ作成されていません/);
  });
});
