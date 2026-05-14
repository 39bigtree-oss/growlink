import { describe, expect, it } from "vitest";

import {
  SEQUENCE_DEFINITIONS,
  findDefinition,
  nextRunAtFor,
} from "@/lib/nurture/sequences";

describe("Nurture sequences", () => {
  it("v1.8 で 5 種類のシナリオが定義済", () => {
    expect(SEQUENCE_DEFINITIONS.length).toBe(5);
  });

  it("全 trigger が unique", () => {
    const triggers = SEQUENCE_DEFINITIONS.map((d) => d.trigger);
    expect(new Set(triggers).size).toBe(triggers.length);
  });

  it("findDefinition(known) returns the meta", () => {
    const d = findDefinition("FAX_SENT_NO_REPLY");
    expect(d).toBeTruthy();
    expect(d?.name).toContain("FAX");
  });

  it("findDefinition(unknown) returns undefined", () => {
    // @ts-expect-error 型外
    expect(findDefinition("NOPE")).toBeUndefined();
  });

  it("nextRunAtFor: WAIT は waitDays 日後", () => {
    const now = new Date("2026-05-14T00:00:00Z");
    const r = nextRunAtFor({ kind: "WAIT", waitDays: 7, label: "x" }, now);
    expect(r.toISOString().slice(0, 10)).toBe("2026-05-21");
  });

  it("nextRunAtFor: EMAIL / STAFF_TODO は即時 (=now)", () => {
    const now = new Date("2026-05-14T00:00:00Z");
    const r1 = nextRunAtFor(
      { kind: "EMAIL", label: "x", emailTemplate: "skill_sheet_reminder" },
      now,
    );
    expect(r1.getTime()).toBe(now.getTime());
    const r2 = nextRunAtFor(
      { kind: "STAFF_TODO", label: "x", todoMessage: "y" },
      now,
    );
    expect(r2.getTime()).toBe(now.getTime());
  });

  it("全シナリオの最初のステップが定義されている (currentStep=0 で動作可能)", () => {
    for (const d of SEQUENCE_DEFINITIONS) {
      expect(d.steps.length).toBeGreaterThan(0);
      expect(d.steps[0].kind).toMatch(/^(WAIT|EMAIL|STAFF_TODO)$/);
    }
  });
});
