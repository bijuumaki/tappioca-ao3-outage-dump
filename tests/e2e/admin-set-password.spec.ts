import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import "./admin-helpers";
import { ensureAdmin } from "../support/supabase-admin";

const configured = !!process.env.SUPABASE_SECRET_KEY;

test("an invite-style link lets the admin set a password and lands on Stories", async ({ page }) => {
  test.skip(!configured, "needs SUPABASE_SECRET_KEY");
  const email = "e2e-invite@tappioca.test";
  const fresh = `pw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await ensureAdmin(email, `old-${fresh}`);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery", email, options: { redirectTo: "http://localhost:3000/admin/set-password" },
  });
  expect(error).toBeNull();
  await page.goto(data.properties!.action_link);
  await expect(page).toHaveURL(/\/admin\/set-password/);
  await page.getByLabel("New password").fill(fresh);
  await page.getByLabel("Type it again").fill(fresh);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stories");
});

test("without a link, the page says so", async ({ page }) => {
  await page.goto("/admin/set-password");
  await expect(page.locator(".a-alert")).toContainText("missing or has expired");
});
