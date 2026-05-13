import { test, expect } from "@playwright/test";

/** v1: 存在しないルートで not-found.tsx が表示される。 */
test("存在しないルートは 404 ページを表示", async ({ page }) => {
  await page.goto("/this-route-does-not-exist", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByRole("heading", { name: /見つかりません/ })).toBeVisible();
});
