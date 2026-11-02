import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import "./admin-helpers";

const configured = !!process.env.SUPABASE_SECRET_KEY && process.env.E2E_LINKS === "1";

test("an invite-style link lets the admin set a password and lands on Stories", async ({ page }) => {
  test.skip(!configured, "needs the localhost redirect URL allowed in Supabase (set E2E_LINKS=1 once it is)");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery", email: "e2e-admin@tappioca.test", options: { redirectTo: "http://localhost:3000/admin/set-password" },
  });
  expect(error).toBeNull();
  await page.goto(data.properties!.action_link);
  await expect(page).toHaveURL(/\/admin\/set-password/);
  await page.getByLabel("New password").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByLabel("Type it again").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stories");
});

test("without a link, the page says so", async ({ page }) => {
  await page.goto("/admin/set-password");
  await expect(page.locator(".a-alert")).toContainText("missing or has expired");
});
