import { describe, expect, it } from "vitest";

import { evaluateBias, mockBiasEvalProvider } from "@/lib/ai/bias-eval";

describe("evaluateBias (mock provider)", () => {
  it("無害な文章は overall=ok", async () => {
    const r = await evaluateBias(
      "看護師経験 10 年の方は訪問看護に向いています。担当地域は東京都新宿区。",
    );
    expect(r.overall).toBe("ok");
    expect(r.findings).toHaveLength(0);
  });

  it("年齢差別表現 (高齢者は向かない) は block", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "高齢者は夜勤に向かないので避けるべきです。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "age")).toBe(true);
  });

  it("外国人だから日本語が難しいは block", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "外国人なので日本語コミュニケーションが難しいかもしれません。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "nationality")).toBe(true);
  });

  it("性別差別 (女性なので無理) は block", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "女性なのでオンコールは無理でしょう。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "gender")).toBe(true);
  });

  it("男性歓迎は block", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "男性歓迎の求人です。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "gender")).toBe(true);
  });

  it("障害者は無理は block", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "障害者は介護現場では難しい業務です。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "disability")).toBe(true);
  });

  it("独身限定は block (婚姻差別)", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "独身限定の求人です。",
    );
    expect(r.overall).toBe("block");
    expect(r.findings.some((f) => f.category === "marriage")).toBe(true);
  });

  it("「外国人」を文脈なしで含むだけでは block しない (false positive 回避)", async () => {
    const r = await mockBiasEvalProvider.evaluate(
      "外国人スタッフのサポート体制も整っています。",
    );
    expect(r.overall).toBe("ok");
  });

  it("提供 mock は名前 bias-eval:mock", async () => {
    const r = await mockBiasEvalProvider.evaluate("test");
    expect(r.provider).toBe("bias-eval:mock");
  });
});
