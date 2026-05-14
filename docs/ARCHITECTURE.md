# BlueLens Architecture

## Overview

BlueLens is a local-first OSINT (Open Source Intelligence) tool for image reconnaissance. It provides a privacy-focused workflow for analyzing images, extracting metadata, performing OCR, and conducting multi-engine reverse image searches.

## Core Principles

1. **Local-First**: Image processing, hashing, EXIF parsing, and OCR happen in the browser before any uploads
2. **Explicit Sharing**: Images are only uploaded when the user explicitly triggers a search action
3. **Multi-Engine Relay**: Single upload prepares links for multiple reverse search engines
4. **Evidence Preservation**: All actions and results are tracked for audit trails

## Architecture Layers

### 1. Client Layer (Browser)

**Files**: `app.js`, `index.html`, `wait.html`, `styles.css`

The client layer runs entirely in the browser and handles:

- Image upload and preview
- Local hash computation (SHA-256, MD5, dHash)
- EXIF metadata extraction using exifr library
- OCR processing using Tesseract.js
- Image comparison and difference visualization
- Reverse search engine link generation
- Session state management (localStorage)

**Key Components**:

- **Dropzone**: Drag-and-drop image upload interface
- **Preview Stage**: Image display with crop selection
- **Hash Computation**: SHA-256, MD5, and perceptual dHash generation
- **EXIF Parser**: GPS coordinates, camera info, software, capture time
- **OCR Pipeline**: Text extraction with entity recognition (URLs, emails, phones, etc.)
- **Comparison Engine**: Visual diff and perceptual hash distance
- **Investigation Surface**: Graph, timeline, sonar, and swarm visualizations

### 2. Server Layer (Node.js)

**Files**: `server.js`, `logger.js`

The server provides three main services:

#### a. Static File Server

Serves the HTML, CSS, JavaScript, and asset files for the web interface.

#### b. Upload Proxy (`/api/upload`)

- Proxies image uploads to public temporary hosting services (Uguu, Catbox, Litterbox, 0x0)
- Implements failover logic across multiple hosts
- Tracks upload success/failure statistics for intelligent host selection
- Returns public URLs for use in reverse search engines

#### c. Wait Job Handoff (`/api/wait-jobs/:id`)

- Long-polling mechanism for wait tabs
- Allows search engine tabs to receive URLs without popup blockers
- Implements job expiration and cleanup
- Stores jobs in-memory with optional disk persistence

#### d. Acquisition Layer

- Fetches remote content for analysis
- Robots.txt discovery
- Archive.org snapshot lookup
- Rate limiting to prevent abuse

### 3. Helper Modules

**Files**: `bluelens-helpers.js`, `bluelens-config.js`, `osint-lib.js`, `launchpad-core.js`, `ocr-pipeline.js`, `ocr-entities-ui.js`

Shared utilities used by both client and server:

- **bluelens-config.js**: Central configuration (ports, timeouts, engine URLs)
- **bluelens-helpers.js**: Shared helper functions (Hamming distance, dimension parsing, sorting)
- **osint-lib.js**: OSINT-specific utilities (reverse search URL builders)
- **launchpad-core.js**: Engine launch coordination
- **ocr-pipeline.js**: OCR text processing and entity extraction
- **ocr-entities-ui.js**: UI for OCR entity display and interaction

## Data Flow

### Image Upload and Analysis Flow

```
1. User drops/selects image
   ↓
2. Browser reads file
   ↓
3. Compute hashes locally (SHA-256, MD5, dHash)
   ↓
4. Extract EXIF metadata
   ↓
5. Display preview and metadata
   ↓
6. User triggers search action
   ↓
7. Browser sends image to server (/api/upload)
   ↓
8. Server uploads to temporary host (Uguu/Catbox/etc.)
   ↓
9. Server returns public URL
   ↓
10. Browser generates engine-specific URLs
    ↓
11. Browser opens tabs/windows for each engine
    ↓
12. User reviews results and suppresses false positives
```

### Wait Tab Flow

For engines that need post-upload processing:

```
1. Main page uploads image
   ↓
2. Server creates wait job with ID
   ↓
3. Wait tab opens and polls /api/wait-jobs/:id
   ↓
4. Server holds request (long-polling)
   ↓
5. Main page updates job with final URL
   ↓
6. Server responds to wait tab with URL
   ↓
7. Wait tab redirects to search engine
```

## Storage

### Browser (localStorage)

- **osint:session:v1**: Current investigation session (images, results, suppressions)
- **osint:lastRun:v1**: Last analysis run metadata
- **ui:missionPreset**: User's mission preset selection
- **ui:shareSafe**: Share-safe mode preference
- **fx:\***: Visual effects settings

### Server (In-Memory + Disk)

- **WAIT_JOBS Map**: Active wait jobs (in-memory)
- **UPLOAD_STATS Map**: Host performance telemetry (in-memory)
- **DOCTOR_HISTORY**: Health check history (in-memory)
- **WAIT_JOB_STORE_PATH**: Persisted wait jobs (/tmp/bluelens-wait-jobs-v1.json)

## Security Considerations

1. **Private Fetch Protection**: Server blocks requests to private IP ranges by default
2. **Rate Limiting**: Acquisition layer limits requests per IP address
3. **CORS Handling**: Server proxies uploads to avoid CORS restrictions
4. **Metadata Stripping**: "Share safe" mode re-encodes images to remove EXIF
5. **Timeout Protection**: All network operations have strict timeouts
6. **No Credential Storage**: No API keys or credentials stored or required

## Extension Points

### Adding a New Search Engine

1. Add engine configuration to `bluelens-config.js` (label, icon, order)
2. Add URL builder to `osint-lib.js` (`reverseSearchUrl` function)
3. Add upload page URL to `osint-lib.js` (`reverseSearchUploadPage` function)
4. Update UI in `app.js` to include new engine button

### Adding a New Upload Host

1. Add host implementation to `server.js` (upload function)
2. Add host to `UPLOAD_HOSTS` array in `bluelens-config.js`
3. Add doctor URL to `UPLOAD_DOCTOR_URLS` in `server.js`

## Performance Characteristics

- **Image Hashing**: <100ms for typical images
- **EXIF Extraction**: <50ms
- **OCR Processing**: 1-5 seconds depending on image size and language
- **Upload Proxy**: 2-10 seconds depending on host and image size
- **Wait Job Polling**: 25s default timeout with exponential backoff

## Dependencies

### Client-Side (CDN)

- **exifr**: EXIF metadata parsing
- **Tesseract.js**: OCR engine
- **SparkMD5**: MD5 hashing
- **sha256**: SHA-256 hashing

### Server-Side (Built-in)

- **http**: HTTP server
- **fs**: File system operations
- **path**: Path manipulation
- **dns**: DNS resolution for private IP checking
- **net**: Network utilities

### Development

- **eslint**: Code linting
- **prettier**: Code formatting
- **node:test**: Built-in test runner (Node 18+)

## Future Considerations

1. **Database Integration**: Move from in-memory storage to persistent database
2. **Authentication**: Add user accounts and API authentication
3. **Batch Processing**: Enhanced batch mode with job queue
4. **Clustering**: Horizontal scaling with shared state
5. **API Documentation**: OpenAPI/Swagger specification
6. **Plugin System**: Extensible engine and processor plugins
