import { expect, test } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

const clean = async () => { await secretClient().from("comments").delete().like("name", "(e2e%"); };
test.beforeAll(async () => {
  await clean();
  const db = secretClient();
  const { data: fic } = await db.from("fics").select("id").eq("slug", "sample-fic").single();
  const { data: ch } = await db.from("chapters").select("id").eq("fic_id", fic!.id).eq("position", 1).single();
  await db.from("comments").insert([
    { chapter_id: ch!.id, name: "(e2e admin one)", body: "(e2e first question)" },
    { chapter_id: ch!.id, name: "(e2e admin two)", body: "(e2e second thought)" },
  ]);
});
test.afterAll(clean);

test("the comments screen requires signing in", async ({ page }) => {
  await page.goto("/admin/comments");
  await expect(page).toHaveURL(/\/admin-login/);
});

test("the author replies and the reply shows on the public chapter as the author's", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Comments" }).click();
  await expect(page).toHaveURL(/\/admin\/comments$/);
  const row = page.locator(".a-comment", { hasText: "(e2e first question)" });
  await expect(row).toContainText("(sample fic)");
  await expect(row).toContainText("(e2e admin one)");
  await row.getByText("Reply", { exact: true }).click();
  await row.getByLabel("Your reply").fill("(e2e my answer)");
  await row.getByRole("button", { name: "Send reply" }).click();
  await expect(row.locator(".a-comment-reply")).toContainText("(e2e my answer)");
  await page.goto("/fics/sample-fic/1");
  const reply = page.locator(".comment[data-author='true']", { hasText: "(e2e my answer)" });
  await expect(reply).toContainText("Author");
});

test("hiding a comment removes it from the public page and it can be shown again", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/comments");
  const row = page.locator(".a-comment", { hasText: "(e2e second thought)" });
  await row.getByRole("button", { name: "Hide" }).click();
  await expect(row).toContainText("Hidden");
  await page.goto("/fics/sample-fic/1");
  await expect(page.getByText("(e2e second thought)")).toHaveCount(0);
  await page.goto("/admin/comments");
  await page.locator(".a-comment", { hasText: "(e2e second thought)" }).getByRole("button", { name: "Show" }).click();
  await expect(page.locator(".a-comment", { hasText: "(e2e second thought)" })).not.toContainText("Hidden");
  await page.goto("/fics/sample-fic/1");
  await expect(page.getByText("(e2e second thought)")).toBeVisible();
});
