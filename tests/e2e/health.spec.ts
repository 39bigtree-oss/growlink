import { test, expect } from "@playwright/test";

/** v1: /api/health が 200 or 503 を返し、checks フィールドを含むこと。 */
test("/api/health が応答する", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty("checks");
  expect(body.checks).toHaveProperty("server");
  expect(body.checks).toHaveProperty("db");
});
