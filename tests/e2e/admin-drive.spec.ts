import { expect, test, type APIRequestContext } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

const MOCK = "http://127.0.0.1:4011";
const control = (request: APIRequestContext, data: object) => request.post(`${MOCK}/__control`, { data });
const state = async (request: APIRequestContext) => (await request.get(`${MOCK}/__state`)).json() as Promise<{ files: { path: string; content: string }[]; calls: string[] }>;
const md = (name: string, text: string) => ({ name, mimeType: "text/markdown", buffer: Buffer.from(text) });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e drive%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
  await db.from("tags").delete().like("name", "(e2e drive%");
  for (const folder of ["fics/new", ...(data ?? []).map((f) => `fics/${f.id}`)]) {
    const { data: files } = await db.storage.from("uploads").list(folder);
    const mine = (files ?? []).filter((x) => x.name.includes("e2e")).map((x) => `${folder}/${x.name}`);
    if (mine.length) await db.storage.from("uploads").remove(mine);
  }
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test.beforeEach(async ({ page, request }) => {
  await control(request, { reset: true });
  await signIn(page);
  await page.goto("/admin/uploads");
  await expect(page.locator(".a-drive-status")).not.toContainText(/checking/i, { timeout: 15_000 });
  const status = (await page.locator(".a-drive-status").textContent()) ?? "";
  test.skip(!/\(mock\) Fic Library/i.test(status), "the app isn't using the mock Drive; these tests must never touch the real one");
});

test("the status line says Drive is connected", async ({ page }) => {
  await expect(page.locator(".a-drive-status")).toContainText(/connected to \(mock\) Fic Library/i);
});

test("an upload with the box ticked also saves the original to Drive", async ({ page, request }) => {
  const box = page.getByLabel("Also save originals to Google Drive");
  await expect(box).toBeChecked();
  await page.getByLabel("Choose files for a new fic").setInputFiles(md("(e2e drive ui) - 1.md", "drive words"));
  const row = page.locator(".a-results li");
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await expect(row).toContainText(/converted/i);
  await expect(row).toContainText(/saved to Google Drive/i);
  const s = await state(request);
  expect(s.files.map((f) => f.path)).toEqual(["Unsorted/(e2e drive ui) - 1.md"]);
  expect(s.files[0].content).toBe("drive words");
});

test("with the box cleared nothing is sent to Drive", async ({ page, request }) => {
  await page.getByLabel("Also save originals to Google Drive").uncheck();
  await page.getByLabel("Choose files for a new fic").setInputFiles(md("(e2e drive off) - 1.md", "stay home"));
  const row = page.locator(".a-results li");
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await expect(row).toContainText(/converted/i);
  await expect(row).not.toContainText(/Google Drive/i);
  expect((await state(request)).files).toEqual([]);
});

test("if saving to Drive fails the chapter is still made and the line says why", async ({ page, request }) => {
  await control(request, { failPut: true });
  await page.getByLabel("Choose files for a new fic").setInputFiles(md("(e2e drive down) - 1.md", "still here"));
  const row = page.locator(".a-results li");
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await expect(row).toContainText(/converted/i);
  await expect(row).toContainText(/couldn’t save to Google Drive/i);
  await row.getByRole("link", { name: "Open in editor" }).click();
  await expect(page.locator(".a-editor .ProseMirror")).toContainText("still here");
});

test("files from the Drive folder can be imported as draft chapters, without sending them back", async ({ page, request }) => {
  await control(request, { add: [
    { path: "Resident Evil/(e2e drive imp) - 1.md", content: "first imported words" },
    { path: "Resident Evil/(e2e drive imp) - 2.md", content: "second imported words" },
  ] });
  await page.getByRole("button", { name: "Show my Drive files" }).click();
  const list = page.locator(".a-drive-files li");
  await expect(list).toHaveCount(2);
  await expect(list.first()).toContainText("Resident Evil/");
  await page.getByLabel("Resident Evil/(e2e drive imp) - 1.md").check();
  await page.getByLabel("Resident Evil/(e2e drive imp) - 2.md").check();
  await page.getByRole("button", { name: "Convert selected" }).click();
  const results = page.locator(".a-results li");
  await expect(results).toHaveCount(2, { timeout: 30_000 });
  await expect(results.first()).toContainText(/converted/i);
  await results.first().getByRole("link", { name: "Open in editor" }).click();
  await expect(page.locator('[aria-label="Chapters"] li')).toHaveCount(2);
  expect((await state(request)).calls.filter((c) => c.startsWith("put"))).toEqual([]);
});

test("when the Drive address is wrong the status line explains, and uploads still work", async ({ page, request }) => {
  await control(request, { mode: "html" });
  await page.reload();
  await expect(page.locator(".a-drive-status")).toContainText(/web page|Anyone/i);
  await expect(page.getByLabel("Also save originals to Google Drive")).toHaveCount(0);
  await page.getByLabel("Choose files for a new fic").setInputFiles(md("(e2e drive broken) - 1.md", "works anyway"));
  await expect(page.locator(".a-results li")).toContainText(/converted/i, { timeout: 30_000 });
});

test("a long library says it was cut off, and one folder can be shown on its own", async ({ page, request }) => {
  await control(request, { listLimit: 2, add: [
    { path: "Resident Evil/(e2e drive big) - 1.md", content: "a" }, { path: "Resident Evil/(e2e drive big) - 2.md", content: "b" },
    { path: "Naruto/(e2e drive big) - 3.md", content: "c" },
  ] });
  await page.getByRole("button", { name: "Show my Drive files" }).click();
  await expect(page.locator(".a-drive-files li")).toHaveCount(2);
  await expect(page.getByText(/showing the first 2 files/i)).toBeVisible();
  await page.getByLabel("Only this folder").fill("Naruto");
  await page.getByRole("button", { name: "Show my Drive files" }).click();
  await expect(page.locator(".a-drive-files li")).toHaveCount(1);
  await expect(page.locator(".a-drive-files li")).toContainText("Naruto/");
  await expect(page.getByText(/showing the first/i)).toHaveCount(0);
});
