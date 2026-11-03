# Plan 3: Catch the site up with the Claude Design canvas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build what the canvas "Tappioca Fic Archive" shows and the site doesn't have yet: story page with content notice, continue-reading, end of story, back-to-top, home re-ordering, publish check in admin (Stage A), then per-chapter comments with author replies and an email alert (Stage B).

**Architecture:** Stage A is mostly client-side reader memory (`localStorage`, no accounts) plus server-built pages, and one server-side rule ("basics before publish") shared by the admin dialog and the publish action. Stage B adds one table written only by a server action (secret key), read through RLS, and one Resend call that can never block a comment.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + migrations through the Supabase tool), Vitest, Playwright, plain CSS tokens, Resend REST API.

**Spec:** the canvas `https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP` (files `project/Site.dc.html`, `project/Admin.dc.html`, `project/canvas.json`; local copies under the session scratchpad `artifact-files/090b9f46-…/project/`), plus `docs/superpowers/specs/2026-11-02-fic-blog-design.md` for everything the canvas is silent on.

## Global Constraints

- Follow the canvas for layout, wording and states. Where the canvas is silent, use the existing site/admin CSS tokens (`app/tokens.css`, `app/globals.css`, `app/admin/admin.css`); no hard-coded colors or font sizes. Text sizes go through the existing `--t13…--t17`, `--h20`, `--h24`, `--h40` tokens so the whole-site text scale keeps working.
- Tap targets: 44px minimum, 48px for primary buttons (canvas values). Back-to-top button 48px under 600px wide, 40px otherwise.
- Exact canvas copy (keep verbatim): "Content notice", "This story is rated {Rating}. It may contain adult content.", "Continue to the story", "Go back", "You have seen the content notice for this story ({Rating}).", "Read the content notice above to open a chapter.", "Start reading", "Resume at chapter {N}", "Resume here", "Show all {N} chapters", "Show fewer chapters", "Continue reading", "Chapter {N} of {M}", "You have reached the end of {title}", "That was chapter {N}, the last one.", "That was the whole story.", "Read again", "More in {fandom}", "Story details", "Back to the fic list", "See the whole fic list", "More stories", "Back to top", "{N} things to fix before publishing", "1 thing to fix before publishing", "Publish “{title}”?", "Fix these to publish. You can still save a draft.", "Readers will see this story on the fic list as soon as you publish.", "Keep editing", "Save as draft", "Publish story", "Comments on chapter {N} ({count})", "No comments on this chapter yet.", "Your name", "Your comment", "Post comment", "Add your name and a comment to post.", "Add your name to post.", "Write a comment to post."
- Content notice applies to ratings `mature` and `explicit` only (canvas `ADULT = ['Explicit','Mature']`).
- Saved reader choices stay in this browser only; every `localStorage` access goes through `readPref`/`writePref` (`lib/client/prefs.ts`), which already swallow errors. Existing keys: `fic-site-theme|font|size|spacing|progress`. New keys: `fic-site-place`, `fic-site-ack`.
- Project rules (`CLAUDE.md`): commit locally only, no attribution lines in commit messages, never push without Bijuu saying so, don't delete anything not named `(e2e …`, don't run browser tests while she is writing, never print `.env.local` values. Admin email addresses never go in the repo (use env vars).
- Commits: every `git commit` in this plan means `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit ...` (no git identity is set on this Mac). One change = one commit. 21 commits are already waiting unpushed; when pushing, Bijuu decides, and everything goes in one push.
- No inline styles and no hard-coded colors: new styles are classes in `app/globals.css` / `app/admin/admin.css` using tokens (the canvas's inline styles are its prototype format, not the target).
- TDD: failing test first, watch it fail, then implement. Unit tests in `tests/unit`, DB tests in `tests/integration` (live Supabase, self-managed fixtures from `tests/support/fixtures.ts`), browser tests in `tests/e2e` (`--project=chromium` for public pages, `--project=admin` for admin).

## Review Focus

1. Blocked or cleared `localStorage` (private window): every reader page still works; an adult story shows the notice (safe default), nothing throws.
2. An adult story opened by a direct chapter link (`/fics/<slug>/3`) shows the content notice instead of the chapter text until accepted.
3. Calling the publish/schedule action for a story with a blank or "Untitled" title, empty summary, "Not Rated" or no fandom is refused on the server, not just in the dialog.
4. A story with zero chapters: story page says "No chapters yet." and has no Start button; a one-chapter story is read at `/fics/<slug>/1` and nothing links to the old inline oneshot.
5. A comment whose name/body contains `<script>`/HTML is shown as plain text and escaped in the alert email; a comment aimed at an unpublished, hidden or missing chapter is refused; a failing email never stops a comment from posting.

---

# STAGE A: reader pages and publish check (no database changes)

## File Structure (Stage A)

- Create `lib/client/reading-memory.ts`: browser-only memory of where each story was left and which content notices were accepted.
- Create `lib/client/back-to-top.ts`: the pure show/hide rule.
- Create `components/StoryOverview.tsx` (client): story page body (header, details, content notice, start/resume, chapter list).
- Create `components/ChapterGate.tsx` (client): wraps chapter text on adult stories.
- Create `components/RecordPlace.tsx` (client): records the chapter being read.
- Create `components/EndOfStory.tsx`, `components/BackToTop.tsx`, `components/ContinueReading.tsx`.
- Create `lib/admin/readiness.ts`, `components/admin/PublishCheck.tsx`.
- Modify `app/(site)/fics/[slug]/page.tsx`, `app/(site)/fics/[slug]/[n]/page.tsx`, `app/(site)/page.tsx`, `lib/content/queries.ts` (`getHomeData`, `HomeData`), `lib/admin/publish.ts`, `lib/admin/actions.ts`, `components/admin/PublishBar.tsx`, `app/globals.css`, `app/admin/admin.css`.
- Modify tests `tests/e2e/reader.spec.ts`, `home.spec.ts`, `admin-publish.spec.ts`, `admin-new-story.spec.ts`, `tests/integration/admin.test.ts` for the changed behavior.

### Task A1: Reading memory

**Files:** Create `lib/client/reading-memory.ts`; Test `tests/unit/reading-memory.test.ts`.

**Interfaces:**
- Produces:
  - `type Place = { n: number; title: string; count: number; at: number }`
  - `recordPlace(slug: string, p: { n: number; title: string; count: number }): void` (stamps `at: Date.now()`)
  - `placeOf(slug: string): Place | null`
  - `lastPlace(): ({ slug: string } & Place) | null` (the entry with the largest `at`)
  - `hasAck(slug: string): boolean`, `setAck(slug: string): void`

- [ ] **Step 1: Write failing tests** (stub `localStorage` with `vi.stubGlobal`): `recordPlace` then `placeOf` round-trips; `lastPlace` returns the later of two stories; `hasAck` is false until `setAck`; corrupt JSON in either key returns `null`/`false` and does not throw; with `localStorage` getter throwing, every function returns its empty value and does not throw.
- [ ] **Step 2: Run** `npx vitest run tests/unit/reading-memory.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** with JSON objects under `fic-site-place` (`Record<slug, Place>`) and `fic-site-ack` (`Record<slug, true>`), using `readPref`/`writePref`.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit** `git add lib/client/reading-memory.ts tests/unit/reading-memory.test.ts && git commit -m "Remember where each story was left and which content notices were accepted"`

### Task A2: Story page with content notice

**Files:** Create `components/StoryOverview.tsx`; Modify `app/(site)/fics/[slug]/page.tsx`, `app/globals.css`; Test `tests/e2e/story-page.spec.ts` (new, project `chromium`).

**Interfaces:**
- Consumes: `hasAck`, `setAck`, `placeOf` (A1); `getFic(slug): FicWithChapters` (existing); `mediaUrl`, `RATING_LABELS`, `STATUS_LABELS`, `formatWords`, `formatDate`, `fandomNames`.
- Produces: `StoryOverview(props: StoryOverviewProps)` where
  `StoryOverviewProps = { slug: string; title: string; coverUrl: string | null; fandom: string; summaryHtml: string; tags: { type: TagType; name: string; slug: string }[]; ratingLabel: string; adult: boolean; warnings: string[]; details: { k: string; v: string }[]; chapters: { n: number; label: string }[] }`.
  The server page builds `details` in the canvas order: Rating, Relationships, Words, Chapters, Status, Updated.

Behavior to build (canvas `isOverview`):
- Server-rendered state is "not yet accepted" for adult stories (safe default); after mount, `hasAck(slug)` flips it. Non-adult stories never show the notice.
- Cover is a 2:3 block (image or "[Cover]" well when none, using the existing `--border` well color); "Back to the fic list" link to `/fics` above.
- Notice (adult and not accepted): heading "Content notice", the rating line, a "Content warnings: …" line only if `warnings.length`, buttons "Continue to the story" (calls `setAck`, then navigates to `/fics/<slug>/1`) and "Go back" (link to `/fics`).
- Accepted or non-adult: primary button "Start reading" (to chapter 1) or, when `placeOf(slug)` exists, "Resume at chapter {n}" (to that chapter); for adult + accepted also the muted "You have seen the content notice for this story ({Rating})."
- Chapters list: first 6, toggle "Show all {N} chapters"/"Show fewer chapters" (`aria-expanded`) when more than 6; the row for the remembered chapter shows "Resume here". While the notice is showing, rows are disabled at 50% opacity with "Read the content notice above to open a chapter." above the list. No chapters: "No chapters yet." and no Start button.
- One-chapter stories use the same page; remove the inline oneshot rendering from the page.

- [ ] **Step 1: Write failing e2e tests** against the seeded fixtures (`(sample fic)` teen, 2+ chapters; `(sample oneshot)` general): (a) `/fics/sample-fic` shows Details rows "Rating", "Words", "Chapters" and a "Start reading" link to `/fics/sample-fic/1`; (b) `/fics/sample-oneshot` shows "Start reading" and no chapter text; (c) after visiting `/fics/sample-fic/2`, the story page shows "Resume at chapter 2" and a "Resume here" row; (d) with `localStorage` blocked via `addInitScript` the page still renders. For the notice: add a published `mature` fixture `(sample mature)` to `tests/support/fixtures.ts` (one chapter) and assert chapter rows are disabled, "Continue to the story" lands on `/fics/sample-mature/1`, and reloading the story page shows the "You have seen the content notice…" line.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/story-page.spec.ts --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement** `StoryOverview` and rebuild `FicPage` to pass props; add `.story-*` styles in `app/globals.css` from existing tokens (accent-bordered notice box using `--accent-text` border and `--card-bg`).
- [ ] **Step 4: Run again.** Expected: PASS. Also `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `git add -A components app tests && git commit -m "Story page: details, content notice for Mature and Explicit, start or resume"`

### Task A3: Chapter page: remember place, gate adult stories, one-chapter stories

**Files:** Create `components/RecordPlace.tsx`, `components/ChapterGate.tsx`; Modify `app/(site)/fics/[slug]/[n]/page.tsx`; Test `tests/e2e/story-page.spec.ts` (extend), `tests/e2e/reader.spec.ts` (update).

**Interfaces:**
- Consumes: `recordPlace`, `hasAck`, `setAck` (A1); `StoryOverview` notice copy (extract the notice block into an exported `ContentNotice({ ratingLabel, warnings, onAccept, backHref })` inside `components/StoryOverview.tsx` and reuse it here).
- Produces: `RecordPlace({ slug, title, n, count })` (effect only); `ChapterGate({ slug, adult, ratingLabel, warnings, children })` (renders `ContentNotice` instead of `children` when `adult` and not accepted; children are not rendered into the DOM while gated).

Also: remove the `redirect` for one-chapter stories (chapter 1 is now read at `/fics/<slug>/1`); show "Chapter 1" (no "of 1"), hide the chapter picker/touch nav/Previous-Next when `count === 1`; add a "Story details" link (to `/fics/<slug>`) at the top of the header per the canvas, keeping the title link.

- [ ] **Step 1: Write failing tests:** visiting `/fics/sample-mature/1` directly shows "Content notice" and not the chapter text; accepting reveals the text; `/fics/sample-oneshot/1` renders text, label "Chapter 1", and no "Next"; `RecordPlace` stores place (check via `page.evaluate(() => localStorage.getItem('fic-site-place'))`). Update `reader.spec.ts` expectations that assumed inline oneshot reading at `/fics/sample-oneshot` and the redirect.
- [ ] **Step 2: Run** the two specs. Expected: FAIL.
- [ ] **Step 3: Implement** as described.
- [ ] **Step 4: Run both specs.** Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "Chapter page remembers your place and shows the content notice on direct links; one-chapter stories read at chapter 1"` (after `git add` of new files).

### Task A4: End of story

**Files:** Create `components/EndOfStory.tsx`; Modify chapter page; Modify `app/globals.css`; Test `tests/e2e/story-page.spec.ts`.

**Interfaces:** `EndOfStory({ slug, title, count, fandom }: { slug: string; title: string; count: number; fandom: { name: string; slug: string } | null })`. Rendered only when `chapter.n === count`. Heading `You have reached the end of {title}`; body `That was chapter {count}, the last one.` (or `That was the whole story.` when `count === 1`); buttons "Read again" (link `/fics/<slug>/1`), "More in {fandom.name}" (link `/tags/fandom/<fandom.slug>`; label "More stories" linking `/fics` when no fandom), "Story details" (link `/fics/<slug>`). Stage B adds "Leave a comment".

- [ ] **Step 1: Write failing e2e:** last chapter of `(sample fic)` shows the heading and all three links with right hrefs; chapter 1 of it does not show the section; the oneshot's chapter shows "That was the whole story."
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "End of story section on the last chapter"` (add new files first).

### Task A5: Back to top

**Files:** Create `lib/client/back-to-top.ts`, `components/BackToTop.tsx`; Modify chapter page, `app/globals.css`; Test `tests/unit/back-to-top.test.ts`, `tests/e2e/story-page.spec.ts`.

**Interfaces:** `shouldShowTop(s: { width: number; y: number; vh: number; docHeight: number; upMode: boolean }): boolean`, true when `y + vh >= docHeight - 200`; and, when `width < 600`, also true when `upMode`. `upMode` is computed by the component from scroll deltas exactly like the canvas: update only when the scroll moved at least 8px; `upMode = moved < 0 && y > vh * 1.5`. `BackToTop` is a fixed round button, `aria-label="Back to top"`, arrow icon from the canvas path, size 48px under 600px else 40px, hidden with `visibility:hidden` (not display:none) plus opacity/translate transition, transition disabled under `prefers-reduced-motion`, scrolls smoothly to 0 (instantly under reduced motion).

- [ ] **Step 1: Write failing unit tests:** at top of a tall page → false; within 200px of bottom → true; phone width, mid-page, `upMode` true → true; desktop width, mid-page, `upMode` true → false.
- [ ] **Step 2: Run** `npx vitest run tests/unit/back-to-top.test.ts` → FAIL. **Step 3: Implement** rule. **Step 4: Run** → PASS.
- [ ] **Step 5: Write failing e2e:** viewport 390×300 on `/fics/sample-fic/1`: button not visible at top; after `scrollTo(0, document.body.scrollHeight)` it is visible; clicking returns `scrollY` to 0.
- [ ] **Step 6: Implement** `BackToTop`, mount it in the chapter page; run e2e → PASS.
- [ ] **Step 7: Commit** `git commit -am "Back to top button on chapters"` (after `git add`).

### Task A6: Home page in the canvas order, with Continue reading

**Files:** Create `components/ContinueReading.tsx`; Modify `app/(site)/page.tsx`, `lib/content/queries.ts`, `app/globals.css`; Test `tests/e2e/home.spec.ts`, `tests/integration/visibility.test.ts` (one assertion).

**Interfaces:**
- `HomeData` gains `moreFics: FicCardData[]`: published stories except the featured one, newest first, at most 6 (reuse the data `browse` already returns).
- `ContinueReading()` (client, no props): uses `lastPlace()`; renders nothing until mounted and nothing when no place. Section `aria-labelledby="resume-heading"`, heading "Continue reading", story title, `Chapter {n} of {count}`, and a "Resume" link to `/fics/<slug>/<n>`. Only offers a story that still exists is not checked here; the link may 404 gracefully to the site's not-found page.
- Home order (canvas `isHome`): title; ContinueReading; "Featured: {title}" bar + featured block; "More stories" bar + card grid (`FicCard`, existing) ; "See the whole fic list" button (link `/fics`); then the existing intro section (photo, archive box, Howdy, page buttons); then "Recent Art" only when posts exist (not in the canvas; kept because art posts are a stated requirement).

- [ ] **Step 1: Write failing tests:** `home.spec`: after visiting `/fics/sample-fic/2`, home shows "Continue reading", "Chapter 2 of …", and the Resume link; a fresh browser context shows no such section; "More stories" lists `(sample oneshot)` but not the featured `(sample fic)`; the "See the whole fic list" link goes to `/fics`; the "Featured" bar comes before the "Howdy" box in DOM order. Integration: `getHomeData().moreFics` excludes the featured fic and drafts/scheduled.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** both → PASS.
- [ ] **Step 5: Commit** `git commit -am "Home: continue reading, more stories, canvas section order"` (after `git add`).

### Task A7: Publish check (server rule, dialog, tests updated)

**Files:** Create `lib/admin/readiness.ts`, `components/admin/PublishCheck.tsx`; Modify `lib/admin/publish.ts`, `lib/admin/actions.ts`, `components/admin/PublishBar.tsx`, `app/admin/admin.css`; Test `tests/unit/readiness.test.ts`, `tests/integration/admin.test.ts`, `tests/e2e/admin-publish.spec.ts`; fix `admin-new-story.spec.ts` and any other admin spec that publishes a bare story.

**Interfaces:**
- Produces in `lib/admin/readiness.ts`:
  - `type Check = { key: "title" | "summary" | "rating" | "fandom"; label: string; ok: boolean; note: string }`
  - `storyChecks(d: { title: string; summaryHtml: string; rating: Rating; fandom: string }): Check[]` returning four checks in this order with labels "Story title", "Summary", "Rating", "Fandom". Title is missing when blank or exactly "Untitled" (the form default), note "Add a title above the chapter."; Summary is missing when the text left after stripping tags and `&nbsp;` is blank, note "Add a summary in story details."; Rating is missing for `not_rated`, note "Pick a rating. Not Rated can’t be published."; Fandom is missing when blank, note "Add a fandom in story details."; when ok, `note` is the value (title, plain-text summary, rating label, fandom).
  - `missingCount(checks: Check[]): number`
  - `publishBlockedMessage(checks: Check[]): string | null`: e.g. "Before publishing: add a summary and pick a rating." (null when nothing missing).
- Produces in `lib/admin/publish.ts`: `loadStoryChecks(db: Db, ficId: number): Promise<Check[]>` (reads title, summary, rating and the fic's fandom tag) and `publishChapterAt` now throws `new Error(publishBlockedMessage(...))` before writing when anything is missing (applies to scheduling too; unpublishing is never blocked).
- Produces in `lib/admin/actions.ts`: server action `getPublishChecks(ficId: number): Promise<{ ok: true; checks: Check[]; title: string; ratingLabel: string; adult: boolean } | { ok: false; error: string }>` (admin-only like the other actions).
- `PublishCheck` props: `{ checks: Check[]; title: string; adult: boolean; ratingLabel: string; busy: boolean; onKeepEditing(): void; onSaveDraft(): void; onPublish(): void }`. Dialog `role="dialog" aria-modal="true"`, `aria-labelledby="pub-title"`, `aria-describedby="pub-body"`; heading and body copy from Global Constraints; each check row has a ✓/! circle, bold label, visually hidden ", done" / ", needs attention", and the note; adult stories add the line "This story is rated {Rating}. Readers see a content notice before chapter 1."; "Publish story" is disabled at 50% opacity while anything is missing; Escape = Keep editing; focus moves into the dialog and returns to the Publish button on close.
- `PublishBar`: the Publish button saves (existing `saveDetailsNow` then `save`), calls `getPublishChecks`, and opens the dialog; "Publish story" runs the existing publish; "Save as draft" saves and closes. "Confirm schedule" keeps its direct path and shows the server's message in the existing alert when blocked.

- [ ] **Step 1: Write failing unit tests** (`readiness.test.ts`): all four ok for a complete story; title "Untitled" and "   " both missing; summary `<p></p>` and `<p>&nbsp;</p>` missing, `<p>Hi</p>` ok; `not_rated` missing; blank fandom missing; `missingCount` and `publishBlockedMessage` for 0, 1 and 3 missing.
- [ ] **Step 2: Run** `npx vitest run tests/unit/readiness.test.ts` → FAIL. **Step 3: Implement** `readiness.ts`. **Step 4: Run** → PASS.
- [ ] **Step 5: Write failing integration tests** (`admin.test.ts`): `publishChapterAt` rejects for a fixture fic with blank summary, with the message from `publishBlockedMessage`, and leaves `publish_at` null; it succeeds once summary, rating and fandom are set; scheduling is rejected the same way; `unpublishChapter` works on a story missing summary.
- [ ] **Step 6: Run** `npx vitest run tests/integration/admin.test.ts` → FAIL. **Step 7: Implement** `loadStoryChecks` and the guard. **Step 8: Run** → PASS.
- [ ] **Step 9: Write failing e2e** (`admin-publish.spec.ts`, project `admin`, named `(e2e …)` stories): a new story with only a title opens the dialog titled "2 things to fix before publishing" (summary, rating), "Publish story" is disabled; filling summary and rating then Publish shows `Publish “(e2e …)”?` and enabled button; publishing makes the story appear on `/fics`; an adult rating adds the content-notice line; Escape closes the dialog.
- [ ] **Step 10: Implement** `PublishCheck`, `getPublishChecks`, `PublishBar` changes, admin CSS. Update other admin specs/fixtures that publish bare stories to set summary, rating and fandom first.
- [ ] **Step 11: Run** `npx playwright test --project=admin` → PASS. Run `npx vitest run` and `npx tsc --noEmit` and `npm run build` → all green.
- [ ] **Step 12: Commit** `git commit -am "Publish check: a story needs title, summary, rating and fandom before it goes public"` (after `git add`).

### Task A8: Stage A wrap-up

- [ ] Run the whole suite (`npx vitest run`, `npx playwright test`, `npm run build`); all green.
- [ ] Update `CLAUDE.md` (new `fic-site-place` / `fic-site-ack` keys, oneshots read at `/fics/<slug>/1`, publish rule) and the memory file `tappioca-fic-blog-project.md`.
- [ ] Independent review of the Stage A branch by a fresh Opus reviewer against this plan and the canvas; fix findings; merge to local `main`. Do not push without Bijuu's say-so.

---

# STAGE B: comments (database + email)

Claude Design drew the reader's comment area only. It drew **no** comments screen in admin, no email field, no hearts, no subscribe. Stage B builds the reader area exactly as drawn and a plain admin screen from existing admin pieces (flagged as not designed). Hearts and subscribe wait for new canvas screens.

## File Structure (Stage B)

- Create `supabase/migrations/0010_comments.sql`; update `lib/supabase/database.types.ts`.
- Create `lib/comments/validate.ts`, `lib/comments/queries.ts`, `lib/email/resend.ts`.
- Create `components/Comments.tsx` (server list), `components/CommentForm.tsx` (client form), `app/(site)/comments/actions.ts` (`"use server"`).
- Create `app/admin/comments/page.tsx`, `lib/admin/comment-actions.ts` (`"use server"`), `components/admin/CommentRow.tsx`; modify `components/admin/AdminShell.tsx` (nav item), `app/admin/admin.css`.
- Tests: `tests/unit/comment-validate.test.ts`, `tests/unit/resend.test.ts`, `tests/integration/comments.test.ts`, `tests/e2e/comments.spec.ts`, `tests/e2e/admin-comments.spec.ts`.

### Task B1: Comments table and rules

**Files:** Create `supabase/migrations/0010_comments.sql`; Modify `lib/supabase/database.types.ts`; Test `tests/integration/comments.test.ts`.

Schema: `comments(id bigint identity pk, chapter_id bigint not null references chapters on delete cascade, parent_id bigint null references comments on delete cascade, name text not null check (char_length(name) between 1 and 60), body text not null check (char_length(body) between 1 and 5000), by_author boolean not null default false, hidden boolean not null default false, created_at timestamptz not null default now())` and `comment_meta(comment_id bigint pk references comments on delete cascade, ip_hash text not null, created_at timestamptz not null default now())` with an index on `(ip_hash, created_at)`. RLS on both: `comments` select for everyone when `hidden = false` and the chapter is live (same visibility rule as chapters: chapter `publish_at <= now()` and its fic `publish_at <= now()`); no insert/update/delete policy for anon or authenticated readers; admins (`private.is_admin()`) can select all and update/delete. `comment_meta`: RLS on, no policies for readers, admin select only.

- [ ] **Step 1: Write failing integration tests** (fixtures + reader client + secret client): the reader client sees a comment on a published chapter; does not see `hidden`, nor one on a draft/scheduled chapter; the reader client cannot insert, update or delete; `comment_meta` is unreadable to the reader client; deleting the chapter deletes its comments.
- [ ] **Step 2: Run** `npx vitest run tests/integration/comments.test.ts` → FAIL (no table).
- [ ] **Step 3: Apply migration** through `apply_migration` (use `alter policy` rather than drop/create if a change is needed later); run `get_advisors` (security) and fix any new warning; regenerate `database.types.ts`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git add supabase lib/supabase tests/integration/comments.test.ts && git commit -m "Add the comments tables with read-only access for readers"`

### Task B2: Posting rules and the Resend alert

**Files:** Create `lib/comments/validate.ts`, `lib/email/resend.ts`; Test `tests/unit/comment-validate.test.ts`, `tests/unit/resend.test.ts`.

**Interfaces:**
- `validateComment(input: { name: string; body: string; website?: string }): { ok: true; name: string; body: string } | { ok: false; error: string } | { ok: "skip" }`: trims; both empty → "Add your name and a comment to post."; name empty → "Add your name to post."; body empty → "Write a comment to post."; name over 60 → "Keep your name to 60 characters."; body over 5000 → "Keep your comment under 5,000 characters."; `website` (the hidden honeypot field) non-empty → `{ ok: "skip" }`.
- `sendCommentAlert(c: { ficTitle: string; chapterN: number; name: string; body: string; url: string }, deps?: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> }): Promise<void>`: POSTs to `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`, `from` = `RESEND_FROM`, `to` = `ALERT_EMAIL`, subject `New comment on {ficTitle}, chapter {n}`, HTML body with name/comment/title HTML-escaped and the link. Does nothing (no throw) when any of the three env vars is missing; never throws on network or non-2xx (logs one line without secrets).

- [ ] **Step 1: Write failing tests:** every `validateComment` case above plus a 60-char name accepted; `sendCommentAlert` with a fake `fetch`: called once with the right URL/headers/recipient, `<script>` in name and body appears escaped in `html`, missing env → fetch not called, fetch rejecting → resolves, 500 response → resolves.
- [ ] **Step 2: Run** both → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git add lib tests && git commit -m "Comment rules and the email alert, which can never block a comment"`

### Task B3: Reader comments on every chapter

**Files:** Create `lib/comments/queries.ts`, `components/Comments.tsx`, `components/CommentForm.tsx`, `app/(site)/comments/actions.ts`; Modify chapter page, `components/EndOfStory.tsx`, `app/globals.css`; Test `tests/integration/comments.test.ts` (extend), `tests/e2e/comments.spec.ts`.

**Interfaces:**
- `getComments(slug: string, n: number): Promise<{ id: number; name: string; body: string; byAuthor: boolean; createdAt: string; parentId: number | null }[]>` via the reader client (RLS decides visibility), oldest first.
- Server action `postComment(prev: CommentFormState, form: FormData): Promise<CommentFormState>` with `CommentFormState = { error: string; posted: boolean }`: runs `validateComment`; `skip` returns `{ posted: true }` without saving; resolves the chapter with `getChapter(slug, n)` (refuses if not live: "That chapter isn’t available."); throttles to 5 comments per `ip_hash` per 10 minutes ("Slow down a little and try again in a few minutes."), where `ip_hash` is a SHA-256 of the forwarded IP plus a server secret (`COMMENT_HASH_SALT`, falling back to `SUPABASE_SECRET_KEY` so no new setup is needed); inserts with the secret-key client (comment, then `comment_meta`); calls `sendCommentAlert` without awaiting failure; `revalidatePath` for the chapter. Form fields: `slug`, `n`, `name`, `body`, hidden honeypot `website` (visually hidden, `tabindex=-1`, `autocomplete=off`).
- `Comments({ slug, n })` (server) renders the section `aria-labelledby="comments-heading"` with `id="comments-heading"` heading `Comments on chapter {n} ({count})`, the list (name bold, date via `formatDate`, body with `white-space: pre-wrap`, plain text only, no lowercase transform on name/body), author replies indented under their parent with a small "Author" label, the empty line "No comments on this chapter yet.", and `CommentForm`. `CommentForm` uses `useActionState`; shows the error in a `role="alert"` paragraph; keeps the name and clears the comment after a successful post.
- `EndOfStory` gains a full-width primary button "Leave a comment" that scrolls to `#comments-heading` (smooth unless reduced motion).

- [ ] **Step 1: Write failing integration tests:** `postComment` stores a comment on a live chapter and `getComments` returns it; blank fields return the exact canvas errors and store nothing; honeypot filled stores nothing and reports posted; draft chapter refused; a 6th comment from the same hash within 10 minutes refused; HTML in the body round-trips as text.
- [ ] **Step 2: Write failing e2e** (`comments.spec.ts`, comments named `(e2e …)` and removed in cleanup): fill name and comment on `/fics/sample-fic/1`, post, see it in the list and the count heading change; empty submit shows "Add your name and a comment to post."; `<b>x</b>` shows literally; end-of-story "Leave a comment" focuses/scrolls to the comments heading.
- [ ] **Step 3: Run** both → FAIL. **Step 4: Implement.** **Step 5: Run** both → PASS.
- [ ] **Step 6: Commit** `git add -A app components lib tests && git commit -m "Readers can comment on each chapter"`

### Task B4: Admin Comments screen (not in the canvas)

**Files:** Create `app/admin/comments/page.tsx`, `lib/admin/comment-actions.ts`, `components/admin/CommentRow.tsx`; Modify `components/admin/AdminShell.tsx`, `app/admin/admin.css`; Test `tests/e2e/admin-comments.spec.ts`, `tests/integration/comments.test.ts`.

**Interfaces:** server actions (admin-only) `replyToComment(parentId: number, body: string): Promise<{ ok: true } | { ok: false; error: string }>` (inserts `by_author = true`, `name = "Author"`, same chapter as parent, length rules from `validateComment`, parent must not itself be a reply), `setCommentHidden(id: number, hidden: boolean)`. The page lists newest first (50 per page): story title linking to the chapter, chapter number, name, date, body, replies, a "Reply" disclosure with textarea, and "Hide"/"Show" button; hidden comments are dimmed with "Hidden". Reuses `a-*` admin classes and tokens.

- [ ] **Step 1: Write failing tests:** integration: a reply is stored `by_author`, shows in `getComments` under its parent, a reply to a reply is rejected; hiding removes it from `getComments`. e2e (`admin`): seeded comment appears on `/admin/comments`, replying shows on the public chapter with "Author"; hiding removes it from the public page; a signed-out request redirects to `/admin-login`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git add -A app components lib tests && git commit -m "Admin: see, reply to and hide comments"`

### Task B5: Stage B wrap-up

- [ ] Run the whole suite and `npm run build`; all green. Run `get_advisors` (security) once more.
- [ ] Update `CLAUDE.md`, `README.md` (env vars `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL`, optional `COMMENT_HASH_SALT`), `docs/` setup note, and the memory file. Bijuu adds the three env vars herself (locally in `.env.local`, and in Vercel when pushed; `RESEND_API_KEY` as Sensitive).
- [ ] Independent Opus review of the branch; fix; merge to local `main`. Do not push without Bijuu's say-so.

---

## Not in this plan (needs new canvas screens first)

Hearts, subscribe, reply-notification emails to commenters, RSS, image posts, tag/category screens, delete-story, the Drive option on the Uploads screen (the canvas has no Uploads or Drive screen; the working version stays as built until Claude Design draws it).

## Self-review notes

- Spec coverage: story page + content notice (A2, A3), continue reading (A1, A6), end of story (A4), back to top (A5), home order and More stories (A6), publish check (A7), comments + empty state + errors (B3), alert email (B2). Canvas items already built are left alone (themes, Aa panel with hide-on-scroll, fic list, pages, admin dashboard/editor).
- Decisions made from the canvas rather than asked: one-chapter stories get the same story page and read at `/fics/<slug>/1`; the "author's closing note" placeholder is not built (chapters already have end notes); "Fandom" is a real requirement (the canvas hard-codes it as done).
- Type names used across tasks: `Place`, `recordPlace`, `placeOf`, `lastPlace`, `hasAck`, `setAck`, `Check`, `storyChecks`, `missingCount`, `publishBlockedMessage`, `loadStoryChecks`, `getPublishChecks`, `ContentNotice`, `StoryOverviewProps`, `shouldShowTop`, `validateComment`, `sendCommentAlert`, `getComments`, `postComment`, `CommentFormState`, `replyToComment`, `setCommentHidden`.
