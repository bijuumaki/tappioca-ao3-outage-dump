# Plan 2c: Google Drive (save originals, import files)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox syntax.

**Goal:** On the Uploads screen Bijuu can (1) save the original of every uploaded file into her Google Drive "Fic Library" folder, and (2) import files from that folder as draft chapters. Both are optional and the site works exactly as before while Drive isn't connected.

**Architecture:** A small Google Apps Script web app ("the bridge") lives in the Google account that owns the folder (imong.mama.kuan@gmail.com). It can only act inside that one folder, needs a secret token on every call, and has no delete action. The Next.js server calls it with `fetch` (never the browser). The working copy of every chapter stays in Supabase; Drive holds the originals. Files already in Drive are never re-saved to Drive.

**Tech Stack:** Plan 2b's; no new packages. Apps Script (V8) for the bridge. Needs no Google Cloud project, no billing and no service-account key (Bijuu's account blocks those).

## Global Constraints

- Plan 1, 2a and 2b constraints hold (local branch, no attribution lines, push only on Bijuu's OK, no secrets in the repo, tests clean up after themselves).
- Env vars, server-only, never `NEXT_PUBLIC_`: `DRIVE_BRIDGE_URL` (the web app address) and `DRIVE_BRIDGE_TOKEN` (the secret). Bijuu pastes them into `.env.local` and Vercel herself; they are never printed or sent to chat.
- Bridge rules: every request is a POST with the token in the body; wrong or missing token → `unauthorized`; all reads and writes confined to the folder named by the script property `FOLDER_ID` (ancestry checked); accepted types `html htm md markdown txt docx epub`, at most 25 MB; **no delete, no move, no sharing change**; a file that already exists is never overwritten (the new one gets a time stamp in its name).
- Drive layout for saved originals: `Fic Library / <fandom or "Unsorted"> / <original file name>` (matches the old library's "first folder is the fandom" habit).
- Saving to Drive happens after the chapters are converted, as its own step, so a slow or broken Drive never blocks or loses an upload. Failure is reported per file ("saved to Drive" / "couldn't save to Drive: …").
- Tests never touch the real Drive: they use a fake bridge, and the browser tests run the app against a local mock bridge on port 4011 and skip themselves if the app isn't using it.

## Review Focus

1. A wrong, missing or empty token never reads or writes anything; `get`/`put` can't reach a file or folder outside the library folder (including via a shared-in file or a parent folder id). (Task 1)
2. Drive down, slow, returning a Google sign-in page, or the bridge not shared as "Anyone": the upload still converts, and the message says what's wrong in plain words. (Tasks 2–4)
3. The same original uploaded twice never overwrites the first. (Tasks 1, 3)
4. Importing a file that's too big, the wrong type, or gone since the list was made: a clear message for that file only. (Task 3)
5. Nothing about Drive appears or breaks when the env vars are missing. (Tasks 2, 4)

---

### Task 1: The bridge script (`apps-script/drive-bridge.gs`)

Actions: `ping` → `{ok, folder}`; `list` → `{ok, files:[{id,name,path,size,modified}]}` (recursive, depth ≤ 3, ≤ 500 entries, accepted types only); `get {id}` → `{ok, name, size, data(base64)}`; `put {folder, name, data}` → `{ok, id, name, path}`. Errors: `{ok:false, error:"unauthorized"|"bad_request"|"not_found"|"outside_folder"|"too_large"|"type_not_allowed"}`.

- [ ] Failing unit tests `tests/unit/drive-bridge.test.ts` against a fake Drive (folders, files, parents, shared-in file outside the library): token missing/wrong/empty → unauthorized and nothing touched; ping names the folder; list is recursive, filters types, shows paths; get returns base64 bytes and refuses an outside file, a wrong id, a too-large file; put creates the fandom folder once, saves the file, refuses bad type/oversize/path tricks (`../`, slashes in names), and never overwrites (second put of the same name gets a time-stamped name); no action exists that deletes.
- [ ] Implement, run, commit. Write `docs/google-drive-setup.md`: the flow-chart setup for Bijuu.

### Task 2: Server side connection

`lib/drive/bridge.ts`: `createBridge({url, token, fetchImpl?, timeoutMs?})` → `{ping, list, get, put}`; `bridgeFromEnv()` → bridge or `null`; `DriveError` with a plain-words message for: not configured, unauthorized, bridge returned a web page (not shared as "Anyone" or wrong address), timeout, too large, not found, outside folder. `lib/drive/names.ts`: `fandomFolderName(name | null)`, `safeDriveName(name)`.

- [ ] Failing unit tests with a local mock HTTP server (`tests/support/mock-drive.ts`, also used by the browser tests): token sent; success shapes parsed; unauthorized and HTML responses mapped to the plain messages; timeout; names sanitized (slashes, dots, length, empty → "Unsorted").
- [ ] Implement, run, commit.

### Task 3: Actions and records

Migration `0009_drive_columns.sql`: `upload_files` gains `drive_file_id text`, `drive_status text check (drive_status in ('saved','failed'))`, `drive_error text`. `lib/drive/flows.ts` (bridge injected so tests use a fake): `saveOriginals(db, bridge, items:{name,path}[], ficId)`, `importFiles(db, bridge, files:{id,name}[], ficId|null)`, `driveStatus(bridge|null)`. Server actions in `lib/admin/drive-actions.ts`: `getDriveStatus()`, `listDriveFiles()`, `saveOriginalsToDrive(items, ficId)`, `importFromDrive(files, ficId)`; all `requireAdmin`.

- [ ] Failing integration tests (real Supabase, fake bridge): save puts the original in `Fic Library/<fandom>/` and records `drive_file_id`; a bridge failure records `failed` + message and leaves the chapters untouched; the same file twice → two distinct Drive names; import reads the file from the fake Drive, converts it to a draft chapter, and never re-saves it to Drive; a too-big or wrong-type or vanished file → message for that file, others proceed; non-admin can't read or write `drive_*` columns' rows (RLS unchanged).
- [ ] Implement, run, commit.

### Task 4: Uploads screen

`UploadBin` shows a status line ("Google Drive: connected to <folder>" / "not connected yet" / "can't reach: <reason>"), the checkbox "Also save originals to Google Drive" (on when connected, hidden otherwise), per-file Drive result lines, and an "Import from Google Drive" section (list with path, size, date; checkboxes; "Convert selected"). Importing groups `Title - N` files like an upload does, one group per request.

- [ ] Failing browser tests (mock bridge on port 4011 via `playwright.config.ts` `webServer.env`; skip themselves unless the status line shows the mock's folder name): status line; upload with the box on → the mock holds the original under the fandom/Unsorted folder and the result says "saved to Drive"; box off → nothing saved; Drive failure (mock told to fail) → chapter still converted and the line says couldn't save; import list shows the mock files, selecting two `Title - N` files makes one fic with two draft chapters and nothing is saved back to Drive.
- [ ] Implement, run, visual check at 1440/820/390 in four themes, commit.

### Task 5: Finish

- [ ] Update `CLAUDE.md` (bridge, env vars, layout, what never happens), README mention, ledger; full `npm test`, `npm run e2e`, `npm run build`; independent review; fix; merge to local `main`.
- [ ] After Bijuu deploys the bridge and sets the env vars: check the real connection read-only (status, list), then one real save and one real import together with her, verified through the Google Drive connector (account with editor access to the folder).
