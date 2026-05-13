import { test, expect } from "@playwright/test";

/**
 * Phase 1-3 受け入れテスト:
 *   申込フォームが 4 ステップを経て送信され、/apply/thanks に遷移すること。
 *
 * 実 DB に書き込みたくないため /api/applicants はモック応答に差し替える。
 * DB 起動済み環境で E2E を回したい場合は `route.fulfill` の部分を外せばよい。
 */
test("申込フォーム送信で /apply/thanks に遷移する", async ({ page }) => {
  await page.route("**/api/applicants", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, applicantId: "e2e_test_id" }),
    });
  });

  await page.goto("/apply");

  // --- Step 1: 基本情報 ---
  await page.getByLabel("姓").fill("テスト");
  await page.getByLabel("名").fill("花子");
  await page.getByLabel("セイ（カタカナ）").fill("テスト");
  await page.getByLabel("メイ（カタカナ）").fill("ハナコ");
  await page.getByLabel("生年月日").fill("1995-04-12");
  await page.getByLabel("女性").check();
  await page.getByRole("button", { name: "次へ" }).click();

  // --- Step 2: 連絡先・国籍 ---
  await page.getByLabel("メールアドレス").fill("e2e+anon@example.test");
  await page.getByLabel("電話番号").fill("090-0000-0001");
  // 言語は既定 (日本語) のまま進む
  await page.getByRole("button", { name: "次へ" }).click();

  // --- Step 3: 資格と希望職種（任意なのでそのまま進む） ---
  await page.getByLabel("看護師").check();
  await page.getByLabel("訪問看護（一般）").check();
  await page.getByRole("button", { name: "次へ" }).click();

  // --- Step 4: 確認と同意 ---
  await page.getByLabel("希望する").check();
  await page.getByLabel(/利用規約.+同意します。/).check();

  const submit = page.getByRole("button", { name: "申込を送信" });
  await expect(submit).toBeEnabled();
  await submit.click();

  await page.waitForURL("**/apply/thanks");
  await expect(page.getByRole("heading", { name: "申込を受け付けました" })).toBeVisible();
});
