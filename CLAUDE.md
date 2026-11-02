# CLAUDE.md: Tappioca's reader

Project rules for Claude Code. Read this first, every session.

## What this is

A public blog for Bijuu's ("tappioca") fanfics and art, like a small WordPress built around fics. Bijuu is the only author. Anyone can read without an account; readers can comment, give hearts and subscribe.

- Design (the authority): `docs/superpowers/specs/2026-11-02-fic-blog-design.md`
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
app/                 pages (App Router); tokens.css and globals.css
components/          header, Aa panel, theme toggle, reader parts, cards
lib/supabase/        Supabase clients and generated database types
lib/content/         reader queries and chapter numbering
lib/text/            word counts, slugs
lib/richtext/        sanitizer, color adapting, rendering
supabase/            migrations and development seed (placeholder content only)
tests/unit/          Vitest
tests/integration/   Vitest against the Supabase project (skipped without .env.local)
tests/e2e/           Playwright
public/paper.jpg     paper texture
```

## Design decisions to keep

- Light background `#f5f5f5`, dark `#222831`. All boxes `#698c91` in both themes, with `#111` text in light and `#ecefee` in dark. Header `#78a39f` light / `#2f4947` dark. "Howdy" `#8b3253` light / `#e68aa8` dark.
- Display face **IM Fell English SC**, body face **Inclusive Sans**. The site title and the nav menu list are locked to IM Fell English SC in every font mode.
- Font menu: Default; Sans serif: Lucida Sans, Cantarell, Tahoma; Serif: Crimson Pro, IM Fell English, Cormorant Garamond. Lucida Sans and Tahoma are system fonts and only show on devices that have them. The three sans choices also apply all-small-caps to display text; serif choices do not. Only the two default faces load up front; each Font-menu web font is fetched when it is picked. Choices are saved in localStorage (`fic-site-theme`, `fic-site-font`, `fic-site-size`), always inside try/catch.
- Text size: `--fs` is the base (default 14pt, 10 to 24 in steps of 2). `--u = --fs / 19` scales everything else. Fic titles are `--fs * 24/14`, fic details are `--fs`. Line heights scale with it.
- Paper texture: a fixed `body::before` layer, `mix-blend-mode: multiply`, lighter in dark mode. Cards and boxes use `color-mix(... var(--solid), transparent)` with `--solid: 20%`, so the paper shows through. The Aa panel stays opaque.
- Reading progress: per chapter, in the reader's own browser (`fic-site-progress`), furthest point reached, only moves forward.
- Removed on purpose: Quick fic links, Guest book, Powered by, and the card shape behind the nav links. Do not bring them back unless asked.
- Header icons are 20px. Tap targets are at least 44px on touch.
- Editor ("write mode", Plan 2) follows Bijuu's Figma reference: WYSIWYG Text Editor UI Kit, file `FLtVHf4UtMyIQcpscOPC4X`, frame "TextEditor".

## Checking your work

Look at the rendered page, not just the code. Run `npm test` and `npm run e2e`. Take Playwright screenshots at 1440, 1024 and 390 wide, light and dark, at 10pt and 24pt. Check: no sideways scroll, text contrast of at least 4.5:1, visible focus rings, Escape closes the Aa panel.
