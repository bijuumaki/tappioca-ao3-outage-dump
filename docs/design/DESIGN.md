# DESIGN.md: Tappioca's Fic Archive

The design in words, kept in step with the canvas (https://claude.ai/artifact/27nUAdqjtSjppMvVp9t2bP, version 157). **If this file and the canvas differ, the canvas wins**; fix this file. Rules for building it are in `CLAUDE.md`.

The canvas is a prototype: demo switches (`signedIn`, `showEnd`, `panelStartsOpen`, `longStory`, `resumeDemo`, `reviewDemo`, `showTopDemo`) and bracketed placeholders (`[N]`, `[Date]`, `[Fic summary]`, `[YOUR PHOTO]`) only show states and never ship. Never invent fic details or story text.

## 1. Site-wide rules (Bijuu's)

- Small **lowercase** text site-wide. Exceptions: chapter text, comment names and bodies, anything typed, author notes, the Links page body, file names in Uploads, font names in the Aa panel.
- Reader text size 10 to 20pt in steps of 2, default 14; the whole site scales with it. UI text never below 12px.
- Chapter text is justified (max 66ch).
- **Aa**: plain text, fixed 10pt, no circle, 44px tap area, at the viewport's right edge, underline on hover. Under 900px, in the reader only, it slides away on scroll down and returns on scroll up.
- 10px corners on boxes and cards (small controls 6 to 8px).
- Four themes on every screen: **Day, Old paper, Night, Midnight**. Phone, tablet and desktop all covered.
- Tap targets at least 44px, visible focus, reduced motion respected, safe-area insets respected.
- Icons instead of words where she asked (display options X, bottom chapter arrows, edit toolbar, heart). Icon-only buttons keep an `aria-label`.
- **Muted is not a link**: muted text is never underlined; links are underlined or in the link color. Empty notes are muted italic.
- She often reverses values. Apply the latest and say what it replaced.

## 2. Tokens

| | Day | Old paper | Night | Midnight |
|---|---|---|---|---|
| page | `#EDF6F9` | `#F6F1E7` | `#14262D` | `#06141B` |
| text | `#204B57` | `#0A1517` | `#EDF6F9` | `#CCD0CF` |
| muted | `#4F6F78` | `#3C5558` | `#83C5BE` | `#9BA8AB` |
| accent text | `#51344D` | `#A84B4E` | `#D8B4D1` | `#CCD0CF` |
| card | `#EDF6F9` | `#FBF8F2` | `#1B3540` | `#11212D` |
| border / image well | `#B7D3D8` | `#E0C3A8` | `#2F5A66` | `#4A5C6A` |
| field border | `#3F8590` | `#3C5558` | `#6A9AA3` | `#74858F` |
| bar (section headings) | `#83C5BE` | `#F1D5BC` | `#204B57` | `#253745` |
| accent fill | = accent text | `#34B5A1` | = accent text | = accent text |
| on accent | = page | `#0A1517` | = page | = page |
| link | `#125E8A` | = accent text | = accent text | `#9BA8AB` |

**One teal, one job**: the bar color marks section headings only. Buttons and tiles are outlined on the card color; selected states use the accent fill. Muted text only goes on page or card colors, never on a bar. In Midnight muted and link are the same color (underline and italic tell them apart). **Old paper** also has her paper texture as the page background (multiplied, lightened 45%); cards, bars and fields stay solid.

## 3. Type

Site title and headings: **IM Fell English** (the site title, the "Chapter N: title" bar and the "Comments on chapter N" bar always keep it; other headings follow the chosen font unless Default). Body and UI: **Inclusive Sans**. Reader fonts (Aa panel): Inclusive Sans (default), Lucida Sans, Cantarell, Crimson Pro, EB Garamond. Sizes: page title `clamp(30px, 7vw, 40px)`, section bar 24px, intro boxes 24px heading and 16px body, card title 15px, meta 13px, body 16px (all times the size setting). Line spacing: Tight 1.4, Normal 1.7, Loose 2.1.

## 4. Reader screens

**Home**, top to bottom: site title; the intro (photo circle 205px, "The Archive" box with stats, "Howdy" box, outlined page buttons Disclaimer / About / Fic List / Links in a 2 by 2 grid, 52px tall); **Continue reading** (returning readers only: title, "Chapter N of T", Resume); **Latest activity** bar with 3 rows ("New story", "New chapter" or "New comment", the title with "Chapter N", the date; story and chapter rows open the story page, a comment row opens that chapter's comments); **More stories** (up to 6 cards); Recent Art if any exists. No "See the whole fic list" button.

**Fic card**: title, rating and relationships line, words and chapters line. No cover, no like count.

**Fic list**: "Search the fic list" field ("title, fandom or pairing") and "Sort by" (Newest, Title, Most liked), then cards grouped by fandom under bar headings. No match: "No fics match that search." with "Clear the search". Cards open the story page.

**Story page**: "Back to the fic list", title, fandom, summary, tag chips, a **Like** button (heart icon; "Liked" once pressed; no count) and **Follow new chapters (rss)**, Details (Rating, Relationships, Words, Chapters, Status, Updated), "Start reading" or "Resume at chapter N", Chapters list (first 6, "Show all N chapters"). No cover, no content notice.

**Chapter page**: "Story details" link, title, "Chapter N of T", "Jump to chapter" dropdown (no visible label), progress bar, a centered bar "Chapter N: [title]", author notes, text. Bottom: plain centered links (arrow, Contents, arrow; no boxes; arrows dim at the ends). At the last chapter: only a primary "Leave a comment" button with an icon-only heart beside it. Then Comments ("Comments on chapter N (count)", list, form with name, comment, Post; empty note in muted italic). Back to top button. No Previous/Next buttons under the title.

**Aa panel** (dialog under the Aa button; bottom sheet under 600px; X to close, Escape closes; on the reader the muted "adjust for your eyes" sits left of the X; pushes a chapter page over by 344px at 900px+). Sections with small uppercase headings: **Theme** (four round swatches, each split diagonally into the page color and the accent color, label under, ring on the picked one), **Text size** (slider, small A to large A, the size shown at the top), **Serif** and **Sans serif** (font cards, each just the font's name set in that font; ring on the picked one), **Line spacing** (Tight, Normal, Loose).

**Footer** (all pages except the reader): the credit line, then "rss feed for all stories" (copies the feed address, quiet status line) with a muted visitor count beside it.

**Disclaimer, About, Links**: text pages; About has the photo circle. The Links body is free writing with inline underlined links. The site title on every page except Home is a link in the link color, not underlined.

## 5. Admin when signed in

- **Edit in place** (boards "Disclaimer / About / Links: signed in"): the page text is the editor, with an icon toolbar (Bold, Italic, Underline, Heading, List, Quote, Link; the link row takes http, https or mailto) and a quiet "Saved" line; dashed outline on the text. Readers never see it. The photo circle shows a centered upload icon, and once a photo exists a zoom-and-move tool (slider, drag, arrow keys, Done).
- **Sections**: every admin screen has Stories | Comments | Uploads links.
- **Stories**: tabs All / Published / Drafts with counts, a Fandom select (filters at once), a table on desktop and cards on small screens, row actions Edit and View (underlined) and a trash icon, multi-select with a sticky bar and a confirm dialog.
- **Editor**: story details (fandom, rating, relationships, summary, tags) and chapters on the left; menus File / Edit / View; a **Chapter text** label with **Rich text / HTML** toggle and a hint line; formatting toolbar; title, chapter title, writing area, status line. Actions Save draft, Preview, Publish. **Publish check** dialog: story title, summary, rating other than Not Rated, fandom; "Publish story" stays disabled until all pass.
- **Comments**: Waiting / Approved / All tabs, story select, cards with Approve, Hide from site, trash with confirm; status notice after each action.
- **Uploads**: "How a fic gets here" three-step card, "Check Drive again", a list of fics found with Ready / Needs attention and a reason.

## 6. Accessibility already in the design

Real buttons, links, selects and labelled fields; dialogs with labelled titles; status lines with `role="status"`; Like is a toggle with `aria-pressed`; status never by color alone. Contrast measured at 4.5:1 or better in all four themes.

## 7. Not decided / not drawn

Tag filtering on the Fic list; the `/browse`, tag, 404 and Comms pages; the admin Aa panel matching the reader's; edit in place for the Howdy and The Archive boxes; typed check marks versus drawn icons in Uploads, the Publish check and the dashboard; whether the Publish check should be inline instead of a dialog; empty-state wording ("what to do next"); Midnight muted versus link; the Drive links in Uploads (the script returns none yet).
