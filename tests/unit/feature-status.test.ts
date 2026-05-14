import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FEATURES,
  getFeature,
  resolveFeatureState,
  STATE_LABEL,
  type FeatureMeta,
} from "@/lib/system-status/features";

describe("Feature status registry", () => {
  it("全 FeatureMeta が必須フィールドを持つ", () => {
    for (const f of FEATURES) {
      expect(f.key).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.state).toBeTruthy();
      expect(f.summary).toBeTruthy();
    }
  });

  it("key は一意 (重複なし)", () => {
    const keys = FEATURES.map((f) => f.key);
    const dedup = new Set(keys);
    expect(dedup.size).toBe(keys.length);
  });

  it("getFeature(known key) returns the meta", () => {
    const f = getFeature("ai.diagnosis");
    expect(f).toBeTruthy();
    expect(f?.name).toContain("AI 適職診断");
  });

  it("getFeature(unknown key) returns undefined", () => {
    // @ts-expect-error 型外
    expect(getFeature("nonexistent.key")).toBeUndefined();
  });

  it("STATE_LABEL を全 state について網羅", () => {
    expect(STATE_LABEL.READY).toBeTruthy();
    expect(STATE_LABEL.MOCK).toBeTruthy();
    expect(STATE_LABEL.LIMITED).toBeTruthy();
    expect(STATE_LABEL.PLANNED).toBeTruthy();
    expect(STATE_LABEL.ROADMAP).toBeTruthy();
  });
});

describe("resolveFeatureState — runtime 動的判定", () => {
  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("AI_PROVIDER が mock のとき ai.diagnosis は MOCK", () => {
    process.env.AI_PROVIDER = "mock";
    const f = getFeature("ai.diagnosis")!;
    expect(resolveFeatureState(f)).toBe("MOCK");
  });

  it("AI_PROVIDER=gemini なら ai.diagnosis は READY", () => {
    process.env.AI_PROVIDER = "gemini";
    const f = getFeature("ai.diagnosis")!;
    expect(resolveFeatureState(f)).toBe("READY");
  });

  it("AI_PROVIDER=anthropic なら ai.diagnosis は READY", () => {
    process.env.AI_PROVIDER = "anthropic";
    const f = getFeature("ai.diagnosis")!;
    expect(resolveFeatureState(f)).toBe("READY");
  });

  it("EMAIL_PROVIDER=resend + RESEND_API_KEY 設定済なら email.send は READY", () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test_abc";
    const f = getFeature("email.send")!;
    expect(resolveFeatureState(f)).toBe("READY");
  });

  it("EMAIL_PROVIDER=resend だが RESEND_API_KEY が無いと email.send は MOCK", () => {
    process.env.EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    const f = getFeature("email.send")!;
    expect(resolveFeatureState(f)).toBe("MOCK");
  });

  it("EMAIL_PROVIDER=mock なら email.send は MOCK", () => {
    process.env.EMAIL_PROVIDER = "mock";
    process.env.RESEND_API_KEY = "re_test";
    const f = getFeature("email.send")!;
    expect(resolveFeatureState(f)).toBe("MOCK");
  });

  it("BIAS_EVAL_PROVIDER=claude_haiku なら ai.bias_eval は READY", () => {
    process.env.BIAS_EVAL_PROVIDER = "claude_haiku";
    const f = getFeature("ai.bias_eval")!;
    expect(resolveFeatureState(f)).toBe("READY");
  });

  it("BIAS_EVAL_PROVIDER 未設定なら ai.bias_eval は MOCK", () => {
    delete process.env.BIAS_EVAL_PROVIDER;
    const f = getFeature("ai.bias_eval")!;
    expect(resolveFeatureState(f)).toBe("MOCK");
  });

  it("runtimeState が無いフィーチャは state をそのまま返す", () => {
    const f: FeatureMeta = {
      key: "auth.mfa",
      name: "test",
      category: "security",
      state: "PLANNED",
      summary: "x",
    };
    expect(resolveFeatureState(f)).toBe("PLANNED");
  });
});

describe("Registry coverage — Phase 6 主要機能が登録済", () => {
  it("外部連携系の MOCK 機能はすべてレジストリに含まれている", () => {
    const requiredMocks = [
      "ai.diagnosis",
      "ai.interview",
      "email.send",
      "fax.send",
      "ocr.resume",
      "ocr.my_number_card",
      "integration.e_sign",
      "integration.accounting",
    ];
    for (const key of requiredMocks) {
      // @ts-expect-error - key は FeatureKey として文字列 narrowing が必要
      const f = getFeature(key);
      expect(f, `${key} がレジストリに無い`).toBeTruthy();
    }
  });

  it("コンプライアンス系の READY/LIMITED 機能がすべてレジストリに含まれている", () => {
    const compliance = [
      "compliance.dispatch_ledger",
      "compliance.anti_teishoku",
      "compliance.my_number_storage",
      "compliance.audit_chain",
      "compliance.residence_expiry_alert",
    ];
    for (const key of compliance) {
      // @ts-expect-error
      const f = getFeature(key);
      expect(f, `${key} がレジストリに無い`).toBeTruthy();
    }
  });
});
