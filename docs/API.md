# BlueLens API Documentation

## Server API Endpoints

The BlueLens server exposes several HTTP endpoints for image upload, wait job management, and health checks.

Base URL: `http://localhost:8787` (default port, configurable via `PORT` env variable)

---

## Endpoints

### Health & Status

#### `GET /api/ping`

Health check endpoint that returns server status.

**Response**: 200 OK

```json
{
  "ok": true,
  "uptime_ms": 123456,
  "version": "2026.05.04"
}
```

---

### Upload Proxy

#### `POST /api/upload`

Proxies an image upload to a temporary public hosting service. Implements automatic failover across multiple hosts.

**Headers**:

- `Content-Type`: `multipart/form-data` or `application/octet-stream`

**Request Body**:

- For multipart: Include `file` field with image data
- For octet-stream: Raw image bytes

**Query Parameters**:

- `purpose` (optional): Hint for host selection (`lens`, `google`, or `default`)
- `provider` (optional): Force specific provider (`uguu`, `catbox`, `litterbox`, `0x0`)

**Response**: 200 OK

```json
{
  "ok": true,
  "url": "https://catbox.moe/c/abc123.jpg",
  "host": "catbox",
  "size": 245678,
  "duration_ms": 1234
}
```

**Error Response**: 500/503

```json
{
  "ok": false,
  "error": "upload_failed",
  "message": "All upload hosts failed",
  "attempts": [...]
}
```

**Supported Hosts**:

1. **Uguu** (`uguu.se`) - 48-hour expiry
2. **Catbox** (`catbox.moe`) - Permanent
3. **Litterbox** (`litterbox.catbox.moe`) - 72-hour expiry (configurable)
4. **0x0** (`0x0.st`) - 1-year expiry

**Host Selection Logic**:

- Automatic failover if primary host fails
- Purpose-specific host preferences for better compatibility
- Performance-based selection using historical upload stats

---

#### `GET /api/upload-stats`

Returns upload host performance statistics.

**Response**: 200 OK

```json
{
  "stats": {
    "uguu": { "ok": 45, "fail": 2, "avgMs": 2341 },
    "catbox": { "ok": 38, "fail": 0, "avgMs": 1823 },
    "litterbox": { "ok": 12, "fail": 1, "avgMs": 2156 },
    "0x0": { "ok": 9, "fail": 3, "avgMs": 3012 }
  },
  "doctor_history": {
    "uploadReachability": [...],
    "cdnReachability": [...],
    "engineAvailability": [...],
    "uploadAttempts": [...]
  }
}
```

---

### Wait Job Management

Wait jobs enable a long-polling mechanism for search engine tabs to receive URLs without triggering popup blockers.

#### `POST /api/wait-jobs`

Creates a new wait job.

**Request Body**:

```json
{
  "engine": "lens",
  "label": "Google Lens"
}
```

**Response**: 200 OK

```json
{
  "ok": true,
  "id": "abc123def456",
  "engine": "lens",
  "label": "Google Lens",
  "status": "pending",
  "created_at": "2026-05-10T10:00:00.000Z",
  "expires_at": "2026-05-10T10:10:00.000Z"
}
```

---

#### `GET /api/wait-jobs/:id`

Long-polls for a wait job's result. Holds the connection until the job is updated or times out.

**Query Parameters**:

- `timeout` (optional): Max wait time in milliseconds (default: 25000, max: 30000)

**Response (pending)**: 200 OK (after timeout)

```json
{
  "ok": true,
  "id": "abc123",
  "status": "pending",
  "message": "Job still pending"
}
```

**Response (completed)**: 200 OK

```json
{
  "ok": true,
  "id": "abc123",
  "status": "completed",
  "url": "https://lens.google.com/uploadbyurl?url=...",
  "updated_at": "2026-05-10T10:00:05.000Z"
}
```

**Response (failed)**: 200 OK

```json
{
  "ok": false,
  "id": "abc123",
  "status": "failed",
  "error": "Upload failed",
  "updated_at": "2026-05-10T10:00:05.000Z"
}
```

---

#### `PUT /api/wait-jobs/:id`

Updates a wait job with a result (URL or error).

**Request Body**:

```json
{
  "status": "completed",
  "url": "https://lens.google.com/uploadbyurl?url=..."
}
```

or

```json
{
  "status": "failed",
  "error": "Upload failed"
}
```

**Response**: 200 OK

```json
{
  "ok": true,
  "id": "abc123",
  "updated": true
}
```

---

### Acquisition Layer

The acquisition layer provides safe fetching of remote resources with rate limiting and security checks.

#### `GET /api/acquire`

Fetches a remote URL's content.

**Query Parameters**:

- `url` (required): Target URL to fetch

**Response**: 200 OK

```json
{
  "ok": true,
  "target": "https://example.com",
  "content": "...",
  "content_type": "text/html",
  "status": 200,
  "provenance": {
    "requested_url": "https://example.com",
    "final_url": "https://example.com",
    "fetched_at": "2026-05-10T10:00:00.000Z",
    "duration_ms": 345,
    "rate_limit": {
      "count": 5,
      "window_ms": 60000,
      "max": 18
    }
  }
}
```

**Security**:

- Blocks private IP addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
- Rate limited: 18 requests per IP per minute
- 10-second timeout
- 768KB max response size

---

#### `GET /api/discover`

Fetches and parses a site's robots.txt file.

**Query Parameters**:

- `url` (required): Target URL (robots.txt will be fetched from the origin)

**Response**: 200 OK

```json
{
  "ok": true,
  "target": "https://example.com/page",
  "origin": "https://example.com",
  "robots_url": "https://example.com/robots.txt",
  "robots_status": 200,
  "sitemaps": [
    "https://example.com/sitemap.xml"
  ],
  "allow": [
    "/public/*"
  ],
  "disallow": [
    "/private/*",
    "/admin/*"
  ],
  "provenance": { ... }
}
```

---

#### `GET /api/archive`

Checks for Wayback Machine snapshots of a URL.

**Query Parameters**:

- `url` (required): Target URL to check

**Response**: 200 OK

```json
{
  "ok": true,
  "target": "https://example.com",
  "snapshot": {
    "available": true,
    "url": "https://web.archive.org/web/20260510/https://example.com",
    "timestamp": "20260510123456",
    "status": "200"
  },
  "provenance": { ... }
}
```

**Response (no snapshot)**: 200 OK

```json
{
  "ok": true,
  "target": "https://example.com",
  "snapshot": null,
  "provenance": { ... }
}
```

---

### Doctor Checks

#### `GET /api/doctor/upload-reachability`

Checks if upload hosts are reachable.

**Response**: 200 OK

```json
{
  "ok": true,
  "results": {
    "uguu": { "ok": true, "duration_ms": 234, "url": "https://uguu.se/" },
    "catbox": { "ok": true, "duration_ms": 189, "url": "https://catbox.moe/" }
  }
}
```

---

#### `GET /api/doctor/cdn-reachability`

Checks if CDN resources are reachable.

**Response**: 200 OK

```json
{
  "ok": true,
  "results": [
    { "name": "unpkg", "ok": true, "duration_ms": 156 },
    { "name": "jsdelivr", "ok": true, "duration_ms": 142 }
  ]
}
```

---

#### `GET /api/doctor/engine-availability`

Checks if search engine pages are reachable.

**Response**: 200 OK

```json
{
  "ok": true,
  "results": {
    "lens": { "ok": true, "duration_ms": 234 },
    "bing": { "ok": true, "duration_ms": 298 }
  }
}
```

---

## Client-Side API (JavaScript)

The client-side JavaScript provides several global APIs for image analysis and search.

### Reverse Search Functions

#### `reverseSearchUrl(engine, imageUrl)`

Generates a reverse search URL for a given engine.

**Parameters**:

- `engine` (string): Engine name (`lens`, `bing`, `yandex`, `tineye`, `saucenao`, `iqdb`, `baidu`, `ascii2d`, `google_images`)
- `imageUrl` (string): Public URL of the image to search

**Returns**: String URL or empty string if engine not supported

**Example**:

```javascript
const url = OSINT_LIB.reverseSearchUrl("lens", "https://example.com/image.jpg");
// Returns: "https://lens.google.com/uploadbyurl?url=https%3A%2F%2Fexample.com%2Fimage.jpg"
```

---

#### `reverseSearchUploadPage(engine)`

Returns the manual upload page URL for an engine.

**Parameters**:

- `engine` (string): Engine name

**Returns**: String URL or `about:blank` if not supported

---

### Configuration

#### `BLUELENS_CONFIG`

Global configuration object containing all app settings.

**Structure**:

```javascript
{
  meta: {
    appVersion: "2026.05.04",
    exportSchemaVersion: "bluelens-report-v3"
  },
  server: {
    port: 8787,
    waitJobs: { ... },
    upload: { ... }
  },
  app: {
    upload: { ... },
    ocr: { ... },
    engines: { ... }
  }
}
```

---

## Rate Limits

| Endpoint        | Limit                                 | Window            |
| --------------- | ------------------------------------- | ----------------- |
| `/api/upload`   | None (but individual hosts may limit) | N/A               |
| `/api/acquire`  | 18 requests                           | 60 seconds per IP |
| `/api/discover` | 18 requests                           | 60 seconds per IP |
| `/api/archive`  | 18 requests                           | 60 seconds per IP |

---

## Error Codes

| Code                 | HTTP Status | Description                       |
| -------------------- | ----------- | --------------------------------- |
| `upload_failed`      | 500         | All upload hosts failed           |
| `invalid_image`      | 400         | Invalid or corrupt image data     |
| `timeout`            | 504         | Request timed out                 |
| `rate_limited`       | 429         | Too many requests from this IP    |
| `private_ip_blocked` | 403         | Target URL resolves to private IP |
| `invalid_url`        | 400         | Malformed or invalid URL          |
| `acquire_failed`     | 500         | Failed to fetch remote content    |

---

## Environment Variables

| Variable                       | Default                                 | Description                               |
| ------------------------------ | --------------------------------------- | ----------------------------------------- |
| `PORT`                         | `8787`                                  | Server port                               |
| `BLUELENS_LOG_LEVEL`           | `INFO`                                  | Log level (DEBUG, INFO, WARN, ERROR)      |
| `BLUELENS_LOG_FILE`            | None                                    | Optional log file path                    |
| `BLUELENS_ARCHIVE_API_BASE`    | `https://archive.org/wayback/available` | Archive.org API base URL                  |
| `BLUELENS_ALLOW_PRIVATE_FETCH` | `0`                                     | Allow fetching private IPs (testing only) |
