import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e upload%");
  for (const f of data ?? []) {
    const { data: imgs } = await db.storage.from("media").list(`fics/${f.id}/images`);
    if (imgs?.length) await db.storage.from("media").remove(imgs.map((x) => `fics/${f.id}/images/${x.name}`));
    await db.from("fics").delete().eq("id", f.id);
  }
  for (const folder of ["fics/new", ...(data ?? []).map((f) => `fics/${f.id}`)]) {
    const { data: files } = await db.storage.from("uploads").list(folder);
    const mine = (files ?? []).filter((x) => x.name.includes("e2e")).map((x) => `${folder}/${x.name}`);
    if (mine.length) await db.storage.from("uploads").remove(mine);
  }
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

const md = (name: string, text: string) => ({ name, mimeType: "text/markdown", buffer: Buffer.from(text) });
const DOCS_HTML = '<b style="font-weight:normal" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:700;font-style:italic">Third</span> chapter words</p></b>';

async function openUploads(page: Page) {
  await signIn(page);
  await page.getByRole("link", { name: "Uploads" }).click();
  await expect(page).toHaveURL(/\/admin\/uploads$/);
}

test("two numbered files become one fic with two draft chapters, and a third can be added to its folder", async ({ page }) => {
  await openUploads(page);
  await page.getByLabel("Choose files for a new fic").setInputFiles([md("(e2e upload) - 1.md", "first chapter words"), md("(e2e upload) - 2.md", "second chapter words")]);
  const results = page.locator(".a-results li");
  await expect(results).toHaveCount(2, { timeout: 30_000 });
  await expect(results.nth(0)).toContainText(/converted/i);
  await expect(results.nth(1)).toContainText(/converted/i);
  await results.first().getByRole("link", { name: "Open in editor" }).click();
  await expect(page.locator('[aria-label="Chapters"] li')).toHaveCount(2);
  await expect(page.locator('[aria-label="Chapters"] li').first()).toContainText(/draft/i);

  await page.goto("/admin/uploads");
  const folder = page.locator('[aria-label="Folder (e2e upload)"]');
  await expect(folder).toContainText("fics/e2e-upload/");
  await folder.getByLabel("Add files to (e2e upload)").setInputFiles({ name: "(e2e upload) - 3.html", mimeType: "text/html", buffer: Buffer.from(DOCS_HTML) });
  await expect(page.locator(".a-results li")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(".a-results li")).toContainText(/converted/i);
  await page.locator(".a-results").getByRole("link", { name: "Open in editor" }).click();
  await expect(page.locator('[aria-label="Chapters"] li')).toHaveCount(3);
});

test("a file type I can't read is refused with a clear message, without sending anything", async ({ page }) => {
  await openUploads(page);
  await page.getByLabel("Choose files for a new fic").setInputFiles({ name: "program.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
  await expect(page.locator(".a-upload-problems")).toContainText("isn’t a type I can read");
  await expect(page.locator(".a-results li")).toHaveCount(0);
});

test("a broken file is reported while a good one in the same batch still goes through", async ({ page }) => {
  await openUploads(page);
  await page.getByLabel("Choose files for a new fic").setInputFiles([
    { name: "(e2e upload broken).epub", mimeType: "application/epub+zip", buffer: Buffer.from("not a zip") },
    md("(e2e upload fine).md", "fine words"),
  ]);
  const results = page.locator(".a-results li");
  await expect(results).toHaveCount(2, { timeout: 30_000 });
  await expect(results.filter({ hasText: "broken" })).toContainText(/couldn’t convert/i);
  await expect(results.filter({ hasText: "fine" })).toContainText(/converted/i);
});

test("a signed-out visitor can't open the Uploads screen", async ({ page }) => {
  await page.goto("/admin/uploads");
  await expect(page).toHaveURL(/\/admin-login/);
});
