# BlueLens

Ocean-themed UI for image upload + reverse-image-search workflows, with an OSINT slant:

- Local preview plus automatic launchpad upload to a temporary public URL after you choose an image
- Hashes: `SHA-256`, `MD5`, perceptual `dHash`
- Metadata extraction (EXIF/IPTC/XMP when present)
- OCR (watermarks/usernames/signage) + extracted key fields (URLs, emails, @handles, phones)
- Compare two images via perceptual distance (near-duplicate check)
- Automatic launcher prep for multiple reverse-search providers using a public URL
- "Mutation Lab" local variants (crop/rotate/low-contrast) + manual re-checking
- Batch mode: drop a folder of images -> one report per file
- "Clean copy" download that re-encodes the image to strip metadata

## Run it

This is a static site, but the built-in server is recommended so the automatic upload + launchpad flow works reliably.

```bash
node server.js
```

Open:

- http://localhost:8787

## Notes

- Choosing an image now uploads it to a third-party host to generate a temporary public URL for the search launchpad.
- Upload proxy uses multi-host failover (Uguu -> Catbox -> Litterbox -> 0x0).
- "Prepare Engine Links" opens Lens first, then shows clickable provider links in-console for manual follow-up.
- Run tests with `npm test`.

## Desktop icon (Windows)

```bash
npm run desktop-icon
```

Or double-click `bluelens-start.cmd`.
