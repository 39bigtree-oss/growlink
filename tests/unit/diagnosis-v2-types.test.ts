import { describe, expect, it } from "vitest";

import {
  CARE_TYPES,
  allCodes,
  codeFromScores,
  getCareType,
} from "@/lib/ai/diagnosis-v2/types";

describe("Diagnosis v2 types", () => {
  it("16 種類のタイプが定義されている", () => {
    expect(Object.keys(CARE_TYPES)).toHaveLength(16);
  });

  it("全コードが 4 文字で、許容される文字のみ", () => {
    const allowed = new Set(["C", "A", "E", "R", "T", "I", "S", "F"]);
    for (const code of allCodes()) {
      expect(code).toHaveLength(4);
      for (const ch of code) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it("各タイプに name / english / catchphrase / strengthThemes (3つ) / partners (2つ) がある", () => {
    for (const t of Object.values(CARE_TYPES)) {
      expect(t.name).toBeTruthy();
      expect(t.english).toBeTruthy();
      expect(t.catchphrase).toBeTruthy();
      expect(t.strengthThemes.length).toBeGreaterThanOrEqual(3);
      expect(t.partners.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("codeFromScores: 全部高 → CETS", () => {
    expect(codeFromScores({ caring: 80, energetic: 80, team: 80, stable: 80 })).toBe("CETS");
  });

  it("codeFromScores: 全部低 → ARIF (Analytical, Reflective, Independent, Flexible)", () => {
    expect(codeFromScores({ caring: 20, energetic: 20, team: 20, stable: 20 })).toBe("ARIF");
  });

  it("codeFromScores: 中間値 (50 ぴったり) → 全部 high 判定", () => {
    expect(codeFromScores({ caring: 50, energetic: 50, team: 50, stable: 50 })).toBe("CETS");
  });

  it("getCareType: 未登録コードは fallback CETS", () => {
    expect(getCareType("ZZZZ").code).toBe("CETS");
  });

  it("partners コードは全て登録済 (デッドリンク無し)", () => {
    for (const t of Object.values(CARE_TYPES)) {
      for (const p of t.partners) {
        expect(CARE_TYPES[p]).toBeDefined();
      }
    }
  });
});
