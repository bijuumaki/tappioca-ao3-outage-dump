# Plan 2a: Admin sign-in, Stories list and New Story

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bijuu can sign in to `/admin`, see her stories, start a **New Story** (details, chapters, writing in the editor), and save it as a draft, schedule it, or publish it to the public site.

**Architecture:** Admin pages are Next.js server components plus a few client components (the editor, the Aa panel). They read and write through a Supabase client that carries Bijuu's login session in cookies; row-level security lets only rows in a new `admins` table write content or read drafts. Every body is sanitized with the existing `sanitizeRichText` and word-counted with `countWords` on the server before it is saved. The admin look follows Bijuu's Claude Design canvas (boards "Admin: Stories" and "Admin: New Story").

**Tech Stack:** what Plan 1 set up, plus Tiptap 3.32 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-highlight`) and `@supabase/ssr` cookie sessions.

**Spec:** `docs/superpowers/specs/2026-11-02-fic-blog-design.md`
**Design:** Claude Design canvas "Tappioca Fic Archive", `https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP`, files `project/Dashboard.dc.html` and `project/Admin.dc.html` (read them with the Artifact tool before Task 2 and Task 5). Editor toolbar reference: Figma `FLtVHf4UtMyIQcpscOPC4X`.

**Not in this plan (Plan 2b):** the upload bin and file conversion, the Paste HTML box, images inside chapters, preview links for beta readers, versions, the categories/tags/pages screens, image posts.

## Global Constraints

- All Plan 1 constraints still hold (local commits, no attribution, ask before pushing at 4 waiting, no secrets or the alert email in the repo, tokens for every color, 44px tap targets, 4.5:1 text contrast).
- Only accounts listed in `public.admins` can write content or see drafts. Public sign-up stays off in Supabase Auth settings.
- `SUPABASE_SECRET_KEY` is needed from this plan on (test admin setup). Bijuu pastes it into `.env.local` herself; it is never printed, logged or committed.
- Every stored body goes through `sanitizeRichText` then `countWords` on the server. The editor's output is never trusted.
- Admin themes (exact, from the canvas `THEME` object): Day `pageBg #EDF6F9, text #204B57, muted #125E8A, accentText #51344D, tint #83C5BE, cardBg #EDF6F9, border #83C5BE`; Lagoon `pageBg #F6F1E7, text #0A1517, muted #3C5558, accentText #B9575A, tint #34B5A1, cardBg #FBF8F2, border #E0C3A8, fieldBorder #3C5558, bar #F1D5BC, accentFill #34B5A1, onAccent #0A1517`; Night `pageBg #14262D, text #EDF6F9, muted #83C5BE, accentText #D8B4D1, tint #204B57, cardBg #1B3540, border #2F5A66`; Midnight `pageBg #06141B, text #CCD0CF, muted #9BA8AB, accentText #CCD0CF, tint #253745, cardBg #11212D, border #4A5C6A`. Where a theme lacks `fieldBorder`, `bar`, `accentFill`, `onAccent`, they fall back to `border`, `tint`, `accentText`, `pageBg`. Order in the switch: Day, Lagoon, Night, Midnight. Saved in localStorage `fic-admin-theme`.
- Admin text is lowercase (`text-transform: lowercase`), headings IM Fell English, body Inclusive Sans, as on the canvas. Stored story text is never lowercased.
- Rating labels change site-wide to the canvas wording: General Audiences, Teen and Up, Mature, Explicit, Not Rated.
- Editor toolbar shows only: undo, redo, text style (paragraph / heading / subheading), bold, italic, underline, strikethrough, text color, highlight, link, bulleted list, numbered list, align left / center / right / justify, scene break, clear formatting. The canvas's editor Font and size controls change only how the writing area looks (saved in `fic-admin-editor-font` / `fic-admin-editor-size`) and are never stored in the story.

## Review Focus

1. **Two stories with the same title.** The second gets a different web address (`title-2`), never an error or an overwrite. Test: Task 3 `uniqueSlug`.
2. **The login runs out while writing.** Autosave fails: the editor shows "Not saved: sign in again" and keeps the text on screen; nothing is lost silently. Test: Task 6 e2e (clear cookies, type, expect the message).
3. **A big paste from Google Docs** (inline `font-family`, `color:#000000`, `<b style="font-weight:normal">` wrappers, `<script>`). It saves as clean allowed HTML with the right word count. Test: Task 6 unit test on `prepareChapter`.
4. **Publishing a chapter of a story that's still a draft.** The story goes live with it (otherwise readers see nothing), and publishing never moves an already-published story's date. Test: Task 7 integration.
5. **Readers still can't see drafts or admin data** after the new admin policies. Test: Task 1 integration (publishable key can't read drafts or `admins`).

---

## File map

```
supabase/migrations/0005_admin.sql       admins table; admin read/write policies; media bucket + policies
proxy.ts                                 refreshes the session; sends signed-out visitors from /admin to /admin/login
lib/supabase/session.ts                  createSessionClient() (cookies) and requireAdmin()
lib/admin/story-form.ts                  parseTagInput, uniqueSlug, RATING_OPTIONS, storyDetailsFromForm
lib/admin/chapter.ts                     prepareChapter(html) -> { body, word_count }
lib/admin/queries.ts                     listAdminStories, getAdminStory
lib/admin/actions.ts                     server actions: signIn, signOut, createStory, saveStoryDetails,
                                         addChapter, saveChapter, publishChapter, scheduleChapter, uploadCover
app/admin/admin.css                      admin themes and layout (scoped to .admin)
app/admin/layout.tsx                     admin shell (no public header), theme boot script
app/admin/login/page.tsx
app/admin/page.tsx                       Stories list
app/admin/stories/new/page.tsx           creates a draft story, then redirects to its edit page
app/admin/stories/[id]/page.tsx          details sidebar, chapters, editor
app/admin/stories/[id]/preview/[chapterId]/page.tsx
components/admin/AdminTheme.tsx          Aa panel with the four themes
components/admin/StoryDetails.tsx        details form
components/admin/ChapterList.tsx
components/admin/Editor.tsx              Tiptap editor + toolbar + word count bar + autosave
components/admin/PublishBar.tsx          Save draft / Preview / Schedule / Publish
scripts/create-admin.ts                  adds an email to public.admins (needs SUPABASE_SECRET_KEY)
tests/unit/story-form.test.ts, tests/unit/chapter.test.ts
tests/integration/admin.test.ts
tests/e2e/admin-*.spec.ts                use a test admin made in tests/e2e/global-setup.ts
```

---

### Task 1: Admin access and its database rules

**Files:**
- Create: `supabase/migrations/0005_admin.sql`, `lib/supabase/session.ts`, `proxy.ts`, `lib/admin/actions.ts` (signIn, signOut only), `app/admin/layout.tsx` (minimal), `app/admin/login/page.tsx`, `app/admin/page.tsx` (placeholder heading "Stories"), `scripts/create-admin.ts`, `tests/integration/admin.test.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/admin-login.spec.ts`
- Modify: `playwright.config.ts` (globalSetup), `.env.example` (no new keys; note that `SUPABASE_SECRET_KEY` is now required for tests)

**Interfaces:**
- Produces: `createSessionClient(): Promise<SupabaseClient<Database>>` (server, cookie session); `requireAdmin(): Promise<{ db, userId }>` (redirects to `/admin/login` when signed out or not an admin); test helpers `TEST_ADMIN = { email: "e2e-admin@tappioca.test", password: process.env.E2E_ADMIN_PASSWORD }`.

- [ ] **Step 1: Ask Bijuu** for (a) the email she wants to sign in with and (b) to paste `SUPABASE_SECRET_KEY` into `.env.local` (Supabase dashboard, Project Settings, API keys, secret key). Confirm public sign-up is off in Authentication settings (or turn it off with her OK).
- [ ] **Step 2: Write the migration** `0005_admin.sql`: `admins(user_id uuid primary key references auth.users on delete cascade)`, RLS on with no public policies; a `security definer` function `public.is_admin()` returning `exists(select 1 from public.admins where user_id = auth.uid())` (search_path ''); for every content table (`fics, chapters, posts, post_images, tags, fic_tags, post_tags, categories, pages`) one policy `for all to authenticated using (public.is_admin()) with check (public.is_admin())`. Storage: a public-read bucket `media`, with insert/update/delete allowed only when `public.is_admin()`.
- [ ] **Step 3: Write the failing integration test** `tests/integration/admin.test.ts` (skips without `SUPABASE_SECRET_KEY`); before all: create the test admin user with the secret key (auth admin API, `email_confirm: true`) and add it to `admins`; a signed-in client for it:
  - the admin can read `sample-draft`
  - the admin can insert and delete a fic
  - a signed-in user who is *not* in `admins` cannot insert a fic and cannot read `sample-draft`
  - the publishable key cannot read `admins` and still cannot read `sample-draft`
- [ ] **Step 4: Run** `npm test -- admin` (expected: FAIL before the migration is applied). Apply the migration with the Supabase connector, then run again (expected: PASS).
- [ ] **Step 5: Write the failing e2e test** `admin-login.spec.ts`: `/admin` while signed out redirects to `/admin/login`; wrong password shows "That email and password don't match"; right password lands on `/admin` showing "Stories"; "Sign out" returns to `/admin/login`. `global-setup.ts` ensures the test admin exists.
- [ ] **Step 6: Implement** the session client with `@supabase/ssr` `createServerClient` and Next `cookies()`; `proxy.ts` refreshes the session on `/admin/:path*` and redirects signed-out visitors (except `/admin/login`); the login page is a plain form posting to the `signIn` server action (email + password).
- [ ] **Step 7: Run** `npm run e2e -- admin-login` (expected: PASS) and `npm test` (expected: PASS). Then run `scripts/create-admin.ts <Bijuu's email>` to add her (she sets her password through the email Supabase sends).
- [ ] **Step 8: Commit** "Add admin sign-in and the rules that keep drafts private".

### Task 2: Admin look and the four themes

**Files:**
- Create: `app/admin/admin.css`, `components/admin/AdminTheme.tsx`, `tests/e2e/admin-theme.spec.ts`
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties on `.admin` named `--a-page-bg, --a-text, --a-muted, --a-accent-text, --a-tint, --a-card-bg, --a-border, --a-field-border, --a-bar, --a-accent-fill, --a-on-accent`, set by `.admin[data-admin-theme="day|lagoon|night|midnight"]`. Classes `.a-button-primary`, `.a-button`, `.a-card`, `.a-field`.

- [ ] **Step 1: Read the canvas** `project/Dashboard.dc.html` and `project/Admin.dc.html` again with the Artifact tool, in case Bijuu changed them.
- [ ] **Step 2: Write the failing e2e test**: signed in, `.admin` starts with `data-admin-theme="day"`; open Aa, pick Lagoon, `data-admin-theme="lagoon"` and the page background is `rgb(246, 241, 231)`; reload, still lagoon; the four theme buttons read day, lagoon, night, midnight in that order; for each theme, text against page background is at least 4.5:1.
- [ ] **Step 3: Run** `npm run e2e -- admin-theme` (expected: FAIL).
- [ ] **Step 4: Implement** the theme tokens from Global Constraints, the Aa button (52px circle) and panel, the lowercase admin text, the fonts, and a no-flash boot script for `fic-admin-theme`.
- [ ] **Step 5: Run** the same command (expected: PASS). Commit "Give the admin side Bijuu's Day, Lagoon, Night and Midnight themes".

### Task 3: Story details logic and rating wording

**Files:**
- Create: `lib/admin/story-form.ts`, `tests/unit/story-form.test.ts`
- Modify: `lib/content/types.ts` (RATING_LABELS), `tests/e2e/reader.spec.ts` (expects "Teen and Up")

**Interfaces:**
- Produces:
  - `RATING_OPTIONS: { value: Rating; label: string }[]` in order Not Rated, General Audiences, Teen and Up, Mature, Explicit
  - `parseTagInput(text: string): string[]`: split on commas, trim, drop empties, de-duplicate ignoring case, keep first spelling
  - `uniqueSlug(base: string, taken: string[]): string`
  - `storyDetailsFromForm(form: FormData): StoryDetails` where `StoryDetails = { title, summary, rating: Rating, fandom: string, relationships: string[], characters: string[], warnings: string[], tags: string[] }`

- [ ] **Step 1: Write failing tests**:
  - `parseTagInput("Ashley/Leon, , ashley/leon ,Hurt/Comfort")` is `["Ashley/Leon", "Hurt/Comfort"]`; `parseTagInput("")` is `[]`
  - `uniqueSlug("anam-cara", [])` is `anam-cara`; with `["anam-cara"]` it is `anam-cara-2`; with `["anam-cara", "anam-cara-2"]` it is `anam-cara-3`
  - `storyDetailsFromForm` with rating `teen` gives `rating: "teen"`; with an unknown rating gives `not_rated`; trims the title; an empty title becomes `"Untitled"`
  - `RATING_LABELS.teen` is `"Teen and Up"` and `RATING_LABELS.general` is `"General Audiences"`
- [ ] **Step 2: Run** `npm test -- story-form` (expected: FAIL).
- [ ] **Step 3: Implement**, and update `RATING_LABELS` and the reader e2e expectation.
- [ ] **Step 4: Run** `npm test` and `npm run e2e -- reader` (expected: PASS). Commit "Add story details helpers and use the AO3-style rating names".

### Task 4: Stories list

**Files:**
- Create: `lib/admin/queries.ts`, `app/admin/page.tsx` (replace placeholder), `tests/e2e/admin-stories.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin()`.
- Produces: `listAdminStories(db): Promise<AdminStoryRow[]>` where `AdminStoryRow = { id, slug, title, fandom: string | null, rating: Rating, chapters: number, words: number, status: "published" | "scheduled" | "draft", updatedAt: string }`; `getAdminStory(db, id)` returning the fic with all chapters (drafts included), tags and category.

- [ ] **Step 1: Write the failing e2e test**: the list shows the seed stories including `(sample draft)`; tabs read "all", "published", "drafts" with counts matching the rows; clicking drafts shows only drafts; the fandom select filters rows; at 390px wide rows switch to the stacked layout and nothing scrolls sideways; a "new story" link points to `/admin/stories/new`; "view" appears only on published rows and links to `/fics/<slug>`.
- [ ] **Step 2: Run** `npm run e2e -- admin-stories` (expected: FAIL).
- [ ] **Step 3: Implement** the page to the canvas Dashboard layout (header with title, "Tappioca's Fic Archive · Admin", New Story button, Aa; status tabs; fandom select; table on wide screens, stacked cards under 600px). Status: `scheduled` when `publish_at` is in the future; the scheduled ones count under Published's tab label as "scheduled" rows. Filters work through the URL (`?status=drafts&fandom=<slug>`) so they need no JavaScript.
- [ ] **Step 4: Run** the same command (expected: PASS). Commit "Add the admin Stories list".

### Task 5: New Story: details and chapters

**Files:**
- Create: `app/admin/stories/new/page.tsx`, `app/admin/stories/[id]/page.tsx`, `components/admin/StoryDetails.tsx`, `components/admin/ChapterList.tsx`, `tests/e2e/admin-new-story.spec.ts`
- Modify: `lib/admin/actions.ts` (createStory, saveStoryDetails, addChapter, uploadCover)

**Interfaces:**
- Consumes: `storyDetailsFromForm`, `uniqueSlug`, `getAdminStory`, `requireAdmin`.
- Produces: `createStory(): Promise<never>` (inserts a draft fic titled "Untitled" in category Fic with one empty draft chapter, then redirects to `/admin/stories/<id>`); `saveStoryDetails(id, form)`; `addChapter(ficId): Promise<never>` (adds an empty draft chapter at the next position and redirects to it with `?chapter=<chapterId>`); `uploadCover(ficId, form)` (image only, up to 5 MB, stored as `media/fics/<slug>/cover.<ext>`, sets `cover_path`).

- [ ] **Step 1: Write the failing e2e test**: from the Stories list, "new story" opens an edit page; fill fandom "(e2e fandom)", rating "teen and up", relationships "(a)/(b), (c)/(d)", characters "(a)", summary "(e2e summary)", tags "(e2e tag)", title "(e2e story)"; save; back on Stories the row "(e2e story)" shows rating "teen and up", status "draft", fandom "(e2e fandom)"; on reopening, every field holds what was typed; "+ add chapter" adds "chapter 2" to the chapter list; uploading `tests/e2e/fixtures/cover.png` shows the cover preview; "remove" clears it. The test deletes its story afterwards.
- [ ] **Step 2: Run** `npm run e2e -- admin-new-story` (expected: FAIL).
- [ ] **Step 3: Implement** to the canvas New Story layout: the details sidebar (fandom, rating, relationships, characters, warnings, summary, cover image, tags; collapsible on phones as on the canvas) and the chapter list. Fandom is a text field with suggestions from existing fandom tags (a `<datalist>`), so new fandoms can be typed. Tags are found or created by `(type, slugify(name))`. The slug comes from the title through `uniqueSlug` and is set the first time the title stops being "Untitled".
- [ ] **Step 4: Run** the same command (expected: PASS). Commit "Add New Story: details, cover and chapters".

### Task 6: The editor

**Files:**
- Create: `lib/admin/chapter.ts`, `components/admin/Editor.tsx`, `tests/unit/chapter.test.ts`, `tests/e2e/admin-editor.spec.ts`
- Modify: `lib/admin/actions.ts` (saveChapter), `app/admin/stories/[id]/page.tsx`

**Interfaces:**
- Produces: `prepareChapter(html: string): { body: string; word_count: number }`; `saveChapter(chapterId, { title, notes_before, notes_after, body }): Promise<{ ok: true; savedAt: string } | { ok: false; reason: "signed_out" | "error" }>` (never changes `publish_at`).

- [ ] **Step 1: Write failing unit tests** `chapter.test.ts`:
  - a Google Docs paste `<b style="font-weight:normal" id="docs-internal-guid-x"><p dir="ltr"><span style="font-family:Arial;color:#000000;font-weight:700">Hi</span> <span style="font-style:italic">there</span></p></b><script>x</script>` comes out with no `script`, no `font-family`, no `id`, and `word_count` 2
  - `<p style="text-align:center;color:#8b3253">a b c</p>` keeps both styles, `word_count` 3
  - empty editor output `<p></p>` gives `word_count` 0
- [ ] **Step 2: Run** `npm test -- chapter` (expected: FAIL), implement `prepareChapter` as `sanitizeRichText` then `countWords`, run again (expected: PASS).
- [ ] **Step 3: Write the failing e2e test** `admin-editor.spec.ts`: in a new story, type "hello", select it, press bold, wait for "saved"; reload; the word is still bold and the bar reads "1 word"; center-align a line and pick a text color, reload, both kept; paste HTML containing `<script>` (via clipboard event), saved body has no script; scene break button inserts a scene break; the font/size controls change the writing area but the saved body has no font; clear the session cookies, type, and "not saved: sign in again" appears with the text still on screen.
- [ ] **Step 4: Run** `npm run e2e -- admin-editor` (expected: FAIL).
- [ ] **Step 5: Implement** the Tiptap editor (StarterKit with heading levels 2 and 3, TextAlign on headings and paragraphs, TextStyle + Color, Highlight with multicolor) and the toolbar from Global Constraints, laid out like the canvas (menu row with Save draft / Preview / Publish; two-row toolbar; story title and chapter title fields; word count bar at the bottom), plus collapsible "notes before" and "notes after" fields. Autosave 3 seconds after typing stops, and on leaving the page.
- [ ] **Step 6: Run** the same command (expected: PASS). Commit "Add the writing editor with autosave".

### Task 7: Publish, schedule and preview

**Files:**
- Create: `components/admin/PublishBar.tsx`, `app/admin/stories/[id]/preview/[chapterId]/page.tsx`, `tests/e2e/admin-publish.spec.ts`
- Modify: `lib/admin/actions.ts` (publishChapter, scheduleChapter, unpublishChapter), `tests/integration/admin.test.ts`

**Interfaces:**
- Produces: `publishChapter(chapterId)`: saves first, sets the chapter's `publish_at = now()`, and sets the fic's `publish_at = now()` only if it was null or in the future; `scheduleChapter(chapterId, isoTime)`: same, with the given time (must be in the future); `unpublishChapter(chapterId)`: back to draft (null).

- [ ] **Step 1: Write failing integration tests**: publishing a chapter of a draft fic makes both visible to the publishable key; publishing a second chapter of an already-published fic leaves the fic's `publish_at` unchanged; scheduling an hour ahead keeps it hidden from the publishable key; `scheduleChapter` with a past time is rejected.
- [ ] **Step 2: Write the failing e2e test**: write "(e2e text)" in a new story titled "(e2e publish)", "preview" shows it in the reader style while it is still a draft; "publish" then the public page `/fics/e2e-publish` shows "(e2e text)"; a second story scheduled for tomorrow shows "scheduled" in the Stories list and is not found publicly.
- [ ] **Step 3: Run** `npm test -- admin` and `npm run e2e -- admin-publish` (expected: FAIL).
- [ ] **Step 4: Implement** the bar (Save draft, Preview, Schedule with a date-time field in Philippine time, Publish; "Unpublish" on a published chapter) and the preview page (admin-only, uses `ChapterBody`).
- [ ] **Step 5: Run** `npm test`, `npm run e2e` (expected: all PASS). Visual check of `/admin` and the edit page at 1440, 820 and 390 in all four themes. Commit "Publish, schedule and preview chapters from the admin". Count waiting commits and ask about pushing.
