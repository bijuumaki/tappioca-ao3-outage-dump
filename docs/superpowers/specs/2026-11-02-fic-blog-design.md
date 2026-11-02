# Tappioca's reader: fic blog design

Date: 2026-11-02. Status: waiting for Bijuu's review.

## Goal

A public blog for Bijuu's fanfics and art, like a small WordPress built around fics. Bijuu is the only author. Anyone can read without an account. Readers can comment, give hearts and subscribe.

This replaces the old plan in `CLAUDE.md` (fics in Google Drive served by Apps Script, plain static files, Neocities and WordPress portability). That plan is dropped. `CLAUDE.md` gets rewritten to match this spec as the first implementation step.

## What Bijuu said (requirements)

- Public site, single author.
- Fics have chapters. Some fics have only one chapter (oneshots).
- Categories: **Fic** and **Art** to start, and Bijuu can add more later (for example **Playlist**). One category per post.
- Fanfic-style tags: fandom, characters, relationships, rating, warnings, free-form tags. Clicking a tag shows everything with it.
- Status (in progress / complete). Word count per chapter and total per fic.
- Images: image posts, images inside chapters, cover images. All optional.
- A visual editor that also keeps formatting when pasting from Google Docs or Word.
- **Upload files** (.md, .html, .epub and similar) and the reader shows them with their rich text and formatting.
- Readers: comments, hearts (not "kudos"), subscribe. Reading never needs an account.
- Comments: guests give a name and, if they want, an email. Bijuu replies as the author.
- Drafts, scheduled posts, and private preview links.
- Bijuu designs the look herself (in Claude Design). The site follows her design.

## Assumptions (Bijuu can correct these)

- One rating per fic: General, Teen, Mature, Explicit, or Not Rated.
- Hearts go on the whole fic and on image posts, one per browser.
- Comments go on chapters and image posts. For a oneshot, that is the fic's page.
- A first-time commenter waits for approval. Once Bijuu approves someone (matched by email if given, otherwise by name plus browser), their later comments go live at once.
- Uploads accept .md / .markdown, .txt, .html / .htm, .epub and .docx. Other formats (.odt, .rtf, .pdf) are not in this version.
- The site keeps its current name, "Tappioca's reader", until Bijuu says otherwise.

## Content

**Fic**: title, slug (for the web address), summary, cover image (optional), category, rating, status, fic notes, tags, and a state: draft, scheduled (with a date and time) or published. The total word count is added up from its published chapters.

**Chapter**: belongs to one fic. Number (Bijuu can reorder), optional title, notes before, body, notes after, word count (counted automatically), and its own state: draft, scheduled or published. Readers only see published chapters, numbered in order.

**Post** (any category other than Fic, such as Art or Playlist): title, slug, one or more images with captions, optional body text, optional embed link (Spotify, YouTube and similar), category, tags, state.

**Category**: name and slug. Starts with Fic and Art. Bijuu can add, rename and remove empty ones.

**Tag**: a type (fandom, character, relationship, warning, freeform) plus a name. The same name can exist under different types. Typing a tag suggests existing ones so spellings don't split. Bijuu can rename and merge tags.

**Page**: simple pages Bijuu writes in the editor: About, Disclaimer, Links, Comms. They come from the old site's nav.

**Heart**: one per browser per fic or post. It stores an anonymous browser id, never a name.

**Comment**: on a chapter or a post. Name, optional email (never shown publicly), text, state (pending, approved, hidden), optional parent (for Bijuu's replies). Bijuu's replies show an "Author" badge.

**Subscriber**: email, confirmed or not, unsubscribe token.

**Preview link**: a secret random link for one draft or scheduled chapter or post. Bijuu can revoke it.

## Rich text: one format for everything

Every body (chapters, posts, pages) is stored as clean HTML limited to this set:

paragraphs, bold, italic, underline, strikethrough, text color, highlight color, headings, block quotes, bulleted and numbered lists, links, text alignment (left, center, right, justified), scene breaks, and images (with optional caption).

**HTML is the main way in.** Bijuu finds HTML the most faithful to the formatting she intends. Ellipsus has no `.html` file export, but its "Copy as HTML" keeps links, colors, text decorations and alignment (it drops fonts, indents and custom paragraph spacing). The format set above is chosen to keep everything that copy carries.

The editor, pasting and uploads all produce this same format, so the reader shows everything the same way. Anything outside the set (fonts, scripts, embedded styles other than color and alignment) is dropped. A sanitizer runs on the server before anything is saved, so nothing unsafe can reach a reader.

Colors show exactly as written. In whichever theme a color would fall below 4.5:1 contrast against the background, the reader lightens or darkens it just enough to stay readable, keeping its hue.

## Writing and uploading

There are **two routes** for putting up a fic. Both end in the same chapters and the same reader pages.

1. **Editor**: write or paste in the WordPress-style editor.
2. **Upload bin**: drop files into the fic's folder.

**Every fic has its own folder and its own path**, so stories never get mixed up:

```
Upload bin (dashboard)              Web address
fics/
  moribund/                   ->    /fics/moribund
    MORIBUND - 1.html         ->    /fics/moribund/1
    MORIBUND - 2.html         ->    /fics/moribund/2
    images/                         (pictures used in this fic only)
    cover.jpg
  anam-cara/                  ->    /fics/anam-cara   (oneshot)
    Anam Cara.html
```

How the upload bin works:

- Creating a fic (by either route) creates its folder. Dropping files on an empty spot in the bin with "New fic" creates a new fic and folder, named from the files.
- Files in a fic's folder become its chapters: `<Title> - <N>` names give the chapter numbers; otherwise they follow the order Bijuu arranges them in. An `.epub` dropped in fills the whole fic.
- Dropping a file with the same chapter number again **replaces that chapter's text**. The previous text is kept as an earlier version (see below), so nothing is lost.
- New uploads arrive as **drafts**. Bijuu publishes or schedules them as usual.
- A picture named `cover.*` becomes the cover. Other pictures go in `images/` and can be placed in chapters.
- The bin shows each file's state next to it: draft, scheduled, published, or "couldn't convert" (with the reason).
- Files and editor stay in sync: a chapter edited in the editor shows as "edited on the site" in the bin. Re-uploading over it asks first, then replaces it.

**Versions**: every save or replace keeps the previous text of the chapter. Bijuu can view and restore the last 20 versions per chapter.

**Editor** (Tiptap): a toolbar for the formats above and drag-and-drop images. Pasted Google Docs or Word text keeps its formatting within the set. It autosaves drafts every few seconds.

**Paste HTML**: a box on the editor screen where Bijuu pastes what Ellipsus's "Copy as HTML" produced. It shows a preview, then fills the chapter. No file needed.

**Upload**: anywhere the editor is, plus "New fic from files":

| File | What happens |
|---|---|
| `.html`, `.htm` | The main format. Cleaned down to the format set, keeping colors and alignment. |
| `.md`, `.markdown` | Markdown becomes rich text. Optional `---` front matter (title, fandom, rating, relationships, summary, tags) fills in the fic details. |
| `.txt` | Each blank-line-separated block becomes a paragraph. |
| `.docx` | Converted with formatting kept (bold, italics, headings, lists, images). |
| `.epub` | One fic. Each chapter in the book's reading order becomes a chapter (skipping the cover, title and nav pages). The book's title and description fill in the fic's title and summary. Its images are kept. |

- Upload several files named `<Title> - <N>.html` or `<Title> - <N>.md` (the old naming rule) and they become chapters 1 to N of one fic, in number order.
- Images inside files are moved into the site's image storage.
- A line of only dashes, stars or ornament symbols becomes a scene break, as in the old reader.
- After an upload Bijuu sees a preview of the result, then saves it as a draft. It stays fully editable in the editor afterwards.
- Upload into an existing fic: add as a new chapter, or replace one chapter's text.
- The original file is kept privately, so it can be converted again if the converter improves.
- Conversion is tested on Bijuu's real export files (Ellipsus Markdown and EPUB) before it counts as done.

## Pages readers see

- **Home** (`/`): latest updates, newest first: new fics, new chapters and posts.
- **Fic** (`/fics/<slug>`): cover, title, summary, rating, status, category, tags, total word count, heart button, and a table of contents with each chapter's word count. For a oneshot, the story itself, notes and comments are on this page.
- **Chapter** (`/fics/<slug>/<n>`): notes, chapter text, end notes, chapter word count, previous / next / contents, comments.
- **Post** (`/posts/<slug>`): images, captions, text, embed, tags, heart, comments.
- **Browse** (`/browse`): filter by category, rating, status and any tag; sort by newest, last updated, or longest or shortest word count.
- **Tag** (`/tags/<type>/<slug>`): everything with that tag.
- **Pages** (`/about`, `/disclaimer`, `/links`, `/comms`).
- **Subscribe** (`/subscribe`) and RSS feed (`/feed.xml`).

Kept from the current site on every page: theme toggle, the Aa panel (size and font), paper texture and reading progress, now saved per chapter.

## Bijuu's dashboard (`/admin`)

Only Bijuu's account can sign in (Supabase login, limited to her email).

- **Fics**: list, create, edit details, add and reorder chapters.
- **Upload bin**: one folder per fic; drop, replace and remove files; see each file's state.
- **Posts**: create and edit image posts and other categories.
- **Editor screen**: Save draft, Schedule (date and time), Publish, Copy preview link, Revoke preview link.
- **Comments**: pending queue; approve, hide, delete, reply; list of approved commenters.
- **Tags and categories**: add, rename, merge.
- **Pages**: edit About, Disclaimer, Links, Comms.
- **Subscribers**: list, count, and a log of sent emails with any failures.

## How it works

- **Next.js** (App Router, TypeScript) on **Vercel**, reusing the paused `tappiocarchive` project when it's time to go live.
- **Supabase**: Postgres database, image and file storage, and Bijuu's login. Row-level security: the public can only read published content and approved comments, and can only add comments, hearts and subscriptions through the site's server code.
- **Styling**: plain CSS with every color, font and size as a custom property (as now), ported from the current `styles.css`. No CSS framework, so Bijuu's design maps straight onto the tokens.
- **Publishing**: a published item shows within seconds. Scheduled items are filtered by their time, so they appear exactly on time without waiting for a job.
- **Emails**: a Supabase scheduled job checks every 5 minutes for items that went live and sends one email per item to confirmed subscribers through **Resend**. Every email has a one-click unsubscribe. (Vercel's free plan only allows a daily scheduled job, which is why this runs in Supabase.)
- **Emails to Bijuu**: Resend emails Bijuu's own inbox (her Resend account email, which needs no domain) when a comment waits for approval, when someone subscribes, and when an email to subscribers fails.
- **Spam**: a hidden honeypot field, a rate limit per browser and per network address, a length limit, and the approve-first-comment rule.
- **Images**: resized and served in modern formats by Next.js.

## When things go wrong

- Autosave keeps drafts if the tab closes or the connection drops.
- A failed upload or conversion shows a plain message and saves nothing half-done.
- A failed email is retried, then logged on the Subscribers screen.
- A missing fic, chapter or post shows a friendly "not found" page. A draft is never shown without a valid preview link.

## Testing and checking

- Automated tests: drafts and scheduled items stay hidden until their time; preview links work and stop working once revoked; the comment approval rules; one heart per browser; word counts; each upload format converts correctly; the sanitizer removes unsafe content.
- In a real browser (Playwright): the reader at 1440, 1024 and 390 wide, light and dark, 10pt and 24pt; no sideways scroll; text contrast of at least 4.5:1; visible focus rings; the dashboard flow from upload to publish.

## Visual design

Until Bijuu's Claude Design is ready, pages use the current tokens (colors, IM Fell English SC and Inclusive Sans, paper texture, teal header). When she shares the design link, Claude reads the design and maps it onto the tokens and page layouts. Visual decisions are hers and are not set in this spec.

## Build order

1. Rewrite `CLAUDE.md` and the README for the new plan; set up Next.js and Supabase; port the tokens, theme, Aa panel and reading progress.
2. Content and reader pages (fics, chapters, posts, browse, tags, pages) with sample data.
3. Dashboard: login, editor, uploads and conversion, drafts, scheduling, preview links.
4. Comments and hearts.
5. Subscriptions, emails and RSS.
6. Apply Bijuu's visual design.
7. Go live on Vercel (only with Bijuu's OK).

## Working rules (kept from `CLAUDE.md`)

- Commit locally after each change, one change per commit, plain-language messages, no attribution lines.
- Do not push without Bijuu's OK. At 4 waiting commits, ask "That's 4 changes waiting. Ready to push to GitHub?"
- Never invent fic details or story text. Placeholders are hers to replace.
- No secrets in the repo (Supabase and Resend keys go in Vercel and a local `.env.local` that git ignores).

## Open items

- **Subscriber email needs a domain.** Emails to Bijuu work now. Resend only sends to other people from a domain she owns (about $10 to $15 a year). Until then, readers subscribe through RSS, the email signup is hidden, and it gets switched on when a domain is added.
- **Real export files.** Bijuu will provide a sample of Ellipsus's "Copy as HTML" output (the main path), plus an `.md` and an `.epub`, for testing the converter.
