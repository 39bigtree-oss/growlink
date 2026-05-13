import { describe, expect, it } from "vitest";

import { isVisaType, VISA_TYPE_OPTIONS } from "@/lib/constants/visa-types";

describe("visa types", () => {
  it("代表的な値を採用判定する", () => {
    expect(isVisaType("SSW1_CARE")).toBe(true);
    expect(isVisaType("PERMANENT")).toBe(true);
    expect(isVisaType("UNKNOWN_VISA")).toBe(false);
  });

  it("OPTIONS のすべての value が isVisaType を通る", () => {
    for (const o of VISA_TYPE_OPTIONS) {
      expect(isVisaType(o.value)).toBe(true);
    }
  });
});
