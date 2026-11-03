import { expect, test } from "@playwright/test";

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

  await notice.getByRole("button", { name: "Continue to the story" }).click();
  await page.goto("/fics/sample-mature");
  await expect(page.getByRole("heading", { name: "Content notice" })).toHaveCount(0);
  await expect(page.getByText("You have seen the content notice for this story (Mature).")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start reading" })).toBeVisible();
});
