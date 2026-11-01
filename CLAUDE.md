# CLAUDE.md: Tappioca's fic reader

Project rules for Claude Code. Read this first, every session.

## What this is

A public fic archive and web reader for Bijuu ("tappioca"). It started as a Neocities-style homepage and is becoming a reader app: readers browse a list of fics, open one, and read it by chapter with their own font, size and theme. The design comes from Bijuu's Figma file and was built up through comments on a live page. Everything in this repo today is that page, split into files.

Source of the fics: Bijuu writes in Ellipsus and exports Markdown (`.md`) or EPUB (`.epub`). Ellipsus has no public API, so there is no live sync. **The fics live in Google Drive, not in this repo.** She drops files into a Drive folder `Fic Library / <Fandom> / ...`; folders act as tags and the first folder is the fandom. A **Google Apps Script web app** (`apps-script/Code.gs`, deployed from her own Google account) reads that one folder and serves it as JSON:

- Library list: `<web app link>`
- One fic's text: `<web app link>?action=text&id=<fileId>`
- Current web app link (not secret; it only serves that folder): `https://script.google.com/macros/s/AKfycbzp6QNwpXQCtwJrba7PSS3qWA-Y6fljaQ9pckKFvWm8NrFuiokibS6kg8RhUlD7KuECfg/exec`

Adding a fic therefore never needs a commit or a Vercel deployment. The reader calls the web app straight from the browser (tested in Chromium: CORS works, the web app answers every origin with `access-control-allow-origin: *`, so no serverless function is needed). Requests are plain GETs with no custom headers, which keeps them free of CORS preflights; keep it that way, because Apps Script cannot answer a preflight. The list is cached in localStorage (`fic-site-library`) so it shows at once and then refreshes.

Naming convention for chapters: files named `<Title> - <N>.md` (space, dash, space, a number of up to 3 digits; for example `MORIBUND - 1.md`) in the same folder are chapters of one fic, in number order. Other names are one-chapter fics. The script (`apps-script/Code.gs`) groups them and also serves: `<web app link>?action=fic&id=<fic id>` (the fic with its chapter list: n, id, title, words) and `<web app link>?action=text&id=<chapter file id>` (one chapter's text). The library list has one entry per fic, with `chapterCount`. It remembers what it learned about each file (refreshed when the file is edited), so only new or changed files are read, and the list is cached in pieces. Bijuu has to paste a changed script into script.google.com (keeping her `FOLDER_ID`) and redeploy (Deploy, Manage deployments, edit, New version); the repo copy is the source of record, with `FOLDER_ID` left as a placeholder. Her library is under 20 fics, one of them about 296k words; the rest are much shorter. `.epub` files are listed but not readable yet.

## Working with Bijuu

- Analogies help when explaining. Give step-by-step instructions as a flow chart.
- Keep chat replies short. Do the work, then say what changed.
- Latest request wins when she contradicts an earlier one. Say what it replaced. She sometimes reverses a value ("oh, sorry"); just apply it.
- When something is ambiguous, pick the most plausible reading, say the guess, and offer to redo.
- Placeholder text is hers to replace. Never invent fic details (fandom, rating, relationships, summaries) or story text.

## Git and deploys (important)

- Bijuu deploys through Vercel, connected to this GitHub repo. Every push to the production branch is a deployment, and she does not want to burn through deployments.
- **Commit locally after each change. Do not push without her OK.**
- Count pending changes with `git rev-list --count origin/main..HEAD`. **When the count reaches 4, ask: "That's 4 changes waiting. Ready to push to GitHub?"** Push only after she says yes, and push all of them in one go. She can also ask to push earlier.
- One change = one commit, with a plain-language message.
- Do not add attribution lines to commits unless she asks.

## Stack and portability

- Plain HTML, CSS and vanilla JavaScript. No framework. Small build scripts in Node are fine (Vercel runs them), but the output must be plain static files.
- Reason: the same design must also work as a **Neocities** site (static files, no build step on their side, so a built folder gets uploaded) and as a **WordPress theme** "just in case". Keep things portable:
  - All colors, fonts, spacing and sizes are CSS custom properties at the top of `styles.css`. No hard-coded colors elsewhere, no inline styles.
  - Relative paths only (`assets/paper.jpg`, not `/assets/...`).
  - Keep markup semantic and class-based so it can move into PHP templates later.
  - Avoid dependencies. If one is truly needed (for example reading `.epub` files), pick a small one, say why, and prefer doing the conversion at build time.
- Do not add Supabase or any server database. Bijuu chose Google Drive (through the Apps Script web app) as the store. Do not suggest Google Cloud service-account keys: key creation is blocked on her account and she wants no billing.
- Never put secrets, passwords or keys in the repo.

## Files

```
index.html     page structure (all views live here)
styles.css     all styling, tokens first
app.js         routing, theme, text options, library loading, list, reader, search and sort
markdown.js    small Markdown renderer for the reader (builds elements, never HTML strings)
assets/        paper.jpg texture
apps-script/   Code.gs, the Google Apps Script that serves the Drive library (source of record)
docs/          sample-fic.md, the Markdown format for a fic's details and chapters
CLAUDE.md      this file
```

## Page structure

- Header band (teal, max 1630px): theme toggle (moon in light mode, sun in dark mode), **Aa** button opening a panel (text size 10 to 24pt in steps of 2, default 14; Font menu), and the site title.
- Grid: left sidebar (302px, only the nav links now) | main | right column (255px, Sort by and search on the fic list only).
- Under 1240px the right column goes away and Sort by and search stack above the fic cards. Under 900px the sidebar, theme toggle and Aa move into a modal menu drawer (done in JS by `place()`).
- Views (hash routes): `#home` (and anything unknown) is the Howdy page. `#list` is the fic list. `#read/<fic-id>/<chapter>` is the reader (a bare id or a bad chapter number is corrected to a valid one). `#disclaimer`, `#about`, `#links` and `#comms` show a "coming soon" placeholder; Bijuu designs those pages in Claude Design and will bring them in. Avoid hash names claude.ai reserves in previews (settings, sidebar, customize, upgrade, downloads, comment-*).
- Placeholder convention: a value that is empty, fully wrapped in parentheses such as `(media title)`, or the lorem ipsum filler counts as a placeholder. Search ignores placeholders and sorting puts them last. Real values need no code change. "Saw (2004)" is real text, not a placeholder.

## Design decisions to keep

- Light background `#f5f5f5`, dark `#222831`. All boxes `#698c91` in both themes, with `#111` text in light and `#ecefee` in dark. Header `#78a39f` light / `#2f4947` dark. "Howdy" `#8b3253` light / `#e68aa8` dark.
- Display face **IM Fell English SC**, body face **Inclusive Sans**. The site title and the nav menu list are locked to IM Fell English SC in every font mode.
- Font menu: Default; Sans serif: Lucida Sans, Cantarell, Tahoma; Serif: Crimson Pro, IM Fell English, Cormorant Garamond. Lucida Sans and Tahoma are system fonts and only show on devices that have them. The three sans choices also apply all-small-caps to display text; serif choices do not. Choices are saved in localStorage (`fic-site-theme`, `fic-site-font`, `fic-site-size`), always inside try/catch.
- Text size: `--fs` is the base (default 14pt, 10 to 24 in steps of 2). `--u = --fs / 19` scales everything else. Fic titles are `--fs * 24/14`, fic details are `--fs`. Line heights scale with it.
- Paper texture: a fixed `body::before` layer, `mix-blend-mode: multiply`, lighter in dark mode. Cards and boxes use `color-mix(... var(--solid), transparent)` with `--solid: 20%`, so the paper shows through. The Aa panel stays opaque. The phone menu drawer is 80% opaque (fill and texture on its own layer so text stays solid) with a 14px backdrop blur on the drawer only.
- Removed on purpose: Quick fic links, Guest book, Powered by, and the card shape behind the nav links. Do not bring them back unless asked.
- Header icons are 20px. Tap targets are at least 44px on touch.

## Checking your work

Look at the rendered page, not just the code. Playwright with Chromium works: open `index.html` (block `fonts.googleapis.com` if the sandbox cannot reach it; fallback fonts then show), screenshot at 1440, 1024 and 390 in light and dark, and at 10pt and 24pt. Check no sideways scroll, contrast of at least 4.5:1 for text, visible focus rings, and that the menu drawer opens, traps focus and closes with Escape.

Last audit (before the reader work): 15/20, Good. Open items: untested real touch-drag on the size slider, no screen-reader pass, not checked with the real web fonts, and a possible performance cost from the full-screen texture on weak phones.

## Reader roadmap (not built yet)

1. Fic data: `apps-script/Code.gs` groups chapters (done and deployed). The `#list` cards are built from the library JSON (done). Details come from optional `---` front matter in each file (title, fandom, rating, words, relationships, summary, tags); missing ones are filled in (title from the file name, fandom from the folder, word count from the text).
2. Reader view: `#read/<fic-id>/<chapter>` with previous/next, a chapter menu, and the Aa font, size and theme (done for Markdown: italics, bold, headings, quotes, links, scene breaks; a line of only dashes, stars or ornament symbols is a scene break and shows the `--scene-break` token). Still to do: EPUB.
3. Reading progress: remembered per reader in their own browser (localStorage), no accounts. "Continue reading" on the card.
4. Search, tags and sort on the real data (fandom, rating, longest and shortest word count, relationships).
5. First real fic: "moribund" (Bijuu will supply the Markdown export and the fic details; do not guess the details).
6. Later: Neocities build (built folder, relative paths) and WordPress theme.
