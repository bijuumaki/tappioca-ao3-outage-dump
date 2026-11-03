# DESIGN.md: Tappioca's Fic Archive (design spec for Claude Code)

Updated 2026-11-03 from the design canvas, **version 135**. Read `claude/HANDOFF.md` too (data, hosting, Apps Script, repo rules). This file describes the design: what each screen looks like, how it behaves, and the rules to keep.

**Precedence (Bijuu's rule): the latest state of the canvas wins over this file.** This file is a description of the canvas at v135. If you open the canvas and it differs from what is written here, build what the canvas shows, and tell Bijuu so the docs can be corrected.

## 0. How to use this file

- **Source of truth for design = the design canvas** (Claude Design artifact): https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP (comments and canvas view: https://claude.ai/code/artifact/090b9f46-3f8f-4cb4-ba9f-582d2e923d46). It is private; reading it needs Bijuu's account. If you cannot open it, build from this file and ask her for the board you need.
- **Source of truth for code and real data = the repo.** Code, saving, deletion and real data are yours (Claude Code). The design chat only draws on the canvas.
- The canvas is a **prototype**. Demo switches (`resumeDemo`, `showEnd`, `reviewDemo`, `longStory`, `showTopDemo`, `panelStartsOpen`) and bracketed placeholders (`[N]`, `[Date]`, `[Fic summary]`, `[Tag]`, `[YOUR PHOTO]`, `[Reader name]`, `[Comment text]`, `[time]`) exist only to show states. Never ship them. Real values come from Drive via the Apps Script web app.
- **The canvas does not read or write browser storage.** All reader state (theme, font, size, progress, notice accepted, hearted, feed message) is demo state in the page. Storage in section 5 is a proposal for the real app.
- **Never invent fic details or story text.** Only Anam Cara has known details: Resident Evil, Explicit, Ashley/Leon, 295,645 words, 25 chapters. Everything else stays a placeholder until Bijuu supplies it.
- Output target: plain static HTML/CSS/JS, tokens in CSS, relative paths, no framework (so it also works as a WordPress theme and a Neocities theme).

## 1. Site-wide rules (Bijuu's, keep them)

- Small **lowercase** text site-wide (`text-transform: lowercase` on the root). **Exceptions:** chapter text, comment names/bodies (reader and admin), anything typed, author notes, the Links page body, file names in Uploads.
- Reader text size **10 to 20pt in steps of 2, default 14**. Base `--fs = size / 14`. Reader chapter text is set in `pt`; UI scales with `--fs`. Floors: UI text never below 12px.
- **Chapter text is justified** (`text-align: justify; hyphens: auto; max-width: 66ch`).
- **Aa button, upper right.** It is **plain text "Aa" with no circle, border or fill**, set at **fixed 10pt in every theme, and it does not scale with the text size setting**. Keep a **44 x 44px tap area** (`top: 12px + safe-area`, `right: 16px`, fixed, `aria-label="Display options"`, `aria-expanded`). **It is positioned against the viewport's right edge, not the 708px reading column** (decided 2026-11-03): on a wide desktop it sits well outside the column on purpose, like a light switch by the door, and the title row reserves 64px of right padding so they never collide. Do not cap its distance from the column. **Hover shows an underline** (4px offset), because a brightness change is invisible on bare text; keyboard focus uses the normal 2px outline. On screens under 900px, in the reader only, it slides away when scrolling down and returns on scroll up, on focus, or on back-to-top. Measure the width on scroll as well as on resize (the prototype once kept a stale narrow reading and hid Aa on desktop). **The admin screens still use the older circle Aa** (open question).
- **10px corners** on boxes and cards (buttons and small controls 6 to 8px, chips 6px).
- Four themes everywhere, plus phone, tablet and desktop: **Day, Old paper, Night, Midnight**. Check all four after any color change.
- Tap targets at least 44px. Visible focus (`outline: 2px solid currentColor`). `prefers-reduced-motion` turns motion off. Respect safe-area insets.
- **Icons instead of words** where Bijuu asked: the display options close is an X icon; chapter Previous/Next are small arrow icons. Icon-only buttons keep an `aria-label`.
- **Links instead of boxes** where Bijuu asked: the reader's bottom chapter row is plain links (see Reader). Do not box things she asked to be links.
- **Muted is not a link.** Muted text (secondary lines, counts, hints) and links must never look alike. Links are underlined (or, in the title and chapter row, use the `link` color and are plainly buttons); muted text is never underlined. **Empty notes** ("No comments on this chapter yet.", and in the live site "(intro coming soon)" and "nothing posted yet.") are drawn **muted and italic, with no underline**.
- She often reverses values. Apply the latest and say what it replaced.

## 2. Tokens

Each theme defines these. Names match the canvas code.

| token | job |
|---|---|
| `pageBg`, `text`, `muted` | page, body text, secondary text |
| `accentText` | headings like "Howdy" / "The Archive" / "Continue reading" / notice heading, delete icon, heart color |
| `accentFill` + `onAccent` | primary buttons AND every selected state (tab, theme option, spacing option, toolbar toggle, current admin section) |
| `cardBg` | cards, tiles, buttons, dialogs, fields |
| `border` | quiet hairlines AND empty image wells (`well = border`) |
| `fieldBorder` | borders of controls and buttons (must stay visible) |
| `bar` | **section heading bands only** (the teal) |
| `link` | text links |

**One teal, one job:** teal (`bar`) marks section headings and nothing else (it is also the background of status notices in admin). Buttons and nav tiles are outlined on `cardBg`. Selected = accent fill. Empty image/photo wells = `border` color. Selected table rows use a 14% tint of `accentFill`.

Values (Tappioca palette, the default):

| | Day | Old paper (was Lagoon) | Night | Midnight |
|---|---|---|---|---|
| pageBg | `#EDF6F9` | `#F6F1E7` | `#14262D` | `#06141B` |
| text | `#204B57` | `#0A1517` | `#EDF6F9` | `#CCD0CF` |
| muted | `#4F6F78` | `#3C5558` | `#83C5BE` | `#9BA8AB` |
| accentText | `#51344D` | `#A84B4E` | `#D8B4D1` | `#CCD0CF` |
| cardBg | `#EDF6F9` | `#FBF8F2` | `#1B3540` | `#11212D` |
| border / well | `#B7D3D8` | `#E0C3A8` | `#2F5A66` | `#4A5C6A` |
| fieldBorder | `#3F8590` | `#3C5558` | `#6A9AA3` | `#74858F` |
| bar (teal) | `#83C5BE` | `#F1D5BC` | `#204B57` | `#253745` |
| accentFill | = accentText | `#34B5A1` | = accentText | = accentText |
| onAccent | = pageBg | `#0A1517` | = pageBg | = pageBg |
| link | `#125E8A` | = accentText | = accentText | `#9BA8AB` |

**Changed 2026-11-03 (v125): Day `muted` was `#125E8A`, the same blue as Day `link`**, so muted lines and empty notes read as clickable. It is now `#4F6F78` (4.94:1 on the Day page and cards). Day `link` stays `#125E8A`. **Rule: muted text only goes on `pageBg` or `cardBg`, never on a `bar` or an image well** (Day muted measures 2.76:1 on the bar and 3.44:1 on a well). In **Midnight, `muted` and `link` are still the same value (`#9BA8AB`)**; the underline and italic rules above are what tell them apart there. Whether to separate them is an open question.

Defaults when a token is missing: `fieldBorder = border`, `bar = tint`, `accentFill = accentText`, `onAccent = pageBg`, `link = accentText`. (`tint` is the old teal, now only a source for `bar`.) The admin screens define no `link` token; their links are text color with an underline.

The reader component (`Site.dc.html`) also still contains leftover palettes (Harbor, Milk Tea, Orchid, Custom) from the old look; the Admin, Stories, Comments and Uploads screens have only the four above. Ignore the leftovers unless Bijuu asks; Tappioca is the live one. **Lagoon was renamed "Old paper" on 2026-11-03 (v142).** In code its key is still `lagoon`, so saved choices keep working. **Old paper also has a texture** (`public/textures/old-paper.webp`, from Bijuu): multiplied into the page color (`background-blend-mode: multiply`), page background only, with the page color laid over it at 45% so text keeps 4.5:1. Cards, bars and fields stay solid.

## 3. Type

- Display and headings: **IM Fell English** (site title always; headings follow the chosen font when it is not Default).
- Body and UI: **Inclusive Sans**. Admin uses the same.
- Reader font menu (Aa panel, checked in the canvas code): Default (Inclusive Sans), Lucida Sans, Cantarell, Tahoma, Crimson Pro, IM Fell English, Cormorant Garamond.
- Sizes: page title `clamp(30px, 7vw, 40px) * --fs`; section bar heading `24px * --fs`; **intro box heading (Howdy, The Archive) `24px * --fs`, body `16px * --fs`, padding 20px**; card title `15px * --fs`; meta `13px * --fs`; body `16px * --fs`.
- Line spacing options: Tight 1.4, Normal 1.7 (default), Loose 2.1.
- Paper texture from the old v44 page is **not** in the canvas. Decide with Bijuu before bringing it back.

## 4. Screens and behavior

Reader-facing app is one page with hash routes: `#home`, `#fics`, `#story/<id>` (overview), `#read/<id>/<n>`, `#disclaimer`, `#about`, `#links`. (Proposed routes; the canvas switches screens with state.)

### Home (order set by Bijuu on 2026-11-03)
Top to bottom:
1. Site title "Tappioca's Fic Archive" (links to Home).
2. **Intro block**, directly under the title: photo circle placeholder + "The Archive" stats box (per-fandom counts, `[N]`) on the left; "Howdy" box and four outlined page tiles (Disclaimer, About, Fic List, Links) on the right. Stacks and centers on phones. **The Archive box and the Howdy box are one component at one scale** (h2 24 in `accentText`, body 16, padding 20, gap 12, 10px corners). The Archive box is **not a 1:1 square any more** (v125): it takes its natural height, and "[N] stories" is a plain bold line above the per-fandom list.
3. **Latest activity** bar + three rows (v146, replaces Featured; v147 added comments): "New story", "New chapter" or "New comment", the title (with "Chapter N"), the date. Story and chapter rows open the story page; a comment row opens that chapter's comments.
4. **More stories** bar + grid of fic cards (auto-fill, min 200px). There is **no "See the whole fic list" button**; the Fic List tile in the intro is the way to the list.
5. **Continue reading** card, **only for a returning reader** (has progress), at the **very bottom, just above the footer**: title, "Chapter N of T", primary "Resume". Resume goes straight into the reader at that chapter. First-time readers never see it.

Earlier orders (fics first; Continue reading on top) were replaced by Bijuu's comments. Build the order above.

**Fic cards** (Home and Fic list): **no cover image** (v130), title, rating and relationships line, words and chapters line, and nothing about likes (the "[N] hearts" line was removed in v135). The hearts line is a count only; it is not a button.

### Fic list
Fic cards grouped by fandom (bar heading per fandom). Cards as above. Opens the **story page**, not the reader. Above the groups: a **"Search the fic list"** field (matches title, fandom and pairing; typed text is not lowercased) and a **"Sort by"** select (**Newest, Title, Most liked**), both 44px tall, side by side and wrapping on phones. Fandoms with no match disappear; if nothing matches, a status line says "No fics match that search." with an underlined "Clear the search" link. On the canvas only Title visibly reorders, because dates and hearts are placeholders; in the real app Newest uses the updated date and Most liked uses the server count. Tag filtering is **not** drawn (all tags are placeholders); ask Bijuu before adding it.

### Story page (overview)
- "Back to the fic list" link, title, fandom, summary, tag chips.
- **Hearts and follow row**, just under the tags: an outlined **"Like"** (v135; "Liked" once pressed) button (heart icon in `accentText`, outline when off, filled when on, label becomes "Hearted", `aria-pressed`), and an outlined **"Follow new chapters (rss)"** button with an RSS icon. Pressing Follow copies the story's feed link and shows a quiet status line: "Feed link copied. Paste it into your feed reader." These are shown even before the content notice is accepted.
- **No covers anywhere (v130, Bijuu: "i don't want a cover for a fic").** The story page, the Home and Fic list cards, and the editor's "Cover image" upload have no cover. Title, summary and tags take its place.
- **Details** bar with Rating, Relationships, Words, Chapters, Status, Updated.
- **No content notice (v144).** Bijuu removed it ("they know what they're going into anyway"). Mature and Explicit stories open straight to the chapters. Do not build it, and do not ask readers to confirm they are adults.
- After acceptance (or if no notice needed): primary button **"Start reading"**, or **"Resume at chapter N"** if there is progress. If a notice was accepted, a muted line says so.
- **Chapters** bar + list of chapter buttons (first 6, then "Show all N chapters" / "Show fewer chapters"). The resume chapter shows "Resume here".
- The notice wording is not final. Whether to ask readers to confirm they are adults is Bijuu's call; do not add an age claim without asking.

### Reader
- Top: "Story details" link, story title, "Chapter N of T", **chapter dropdown with no visible label** (it carries `aria-label="Jump to chapter"`), thin progress bar. **No Previous / Next buttons under the title any more (v129, Bijuu: "remove these buttons")**; readers move with the dropdown and the bottom row of links.
- Chapter heading bar (v128): **centered text "Chapter N: [chapter title]"** (the real title replaces the bracket), optional author's-notes box (not lowercased), chapter text (justified, `pt` size, chosen font).
- **Bottom chapter row (Bijuu: "remove the boxes, make them links, center them"):** **no borders or fills**. A centered row of three links: **left arrow | Contents | right arrow**, in the `link` color, 48px tap areas, 8px apart, Contents underlined. Arrows dim at the first/last chapter and are disabled there. **Contents** currently scrolls to the top and focuses the chapter dropdown; it does not open a separate list (open question).
- **End of story** (last chapter only, v127): **no box, heading, closing note or extra buttons.** Just one row: the primary **"Leave a comment"** button (scrolls to the comment form) and, next to it, an **icon-only heart** (no label, no box, `aria-label` "Like" / "Liked", `aria-pressed`, same behavior as on the story page). "Read again", "More in <fandom>" and "Story details" were removed (Bijuu's comment); the story page still has the heart count. Open: whether to show the count here.
- **Comments** per chapter, at the bottom of every chapter page: heading "Comments on chapter N (count)", list (name, when, body; typed text is not lowercased), form (name, comment, Post). With no comments the list shows **"No comments on this chapter yet." in muted italic** (an empty note, see section 1). **This is the only place a reader writes a comment.** The Post button is still a normal box. New comments go to the admin Comments screen and wait for approval (see Admin).
- **Back to top** button: round, bottom right; shows near the bottom of the page, and on phones also when scrolling up after a long scroll.
- **Aa panel** (display options): opens from the Aa button. Header row: on the reader, the muted 10pt text **"adjust for your eyes"** sits to the left of the **close X**; the X is a plain icon with **no box or border** (44px tap area, `aria-label="Close display options"`). Below: Text size − / +, Font, Line spacing, Theme. Esc closes and returns focus to Aa. Desktop: floating card under the Aa button; when open on wide screens the page makes room at the right. Phone (<600px): bottom sheet. The "adjust for your eyes" text shows only in the reader.
- Where the heart and comment controls are **not**: no heart in the chapter pages, no comment button on Home, fic cards or the story page.

### Footer (all pages except the reader)
"online web app made by tappioca. all intellectual properties belong to their rightful owners." plus an underlined link **"rss feed for all stories"** that copies the site-wide feed link and shows the same quiet status line. **Next to it, a muted "[N] visitors" count** (v148; GoatCounter).

### Disclaimer, About, Links
Placeholders with `[Your ... text]`. Photo circle placeholder on About. Links body is not lowercased and has four inline links.

### Edit in place for Bijuu (v131-v134)
When Bijuu is signed in as admin, the **Disclaimer, About and Links** pages can be edited right on the page, like Notion. Readers never see any of it. The text itself is the editor (`contenteditable`). Above it a toolbar: **Bold, Italic, Underline, Heading, List, Quote, Link** (44px buttons; they must not steal the text selection). **Link** opens a row: "Link address" field, **Add link**, **Remove link**, Cancel; only `http`, `https` and `mailto` are accepted, with a short message otherwise. A muted status line says "Saved" as she types (autosave). Dashed outline on the editor, normal focus ring. Stored as the allowed rich-text HTML in CLAUDE.md (heading = h3, list = ul, quote = blockquote). Canvas boards: "Disclaimer / About / Links: signed in (edit in place)" below the public ones. **Not drawn yet:** the same for the Howdy and The Archive boxes on Home (asked of Bijuu). The canvas is untested for typing; the real build decides undo and paste behavior.

### Admin: sections
Every admin screen has a row of section links under its header: **Stories | Comments | Uploads** (current one in accent fill, `aria-current="page"`). The New Story editor sits under Stories.

### Admin: New Story (editor)
- Header: title "New Story", "Back to all stories", Aa (theme only; older circle look).
- Left column (collapses behind a button below 1024px): **Story details** (Fandom: Resident Evil / Naruto / Saw (Static Baby); Rating: Not Rated / General Audiences / Teen and Up / Mature / Explicit; Relationships; Summary; optional cover upload with preview; Tags) and **Chapters** (list, "+ Add chapter").
- **Menu row: File, Edit, View only** (Insert, Format, Tools, Help were dropped; the toolbar covers them). Pressing one (accent fill while open, `aria-expanded`) opens a row of underlined links beneath it. File: Save draft, Preview, Publish (opens the Publish check), Back to stories. Edit: Undo, Redo, Clear formatting. View: Word count, Text size. Below 1024px the row sits behind the hamburger button. On the canvas most items just close the row; build the real actions.
- Editor: formatting toolbar (undo/redo, bold, italic, underline, strike, link, image, block quote, scene break, alignment, spacing, indent, clear, text style, font, size), story title, chapter title, writing area, status line ("Chapter N · [Word count] · Draft or Published").
- Actions: Save draft, Preview, **Publish**. On phones they sit in a fixed bottom bar.
- **Publish check** (dialog): Publish opens it instead of publishing. Checks: story title present, summary present, rating is not "Not Rated", fandom chosen. Each row shows a check or "!" plus a short note; the dialog title says how many things need attention. **"Publish story" stays disabled until all pass**; "Keep editing" and "Save as draft" always work. If rating is Explicit or Mature, a line says readers will see a content notice before chapter 1. Enforce the same rules on the server; the dialog is only the front door.

### Admin: Stories (dashboard)
- Header "Stories", "Add new story" (bottom bar on phone), Aa.
- Filter tabs All / Published / Drafts with counts; Fandom select. **No "show" button:** the select filters as soon as it changes.
- **Table** on desktop, **cards** on tablet and phone. Columns: select box, story + fandom, rating, chapters, words, status (filled dot = published), updated, actions.
- Row actions: **Edit** (underlined link), **View** (underlined, published only), **delete icon** (no box).
- Multi-select with a sticky bar ("N selected", Clear, "Delete N stories"). Delete opens a confirm dialog (permanent; says how many published stories will disappear). Esc closes dialogs.
- Open question: whether Anam Cara and MORIBUND stay marked Published.

### Admin: Comments (new)
- Header "Comments", Aa (theme panel with X close), section links.
- A muted line: "New comments wait here until you approve them. Only approved comments show under a chapter." (**Designed as approve-first**; Bijuu has not confirmed. Flipping to "show immediately" only changes the default status and this line.)
- Filter tabs **Waiting | Approved | All** with counts (default tab: Waiting) and a Story select (All stories / each story).
- A **list of comment cards** (all widths; stacks on phone): name (as typed, not lowercased), when, status (hollow dot "Waiting for approval", filled dot "Showing on the site"), "On <story link> · Chapter N", the comment body (as typed). Actions: **Approve** (primary, waiting only), **Hide from site** (underlined link, approved only; sends it back to Waiting), **delete icon** (no box) with a confirm dialog ("Delete this comment?", Keep comment / Delete comment, permanent).
- Status notice (bar background, `role="status"`) after each action: "Comment approved. It now shows under the chapter." / "Comment hidden. It is back in Waiting." / "Comment deleted."
- Empty states per tab ("Nothing is waiting for approval." etc.).

### Admin: Uploads / Drive (new)
- Header "Uploads", Aa, section links.
- **"How a fic gets here"** card: a teal section bar, then a three-step flow with numbered circles and arrows: (1) Drop the file in your Drive folder -> (2) Press "Check Drive again" -> (3) It shows up in the list below, ready or with what to fix. Under it: "Name chapters like `Title - 1.md`, `Title - 2.md` so they group into one fic."
- Summary line "N fics found · N need attention", "Last checked [time]" (becomes "just now" after a check), an underlined **"Open the Drive folder"** link and a primary **"Check Drive again"** button. A status notice appears after checking.
- **List of fics found** (one row per fic): title, folder path (e.g. `Resident Evil / Moribund`), a file line (file name(s), type, words or chapters), a status of **Ready** (filled check) or **Needs attention** (hollow "!") with a one-line reason, and underlined **Open** (goes to the editor) and **View in Drive** links. Status is never color alone.
- **The four demo rows are examples of the states, not real Drive contents.** Two use details from November 1 (Anam Cara as an `.epub` that is not readable, MORIBUND with no details block); I do not know whether those files are in her Drive under those names today. The other two are placeholders. Build the states (epub not readable, no details block, ready, all chapters found), and fill them from the real Drive listing.

## 5. Behavior to build (proposed storage)

The canvas keeps all of this in demo state; it reads and writes **no** browser storage. For the real app, reading state lives in the reader's browser, no accounts. Wrap every read and write in try/catch.

- Proposed keys: `fic-theme`, `fic-font`, `fic-size`, `fic-spacing`, `fic-progress` ({ficId: chapter}), `fic-last` (ficId of the last read story), `fic-notice-seen` ({ficId: true}), `fic-hearted` ({ficId: true}). (The old v44 page used `fic-site-theme`, `fic-site-font`, `fic-site-size`; you may keep those names for theme, font and size if you prefer.)
- Progress is written whenever the chapter changes in the reader. "Continue reading" and "Resume at chapter N" read it.
- **Hearts:** the reader's own on/off state lives in `fic-hearted`. The shared **count** must live on the server (the prototype shows `[N]`). With no accounts, one reader can heart again from another browser; accept that or add light protection, and tell Bijuu which.
- **RSS:** one feed per story and one site-wide feed (for example `/feed/<id>.xml` and `/feed.xml`; the terminal chooses the paths). Each item is a chapter. The Follow buttons copy the matching URL.
- **Comments:** reader posts go to the server with status `waiting`; only `approved` comments are returned to the reader. The admin Comments screen approves, hides and deletes.
- **Uploads:** the screen reads the Apps Script list (with a "check again" that bypasses the 5-minute cache) and reports per-fic status and reason. The script needs to return that status.
- Chapters: files named `<Title> - <N>.md` are chapters of one fic (see HANDOFF).

## 6. Accessibility notes already in the design

- Real `<button>`, `<a>`, `<select>`, labelled fields. Icon-only buttons (Aa, X, arrows, back to top, delete) have `aria-label`. Status is never color alone (publish check and Uploads use a check or "!" plus text; published/approved dot is filled vs hollow).
- The dialogs use `role="dialog"` / `alertdialog` with labelled titles. Heart is a toggle with `aria-pressed`. Status lines use `role="status"`.
- Contrast: Day muted is now 4.94:1 on the page and cards (v125). The old 3.6:1 worry (Day muted on the teal bar) is closed by the rule that muted never sits on a bar or well. Midnight muted is 7.6:1. Recheck all four themes once built.
- "adjust for your eyes" is visual hint text inside the panel; the panel itself is labelled "Display options".
- Known gap (from Impeccable's craft rules, not changed): the check marks in Uploads, the Publish check and the Dashboard select boxes are typed characters (✓, !, –), not drawn icons. Build them as one consistent SVG icon set.

## 7. For the terminal (not solved by the design)

1. `viewport-fit=cover` in the viewport meta so safe-area insets work.
2. Real-phone testing of the Admin bottom bar, the Aa panel, and the Aa slide-away on scroll.
3. Saving comments (storage, validation, moderation); hearts count storage; RSS feed generation (section 5).
4. Real table markup for the dashboard (semantic `<table>`), keeping the card layout on small screens.
5. Focus trap and focus return for the delete dialogs, the Publish check dialog and the display options panel.
6. Server-side check of the publish rules; unsaved-changes warning when leaving the editor.
7. Browser storage for progress, notice-seen and hearts (section 5).
8. Verify what was never rendered: board heights, script errors, contrast in all four themes, no sideways scroll at 390/820/1280 and at 10, 14 and 20pt. Specifically check the reader's top-right at 390px (plain-text Aa), the bottom chapter row at 390px, the story page heart/follow row wrapping, the new Comments and Uploads screens in all four themes and three widths, and **the Home intro in all four themes (the Archive box is no longer a square, so check that the left and right columns still line up and the Archive list fits in the 253px column at 20pt)**.
9. **Match the canvas on the three points the terminal raised (decided 2026-11-03):** (a) the Archive box uses the Howdy scale; (b) empty notes are muted, italic, not underlined, using Day muted `#4F6F78`; (c) the plain 10pt Aa stays outline-free and stays at the viewport's right edge, with an underline on hover.

## 8. Canvas boards (so you know where to look)

Rows, top to bottom: Home and Reader in four themes (Reader: Day opens with the display options panel open); phones and tablets (Home, Reader, Admin, Story page, End of story); the whole site; **Story page, content notice and the end** (Overview Day/Night/Midnight/Lagoon first visit, Overview returning reader, End of story in four themes); Admin and Stories in four themes plus phone and tablet; **Publish check**; "Back to top: a long story"; and at the bottom **"Admin: comments and uploads"** (Comments row, then Uploads row, each Day, Night, Midnight, Lagoon, tablet, phone). "Original template" is the old starting point; ignore it. Home boards default to the returning reader, so they show the Continue reading card at the bottom. Bijuu may move boards or edit the canvas herself; the canvas as she leaves it is the truth.

## 9. Change log (design chat)

- 2026-11-03 (v100-v102): story page with Explicit/Mature content notice; Continue reading and Resume; end-of-story panel; Home reordered (fics first); teal split to one job; publish check in Admin; chapter dropdown label removed; row actions underlined and delete box removed.
- 2026-11-03 (v106-v120, from Bijuu's canvas comments): display options X icon without a box; Aa stays visible on desktop; "See the whole fic list" button removed; Continue reading moved to the bottom for returning readers; intro block moved under the page title; Aa plain 10pt text; Previous/Next arrow icons with Contents centered; "adjust for your eyes" inside the panel left of the X; pencil doodle removed from Reader: Day.
- 2026-11-03 (v121, requested by terminal Claude Code, answers from Bijuu): per-story hearts; rss follow buttons and footer link; Admin Comments screen; Admin Uploads/Drive screen; section links across admin screens.
- 2026-11-03 (v122, Bijuu's comment): reader bottom chapter row became centered plain links (no boxes).
- 2026-11-03 (v123, from the terminal's gap list, Bijuu: "all as suggested"): editor menu row reduced to File/Edit/View with items; dashboard "show" button confirmed absent; fic list search and sort.
- 2026-11-03 (docs only, no canvas change): added the canvas-wins rule; storage keys relabeled as proposed; Uploads demo rows marked as examples; leftover-palette note corrected.
- 2026-11-03 (v125, terminal's type-scale critique checked against Impeccable's rules): The Archive box moved to the Howdy scale (24/16/padding 20, accent heading, no 1:1 square); Day `muted` changed from `#125E8A` to `#4F6F78` in all five components so muted text no longer matches links; the empty comments line is muted italic; Aa kept plain and at the viewport edge, with an underline on hover. Not changed, waiting on Bijuu: typed check marks vs drawn icons, Publish check as a modal, "nothing here" empty-state wording, Midnight muted equal to link.
- 2026-11-03 (v127-v129, Bijuu's comments): end of story reduced to "Leave a comment" + icon-only heart (v127); chapter bar centered as "Chapter N: [chapter title]" (v128); the top Previous/Next arrow buttons removed (v129).
- 2026-11-03 (v130-v135, Bijuu's comments): covers removed everywhere; edit-in-place with rich text and links on Disclaimer, About, Links (signed-in boards); "Heart this story" became "Like"/"Liked" and all "[N] hearts" counts were removed; sort option "Most liked".
- 2026-11-03 (v142): Lagoon renamed Old paper; paper texture as its page background (multiply, lightened 45%).
- 2026-11-03 (v144): content notice removed everywhere.
- 2026-11-03 (v146): Home Featured became "latest activity": three rows of the newest chapters (New story / New chapter, title, date).
- 2026-11-03 (v148): visitor count next to the rss link in the footer.
