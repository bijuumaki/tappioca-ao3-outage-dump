# Tappioca's fic reader

A public fic archive and reader, styled after a Neocities page. Plain HTML, CSS and JavaScript.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Where the fics live

In Google Drive, not in this repo. Fics go in a Drive folder `Fic Library / <Fandom> / ...`; a Google Apps Script web app (`apps-script/Code.gs`) reads that folder and serves it to the site. See `docs/sample-fic.md` for the Markdown format. Adding a fic never needs a deployment.

## Deploying

Connected to Vercel through GitHub. Every push to the production branch is a deployment, so changes are batched: see "Git and deploys" in `CLAUDE.md`.

## Other targets

The same design is meant to also work as a Neocities site and as a WordPress theme. See "Stack and portability" in `CLAUDE.md`.
