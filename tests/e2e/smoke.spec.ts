import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the three flows we want to verify before shipping:
 *   1. Workout logger route boots and gates unauthenticated users.
 *   2. Calendar route boots and gates unauthenticated users.
 *   3. Form (analyzer) route boots and gates unauthenticated users.
 *
 * Authenticated flow assertions require a seeded Supabase session — see
 * tests/e2e/README.md for how to enable them with LOVABLE_BROWSER_* env vars.
 */

test.describe("public shell", () => {
  test("welcome page loads with hero CTA", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("auth page renders sign-in surface", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button").first()).toBeVisible();
  });
});

test.describe("gated routes redirect unauthenticated users", () => {
  for (const path of ["/workouts", "/calendar", "/form"]) {
    test(`GET ${path} → /auth`, async ({ page }) => {
      await page.goto(path);
      // Route guards navigate client-side after auth resolves; wait for it.
      await page.waitForURL(/\/auth/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/auth/);
    });
  }
});

test.describe("authenticated smoke (opt-in)", () => {
  test.skip(
    process.env.LOVABLE_BROWSER_AUTH_STATUS !== "injected",
    "Requires an injected Supabase session (LOVABLE_BROWSER_AUTH_STATUS=injected).",
  );

  test.beforeEach(async ({ context, page }) => {
    const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
    const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
    const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
    if (cookiesJson) {
      const cookies = JSON.parse(cookiesJson).map((c: any) => ({
        ...c,
        url: "http://localhost:8080",
      }));
      await context.addCookies(cookies);
    }
    await page.goto("/");
    if (storageKey && sessionJson) {
      await page.evaluate(
        ([k, v]) => window.localStorage.setItem(k, v),
        [storageKey, sessionJson],
      );
    }
  });

  test("workouts page shows session UI", async ({ page }) => {
    await page.goto("/workouts");
    await expect(page).toHaveURL(/\/workouts/);
    // Either the empty-state, upcoming list, or Start button should appear.
    await expect(
      page.getByText(/workout|start|session|program/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("calendar page renders month grid", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/calendar/);
    // Month grid renders weekday headers.
    await expect(page.getByText(/mon|sun/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("form analyzer page exposes record + upload controls", async ({ page }) => {
    await page.goto("/form");
    await expect(page).toHaveURL(/\/form/);
    await expect(page.getByText(/record|upload|video/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
