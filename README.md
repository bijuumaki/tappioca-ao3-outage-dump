# Tappioca's reader

A public blog for fanfics and art: fics with chapters, image posts, tags and categories. Readers can browse, read by chapter with their own font, size and theme, and pick up where they left off.

Built with Next.js and Supabase. Project rules are in `CLAUDE.md`; the design is in `docs/superpowers/specs/`.

## Run it locally

```
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000
```

## Tests

```
npm test        # logic tests (Vitest)
npm run e2e     # page tests in a real browser (Playwright)
```
