# BlueLens

<div align="center">
  <img src="./assets/bluelens-ocean-banner.svg" alt="BlueLens ocean banner" width="100%" />
  <br />
  <br />
  <img src="https://github.com/user-attachments/assets/a0c348b1-50b9-42fa-82dd-518edcf2ec5c" alt="BlueLens sea mark" width="360" />
</div>

<div align="center">

### 🌊 Local-first image reconnaissance for serious reverse-search work

**BlueLens** is an ocean-toned OSINT console for image investigation: inspect locally, upload deliberately, relay one image into many search engines, explain dead ends, and suppress bad matches during the current session.

</div>

---

## 🔎 What BlueLens does

- **Local-first image review**
  - preview, dimensions, hashes, clean-copy generation, and metadata extraction stay local
- **OCR and pivot extraction**
  - text extraction plus URLs, emails, handles, phones, people, organizations, locations, and dates
- **Multi-engine image relay**
  - one upload can stage follow-up doors for:
    - Google Lens
    - Bing Visual Search
    - Yandex Images
    - TinEye
    - Pinterest follow-up
    - SauceNAO
    - IQDB
    - Baidu Image Search
    - ASCII2D
    - Google Images
- **No-result autopsy**
  - when nothing useful lands, BlueLens explains likely failure modes such as:
    - heavy crop
    - low resolution
    - generic subject matter
    - stripped metadata
    - blocked provider tabs
    - private / unindexed imagery
- **False-positive suppressor**
  - mark bad matches and keep them suppressed for the current session
- **Investigation surface**
  - graph, timeline, sonar, and swarm views share one investigation model
- **Evidence output**
  - report export, evidence pack export, upload provenance, OCR settings, and runtime metadata

---

## 🧭 Operating model

BlueLens is designed for disciplined image triage:

1. **Load the image**
2. **Inspect local signals**
3. **Run OCR if needed**
4. **Launch the multi-engine relay**
5. **Ingest external hits**
6. **Suppress junk**
7. **Use the autopsy when the queue stays empty**

The default posture is explicit and restrained:

- image load stays local
- uploads happen only when you choose a launch action
- provider URLs are temporary external artifacts
- OCR models are pulled only when OCR is invoked

---

## 🌐 Multi-engine relay

BlueLens already had a launchpad; it now reads more accurately as a **one upload, many doors** workflow.

- **Search All** prepares the relay from a single public handoff URL
- the launchpad tracks queue state, blocked tabs, opened tabs, and analyst dispositions
- art-focused follow-ups such as **SauceNAO**, **IQDB**, and **ASCII2D** sit beside the broader web engines
- the intake queue dedupes pasted findings and now supports per-session suppression of false positives

> Pinterest does not expose the same clean public URL handoff as the other providers, so BlueLens treats it as a best-effort follow-up door rather than a guaranteed automated match lane.

---

## 🛰️ No-result autopsy

When the intake queue is empty after a relay run, BlueLens does not shrug. It performs a compact autopsy using:

- current dimensions
- crop shape
- OCR / attribution sparsity
- EXIF presence
- blocked-engine state
- staged engine coverage

This keeps “no result” from being a dead screen. It becomes a concrete explanation of **why** the image likely failed to match.

---

## ⚓ Run it

BlueLens expects **Node.js 18 or newer**.

```bash
npm start
```

Open:

- http://localhost:8787

Direct equivalent:

```bash
node server.js
```

Run tests:

```bash
npm test
```

---

## 📦 Notes

- choosing an image stays local until you launch a provider action
- upload proxy uses ranked temporary-host failover
- OCR model files load from a CDN on first use
- capture-time exports preserve raw value, normalized value, source field, and timezone ambiguity notes
- the evidence pack includes report data and reproducibility metadata
- `BLUELENS_ALLOW_PRIVATE_FETCH=1` is for controlled local testing only

---

## 🖥️ Windows shortcut

```bash
npm run desktop-icon
```

Or double-click `bluelens-start.cmd`.

The start script waits for `/api/ping` before opening the browser.
