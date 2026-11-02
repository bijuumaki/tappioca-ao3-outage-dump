# Plan 1: Foundation and reader pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the repo into a Next.js + Supabase site that shows fics, chapters, posts, tags, browse and simple pages to readers, in Bijuu's current look, with the theme toggle, Aa panel and reading progress carried over.

**Architecture:** Next.js App Router renders reader pages on the server from Supabase (read with the public key, so row-level security decides what is visible). Visibility is one column: `publish_at` (null = draft, future = scheduled, past = published). Rich text is stored as HTML; the reader re-sanitizes it with a shared allowlist and adapts inline colors for each theme.

**Tech Stack:** Next.js 16.4, React 19, TypeScript, `@supabase/supabase-js` 2.118 + `@supabase/ssr` 0.12, `sanitize-html` 2.18, Vitest 4, Playwright 1.64. Plain CSS (no CSS framework).

**Spec:** `docs/superpowers/specs/2026-11-02-fic-blog-design.md`

**Later plans (not in this one):** Plan 2 dashboard, editor, upload bin, conversion, preview links, versions. Plan 3 comments and hearts. Plan 4 alert emails, RSS, subscriptions. Go-live on Vercel happens only with Bijuu's OK.

## Global Constraints

- Commit locally after each task, one change per commit, plain-language message, **no attribution lines**. Commit with `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit` (no git identity is configured on this Mac).
- **Do not push without Bijuu's OK.** After each commit run `git rev-list --count origin/main..HEAD`; at 4, ask "That's 4 changes waiting. Ready to push to GitHub?" To push: `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`.
- Never invent fic details or story text. Sample data uses placeholders in parentheses, like `(sample fic)`, and lorem ipsum.
- No secrets in the repo. `.env.local` is git-ignored. The alert email address never goes in the repo.
- Every color, font and size is a CSS custom property in `app/tokens.css`. No hard-coded colors elsewhere, no inline styles (the only exception: inline color styles inside stored rich text).
- Tap targets at least 44px on touch. Text contrast at least 4.5:1. Visible focus rings.
- Rich-text allowlist (exact): `p, br, strong, b, em, i, u, s, del, h2, h3, h4, blockquote, ul, ol, li, a[href], hr, img[src alt], figure, figcaption, span`; `style` allowed only for `color`, `background-color` and `text-align` (`left|center|right|justify`); `a[href]` only `http`, `https`, `mailto`.
- Ratings (exact): `general`, `teen`, `mature`, `explicit`, `not_rated`, shown as General, Teen, Mature, Explicit, Not Rated.
- Tag types (exact): `fandom`, `character`, `relationship`, `warning`, `freeform`.
- Fic status: `in_progress`, `complete`. Starting categories: Fic (`fic`), Art (`art`).
- Theme backgrounds for contrast: light `#f5f5f5`, dark `#222831`.
- localStorage keys stay `fic-site-theme`, `fic-site-font`, `fic-site-size`, `fic-site-progress`, always read and written inside try/catch.

## Review Focus

1. **A scheduled chapter in the middle of a fic.** Chapter 3 is scheduled while chapter 4 is published: readers see chapters numbered 1, 2, 3 (the old 4), with no gap and no leak of the hidden one. Test: Task 4, `numberVisibleChapters`.
2. **A published fic with no published chapters yet.** It shows the fic page with "No chapters yet", not an error or a 404. Test: Task 6 e2e.
3. **Oneshot addresses.** `/fics/<slug>/1` for a one-chapter fic redirects to `/fics/<slug>`; `/fics/<slug>/0`, `/fics/<slug>/abc` and numbers past the end show the not-found page. Test: Task 6 e2e.
4. **Colors from pasted HTML in every format** (`#abc`, `#aabbcc`, `rgb()`, named colors like `red`) and highlights: readable in both themes, hue kept. Unknown color strings are dropped, not passed through. Test: Task 5 unit tests.
5. **Hostile or messy HTML in stored bodies** (`<script>`, `onclick`, `javascript:` links, `style="position:fixed"`) never reaches the page, even though Plan 2 also sanitizes on save. Test: Task 5 unit tests.

---

## File map

```
app/
  layout.tsx            root layout: tokens, header, no-flash theme script
  tokens.css            all tokens (ported from styles.css)
  globals.css           base styles, header, Aa panel, reader, cards
  page.tsx              home feed
  not-found.tsx         friendly not-found page
  fics/[slug]/page.tsx              fic page (oneshot shows story here)
  fics/[slug]/[n]/page.tsx          chapter page
  posts/[slug]/page.tsx             post page
  browse/page.tsx                   filters and sort
  tags/[type]/[slug]/page.tsx       tag page
  [page]/page.tsx                   about, disclaimer, links, comms
components/
  SiteHeader.tsx        header band with tools and title
  ThemeToggle.tsx       client: theme button
  TextOptions.tsx       client: Aa panel (size slider, font menu)
  ReadingProgress.tsx   client: saves and restores progress per chapter
  RichText.tsx          renders a stored body through renderRichText
  FicCard.tsx, PostCard.tsx, TagList.tsx, ChapterNav.tsx, TableOfContents.tsx
lib/
  supabase/server.ts    createReaderClient()
  content/types.ts      shared row and view types
  content/queries.ts    all reader queries
  content/chapters.ts   numberVisibleChapters()
  text/words.ts         countWords()
  text/slug.ts          slugify()
  richtext/allowlist.ts sanitizeRichText()
  richtext/colors.ts    adaptColor(), parseColor()
  richtext/render.ts    renderRichText()
supabase/migrations/0001_content.sql
supabase/seed.sql       placeholder sample content for development
tests/unit/*.test.ts    Vitest
tests/e2e/*.spec.ts     Playwright
public/paper.jpg
```

The old `index.html`, `app.js` and `styles.css` are removed in Task 2 once their behavior is ported.

---

### Task 1: New project rules and Next.js setup

**Files:**
- Modify: `CLAUDE.md` (rewrite), `README.md` (rewrite)
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`, `app/layout.tsx` (minimal), `app/page.tsx` (minimal), `tests/unit/smoke.test.ts`
- Move: `assets/paper.jpg` → `public/paper.jpg`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` (Vitest), `npm run e2e` (Playwright, starts `next dev` on port 3000).

- [ ] **Step 1: Rewrite `CLAUDE.md`.** Keep the sections "Working with Bijuu", "Git and deploys" (add the push command and the git identity command from Global Constraints), "Design decisions to keep" and "Checking your work" (update for Next.js: run `npm run e2e`, screenshots at 1440, 1024, 390, light and dark, 10pt and 24pt). Replace "What this is", "Stack and portability", "Files", "Page structure" and "Reader roadmap" with: the stack from this plan, the spec path, the plan paths, the `publish_at` visibility rule, the rich-text allowlist, and the file map above. Remove everything about Google Drive, Apps Script, Neocities and WordPress, and the "Do not add Supabase" rule.
- [ ] **Step 2: Rewrite `README.md`**: what the site is, `npm install`, copy `.env.example` to `.env.local`, `npm run dev`, `npm test`, `npm run e2e`.
- [ ] **Step 3: Create the Next.js project files by hand** (not `create-next-app`, so existing files stay): TypeScript strict, App Router, no `src/` dir, path alias `@/*` → `./*`. `.gitignore` covers `node_modules`, `.next`, `.env*.local`, `test-results`, `playwright-report`. `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, `SUPABASE_SECRET_KEY=` with no values.
- [ ] **Step 4: Write the smoke test** `tests/unit/smoke.test.ts`: `expect(1 + 1).toBe(2)`, just to prove Vitest runs.
- [ ] **Step 5: Install and verify.** Run `npm install`, then `npm test` (expected: 1 passed) and `npm run build` (expected: build succeeds).
- [ ] **Step 6: Commit** "Switch to Next.js and rewrite the project rules for the fic blog".

### Task 2: Port the look, theme toggle, Aa panel

**Files:**
- Create: `app/tokens.css`, `app/globals.css`, `components/SiteHeader.tsx`, `components/ThemeToggle.tsx`, `components/TextOptions.tsx`, `tests/e2e/shell.spec.ts`
- Modify: `app/layout.tsx`
- Delete: `index.html`, `app.js`, `styles.css`

**Interfaces:**
- Produces: `<SiteHeader />` used by `app/layout.tsx`; CSS classes `.page`, `.heading`, `.box` (translucent card) for later tasks.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/shell.spec.ts`:
  - `theme toggle switches and remembers`: click `#theme-toggle`; `html` gets `data-theme="dark"`; reload; still `dark`.
  - `text size slider sets --fs`: set `#size-slider` to 20; `getComputedStyle(html).getPropertyValue('--fs')` is `20pt`; reload; still `20pt`.
  - `font menu loads the font only when picked`: before picking, no `link[href*="Crimson+Pro"]`; select `crimson`; the link exists and `html[data-font="crimson"]`.
  - `Aa panel closes with Escape and returns focus`: open `#aa-toggle`, press Escape, `#size-panel` hidden, `#aa-toggle` focused.
- [ ] **Step 2: Run** `npm run e2e -- shell` (expected: FAIL, elements missing).
- [ ] **Step 3: Port.** Move the `:root` token block and theme and font blocks from `styles.css` into `app/tokens.css` (change `--paper` to `url(/paper.jpg)`); move the rest into `app/globals.css`. Rebuild the header markup from `index.html` as `SiteHeader` (server) containing `ThemeToggle` and `TextOptions` (client components, same ids, same behavior as `app.js`). Add an inline script in `app/layout.tsx`'s `<head>` that applies the saved theme, font and size before paint (in try/catch) so there's no flash. Load IM Fell English SC and Inclusive Sans with `next/font/google` and set them into `--font-fancy` and `--font-body`.
- [ ] **Step 4: Run** `npm run e2e -- shell` (expected: 4 passed). Delete `index.html`, `app.js`, `styles.css`.
- [ ] **Step 5: Commit** "Bring over the paper look, theme toggle and Aa panel".

### Task 3: Supabase project and content schema

**Files:**
- Create: `supabase/migrations/0001_content.sql`, `supabase/seed.sql`, `lib/supabase/server.ts`, `lib/content/types.ts`, `tests/integration/visibility.test.ts`

**Interfaces:**
- Produces: tables below; `createReaderClient(): SupabaseClient` (server-only, publishable key, no session); types `Fic`, `Chapter`, `Post`, `PostImage`, `Tag`, `TagType`, `Category`, `Page`, `Rating`, `FicStatus` in `lib/content/types.ts`.

- [ ] **Step 1: Create the Supabase project. Ask Bijuu first** (it's an external action). Use the Supabase connector: `list_organizations`, then `create_project` named `tappioca-reader` on the free plan, in the region closest to the Philippines (Singapore, `ap-southeast-1`). Put its URL, publishable key and secret key in `.env.local` (from `get_project_url` and `get_publishable_keys`; Bijuu copies the secret key from the dashboard).
- [ ] **Step 2: Write `0001_content.sql`.**
  - Enums `rating`, `fic_status`, `tag_type` with the exact values in Global Constraints.
  - `categories(id, name, slug unique)`; seed `('Fic','fic')`, `('Art','art')`.
  - `tags(id, type tag_type, name, slug, unique(type, slug))`.
  - `fics(id, slug unique, title, summary, notes, cover_path, category_id → categories, rating, status, publish_at timestamptz null, created_at, updated_at)`.
  - `chapters(id, fic_id → fics on delete cascade, position int, title null, notes_before, body, notes_after, word_count int not null default 0, publish_at, created_at, updated_at, unique(fic_id, position))`.
  - `posts(id, slug unique, title, body, embed_url, category_id, publish_at, created_at, updated_at)`; `post_images(id, post_id → posts cascade, position, path, caption)`.
  - `fic_tags(fic_id, tag_id)`, `post_tags(post_id, tag_id)` with composite primary keys.
  - `pages(slug primary key, title, body, updated_at)`; seed `about`, `disclaimer`, `links`, `comms` with title only and empty body.
  - RLS on every table. Public `select` policies: `fics` and `posts` where `publish_at <= now()`; `chapters` where its own `publish_at <= now()` and its fic's `publish_at <= now()`; `post_images` and tag joins where the parent is visible; `categories`, `tags`, `pages` always. No public insert, update or delete.
- [ ] **Step 3: Apply** with the connector's `apply_migration`, then `generate_typescript_types` into `lib/supabase/database.types.ts`.
- [ ] **Step 4: Write `seed.sql`** with placeholder content only: one multi-chapter fic `(sample fic)` with chapters 1, 2 published, 3 scheduled a year ahead and 4 published; one published oneshot `(sample oneshot)`; one draft fic `(sample draft)` (slug `sample-draft`); one published fic `(sample empty)` (slug `sample-empty`) with no published chapters; one Art post `(sample art)` (slug `sample-art`) with two images and an `embed_url`; tags of every type. Bodies use lorem ipsum, including one paragraph with `style="color:#8b3253"` and one `<hr>`. Run it with `execute_sql`.
- [ ] **Step 5: Write the failing integration test** `tests/integration/visibility.test.ts` (skipped when `NEXT_PUBLIC_SUPABASE_URL` is unset), using the publishable key:
  - draft fic is not returned
  - scheduled chapter 3 is not returned; chapters returned for `(sample fic)` have positions `[1, 2, 4]`
  - chapters of the draft fic are not returned even if their own `publish_at` is past
  - `insert` into `fics` with the publishable key is rejected
- [ ] **Step 6: Run** `npm test -- visibility` (expected: PASS once the policies are in place; if any fails, fix the policy, not the test).
- [ ] **Step 7: Commit** "Add the content database: fics, chapters, posts, tags, categories and pages" (the migration and seed only; `.env.local` stays out).

### Task 4: Text helpers and reader queries

**Files:**
- Create: `lib/text/words.ts`, `lib/text/slug.ts`, `lib/content/chapters.ts`, `lib/content/queries.ts`, `tests/unit/words.test.ts`, `tests/unit/slug.test.ts`, `tests/unit/chapters.test.ts`

**Interfaces:**
- Produces:
  - `countWords(html: string): number`
  - `slugify(text: string): string`
  - `numberVisibleChapters<T extends { position: number }>(rows: T[]): (T & { n: number })[]`
  - In `queries.ts`, all `async`, all using `createReaderClient()`:
    - `getHomeFeed(limit = 20): Promise<FeedItem[]>`, where `FeedItem` = `{ kind: 'fic' | 'chapter' | 'post', title, href, publishedAt, ficTitle? }`
    - `getFic(slug): Promise<FicWithChapters | null>`, where `FicWithChapters` = Fic + `category`, `tags: Tag[]`, `chapters: (ChapterSummary & { n })[]`, `totalWords`
    - `getChapter(slug, n): Promise<{ fic: FicWithChapters, chapter: Chapter & { n } } | null>`
    - `getPost(slug): Promise<PostWithImages | null>`
    - `browse(filters: { category?, rating?, status?, tags?: {type, slug}[], sort?: 'newest' | 'updated' | 'longest' | 'shortest' }): Promise<FicCardData[] | PostCardData[]>`
    - `getTagItems(type, slug): Promise<{ tag: Tag, fics: FicCardData[], posts: PostCardData[] } | null>`
    - `getPage(slug): Promise<Page | null>`

- [ ] **Step 1: Write failing unit tests.**
  - `words.test.ts`: `countWords('<p>one two</p><p>three</p>')` is 3; tags and entities don't count (`'<p>a&nbsp;b</p>'` is 2); hyphenated `well-known` is 1; contractions `don't` is 1; empty string is 0; `<hr>` is 0.
  - `slug.test.ts`: `slugify('Anam Cara')` is `anam-cara`; `slugify('MORIBUND')` is `moribund`; `slugify('  Ça va? Oui!  ')` is `ca-va-oui`; `slugify('')` is `untitled`.
  - `chapters.test.ts`: positions `[1, 2, 4]` give `n` `[1, 2, 3]`; unsorted input `[4, 1, 2]` comes back sorted with `n` `[1, 2, 3]`; empty gives empty.
- [ ] **Step 2: Run** `npm test -- words slug chapters` (expected: FAIL, modules missing).
- [ ] **Step 3: Implement** the three helpers. `countWords` strips tags, decodes entities, splits on whitespace. `slugify` uses NFKD normalization and drops accents.
- [ ] **Step 4: Run** the same command (expected: PASS).
- [ ] **Step 5: Implement `queries.ts`.** `totalWords` is the sum of visible chapters' `word_count`. `getChapter` returns null when `n` is not an integer of at least 1, or past the last visible chapter. `browse` sorts `longest`/`shortest` by `totalWords`.
- [ ] **Step 6: Extend** `tests/integration/visibility.test.ts`: `getFic('sample-fic')` has chapters with `n` `[1, 2, 3]` and `totalWords` equal to the sum of those three; `getChapter('sample-fic', 4)` is null; `getFic('sample-draft')` is null. Run `npm test` (expected: PASS).
- [ ] **Step 7: Commit** "Add word counts, slugs and the reader queries".

### Task 5: Safe rich text with readable colors

**Files:**
- Create: `lib/richtext/allowlist.ts`, `lib/richtext/colors.ts`, `lib/richtext/render.ts`, `components/RichText.tsx`, `tests/unit/sanitize.test.ts`, `tests/unit/colors.test.ts`
- Modify: `app/globals.css` (`.rich-text` styles, scene break uses `--scene-break` token)

**Interfaces:**
- Produces:
  - `sanitizeRichText(html: string): string` (Plan 2 reuses it on save)
  - `parseColor(input: string): { r, g, b } | null`
  - `adaptColor(color: string, background: string, minContrast = 4.5): string`, returns a hex color with the same hue whose contrast against `background` is at least `minContrast`; unchanged when already enough
  - `renderRichText(html: string): string`, which sanitizes, then rewrites each inline `color` / `background-color` into CSS variables `--c-l` / `--c-d` (and `--hl-l` / `--hl-d`) computed by `adaptColor` against `#f5f5f5` and `#222831`, plus a class `rt-c` / `rt-hl`
  - `<RichText html={string} />`

- [ ] **Step 1: Write failing tests.**
  - `sanitize.test.ts`: `<script>alert(1)</script><p>x</p>` gives `<p>x</p>`; `<p onclick="x()">a</p>` gives `<p>a</p>`; `<a href="javascript:alert(1)">a</a>` loses the href; `<p style="position:fixed;color:red">a</p>` keeps only `color:red`; `<p style="text-align:center">` is kept; `<h1>` becomes `<h2>`; `<img src="https://x/y.png" alt="a" onerror="x">` keeps src and alt only; `<font face="Arial">a</font>` gives `a`.
  - `colors.test.ts`: `parseColor('#abc')`, `parseColor('#aabbcc')`, `parseColor('rgb(170, 187, 204)')` all give `{r:170,g:187,b:204}`; `parseColor('red')` gives `{r:255,g:0,b:0}`; `parseColor('banana')` is null; `adaptColor('#8b3253', '#f5f5f5')` is unchanged (already readable); `adaptColor('#8b3253', '#222831')` has contrast of at least 4.5 against `#222831` and the same hue within 2 degrees; `adaptColor('#ffff00', '#f5f5f5')` has contrast of at least 4.5; `renderRichText('<p style="color:banana">a</p>')` has no `style` and no `rt-c`.
- [ ] **Step 2: Run** `npm test -- sanitize colors` (expected: FAIL).
- [ ] **Step 3: Implement.** `sanitizeRichText` uses `sanitize-html` with the exact allowlist in Global Constraints (`transformTags` maps `h1` → `h2`, `b` → `strong`, `i` → `em`). `adaptColor` converts to HSL and steps lightness (darker on light backgrounds, lighter on dark) in steps of 1% until the WCAG contrast ratio reaches the minimum. In CSS, `.rt-c { color: var(--c-l) }`, with the dark-theme rules (both the media query and `[data-theme=dark]`) setting `color: var(--c-d)`; same for highlights.
- [ ] **Step 4: Run** the same command (expected: PASS).
- [ ] **Step 5: Commit** "Render stored text safely and keep colors readable in both themes".

### Task 6: Fic and chapter pages with reading progress

**Files:**
- Create: `app/fics/[slug]/page.tsx`, `app/fics/[slug]/[n]/page.tsx`, `app/not-found.tsx`, `components/TableOfContents.tsx`, `components/ChapterNav.tsx`, `components/TagList.tsx`, `components/ReadingProgress.tsx`, `tests/e2e/reader.spec.ts`

**Interfaces:**
- Consumes: `getFic`, `getChapter`, `<RichText>`.
- Produces: `<TagList tags={Tag[]} />` (links to `/tags/<type>/<slug>`, grouped by type), reused in Task 7. `<ReadingProgress id="<fic-slug>/<n>" />`, which wraps the chapter body.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/reader.spec.ts` against the seed data:
  - fic page shows title, rating label, status, category, tags grouped by type, total word count, and a table of contents of 3 chapters each with its word count
  - chapter 2 page shows its word count, notes, body, and Previous (to 1), Contents and Next (to 3) links; chapter 3's Next is absent
  - oneshot: `/fics/sample-oneshot` shows the story body and no table of contents; `/fics/sample-oneshot/1` redirects there
  - `/fics/sample-fic/0`, `/fics/sample-fic/abc`, `/fics/sample-fic/9` and `/fics/sample-draft` show the not-found page with status 404
  - the published fic with no published chapters shows "No chapters yet"
  - reading progress: scroll chapter 2 halfway, reload, a "Welcome back" note shows and the page is scrolled near where it was
  - the colored seed paragraph has contrast of at least 4.5 in both light and dark
- [ ] **Step 2: Run** `npm run e2e -- reader` (expected: FAIL).
- [ ] **Step 3: Build the pages** using `getFic` / `getChapter`, calling `notFound()` for null and `redirect()` for the oneshot case. Use `export const revalidate = 60` so scheduled chapters appear within a minute of their time. Port the reading progress logic from the old `app.js` into `ReadingProgress` (the furthest point, forward-only, storage key `fic-site-progress`, keyed by `<fic-slug>/<n>`).
- [ ] **Step 4: Run** the same command (expected: PASS).
- [ ] **Step 5: Commit** "Add the fic and chapter pages with word counts and reading progress".

### Task 7: Home, posts, browse, tags and simple pages

**Files:**
- Create: `app/page.tsx` (replace minimal), `app/posts/[slug]/page.tsx`, `app/browse/page.tsx`, `app/tags/[type]/[slug]/page.tsx`, `app/[page]/page.tsx`, `components/FicCard.tsx`, `components/PostCard.tsx`, `tests/e2e/browse.spec.ts`

**Interfaces:**
- Consumes: `getHomeFeed`, `getPost`, `browse`, `getTagItems`, `getPage`, `<TagList>`, `<RichText>`.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/browse.spec.ts`:
  - home lists the newest published items first, and never the draft fic or the scheduled chapter
  - the Art post page shows both images with captions, its embed link and its tags
  - clicking a fandom tag on a fic page opens `/tags/fandom/<slug>` listing that fic
  - `/browse?category=art` shows only the Art post; `/browse?rating=teen` shows only teen fics; `/browse?sort=longest` orders by total words, descending; filters are links and dropdowns that work without JavaScript (a plain GET form)
  - `/about` shows the About title; `/nonsense-page` gives 404 (only `about`, `disclaimer`, `links`, `comms` are valid)
  - no sideways scroll at 390px wide on home, fic, chapter, post and browse
- [ ] **Step 2: Run** `npm run e2e -- browse` (expected: FAIL).
- [ ] **Step 3: Build the pages.** The browse form uses `method="get"` with selects for category, rating, status and sort, plus the tag chips from the query string. Cards show title, category, rating, status, total words and tags.
- [ ] **Step 4: Run** `npm run e2e` (expected: all suites PASS) and `npm test` (expected: PASS).
- [ ] **Step 5: Visual check** with Playwright screenshots at 1440, 1024 and 390, in light and dark, at 10pt and 24pt, of home, fic, chapter and post. Fix anything that overflows or loses contrast.
- [ ] **Step 6: Commit** "Add the home feed, post pages, browse, tag pages and simple pages". Then count waiting commits and ask about pushing if the count is 4 or more.
