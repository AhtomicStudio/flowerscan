import { expect, test } from "@playwright/test";

test("app shell loads over HTTPS", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "FlowerScan" })).toBeVisible();
  expect(page.url()).toMatch(/^https:/);
});
