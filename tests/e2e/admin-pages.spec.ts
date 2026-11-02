import { expect, test } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

const SLUGS = ["howdy", "archive", "about", "disclaimer", "links", "comms"];
let original: Record<string, string> = {};

test.beforeAll(async () => {
  const { data } = await secretClient().from("pages").select("slug, body").in("slug", SLUGS);
  original = Object.fromEntries((data ?? []).map((p) => [p.slug, p.body]));
});
test.afterAll(async () => {
  const db = secretClient();
  for (const [slug, body] of Object.entries(original)) await db.from("pages").update({ body }).eq("slug", slug);
});

test("the Pages screen lists all six texts", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Pages" }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await expect(page.locator("[data-page]")).toHaveCount(6);
  for (const slug of SLUGS) await expect(page.locator(`[data-page="${slug}"] .ProseMirror`)).toBeVisible();
});

test("Howdy written here shows on the home page", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/pages");
  await page.locator('[data-page="howdy"] .ProseMirror').click();
  await page.keyboard.type("(e2e howdy)");
  await expect(page.locator('[data-page="howdy"] .a-save-state')).toHaveText(/saved/i, { timeout: 10_000 });
  await page.goto("/");
  await expect(page.locator(".howdy")).toContainText("(e2e howdy)");
});

test("a link in the Links text stays a link on the public page", async ({ page }) => {
  await secretClient().from("pages").update({ body: '<p>find me <a href="https://example.com/e2e">here</a></p>' }).eq("slug", "links");
  await signIn(page);
  await page.goto("/admin/pages");
  const field = page.locator('[data-page="links"] .ProseMirror');
  await field.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" thanks");
  await expect(page.locator('[data-page="links"] .a-save-state')).toHaveText(/saved/i, { timeout: 10_000 });
  await page.goto("/links");
  await expect(page.locator('.links-page a[href="https://example.com/e2e"]')).toHaveText("here");
  await expect(page.locator(".links-page")).toContainText("thanks");
});

test("a signed-out visitor can't open the Pages screen", async ({ page }) => {
  await page.goto("/admin/pages");
  await expect(page).toHaveURL(/\/admin\/login/);
});
