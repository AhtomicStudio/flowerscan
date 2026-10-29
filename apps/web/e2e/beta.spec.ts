// T-034 search beta, end to end on the real built data (pnpm vault:build writes apps/web/public/data).
import { expect, type Page, test } from "@playwright/test";

const BETA_NOTICE = "Beta: our strain data is still being reviewed.";

/** Fails the test on any request that leaves our origin (privacy: no network beyond /data/, no analytics). */
function guardNetwork(page: Page): string[] {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== "https://localhost:4173") foreign.push(request.url());
  });
  return foreign;
}

async function passGate(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Are you 21 or older?" })).toBeVisible();
  await page.getByRole("button", { name: "I'm 21 or older" }).click();
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("gate → search blue dream → result → Details → family tree → Search another", async ({
  page,
}) => {
  const foreign = guardNetwork(page);
  await page.goto("/");
  expect(page.url()).toMatch(/^https:/);
  await passGate(page);

  const box = page.getByRole("searchbox", { name: "Search strains" });
  await expect(box).toBeFocused();
  await box.fill("blue dream");
  const row = page.getByRole("link", { name: /^Blue Dream/ });
  await expect(row).toBeVisible();
  await row.click();

  await expect(page).toHaveURL(/\/s\/blue-dream$/);
  const name = page.getByRole("heading", { level: 1, name: "Blue Dream" });
  await expect(name).toBeFocused();
  const word = page.getByTestId("answer-word");
  await expect(word).toHaveText(/^(Indica|Sativa|Hybrid|Unknown lineage)$/);
  await expect(page.getByText("Effects vary person to person. Start low, go slow.")).toBeVisible();
  await expect(page.locator('meta[name="theme-color"]')).not.toHaveAttribute("content", "#0b0d0c");

  await page.getByRole("button", { name: "Details" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Details" })).toBeFocused();
  await expect(page.getByTestId("basis-line")).toBeVisible();
  await page.getByRole("button", { name: /How we know/ }).click();
  const tree = page.getByRole("list", { name: "Family tree" });
  await expect(tree).toBeVisible();
  await expect(tree.getByText("Blue Dream", { exact: true })).toBeVisible();
  await expect(tree.getByRole("link").first()).toBeVisible();

  await page.getByRole("button", { name: /Search another/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0b0d0c");

  expect(foreign).toEqual([]);
});

test("search tolerates typos", async ({ page }) => {
  await page.goto("/");
  await passGate(page);
  await page.getByRole("searchbox").fill("blu dream");
  await expect(page.getByRole("link", { name: /^Blue Dream/ })).toBeVisible();
  await page.getByRole("searchbox").fill("zzqxw");
  await expect(page.getByText("We don't have that strain yet.")).toBeVisible();
});

test("a deep link /s/<id> sits behind the gate and opens after yes", async ({ page }) => {
  const foreign = guardNetwork(page);
  let dataRequested = false;
  page.on("request", (request) => {
    if (request.url().includes("/data/")) dataRequested = true;
  });
  await page.goto("/s/blue-dream");
  await expect(page.getByRole("heading", { level: 1, name: "Are you 21 or older?" })).toBeVisible();
  expect(dataRequested).toBe(false);
  await passGate(page);
  await expect(page).toHaveURL(/\/s\/blue-dream$/);
  await expect(page.getByRole("heading", { level: 1, name: "Blue Dream" })).toBeVisible();

  await page.goto("/s/does-not-exist");
  await expect(page.getByRole("heading", { name: "We can't find that strain." })).toBeVisible();
  expect(foreign).toEqual([]);
});

test("Leave closes the app on this device, across reloads and routes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByText(/stays closed on this device for 24 hours/)).toBeVisible();
  await page.goto("/s/blue-dream");
  await expect(page.getByText(/stays closed on this device for 24 hours/)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
});

test("the beta notice follows the data version", async ({ page, request }) => {
  const latest = (await (await request.get("/data/latest.json")).json()) as {
    data_version: string;
  };
  const beta = latest.data_version.endsWith("-dev");
  await page.goto("/");
  await passGate(page);
  await page.getByRole("searchbox").fill("blue dream");
  await expect(page.getByRole("link", { name: /^Blue Dream/ })).toBeVisible();
  await expect(page.getByText(BETA_NOTICE)).toHaveCount(beta ? 1 : 0);
  await page.getByRole("link", { name: /^Blue Dream/ }).click();
  await expect(page.getByText(BETA_NOTICE)).toHaveCount(beta ? 1 : 0);
  if (beta) await expect(page.getByText(BETA_NOTICE)).toBeVisible();
});

for (const width of [390, 320]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await passGate(page);
    await page.getByRole("searchbox").fill("platinum girl scout cookies");
    await expect(page.getByRole("link").nth(1)).toBeVisible();
    await noSidewaysScroll(page);
    await page.getByRole("link", { name: /^Platinum Girl Scout Cookies/ }).click();
    await expect(page.getByTestId("answer-word")).toBeVisible();
    await noSidewaysScroll(page);
    const wordBox = await page.getByTestId("answer-word").boundingBox();
    expect((wordBox?.x ?? 0) + (wordBox?.width ?? 0)).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Details" }).click();
    await page.getByRole("button", { name: /How we know/ }).click();
    await noSidewaysScroll(page);
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "About FlowerScan" })).toBeVisible();
    await noSidewaysScroll(page);
  });
}

test("reduced motion: no flood circle, the answer crossfades in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/s/blue-dream");
  await passGate(page);
  await expect(page.getByTestId("answer-word")).toBeVisible();
  await expect(page.locator(".flood-circle")).toBeHidden();
  const background = await page
    .getByRole("main")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
});

test("200% text: the answer word stays on screen and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/s/blue-dream");
  await passGate(page);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  const word = page.getByTestId("answer-word");
  await expect(word).toBeVisible();
  const box = await word.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: /Search another/ })).toBeInViewport();
  await noSidewaysScroll(page);
});

test("filler sweep: no %, THC or potency on any real strain's result", async ({
  page,
  request,
}) => {
  const latest = (await (await request.get("/data/latest.json")).json()) as { hash: string };
  const strains = (await (await request.get(`/data/${latest.hash}/strains.json`)).json()) as {
    id: string;
  }[];
  expect(strains.length).toBeGreaterThan(0);
  await page.goto("/");
  await passGate(page);
  await expect(page.getByRole("searchbox")).toBeVisible();
  for (const { id } of strains) {
    // Client-side navigation: the same app instance, so the data loads once.
    await page.evaluate((path) => {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, `/s/${id}`);
    await expect(page.getByTestId("answer-word")).toBeVisible();
    await page.getByRole("button", { name: /How we know/ }).click();
    const text = (await page.locator("body").textContent()) ?? "";
    expect(text, id).not.toMatch(/%|\bTHCa?\b|\bCBD\b|potency|\bN\/A\b|50\s*\/\s*50/i);
  }
});
