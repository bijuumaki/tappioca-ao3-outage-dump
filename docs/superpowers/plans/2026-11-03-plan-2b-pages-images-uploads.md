# Plan 2b: Page texts, images, paste and upload, preview links, versions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Bijuu can edit her page texts (Howdy, The Archive, About, Disclaimer, Links, Comms), put pictures inside chapters, paste Copy-as-HTML into a chapter, drop files (.html .md .txt .docx .epub) into a per-fic upload bin that turn into draft chapters, share a secret preview link of an unpublished chapter, and restore earlier versions of a chapter.

**Architecture:** Same as Plan 2a (server components + server actions, admin-only through RLS and `requireAdmin`). One conversion library (`lib/convert/*`) turns any input into the allowed rich-text HTML, then `prepareChapter` (sanitize + word count) stores it. Documents go from the browser straight to a private storage bucket with signed upload URLs (Vercel limits request bodies to 4.5 MB), then a server action converts them. Images are shrunk in the browser first. Preview links use a database function that needs the secret token, so the site needs no secret key.

**Tech Stack:** Plan 2a's, plus `mammoth` 1.13 (.docx), `jszip` 3.10 (.epub), `marked` 18.1 (Markdown), `htmlparser2` 12 + `domhandler` 6 + `dom-serializer` 3 (HTML rewriting), `@tiptap/extension-image` 3.32.

**Spec:** `docs/superpowers/specs/2026-11-02-fic-blog-design.md` ("Writing and uploading", "Rich text"). **Design:** Claude Design canvas (Admin board) for the look; no canvas board exists for these screens yet, so they reuse the admin tokens and components.

**Not in this plan (Plan 2c):** image posts and other categories, tag/category management screens, comments, hearts, subscribers.

## Global Constraints

- All Plan 1 and 2a constraints hold (local commits on a branch, no attribution lines, push only on Bijuu's OK, no secrets or her email in the repo, 44px tap targets, 4.5:1 contrast, tests add and remove their own data, `(e2e …)` names for test content).
- Rich-text allowlist unchanged (`lib/richtext/allowlist.ts`). Converters output HTML that already follows it; `prepareChapter` still runs last.
- Images: JPG, PNG, WebP, GIF, AVIF only, **checked by their first bytes**, not the declared type; at most 8 MB stored. Stored in the public `media` bucket at `fics/<ficId>/images/<name>`. Browser shrinks anything over 1.5 MB or 2400 px wide before upload.
- Documents: `.html .htm .md .markdown .txt .docx .epub`, at most 25 MB each. Originals kept in the private `uploads` bucket at `fics/<ficId>/<filename>`.
- Uploads always arrive as **drafts**. Replacing a chapter first saves its old text as a version.
- Chapter file naming: `<Title> - <N>.<ext>` (space, dash, space, 1 to 3 digits) means chapter N of fic `<Title>`; any other name is a one-chapter fic named from the file.
- Versions: keep the newest 20 per chapter; a version is also saved at most once per 10 minutes by autosave, and always on Publish, upload-replace and restore.
- Preview links: random UUID token, `/preview/<token>` is `noindex`, shows one chapter, revocable; a revoked or unknown token shows the not-found page.
- Admin page text stays lowercase except stored text (`keep-case`).

## Review Focus

1. A pasted or uploaded document with `<script>`, `onclick`, `javascript:` links, giant inline images or Google Docs wrappers (`<b style="font-weight:normal">`) → clean allowed HTML, correct word count. (Tasks 2, 3)
2. A file that can't be converted (corrupt epub, empty file, wrong type, a .docx renamed .epub) → a clear message for that file, other files in the batch still go through, nothing half-saved. (Task 5)
3. Uploading chapter 2 again replaces its text and keeps the old text as a version; uploading `Title - 5.md` when chapters 1–2 exist leaves a gap that the reader still numbers 1, 2, 3. (Task 5)
4. A revoked or unknown preview token never shows a chapter; a published chapter's token still works only while not revoked. (Task 6)
5. A non-admin can't create upload URLs, run conversions, make or read preview links, or read versions. (Tasks 5–7, RLS)

---

## File map

```
supabase/migrations/0008_pages_uploads_versions.sql   preview_links, chapter_versions, upload_files, uploads bucket, preview_chapter()
lib/convert/html.ts        htmlToChapter(html) cleans Docs/Ellipsus/Word HTML into allowed HTML
lib/convert/markdown.ts    markdownToChapter(md) -> { html, meta }
lib/convert/text.ts        textToChapter(text)
lib/convert/docx.ts        docxToChapter(buffer, images)
lib/convert/epub.ts        epubToFic(buffer, images)
lib/convert/names.ts       parseChapterFilename, groupFiles
lib/convert/images.ts      sniffImage(bytes), extractDataUriImages(html, upload)
lib/convert/index.ts       convertFile(name, buffer, images) -> { kind, chapters[], meta }
lib/admin/versions.ts      pure helpers + saveVersion(db, chapterId, reason)
lib/admin/preview-links.ts createPreviewLink / revokePreviewLink / listPreviewLinks
lib/admin/upload-actions.ts  createUploadUrls, processUploads
lib/admin/page-actions.ts    savePageText
lib/admin/image-actions.ts   uploadChapterImage (sniffs bytes)
lib/client/shrink-image.ts   browser resize
components/admin/EditorToolbar.tsx   shared toolbar (extracted from Editor)
components/admin/RichField.tsx       small editor with autosave, used for page texts
components/admin/PasteHtml.tsx, VersionsPanel.tsx, PreviewLinks.tsx, UploadBin.tsx
app/admin/pages/page.tsx, app/admin/uploads/page.tsx, app/preview/[token]/page.tsx
tests/unit/convert-*.test.ts, tests/integration/admin-2b.test.ts, tests/e2e/admin-*.spec.ts, tests/fixtures/*
```

---

### Task 1: Edit page texts

**Files:** Create `app/admin/pages/page.tsx`, `components/admin/RichField.tsx`, `components/admin/EditorToolbar.tsx`, `lib/admin/page-actions.ts`, `tests/e2e/admin-pages.spec.ts`. Modify `components/admin/Editor.tsx` (use the shared toolbar), `app/admin/page.tsx` (a "Pages" link in the header).

**Interfaces:** `savePageText(slug: PageSlug, html: string): Promise<{ ok: true } | { ok: false; reason: "signed_out" | "error" }>` where `PageSlug = "howdy" | "archive" | "about" | "disclaimer" | "links" | "comms"`; sanitizes with `sanitizeRichText`; revalidates `/` and `/<slug>`. `<EditorToolbar editor font size onFont onSize />` renders the toolbar for any Tiptap editor.

- [ ] **Step 1: Failing e2e** `admin-pages.spec.ts`: header "Pages" link opens `/admin/pages` listing six texts (howdy, the archive, about, disclaimer, links, comms); typing "(e2e howdy)" into Howdy autosaves ("saved"); the public home shows it in the Howdy box; the Links text with a link keeps `<a href>`; the test restores the original body afterwards.
- [ ] **Step 2: Run** `npx playwright test admin-pages` (expected: FAIL).
- [ ] **Step 3: Implement.** Extract the toolbar from `Editor.tsx` without changing behavior; `RichField` = Tiptap editor + toolbar + 2 s autosave calling `savePageText`; the page lists one `RichField` per slug.
- [ ] **Step 4: Run** `npx playwright test admin-pages admin-editor` (expected: PASS, editor tests unchanged). Commit "Edit page texts from the admin".

### Task 2: Conversion library

**Files:** Create `lib/convert/{html,markdown,text,docx,epub,names,images,index}.ts`, `tests/unit/convert-html.test.ts`, `convert-markdown.test.ts`, `convert-names.test.ts`, `convert-images.test.ts`, `convert-docx-epub.test.ts`, `tests/fixtures/` (tiny sample files built in the tests with `jszip`/`mammoth`-readable bytes; no real fic text).

**Interfaces:**
- `htmlToChapter(html: string): string`: parses with htmlparser2; unwraps `<html>/<body>`, Google Docs `<b style="font-weight:normal" id="docs-internal-guid…">`; turns `font-weight:700|bold`, `font-style:italic`, `text-decoration:underline|line-through` styles into `<strong>/<em>/<u>/<s>` (nesting when several); keeps `color`, `background-color`, `text-align` styles; drops everything else; result passes `sanitizeRichText`.
- `markdownToChapter(md: string): { html: string; meta: { title?: string; fandom?: string; rating?: string; relationships?: string; summary?: string; tags?: string } }` (front matter between `---` lines; lines of only `-`, `*`, `~`, `⁂`, `•` and spaces become scene breaks).
- `textToChapter(text: string): string` (blank-line blocks become paragraphs; single line breaks become `<br />`; text escaped).
- `sniffImage(bytes: Uint8Array): { type: string; ext: string } | null` for jpg/png/gif/webp/avif.
- `extractDataUriImages(html: string, upload: (bytes: Uint8Array, ext: string) => Promise<string>): Promise<string>` replaces `src="data:image/…"` with the uploaded URL; images whose bytes aren't an allowed image are removed.
- `parseChapterFilename(name: string): { title: string; n: number | null; ext: string }` (`"MORIBUND - 2.html"` → `{title:"MORIBUND", n:2, ext:"html"}`; `"Anam_Cara.epub"` → `{title:"Anam Cara", n:null, ext:"epub"}`).
- `docxToChapter(buffer: ArrayBuffer, upload): Promise<string>`.
- `epubToFic(buffer: ArrayBuffer, upload): Promise<{ title?: string; summary?: string; chapters: { title?: string; html: string }[] }>`: chapters in spine order, skipping the nav document and pages under 30 words that look like cover/title pages; chapter title from its first heading; relative images uploaded.
- `convertFile(name: string, buffer: ArrayBuffer, upload): Promise<{ title: string; summary?: string; chapters: { title?: string; html: string }[]; meta?: Record<string,string> }>`: picks the converter by extension; throws `ConvertError` (message safe to show) for an unsupported type, empty content or a corrupt file.

- [ ] **Step 1: Failing unit tests** (names, assertions as code):
  - `htmlToChapter` Docs paste `'<b style="font-weight:normal" id="docs-internal-guid-x"><p dir="ltr"><span style="font-weight:700;font-style:italic">Hi</span> there</p></b>'` → contains `<strong><em>Hi</em></strong>`, no `docs-internal`, no outer `<strong>`.
  - `<p style="text-align:center;color:#8b3253">a</p>` keeps both; `<script>`, `onclick`, `javascript:` href gone; `<span style="font-family:Arial">x</span>` → `x`.
  - Markdown: `*a* **b**` → `<em>a</em> <strong>b</strong>`; front matter `title: (e2e)` goes to `meta`, not the text; a line `⁂ ⁂ ⁂` and `---` become `<hr`; raw `<script>` removed.
  - Text: `"a & b\nc\n\nd"` → `<p>a &amp; b<br />c</p><p>d</p>`.
  - Names: `"MORIBUND - 1.md"` → n 1; `"My Fic - 12.html"` → title "My Fic", n 12; `"Anam_Cara.epub"` → title "Anam Cara", n null; `"fic - 1234.md"` (4 digits) → n null.
  - Images: PNG, JPEG, GIF, WebP bytes recognized; an HTML file renamed `.png` → null; a data-URI image is replaced by the uploader's URL; a data-URI of non-image bytes is removed.
  - `.docx`: build a minimal docx in the test (zip with `[Content_Types].xml`, `_rels/.rels`, `word/document.xml` containing a bold run) → output has `<strong>`.
  - `.epub`: build a minimal epub in the test with 3 spine documents (cover with 5 words, two chapters) plus `nav.xhtml` → 2 chapters in order, titles from headings, book title and description picked up; a corrupt zip throws `ConvertError`.
- [ ] **Step 2: Run** `npm test -- convert` (expected: FAIL, modules missing).
- [ ] **Step 3: Install** `npm install mammoth@1.13.0 jszip@3.10.2 marked@18.1.2 htmlparser2@12.0.0 domhandler@6.0.1 dom-serializer@3.1.1 @tiptap/extension-image@3.32.2`.
- [ ] **Step 4: Implement** each module to its signature. Every converter's HTML goes through `sanitizeRichText` before returning.
- [ ] **Step 5: Run** `npm test` (expected: PASS). Commit "Add the file conversion library".

### Task 3: Paste HTML into a chapter

**Files:** Create `components/admin/PasteHtml.tsx`, `tests/e2e/admin-paste.spec.ts`. Modify `components/admin/Editor.tsx`, `lib/admin/chapter.ts` (use `htmlToChapter` before sanitizing, which also fixes the Docs `<strong>` wrapper).

**Interfaces:** `prepareChapter(html)` now runs `htmlToChapter` then `sanitizeRichText`. `<PasteHtml onUse={(html: string) => void} />`: a collapsed "Paste HTML" section with a textarea, a live preview (the converted result) and "Use this" / "Add to the end" buttons.

- [ ] **Step 1: Failing tests:** unit `prepareChapter` with the Docs wrapper has no outer `<strong>` (RED→GREEN); e2e: in a chapter open "Paste HTML", paste `<p style="color:#8b3253">hello <em>there</em></p><script>x</script>`, preview shows "hello there" with no script, "Use this" puts it in the editor, autosave stores it with word count 2.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS). Commit "Paste HTML into a chapter".

### Task 4: Pictures inside chapters

**Files:** Create `lib/admin/image-actions.ts`, `lib/client/shrink-image.ts`, `tests/unit/shrink.test.ts` (pure size math), `tests/e2e/admin-images.spec.ts`. Modify `components/admin/EditorToolbar.tsx` (Image button), `lib/admin/actions.ts` (`uploadCover` sniffs bytes with `sniffImage`).

**Interfaces:** `uploadChapterImage(ficId: number, form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }>` (field `image`; admin only; bytes sniffed; ≤ 8 MB; stored `fics/<ficId>/images/<timestamp>-<random>.<ext>`; returns `mediaUrl(path)`). `targetSize(width: number, height: number, bytes: number): { width: number; height: number } | null` (null = leave as is). The toolbar's Image button picks a file, shrinks it, uploads, inserts `<img src alt>`.

- [ ] **Step 1: Failing tests:** unit `targetSize(4000, 3000, 6e6)` → width 2400, height 1800; `targetSize(800, 600, 3e5)` → null; e2e: an HTML file renamed `.png` is refused with "isn't a JPG, PNG…"; a real small PNG is inserted, saved, and the public chapter (after publishing) shows `<img>` with a `https://` source; cover upload with a fake PNG is refused.
- [ ] **Step 2–4:** run (FAIL), implement (add `@tiptap/extension-image` to the editor with `allowBase64: false`), run (PASS). Commit "Pictures inside chapters".

### Task 5: Upload bin

**Files:** Create migration `0008_pages_uploads_versions.sql` (all of this plan's tables, `uploads` bucket and policies, `preview_chapter()`), `lib/admin/upload-actions.ts`, `components/admin/UploadBin.tsx`, `app/admin/uploads/page.tsx`, `tests/integration/admin-2b.test.ts`, `tests/e2e/admin-uploads.spec.ts`. Modify `app/admin/page.tsx` ("Uploads" link), `lib/supabase/database.types.ts`.

**Interfaces:**
- Tables: `upload_files(id, fic_id → fics on delete cascade, chapter_id → chapters on delete set null, filename, storage_path, kind, size, status in ('converted','failed'), error, created_at)`.
- `createUploadUrls(files: { name: string; size: number }[], ficId: number | null): Promise<{ ok: true; items: { name: string; path: string; token: string }[] } | { ok: false; error: string }>`: admin only; rejects types and sizes outside the Global Constraints; paths `fics/<ficId or "new">/<uuid>-<name>`.
- `processUploads(items: { name: string; path: string }[], ficId: number | null): Promise<{ results: { name: string; ok: boolean; message: string; ficId?: number; chapterIds?: number[] }[] }>`: downloads each file from `uploads`, runs `convertFile`, groups `Title - N` names into one fic, creates the fic (draft, slug via `uniqueSlug`) or adds to `ficId`, creates draft chapters (replacing the text of an existing chapter number after `saveVersion`), stores the original in `fics/<ficId>/…`, records `upload_files`. One file failing never stops the others.
- UI: `/admin/uploads` lists every fic as a folder (name, files, states), a "New fic from files" drop zone and a per-fic drop zone (file input + drag and drop); results show per file ("converted to 3 chapters", "couldn't convert: …") with an "Open in editor" link.

- [ ] **Step 1: Failing integration tests** (`admin-2b.test.ts`, admin session): `processUploads` with `["Title - 1.md", "Title - 2.md"]` makes one draft fic with chapters 1 and 2 and word counts; the same call again replaces chapter 2's text and leaves a version; a corrupt `.epub` plus a good `.md` in one batch → one failure message, one success; a `.exe` is rejected by `createUploadUrls`; a non-admin session can't call either (RLS: no rows created, no signed URL).
- [ ] **Step 2: Failing e2e** `admin-uploads.spec.ts`: sign in, open Uploads, choose two `.md` files named `(e2e upload) - 1.md` and `(e2e upload) - 2.md` with `setInputFiles`, see "converted" for both, open the fic in the editor and see two chapters as drafts, upload an `.html` file with Docs styling into that fic's drop zone and see it as chapter 3; a `.exe` shows a clear refusal.
- [ ] **Step 3: Run** (FAIL). **Step 4: Implement** the migration (apply with the Supabase connector; `alter policy` where possible), actions and UI. Browser uploads use `createClient(url, publishableKey).storage.from("uploads").uploadToSignedUrl(path, token, file)`.
- [ ] **Step 5: Run** `npm test` and `npx playwright test admin-uploads` (expected: PASS). Commit "Upload bin: drop files in, get draft chapters".

### Task 6: Preview links

**Files:** Create `lib/admin/preview-links.ts`, `components/admin/PreviewLinks.tsx`, `app/preview/[token]/page.tsx`, `tests/e2e/admin-preview-links.spec.ts`. Modify `components/admin/PublishBar.tsx` or `Editor.tsx` (a "Share preview link" control).

**Interfaces:** `createPreviewLink(chapterId): Promise<{ ok: true; url: string; token: string } | { ok: false }>`, `revokePreviewLink(token: string): Promise<void>`, `listPreviewLinks(chapterId)`. Public page `/preview/[token]` calls `rpc("preview_chapter", { p_token })` with the publishable key; unknown or revoked token → `notFound()`; `robots: noindex`; shows a "Preview: not published yet" note and the chapter in reader style.

- [ ] **Step 1: Failing e2e:** create a link for a draft chapter; open it in a **signed-out** browser context and see the text and the note; revoke; reload → not found; an unknown UUID → not found; the page has `noindex`.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS). Commit "Share a secret preview link".

### Task 7: Versions

**Files:** Create `lib/admin/versions.ts`, `components/admin/VersionsPanel.tsx`, `tests/unit/versions.test.ts`, extend `tests/integration/admin-2b.test.ts` and `tests/e2e/admin-versions.spec.ts`. Modify `lib/admin/actions.ts` (`saveChapter`, `publishChapter` call `saveVersion`), `components/admin/Editor.tsx`.

**Interfaces:** `shouldSnapshot(lastAt: string | null, now: number, reason: "autosave" | "publish" | "upload" | "restore"): boolean` (autosave only when no version yet or the last is ≥ 10 minutes old; other reasons always); `saveVersion(db, chapterId, reason)` copies the chapter's current title/notes/body/word count into `chapter_versions` then deletes all but the newest 20; `restoreVersion(versionId): Promise<void>` snapshots the current text (reason "restore") then copies the version back. The panel lists versions (time, reason, words) with "Restore".

- [ ] **Step 1: Failing tests:** unit `shouldSnapshot` table (autosave after 5 min false, after 11 min true, publish always true, none yet true); integration: 25 snapshots leave 20, newest kept; restore brings the old body back and keeps the replaced text as a version; non-admin can't read versions; e2e: write "one", publish (creates a version), change to "two", open Versions, restore the first, editor shows "one".
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS). Commit "Keep earlier versions of a chapter".

### Task 8: Finish

- [ ] Visual check of `/admin/pages`, `/admin/uploads`, the editor with Paste HTML, Versions and Preview link controls at 1440, 820 and 390 in all four themes (no overflow, readable).
- [ ] Update `CLAUDE.md` (new screens, conversion library, upload rules, storage buckets, preview function) and the ledger; run `npm test`, `npm run e2e`, `npm run build`; commit "Update project notes for plan 2b".
