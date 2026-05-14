import { describe, expect, it } from "vitest";

import { buildResidenceExpiryAlertEmail } from "@/lib/email/templates/residence-expiry-alert";

describe("buildResidenceExpiryAlertEmail", () => {
  it("件名に残日数を含み、本文に氏名を含めない (PII 最小化)", () => {
    const msg = buildResidenceExpiryAlertEmail({
      applicantId: "app123",
      applicantInitials: "Y.H.",
      visaType: "SSW1_CARE",
      expireAt: new Date("2026-08-01T00:00:00Z"),
      daysUntilExpiry: 79,
    });
    expect(msg.subject).toContain("79 日");
    expect(msg.subject).toContain("Y.H.");
    expect(msg.html).not.toContain("山田");
    expect(msg.text).toContain("app123");
    expect(msg.text).toContain("SSW1_CARE");
    expect(msg.text).toContain("2026-08-01");
    expect(msg.template).toBe("compliance.residence_expiry");
  });

  it("STAFF_NOTIFICATION_EMAIL が設定されていればそちらを優先", () => {
    const orig = process.env.STAFF_NOTIFICATION_EMAIL;
    process.env.STAFF_NOTIFICATION_EMAIL = "ops@growlink.test";
    const msg = buildResidenceExpiryAlertEmail({
      applicantId: "app123",
      applicantInitials: "Y.H.",
      visaType: "ENGINEER",
      expireAt: new Date("2026-08-01"),
      daysUntilExpiry: 30,
    });
    expect(msg.to).toBe("ops@growlink.test");
    process.env.STAFF_NOTIFICATION_EMAIL = orig;
  });
});
