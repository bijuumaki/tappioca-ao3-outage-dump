# CLAUDE.md: Tappioca's reader

Project rules for Claude Code. Read this first, every session.

## What this is

A public blog for Bijuu's ("tappioca") fanfics and art, like a small WordPress built around fics. Bijuu is the only author. Anyone can read without an account; readers can comment and like. Live at https://tappiocarchive.vercel.app.

- **The design canvas is the authority**: https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP (a Design-type artifact; read it with the Artifact tool, it changes between sessions; Bijuu edits it by hand and leaves comments on it). `docs/design/DESIGN.md` describes the screens in words and is kept in step with it. **Where they differ, the canvas wins.**
- **One session does both jobs now**: draw on the canvas, then build the code to match. Change the canvas first, then the code, and say when the canvas says nothing.
- Every canvas button must have working code. Demo props on the canvas (`signedIn`, `showEnd`, `panelStartsOpen`, `longStory`, `resumeDemo`, `reviewDemo`, `showTopDemo`) and bracketed placeholders (`[N]`, `[Date]`) never ship.

## Starting a chat (saves her usage)

- **Do not run a startup routine.** This file is already loaded, so don't re-read DESIGN.md, the canvas or the comments, don't republish the canvas to watch it, and don't ask her to paste a hand-off prompt. Wait for her request and read only what it needs.
- Read the canvas (`Artifact` read, one file at a time) only for a canvas change or a question about what is drawn. Every board is `<dc-import name="Site" ...>`, so almost all drawing lives in `project/Site.dc.html`. Comments only when she mentions one or a comment message arrives.
- Say the pending count (`git rev-list --count origin/main..HEAD`) only when it changes or she asks.
- **Where we left off** (update at the end of a chat when it changes): not drawn on the canvas, waiting on her call: `/browse`, tag, 404 and Comms pages; edit in place for the Howdy and The Archive boxes; the admin Aa panel matching the reader's; tag filtering on the Fic list. Loading feedback (top line, waiting cursor, placeholders, busy spinners) is built but not drawn on the canvas. Waiting on her outside the code: `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL` in Vercel (comment emails); `DRIVE_BRIDGE_URL`, `DRIVE_BRIDGE_TOKEN` (Drive parts stay hidden). Possible speed-up not done: a faster admin sign-in check (`getClaims`), untested without her login.

## Remind her when she mentions posting original work (not fanfiction)

She asked to be reminded of these, once, when it comes up:
- The bot blocks only stop crawlers that announce themselves. One that pretends to be a browser can still copy any public chapter, so original work is the thing most worth protecting and nothing in code fully prevents copying.
- Put a copyright line on the site or in each story's notes (for example "(c) year tappioca, all rights reserved"); the footer today says only that others' properties belong to their owners.
- Keep dated drafts (the editor already stores earlier versions) as proof the work is hers and when it was written.
- Consider posting only some chapters publicly, or leaving the newest chapters as drafts until she is ready.
- The RSS feeds already carry only titles and links, never chapter text, so subscribers can't copy through them.
- Vercel's AI Bots rule is set to Deny; Bot Protection is left Off on purpose (it would challenge RSS readers). Watch Vercel Firewall traffic if she suspects scraping.

## Working with Bijuu

- Analogies help when explaining. Give step-by-step instructions as a flow chart.
- Keep chat replies short. Do the work, then say what changed. She is often low on usage: skip checks she didn't ask for and batch canvas edits.
- Latest request wins when she contradicts an earlier one. Say what it replaced. She sometimes reverses a value; just apply it.
- When something is ambiguous, pick the most plausible reading, say the guess, and offer to redo.
- Never invent fic details (fandom, rating, relationships, summaries) or story text. Sample data uses placeholders in parentheses, like `(sample fic)`, and lorem ipsum.

## Git and deploys (important)

- Vercel deploys every push to `main`, and she does not want to burn deployments.
- **Commit locally after each change. Do not push without her OK.** One change = one commit, with a plain-language message.
- Count pending changes with `git rev-list --count origin/main..HEAD`. **When the count reaches 4, ask: "That's 4 changes waiting. Ready to push to GitHub?"** Push all of them in one go, only after she says yes (she can also ask earlier).
- No git identity is set on this Mac: `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit ...`.
- Push with `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`. Afterwards confirm Vercel reports "Deployment has completed" (`gh api repos/bijuumaki/tappioca-ao3-outage-dump/commits/main/status`).
- "git commit -a" skips new files; run `git status` and `git add` them or Vercel's build fails.
- Applying migrations to the live database is blocked by the safety check; prefer code that creates what it needs at runtime, or ask her to run the SQL.

## Stack

- **Next.js** (App Router, TypeScript strict) on **Vercel**; **Supabase** (Postgres, storage, Bijuu's login). Reader pages read with the publishable key, so row-level security decides what readers can see.
- **Plain CSS**, no framework. All colors, fonts, spacing and sizes are custom properties in `app/tokens.css`; no hard-coded colors elsewhere and no inline styles (except inline color styles inside stored rich text).
- Tests: **Vitest** (`npm test`; `npx vitest run tests/unit` is safe any time) and **Playwright** (`npm run e2e`). Also `npx tsc --noEmit` and `npx next build`.
- Secrets live in `.env.local` (git-ignored) and in Vercel, never in the repo. Never write her admin email or the alert email address into the repo.

## Rules the code depends on

- **Visibility is one column, `publish_at`**: null = draft, future = scheduled, past = published. A chapter is visible only when it and its fic are both visible. Readers see visible chapters numbered 1, 2, 3 with no gaps.
- **Rich text is stored as HTML** limited to `p, br, strong, em, u, s, h2, h3, h4, blockquote, ul, ol, li, a[href], hr, img[src alt], figure, figcaption, span`; inline `style` keeps only `color`, `background-color`, `text-align`; links only `http`, `https`, `mailto`. `lib/richtext/allowlist.ts` is the one place this list lives. Colors are lightened or darkened (same hue) wherever they would fall under 4.5:1 in a theme.
- Ratings: General Audiences, Teen and Up, Mature, Explicit, Not Rated. Tag types: fandom, character, relationship, warning, freeform. Fic status: in progress, complete. Categories: Fic and Art.
- **Publish check** (`lib/admin/readiness.ts`): a story can't be published or scheduled without a title (not "Untitled"), a summary, a rating other than Not Rated, and a fandom. The dialog shows it and `publishChapterAt` enforces it on the server. Unpublishing is never blocked.

## Files

```
app/                 pages (App Router); tokens.css (themes) and globals.css; admin/ with admin.css
components/          reader parts, Aa panel, cards; components/admin/ for the dashboard and editor
lib/supabase/        Supabase clients and generated database types
lib/content/         reader queries, chapter numbering, latest activity, site photo
lib/admin/           server actions and helpers for the dashboard
lib/convert/         every upload format becomes the allowed rich text
lib/richtext/        sanitizer, color adapting, rendering
lib/comments/ lib/drive/ lib/feed/ lib/email/ lib/hearts/ lib/client/ lib/format/ lib/text/
supabase/            migrations (every change to the database, in order)
apps-script/         the optional Google Drive bridge
tests/unit/ tests/integration/ tests/e2e/
```

## The reader (what Bijuu decided)

- **Four themes**, in this order: Day (default), Old paper (code key `lagoon`; her paper texture `public/textures/old-paper.webp` multiplied into the page color and lightened 45% so text keeps 4.5:1), Night, Midnight. A device in dark mode with no saved choice starts in Night.
- Headings and the site title in IM Fell English, body in Inclusive Sans, 16px. All site text is lowercase except story text, notes, and readers' and Bijuu's typed words (`.rich-text`, `.keep-case`).
- One 708px column. **No top menu**: Home is the hub; every other page shows the site title as a link home in the link color, **not underlined**. Footer: "online web app made by tappioca. all intellectual properties belong to their rightful owners." with "rss feed for all stories" and a GoatCounter visitor count.
- **Home order**: title, intro (photo circle 205px, The Archive box, Howdy box, page buttons), Continue reading (returning readers only), Latest activity, More stories (up to 6), Recent Art if any exists. **Latest activity** = the 3 newest things: new story (a story's chapter 1), new chapter, or new reader comment (`lib/content/activity.ts`).
- **Aa panel** (plain 10pt "Aa" at the viewport's right edge, X to close, Escape closes, bottom sheet under 600px, pushes a chapter page over by 344px at 900px+): Theme (four split-color swatches, ringed when picked), Text size (slider 10 to 20pt step 2; scales the whole site via `--fs` and `--read`), Font (cards showing each font's name in its own font: Serif = Crimson Pro, EB Garamond; Sans serif = Inclusive Sans (default), Lucida Sans, Cantarell), Line spacing (tight 1.4, normal 1.7, loose 2.1). The font changes all text except the site title, the "Chapter N: title" and "Comments on chapter N" bars (all stay IM Fell English) and the panel. Web fonts are asked for as WOFF2 from Google Fonts with real regular, bold, italic and bold italic faces (`WEB_FONTS` in `lib/client/prefs.ts`); they load the first time the panel opens. IM Fell English has no bold; Lucida Sans is a system font. Saved in localStorage (`fic-site-theme`, `-font`, `-size`, `-spacing`), always inside try/catch.
- **Story page** (`/fics/<slug>`, every story): title, fandom, summary, tag chips, a Like button and "Follow new chapters (rss)", Details, "Start reading" / "Resume at chapter N", chapter list (first 6, "Show all N chapters"). **Chapters are always read at `/fics/<slug>/<n>`.** There are no covers and no content notice.
- **Chapter page**: title, "Chapter n of N · words", dropdown "Jump to chapter", progress bar, a centered bar reading "Chapter N: title" (a title that only repeats the number shows "Chapter N"), author notes, justified text (max 66ch), a bottom row of plain centered links (arrow, Contents, arrow; Contents scrolls up and focuses the dropdown), at the last chapter just a "Leave a comment" button with an icon-only heart, then comments. No Previous/Next buttons under the title. Back to top button (44px).
- **Likes**: the button says "Like" / "Liked"; no count is shown anywhere; the count is still kept by `heart_fic(slug, ±1)` (server only, `lib/hearts/actions.ts`; column `fics.hearts`). Whether a browser liked lives in `fic-site-hearted`. Fic list sort says "Most liked".
- **Highlights and notes** (not on the canvas yet): select words in a chapter to highlight (4 colors) or add a note; tap a highlight to edit. Kept in `fic-site-notes` (`lib/notes/model.ts` merges and checks them, `lib/client/notes-store.ts`, `components/ChapterHighlights.tsx`, painted with the browser's Custom Highlight API; selecting is allowed only in `.chapter-text`, copy and drag stay blocked). `/highlights` ("My highlights", a Home button) lists them. **Sync across devices** is in the Aa panel (`components/SyncDialog.tsx`): a private 16-character code, no account; `lib/notes/sync-actions.ts` merges by id (newest wins, deletes kept 90 days) into table `reader_sync` (only a hash of the code is stored). **Needs `supabase/migrations/0015_reader_sync.sql` run on the live database**; until then sync says "isn't available right now" and everything else works.
- **Browser memory, never an account**: `fic-site-place` (per story: chapter, title, count, time; drives Continue reading and Resume), `fic-site-progress` (per chapter, furthest point, moves forward only), `fic-site-hearted`.
- **RSS**: `/feed.xml` and `/feed/<slug>.xml`, one item per visible chapter (`lib/feed/rss.ts`). Follow buttons and the footer link copy the address.
- **Comments**: readers post under each chapter (`lib/comments/*`; validated, throttled to 5 per sender per 10 minutes, hidden trap field `website`, emailed to Bijuu through Resend with `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL`; a failing email never blocks a comment). New comments wait for approval (`hidden = true`); only approved ones show. Table `comments` (+ `comment_meta` with a salted hash for flood control); nobody writes with the public key.
- **Site photo**: one round photo on Home and About, stored as a `pages` row `photo` (JSON: path, zoom, x, y; `lib/content/photo.ts`) with the file in the public `media` bucket (`lib/admin/photo-actions.ts`).
- **Visitor counter**: `components/GoatCounter.tsx` (reader pages only, never `/admin`, counts page changes by hand) and `components/VisitorCount.tsx` (reads `https://tappioca.goatcounter.com/counter/TOTAL.json`; shows nothing if unreadable; needs GoatCounter's "Allow adding visitor counts on your website"). She can open any page with `#toggle-goatcounter` to stop counting her own browser.
- Fic list: search field ("title, fandom or pairing") and "Sort by" (Newest, Title, Most liked); tag filtering is not drawn. `/browse`, `/tags/<type>/<slug>`, the 404 page and a Comms page exist but are not on the canvas.
- Tap targets at least 44px (tag chips keep a small look with a larger tap area). Text contrast at least 4.5:1 in every theme. Site icon: `app/icon.svg` (my own simple teal circle with a plum "t"; she can replace it).
- Clickable cards and buttons use the stronger `--field-border`.

- **Bots and AI**: `proxy.ts` answers 403 to named AI and scraping crawlers on every page (`lib/security/bots.ts`, the one list; tested in `tests/unit/bots.test.ts`); `app/robots.ts` tells them to stay out and keeps `/admin` out of search; every response carries `X-Robots-Tag: noai, noimageai` (`next.config.ts`). Search engines and feed readers are allowed on purpose: on `/feed.xml` and `/feed/<slug>.xml` only the named AI crawlers are refused, so RSS subscribers are never blocked (her rule). Vercel's firewall has AI Bots set to Deny; if a feed reader is ever blocked there, add a custom rule that bypasses `/feed`. Spoofed browser names get through; Vercel's Bot Protection (dashboard) is the next layer.

## Admin

- Sign-in at `/admin-login`. Only accounts in `public.admins` can write or see drafts (`private.is_admin()`). Add one: `npx tsx scripts/create-admin.ts <email>` (invites them to set a password at `/admin/set-password`).
- **Stories** (`/admin`): list with filters, select boxes, a sticky "N selected / Clear / Delete N stories" bar, trash icon with confirm (permanent; chapters and comments go with the story). New story / edit: details, chapters, editor with autosave, Publish / Schedule / Unpublish / Preview.
- **Editor**: a "Chapter text" label with **Rich text / HTML** toggle like AO3 (HTML mode is a monospace box; switching back and saving clean it to the allowed tags), File / Edit / View menus, toolbar with Remove link, Paste HTML box, Add picture (shrunk in the browser, stored in the public `media` bucket), preview links (`/preview/<token>`, secret, revocable, noindex), Earlier versions (newest 20 per chapter). Admin view font and size are `fic-admin-editor-font`, `fic-admin-editor-size`.
- **Edit in place**: signed in as admin, the Disclaimer, About, Links and Comms text on the public pages becomes a Tiptap editor (Bold, Italic, Underline, Heading, List, Quote, Link; icon buttons; autosave through `savePageText`; `components/InlinePageEditor.tsx`). The photo circle gets an upload icon and a zoom-and-move tool. Readers get the cached server-rendered page. `/admin/pages` also edits the Howdy, The Archive, About, Disclaimer, Links and Comms texts.
- **Comments** (`/admin/comments`): Waiting / Approved / All tabs, story filter, Approve, Hide, Delete with confirm, author reply (stored `by_author`, name "Author", one level).
- **Uploads** (`/admin/uploads`): files go from the browser straight to the private `uploads` bucket with one-time signed addresses (Vercel limits request bodies to 4.5 MB), then `processUploads` converts them to **draft** chapters. `Title - N.ext` names are chapter N of one fic; an `.epub` is a whole fic; the same chapter number again replaces the text after keeping a version. Accepted: .html .htm .md .markdown .txt .docx .epub, up to 25 MB. Images are identified by their first bytes, never by name or declared type.
- **Google Drive (optional)**: `apps-script/drive-bridge.gs`, deployed by the owner (`docs/google-drive-setup.md`), can list, read and add files in one "Fic Library" folder and nothing else. The server uses `DRIVE_BRIDGE_URL` and `DRIVE_BRIDGE_TOKEN` (server-only). Without them the Drive parts of Uploads don't appear. With them: "Also save originals to Google Drive" and "Import from Google Drive"; Supabase stays the working copy. Tests use a local mock bridge (`tests/support/mock-drive.ts`). The script returns no links yet, so "Open the Drive folder" / "View in Drive" are not shown.
- Admin themes use `--a-*` tokens in `app/admin/admin.css` (choice saved in `fic-admin-theme`); the admin Aa is the older circle button with a theme-only panel.

## Tests and the live database

There is one Supabase project, and the live site reads it. Tests add their own sample content at the start of a run (`tests/support/fixtures.ts`, the one place sample content is defined) and remove it at the end, so **don't run `npm run e2e` or the integration tests while Bijuu may be writing**. Admin tests use `e2e-admin@tappioca.test` and `e2e-reader@tappioca.test` (password `E2E_ADMIN_PASSWORD` in `.env.local`) and delete the "(e2e …)" stories they make. Tests need `SUPABASE_SECRET_KEY` and `E2E_ADMIN_PASSWORD`. Never delete her stories.

## Checking your work

Look at the rendered page, not just the code: `npx tsc --noEmit`, `npx vitest run tests/unit`, `npx next build`, then the dev server (`.claude/launch.json` is local and excluded from git). Check all four themes, widths 390 / 820 / 1280, 10pt and 20pt: no sideways scroll, contrast at least 4.5:1, visible focus, Escape closes the Aa panel.
