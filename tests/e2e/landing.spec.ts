import { test, expect } from "@playwright/test";

/** v1.1: ランディングページに Tsumugi ブランドが表示される */
test("ランディングページに Tsumugi ロゴとタグラインが表示される", async ({ page }) => {
  await page.goto("/");
  // ワードマーク
  await expect(page.getByText("TSUMUGI", { exact: false }).first()).toBeVisible();
  // タグライン本文
  await expect(page.getByText("AI が、人と現場を丁寧に紡ぐ。", { exact: false }).first()).toBeVisible();
  // 主要 CTA
  await expect(page.getByRole("link", { name: /応募/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /ログイン/ }).first()).toBeVisible();
});
