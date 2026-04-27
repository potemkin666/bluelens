# Ocean OSINT Lens

Ocean-themed UI for image upload + reverse-image-search workflows, with an OSINT slant:

- Local-first preview (nothing is uploaded unless you enable one-click mode)
- Hashes: `SHA-256`, `MD5`, perceptual `dHash`
- Metadata extraction (EXIF/IPTC/XMP when present)
- OCR (watermarks/usernames/signage) + extracted key fields (URLs, emails, @handles, phones)
- Compare two images via perceptual distance (near-duplicate check)
- One-click reverse search (public URL) for multiple engines
- "Mutation Lab" variants (crop/rotate/low-contrast) + re-search
- Batch mode: drop a folder of images -> one report per file
- "Clean copy" download that re-encodes the image to strip metadata

## Run it

This is a static site, but the built-in server is recommended so one-click uploads work reliably.

```bash
cd ocean-osint-lens
node server.js
```

Open:

- http://localhost:8787

## Notes

- One-click mode uploads your image to a third-party host to generate a temporary public URL.
- Upload proxy uses multi-host failover (Uguu -> Catbox -> Litterbox).
- "Search All" may be limited by browser pop-up blockers. If blocked, the app shows clickable engine links in-console.
- Run tests with `npm test`.
