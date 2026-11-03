# CLAUDE.md: Tappioca's reader

Project rules for Claude Code. Read this first, every session.

## What this is

A public blog for Bijuu's ("tappioca") fanfics and art, like a small WordPress built around fics. Bijuu is the only author. Anyone can read without an account; readers can comment, give hearts and subscribe.

- Design (the authority): the live canvas, then `docs/design/DESIGN.md` and `docs/design/HANDOFF.md` (written by the design chat, canvas v122; the canvas wins over them). Older spec: `docs/superpowers/specs/2026-11-02-fic-blog-design.md`. Those two docs describe an older static-HTML + Drive-only plan in places; this repo is Next.js + Supabase with Drive as an optional copy.
- Shared mailbox with the design chat: `docs/design/QUESTIONS.md`. Read it every session. When the canvas doesn't say something, write the gap there as a new open question instead of guessing; when an entry has an answer, build from it and move it to Answered. Tell Bijuu when new questions are waiting for the design chat.
- Build plans: `docs/superpowers/plans/` (Plan 1 foundation and reader; Plans 2 to 4 dashboard and uploads, comments and hearts, emails and RSS)

## Working with Bijuu

- Analogies help when explaining. Give step-by-step instructions as a flow chart.
- Keep chat replies short. Do the work, then say what changed.
- Latest request wins when she contradicts an earlier one. Say what it replaced. She sometimes reverses a value ("oh, sorry"); just apply it.
- When something is ambiguous, pick the most plausible reading, say the guess, and offer to redo.
- Placeholder text is hers to replace. Never invent fic details (fandom, rating, relationships, summaries) or story text. Sample data uses placeholders in parentheses, like `(sample fic)`, and lorem ipsum.

## Git and deploys (important)

- Bijuu deploys through Vercel, connected to this GitHub repo. Every push to the production branch is a deployment, and she does not want to burn through deployments.
- **Commit locally after each change. Do not push without her OK.**
- No git identity is set on this Mac. Commit with `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit ...`.
- Count pending changes with `git rev-list --count origin/main..HEAD`. **When the count reaches 4, ask: "That's 4 changes waiting. Ready to push to GitHub?"** Push only after she says yes, and push all of them in one go. She can also ask to push earlier.
- Push with `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main` (plain `git push` has no credentials here).
- One change = one commit, with a plain-language message.
- Do not add attribution lines to commits unless she asks.

## Stack

- **Next.js** (App Router, TypeScript strict) on **Vercel**. The paused Vercel project `tappiocarchive` is reused when going live, only with Bijuu's OK.
- **Supabase**: Postgres, image and file storage, Bijuu's login. Reader pages read with the publishable key, so row-level security decides what readers can see.
- **Plain CSS**, no CSS framework. All colors, fonts, spacing and sizes are custom properties in `app/tokens.css`. No hard-coded colors elsewhere and no inline styles (the one exception: inline color styles inside stored rich text).
- Tests: **Vitest** (`npm test`) for logic, **Playwright** (`npm run e2e`) for pages.
- Secrets live in `.env.local` (git-ignored) and in Vercel. Never in the repo. The alert email address is a secret setting (`ALERT_EMAIL`), never written in the repo.

## Rules the code depends on

- **Visibility is one column, `publish_at`**: null = draft, in the future = scheduled, in the past = published. A chapter is visible only when it and its fic are both visible. Readers see visible chapters numbered 1, 2, 3 in order, with no gaps.
- **Rich text is stored as HTML** limited to: `p, br, strong, em, u, s, h2, h3, h4, blockquote, ul, ol, li, a[href], hr, img[src alt], figure, figcaption, span`. Inline `style` keeps only `color`, `background-color` and `text-align`. Links only `http`, `https`, `mailto`. `lib/richtext/allowlist.ts` is the one place this list lives.
- Colors in stored text show as written, but are lightened or darkened (same hue) wherever they would fall under 4.5:1 contrast in a theme.
- Ratings: General, Teen, Mature, Explicit, Not Rated. Tag types: fandom, character, relationship, warning, freeform. Fic status: in progress, complete. Categories start as Fic and Art.

## Files

```
app/                 pages (App Router); tokens.css (themes) and globals.css
components/          header, Aa panel, theme toggle, reader parts, cards
lib/supabase/        Supabase clients and generated database types
lib/content/         reader queries and chapter numbering
lib/text/            word counts, slugs
lib/richtext/        sanitizer, color adapting, rendering
supabase/            migrations (every change to the database, in order)
tests/unit/          Vitest
tests/integration/   Vitest against the Supabase project (skipped without .env.local)
tests/e2e/           Playwright
```

## Design decisions to keep

The look comes from Bijuu's Claude Design canvas "Tappioca Fic Archive" (https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP; `project/Site.dc.html` for the public site, `Dashboard.dc.html` and `Admin.dc.html` for admin). Re-read it with the Artifact tool before design work; it changes.

- Four themes, in this order: **Day** (default), **Old paper** (code key `lagoon`; has a paper texture, `public/textures/old-paper.webp`, multiplied into the page color), **Night**, **Midnight**. Exact colors are in `app/tokens.css`. A device in dark mode with no saved choice starts in Night.
- Headings in **IM Fell English**, body in **Inclusive Sans**, 16px. All site text is shown lowercase except story text, notes and readers' words (`.rich-text`, `.keep-case`).
- One 708px column. **No top menu**: Home is the hub (title heading that links home, photo circle 205px, "The Archive" box, "Howdy" box, then Disclaimer / About / Fic List / Links buttons). Every other page shows the site title as an underlined link home. Home has Featured fic but **no Recent Fics**. Footer: "online web app made by tappioca. all intellectual properties belong to their rightful owners."
- The round **Aa** button opens display options (a dialog with a Close button, Escape closes; a bottom sheet under 600px; on a chapter page at 900px+ it pushes the page over by 344px instead of covering it): chapter picker (chapter pages), text size 10 to 20pt, font, line spacing (tight 1.4 / normal 1.7 / loose 2.1), theme. **Text size scales the whole site** (`--fs` = size/14, `--read` = size in pt; sizes use `--t13…--t17`, `--h20…--h40`, never under 12px). The font changes all text except the site title and the Aa panel. On narrow screens the button slides away while scrolling down a chapter. Saved in localStorage `fic-site-theme`, `fic-site-font`, `fic-site-size`, `fic-site-spacing`, always inside try/catch.
- Clickable cards and buttons use the stronger `--field-border`. Lagoon's rose (`--accent-text`) is `#A84B4E`.
- Chapter page: fic title, "Chapter n of N · words", progress bar, Previous chapter / Next chapter buttons under the title on screens under 1024px, chapter title bar, notes, justified text (max 66ch), Previous / Contents / Next at the bottom (Contents opens the Aa panel).
- The Links page is free writing with inline links (not buttons).
- Ratings read General Audiences, Teen and Up, Mature, Explicit, Not Rated.
- Reading progress: per chapter, in the reader's own browser (`fic-site-progress`), furthest point reached, only moves forward.
- Story page (`/fics/<slug>`, every story including one-chapter ones): cover, fandom, summary, tag chips, Details, then "Start reading" / "Resume at chapter N", then the chapter list (first 6, "Show all N chapters"). **Chapters are always read at `/fics/<slug>/<n>`** (a one-chapter story is `/1`; there is no inline oneshot any more). Mature and Explicit stories show a **content notice** first (also on direct chapter links, where the text is not shown until accepted; it is still in the page source, so this is a courtesy notice and not access control). Browser memory, never an account: `fic-site-place` (per story: chapter, title, chapter count, time; drives "Continue reading" on Home and "Resume"), `fic-site-ack` (accepted notices). Last chapter ends with an end-of-story box; chapters have a floating Back to top button (`lib/client/back-to-top.ts`).
- Home order (canvas): title, Continue reading (only for returning readers), Featured, More stories (up to 6, not the featured one; no "See the whole fic list" button, by Bijuu's choice), then photo/Archive/Howdy/page buttons, then Recent Art if any exists.
- The old paper texture and teal header band are gone (the canvas has neither).
- Tap targets are at least 44px. Text contrast at least 4.5:1 in every theme.
- Editor ("write mode", Plan 2) follows the canvas Admin board, with toolbar items from the Figma WYSIWYG kit (file `FLtVHf4UtMyIQcpscOPC4X`).

## Admin

- **Publish check** (`lib/admin/readiness.ts`): a story can't be published or scheduled until it has a title (not "Untitled"), a summary, a rating other than Not Rated, and a fandom. The Publish button opens a dialog listing these (canvas board "Publish check"); `publishChapterAt` enforces it on the server too (`NotReadyError`). Unpublishing is never blocked.
- `/admin` (Plan 2a): sign-in at **`/admin-login`** (old `/admin/login` redirects there), Stories list, New Story / edit (details, cover, chapters, editor with autosave), Publish / Schedule / Unpublish / Preview. Only accounts in `public.admins` can write or see drafts (`private.is_admin()` in the policies).
- Add an admin: `npx tsx scripts/create-admin.ts <email>` (sends a Supabase invite to set a password at `/admin/set-password`). Never write the address into the repo.
- Admin themes use `--a-*` tokens in `app/admin/admin.css`; choice saved in `fic-admin-theme`. Editor view font/size: `fic-admin-editor-font`, `fic-admin-editor-size` (never stored in stories).

## Admin screens added in Plan 2b

- **Pages** (`/admin/pages`): edit the Howdy, The Archive, About, Disclaimer, Links and Comms texts (autosave).
- **Uploads** (`/admin/uploads`): one folder per fic. Files go from the browser straight to the private `uploads` bucket with one-time signed addresses (Vercel limits request bodies to 4.5 MB), then `processUploads` converts them to **draft** chapters. `Title - N.ext` names are chapter N of one fic; an `.epub` is a whole fic; the same chapter number again replaces the text after keeping a version. Accepted: .html .htm .md .markdown .txt .docx .epub, up to 25 MB each.
- **Conversion library** (`lib/convert/*`): every input becomes the allowed rich-text format (`htmlToChapter` reads inline-style bold/italic/underline from Ellipsus, Google Docs and Word; `prepareChapter` uses it for every save). Images are identified by their first bytes (`sniffImage`), never by name or declared type.
- **Editor extras**: Paste HTML box, Add picture button (shrunk in the browser first, stored in the public `media` bucket), Share a preview link (`/preview/<token>`, secret UUID, revocable, `preview_chapter()` database function, noindex), Earlier versions (newest 20 per chapter; autosave at most every 10 minutes, always on publish/upload-replace/restore).
- **Google Drive** (Plan 2c): `apps-script/drive-bridge.gs` is a small Apps Script web app the owner (imong.mama.kuan@gmail.com) deploys herself (`docs/google-drive-setup.md`). It can list, read and add files in the one "Fic Library" folder and nothing else: no delete, move or share, never overwrites, every request needs the secret TOKEN. The server talks to it through `lib/drive/bridge.ts` with `DRIVE_BRIDGE_URL` and `DRIVE_BRIDGE_TOKEN` (server-only; never `NEXT_PUBLIC_`; she sets them in `.env.local` and Vercel). Without those the Drive parts of the Uploads screen don't appear and nothing changes. With them: "Also save originals to Google Drive" (saved as `Fic Library/<fandom or Unsorted>/<file>` after the chapters exist, so Drive can never block or lose an upload) and "Import from Google Drive" (files become draft chapters and are not sent back). Supabase stays the working copy. Tests use a local mock bridge (`tests/support/mock-drive.ts`, port 4011 for browser tests) and never touch the real Drive; the browser Drive tests skip themselves unless the app reports the mock's folder name.
- **Comments** (Plan 3 Stage B): `public.comments` (+ `comment_meta`, which only holds a salted hash of the sender for flood control). Readers can only read visible comments (RLS: not hidden, and the chapter is visible to them); nobody writes with the public key. `lib/comments/post.ts` (`postCommentCore`, run by the server action in `lib/comments/actions.ts` with the secret-key client `lib/supabase/secret.ts`) validates (`lib/comments/validate.ts`, canvas wording, hidden trap field `website`), checks the chapter is live, throttles to 5 per sender per 10 minutes, stores, then emails the author via `lib/email/resend.ts` (settings `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL`; a failing email never blocks a comment). Comments show under the chapter text (inside the content notice gate). `/admin/comments` (not in the canvas) lets the author reply (stored `by_author`, name "Author", one level) and hide/show. Replies to commenters by email, hearts and subscribe are not built.
- Plan 3 (design catch-up, `docs/superpowers/plans/2026-11-03-plan-3-design-catch-up.md`): Stage A (story page, content notice, continue reading, end of story, back to top, home order, publish check) and Stage B (comments) are built. Not yet built: image posts, tag and category screens, hearts, subscribers, emails to readers, and anything the canvas doesn't draw.

## Tests and the live database

There is one Supabase project, and the live site reads it. Tests add their own sample content at the start of a run (so **don't run tests while Bijuu is writing**: sample stories appear on the live site for the length of a run) (`tests/support/fixtures.ts`, via Vitest and Playwright global setup) and remove it at the end, so samples are public only while tests run. Admin tests use the accounts `e2e-admin@tappioca.test` and `e2e-reader@tappioca.test` (password `E2E_ADMIN_PASSWORD` in `.env.local`) and delete the "(e2e …)" stories they make. Tests need `SUPABASE_SECRET_KEY` and `E2E_ADMIN_PASSWORD` in `.env.local`. There is no seed file: `tests/support/fixtures.ts` is the one place the sample content is defined.

## Checking your work

Look at the rendered page, not just the code. Run `npm test` and `npm run e2e`. Take Playwright screenshots at 1440, 820 and 390 wide in all four themes, at 10pt and 20pt. Check: no sideways scroll, text contrast of at least 4.5:1, visible focus rings, Escape closes the Aa panel.

## Added after canvas v122 (2026-11-03)

- **Hearts**: `fics.hearts` (migration 0012) is the shared count; `heart_fic(slug, ±1)` is callable by the server only (`lib/hearts/actions.ts`). Whether a browser has hearted lives in `fic-site-hearted`. Heart button + count on the story page and end of story; a count-only line on every fic card. One reader can heart again from another browser (accepted).
- **RSS**: `/feed.xml` (all stories) and `/feed/<slug>.xml` (one story), one item per visible chapter (`lib/feed/rss.ts`). Follow buttons and the footer link copy the feed address.
- **Comments wait for approval**: migration 0013 makes `post_comment` store new comments as `hidden = true` (= "Waiting"). Approve sets `hidden = false`; "Hide from site" sets it back. `/admin/comments` has Waiting/Approved/All tabs, a story filter, Approve, Hide, Delete (confirm) and the author reply. Comments that were already live stay approved.
- **Uploads**: the Drive panel "Fics found in Google Drive" (`components/admin/DriveLibrary.tsx`, `lib/drive/library.ts`) lists what is in the Fic Library folder with Ready / Needs attention. "Open the Drive folder" / "View in Drive" links are not shown because the Apps Script doesn't return links yet.
- **Reader chrome**: Aa is plain 10pt text; display options close with an X and (in the reader) say "adjust for your eyes"; chapter arrows are icons; the bottom chapter row is plain centered links. The reader has the canvas's unlabeled "Jump to chapter" dropdown under the chapter label (the Aa panel no longer has a chapter picker); Contents scrolls to the top and focuses it.
- **Stories list**: row checkboxes, select all, a sticky "N selected / Clear / Delete N stories" bar, a trash icon per row and a confirm dialog (`components/admin/StoryList.tsx`, `deleteStories` in `lib/admin/actions.ts`; chapters and comments go with the story). Permanent.
- **Rule from Bijuu**: the canvas wins on every design choice; any canvas button without working code gets built.

## Added after canvas v135 (2026-11-03)

- **Who builds:** Bijuu now has the desktop-app session do both the canvas (design) and the code. The canvas still wins.
- **No covers.** Story page, cards, Home Featured and the editor have no cover image (`fics.cover_path` stays in the database, unused).
- **Likes, not hearts, on screen.** The button says "Like" / "Liked"; no count is shown anywhere (the count is still kept by `heart_fic`). Fic list sort says "Most liked".
- **End of story** is only "Leave a comment" plus an icon-only heart. **Chapter bar** reads "Chapter N: title", centered (a title that only repeats the number shows "Chapter N"). **No Previous/Next buttons under the title**; the bottom link row and the dropdown remain.
- **Edit in place** (`components/InlinePageEditor.tsx`): signed in as admin, the Disclaimer, About, Links and Comms text becomes a Tiptap editor with Bold, Italic, Underline, Heading, List, Quote, Link; autosaves through `savePageText`. Readers get the cached server-rendered text. Howdy and The Archive on Home are not editable this way yet (not drawn on the canvas).
