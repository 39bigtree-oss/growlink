import { test, expect } from "@playwright/test";

/** v1: 不正トークンは 404 (notFound) になる。 */
test("不正な skill-sheet トークンは 404", async ({ page }) => {
  const res = await page.goto("/skill-sheet/this-is-not-a-real-token", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});
