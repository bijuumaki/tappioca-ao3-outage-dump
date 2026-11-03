import { expect, test, type Page } from "@playwright/test";

/* Clicks "Continue to the story" until the page has really saved it (the first click can land before the page is interactive). */
async function acceptNotice(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Continue to the story" }).click({ timeout: 1000 });
    expect(await page.evaluate(() => localStorage.getItem("fic-site-ack"))).toContain("sample-mature");
  }).toPass();
}

test("story page shows the details, tags and a start button", async ({ page }) => {
  await page.goto("/fics/sample-fic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("(sample fic)");
  const details = page.locator("dl.story-details");
  for (const label of ["Rating", "Relationships", "Words", "Chapters", "Status", "Updated"]) {
    await expect(details.locator("dt", { hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  }
  await expect(details).toContainText("Teen and Up");
  await expect(details).toContainText("675 words");
  await expect(page.getByRole("link", { name: "(sample fandom)" }).first()).toHaveAttribute("href", "/tags/fandom/sample-fandom");
  await expect(page.getByRole("list", { name: "Tags" }).locator("li")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Start reading" })).toHaveAttribute("href", "/fics/sample-fic/1");
  await expect(page.getByRole("link", { name: "Back to the fic list" })).toHaveAttribute("href", "/fics");
  await expect(page.locator(".story-chapters li")).toHaveCount(3);
  await expect(page.getByText("Content notice")).toHaveCount(0);
});

test("a one-chapter story has the same page and no chapter text on it", async ({ page }) => {
  await page.goto("/fics/sample-oneshot");
  await expect(page.getByRole("link", { name: "Start reading" })).toHaveAttribute("href", "/fics/sample-oneshot/1");
  await expect(page.getByText("Duis aute irure dolor in reprehenderit.")).toHaveCount(0);
  await expect(page.locator(".story-chapters li")).toHaveCount(1);
});

test("a story with no chapters says so and has no start button", async ({ page }) => {
  await page.goto("/fics/sample-empty");
  await expect(page.getByText("No chapters yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start reading" })).toHaveCount(0);
});

test("the story page still works when the browser blocks saved settings", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("blocked"); };
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
  });
  await page.goto("/fics/sample-fic");
  await expect(page.getByRole("link", { name: "Start reading" })).toBeVisible();
  await page.goto("/fics/sample-mature");
  await expect(page.getByRole("heading", { name: "Content notice" })).toBeVisible();
});

test("a Mature story shows a content notice before any chapter opens", async ({ page }) => {
  await page.goto("/fics/sample-mature");
  const notice = page.getByRole("region", { name: "Content notice" });
  await expect(notice).toContainText("This story is rated Mature. It may contain adult content.");
  await expect(notice).toContainText("(sample warning)");
  await expect(page.getByText("Read the content notice above to open a chapter.")).toBeVisible();
  await expect(page.locator(".story-chapters button:disabled")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Start reading" })).toHaveCount(0);
  await expect(notice.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/fics");

  await acceptNotice(page);
  await page.goto("/fics/sample-mature");
  await expect(page.getByRole("heading", { name: "Content notice" })).toHaveCount(0);
  await expect(page.getByText("You have seen the content notice for this story (Mature).")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start reading" })).toBeVisible();
});

test("the story page offers to resume where you left off", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await page.goto("/fics/sample-fic");
  await expect(page.getByRole("link", { name: "Resume at chapter 2" })).toHaveAttribute("href", "/fics/sample-fic/2");
  await expect(page.locator(".story-chapters li").nth(1)).toContainText("Resume here");
});

test("a chapter page remembers your place in this browser", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("fic-site-place"))).toContain("sample-fic");
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem("fic-site-place")))!);
  expect(saved["sample-fic"]).toMatchObject({ n: 2, title: "(sample fic)", count: 3 });
});

test("a chapter page links back to the story details", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await expect(page.getByRole("link", { name: "Story details" })).toHaveAttribute("href", "/fics/sample-fic");
});

test("a one-chapter story is read at chapter 1 with no chapter controls", async ({ page }) => {
  const res = await page.goto("/fics/sample-oneshot/1");
  expect(res!.status()).toBe(200);
  await expect(page).toHaveURL(/\/fics\/sample-oneshot\/1$/);
  await expect(page.getByText("Duis aute irure dolor in reprehenderit.")).toBeVisible();
  await expect(page.locator(".chapter-label")).toHaveText("Chapter 1 · 6 words");
  await expect(page.locator(".chapter-buttons")).toHaveCount(0);
  await expect(page.locator(".touch-nav")).toHaveCount(0);
  await expect(page.locator(".progress")).toHaveCount(0);
});

test("a direct link to a Mature chapter shows the content notice instead of the text", async ({ page }) => {
  await page.goto("/fics/sample-mature/1");
  await expect(page.getByRole("heading", { name: "Content notice" })).toBeVisible();
  await expect(page.getByText("Mature sample text.")).toHaveCount(0);
  await acceptNotice(page);
  await expect(page.getByText("Mature sample text.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Content notice" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/fics\/sample-mature\/1$/);
  await page.reload();
  await expect(page.getByText("Mature sample text.")).toBeVisible();
});

test("a Mature chapter stays hidden when the browser blocks saved settings", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("blocked"); };
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
  });
  await page.goto("/fics/sample-mature/1");
  await expect(page.getByRole("heading", { name: "Content notice" })).toBeVisible();
  await expect(page.getByText("Mature sample text.")).toHaveCount(0);
});

test("the last chapter ends with an end-of-story box", async ({ page }) => {
  await page.goto("/fics/sample-fic/3");
  const end = page.getByRole("region", { name: "You have reached the end of (sample fic)" });
  await expect(end).toContainText("That was chapter 3, the last one.");
  await expect(end.getByRole("link", { name: "Read again" })).toHaveAttribute("href", "/fics/sample-fic/1");
  await expect(end.getByRole("link", { name: "More in (sample fandom)" })).toHaveAttribute("href", "/tags/fandom/sample-fandom");
  await expect(end.getByRole("link", { name: "Story details" })).toHaveAttribute("href", "/fics/sample-fic");
});

test("earlier chapters have no end-of-story box", async ({ page }) => {
  await page.goto("/fics/sample-fic/1");
  await expect(page.getByText("You have reached the end of")).toHaveCount(0);
});

test("a one-chapter story says that was the whole story", async ({ page }) => {
  await page.goto("/fics/sample-oneshot/1");
  await expect(page.getByText("That was the whole story.")).toBeVisible();
});

test("a back-to-top button appears near the bottom of a chapter and returns to the top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.goto("/fics/sample-fic/2");
  const button = page.getByRole("button", { name: "Back to top" });
  await expect(button).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(button).toBeVisible();
  expect((await button.boundingBox())!.width).toBe(48);
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(button).toBeHidden();
});
