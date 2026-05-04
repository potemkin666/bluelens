# BlueLens

Ocean-themed UI for image upload + reverse-image-search workflows, with an OSINT slant:

- Local preview first, with explicit launchpad upload only when you choose a provider action
- Hashes: `SHA-256`, `MD5`, perceptual `dHash`
- Metadata extraction (EXIF/IPTC/XMP when present)
- OCR (watermarks/usernames/signage) + extracted key fields (URLs, emails, @handles, phones)
- Compare two images via perceptual distance (near-duplicate check)
- Automatic launcher prep for multiple reverse-search providers using a public URL
- "Mutation Lab" local variants (crop/rotate/low-contrast) + manual re-checking
- Batch mode: drop a folder of images -> one report per file
- "Clean copy" download that re-encodes the image to strip metadata
- Evidence Pack export with hashes, OCR mode, upload provenance, launch targets, and a manifest
- Doctor panel for startup/runtime diagnostics in one screen

## Run it

This is a static site, but the built-in server is recommended so explicit upload + launchpad actions work reliably.

```bash
node server.js
```

Open:

- http://localhost:8787

## Notes

- Choosing an image stays local; uploads happen only when you explicitly run a launch action that needs a temporary public URL.
- Upload proxy uses multi-host failover (Uguu -> Catbox -> Litterbox -> 0x0).
- "Prepare Engine Links" opens Lens first, then shows clickable provider links in-console for manual follow-up.
- OCR model files load from a CDN on first use.
- Batch export currently omits failed files from the downloadable JSON bundle.
- EXIF capture times are exported with raw value, normalized form, source field, and timezone ambiguity notes.
- Run tests with `npm test`.
- Open the in-app Help page for startup, privacy, troubleshooting, and defaults.

## Desktop icon (Windows)

```bash
npm run desktop-icon
```

Or double-click `bluelens-start.cmd`.
