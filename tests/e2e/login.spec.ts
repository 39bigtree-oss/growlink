import { test, expect } from "@playwright/test";

/** v1: ログイン画面が見える + 必須要素のチェック。 */
test("ログイン画面が描画される", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading")).toBeVisible();
  // Email / Password の input が存在する
  expect(await page.locator("input[type=email]").count()).toBeGreaterThan(0);
  expect(await page.locator("input[type=password]").count()).toBeGreaterThan(0);
});
