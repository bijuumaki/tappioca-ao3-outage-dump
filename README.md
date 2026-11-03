# Tappioca's Fic Archive

A public blog for fanfics and art: fics with chapters, tags and categories. Readers browse, read by chapter in their own theme, font and size, and pick up where they left off. One author writes and publishes from a private admin side.

Built with Next.js and Supabase, hosted on Vercel. Project rules and how things work are in `CLAUDE.md`; the original design is in `docs/superpowers/specs/` and the build plans are in `docs/superpowers/plans/`.

## Run it locally

```
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000
```

The author signs in at `/admin-login`. To add someone as the admin: `npx tsx scripts/create-admin.ts <email>` (they get an email to set a password).

## Tests

```
npm test        # logic and database tests (Vitest)
npm run e2e     # page tests in a real browser (Playwright)
```

Comments: readers post without an account; the server stores them with `SUPABASE_SECRET_KEY` (so that key must be set on Vercel too) and emails the author through Resend when `RESEND_API_KEY`, `RESEND_FROM` and `ALERT_EMAIL` are set (see `.env.example`). Replies and hiding are on `/admin/comments`.

The tests share the live database: they add their own sample stories at the start of a run and remove them at the end, so don't run them while the author is writing. They need `SUPABASE_SECRET_KEY` and `E2E_ADMIN_PASSWORD` in `.env.local`.
