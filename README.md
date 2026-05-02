# BlueLens

BlueLens is a local-first image triage tool for reverse-image-search and OSINT-adjacent workflows.

## What it does

- Local preview by default; nothing is uploaded until you explicitly enable one-click sharing
- Reverse-image-search launchpad for Google Lens, Bing, TinEye, Yandex, and Google Images
- File hashing (`SHA-256`, `MD5`, `dHash`)
- Metadata extraction (EXIF/IPTC/XMP when present)
- OCR plus extracted URLs, emails, handles, and phone numbers
- Near-duplicate comparison via perceptual distance
- Mutation lab for alternate search variants
- Batch reporting for multiple images
- Caseboard for lightweight local investigation notes
- Clean-copy export that re-encodes the image to strip metadata

## Quick start

### Requirements

- Node.js 18 or newer

### Run locally

```bash
npm start
```

Open:

- http://localhost:8787

### Tests

```bash
npm test
```

## Privacy and safety

- BlueLens is local-first, but **one-click reverse search uploads the image to a third-party host** to create a public URL.
- Use **Share safe** when possible to upload a re-encoded clean copy instead of the original file.
- Public URL hosting is best-effort and temporary, not private storage.
- Respect privacy, platform terms, and local laws before uploading sensitive material.

## Supported browsers

Best results:

- Current Chrome / Edge
- Current Firefox

Notes:

- HEIC support depends on browser and OS codecs.
- OCR depends on loading Tesseract from a CDN the first time it is used.
- Pop-up blockers can limit automatic engine launches; if that happens, BlueLens renders manual links.

## Troubleshooting

### “Local upload endpoint unreachable”

Start the bundled server:

```bash
npm start
```

Then reload the page.

### OCR did not start

- Check that your browser can reach `cdn.jsdelivr.net`
- Retry after the OCR library finishes downloading
- Try a simpler language setting if the text is sparse

### Search tabs did not open

- Allow pop-ups for `localhost`
- Use the rendered engine links/launchpad when the browser blocks automatic tab opens

### Upload failed

- Confirm the file is a supported raster image type
- Try **Share safe**
- Retry later if the public hosts are unavailable

## Project structure

- `index.html` — main UI shell
- `app.js` — browser application logic
- `ocr-pipeline.js` — OCR preprocessing and entity extraction helpers
- `osint-lib.js` — reverse-search URL helpers
- `server.js` — local static server and upload/status API
- `wait.html` + `wait.js` — wait-tab handoff page
- `test/` — automated tests

## Architecture notes

BlueLens is mostly a static front end served by a tiny local Node server.

- The browser app handles preview, OCR orchestration, metadata parsing, batch triage, and caseboard storage.
- The local server serves static assets, proxies image uploads to third-party hosts, and keeps short-lived wait-tab state in memory.
- OCR preprocessing happens client-side before Tesseract runs.
- Caseboard data is persisted in browser storage; it is not synced to a backend.

## Desktop icon (Windows)

```bash
npm run desktop-icon
```

Or double-click `bluelens-start.cmd`.
