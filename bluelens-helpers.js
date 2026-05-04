// Small pure helpers shared by the browser app and Node tests.
(() => {
  const bitCounts = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

  function hammingHex(a, b) {
    if (!a || !b || a.length !== b.length) return null;
    let dist = 0;
    for (let i = 0; i < a.length; i += 1) {
      const na = parseInt(a[i], 16);
      const nb = parseInt(b[i], 16);
      if (Number.isNaN(na) || Number.isNaN(nb)) return null;
      dist += bitCounts[na ^ nb];
    }
    return dist;
  }

  function parseDimensions(dimensions) {
    const text = String(dimensions || "");
    const match = text.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height, area: width * height };
  }

  function getBatchSortValue(item, sortKey) {
    const triage = item?.triage || {};
    const report = item?.report || {};

    switch (sortKey) {
      case "name":
        return String(report?.file?.name || "");
      case "gps":
        return triage.gps ? 1 : 0;
      case "ent":
        return Number(triage.entCount || 0);
      case "repost":
        return Number.isFinite(triage.repost) ? triage.repost : -1;
      case "cluster":
        return Number(item?.clusterId || 0);
      case "dim": {
        const parsed = parseDimensions(report?.dimensions);
        return parsed ? parsed.area : -1;
      }
      default:
        return Number(triage.lead || 0);
    }
  }

  function sortBatchItems(items, sortKey = "lead", sortDir = "desc") {
    const dir = sortDir === "asc" ? 1 : -1;
    return items.slice().sort((a, b) => {
      const va = getBatchSortValue(a, sortKey);
      const vb = getBatchSortValue(b, sortKey);
      if (typeof va === "string" || typeof vb === "string") return dir * String(va).localeCompare(String(vb));
      return dir * ((va || 0) - (vb || 0));
    });
  }

  function extractPivotsFromReport(report) {
    const pivots = [];
    const ents = report?.key_fields?.ocr_entities;
    if (ents?.urls?.length) pivots.push(...ents.urls.slice(0, 2).map((x) => `url:${x}`));
    if (ents?.emails?.length) pivots.push(...ents.emails.slice(0, 2).map((x) => `email:${x}`));
    if (ents?.handles?.length) {
      pivots.push(
        ...ents.handles
          .slice(0, 3)
          .map((x) => {
          // Old reports or manual entry mistakes can leave multiple leading @ symbols; normalize them to a single @ prefix format.
          const handle = String(x || "").replace(/^@+/, "");
          return handle ? `@${handle}` : null;
        })
          .filter(Boolean),
      );
    }
    if (ents?.phones?.length) pivots.push(...ents.phones.slice(0, 2).map((x) => `phone:${x}`));
    const gps = report?.gps;
    if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon)) pivots.push(`gps:${gps.lat.toFixed(5)},${gps.lon.toFixed(5)}`);
    const cam = report?.key_fields?.camera;
    if (cam) pivots.push(`cam:${String(cam).slice(0, 42)}`);
    const sw = report?.key_fields?.software;
    if (sw) pivots.push(`sw:${String(sw).slice(0, 42)}`);
    return Array.from(new Set(pivots)).slice(0, 8);
  }

  function normalizeHandleValue(value) {
    const clean = String(value || "").trim().replace(/^@+/, "").toLowerCase();
    return clean ? `@${clean}` : "";
  }

  function normalizeDomainValue(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const withoutProtocol = raw.replace(/^[a-z]+:\/\//i, "");
    const host = withoutProtocol.split(/[/?#]/, 1)[0].replace(/^www\./, "");
    return host.replace(/:\d+$/, "").trim();
  }

  function normalizeGraphValue(type, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    switch (type) {
      case "handle":
        return normalizeHandleValue(raw);
      case "email":
        return raw.toLowerCase();
      case "phone":
        return raw.replace(/\s+/g, " ");
      case "domain":
        return normalizeDomainValue(raw);
      case "url":
        return raw;
      case "gps":
      case "software":
      case "camera":
        return raw;
      default:
        return raw;
    }
  }

  function textSnippet(text, start, end, radius = 28) {
    const source = String(text || "");
    if (!source) return "";
    const s = Math.max(0, Number(start || 0) - radius);
    const e = Math.min(source.length, Number(end || 0) + radius);
    const snippet = source.slice(s, e).replace(/\s+/g, " ").trim();
    return snippet ? `${s > 0 ? "…" : ""}${snippet}${e < source.length ? "…" : ""}` : "";
  }

  function reportKeyForGraph(report, index = 0) {
    const fileName = String(report?.file?.name || `image-${index + 1}`);
    const hash = String(report?.hashes?.sha256 || report?.hashes?.md5 || report?.generated_at || index);
    return `file:${fileName}:${hash.slice(0, 16)}`;
  }

  function coerceSpan(entry) {
    if (!entry || typeof entry !== "object") return null;
    const offsets = Array.isArray(entry.offsets) ? entry.offsets : [];
    return offsets.length ? offsets[0] : null;
  }

  function buildEntityGraph({ reports = [] } = {}) {
    const nodeMap = new Map();
    const edgeMap = new Map();

    const upsertNode = ({ key, type, value, label, reportKey, fileName, provenance }) => {
      if (!key) return null;
      const current = nodeMap.get(key) || {
        key,
        type,
        value,
        label: label || value,
        evidence_count: 0,
        file_count: 0,
        files: new Set(),
        provenance: [],
        linked_keys: new Set(),
      };
      current.evidence_count += 1;
      if (fileName) current.files.add(fileName);
      if (provenance) current.provenance.push({ ...provenance, report_key: reportKey, file_name: fileName || provenance.file_name || "" });
      nodeMap.set(key, current);
      return current;
    };

    const upsertEdge = ({ source, target, type, reportKey, fileName, provenance }) => {
      if (!source || !target) return;
      const key = `${source}->${target}`;
      const current = edgeMap.get(key) || {
        key,
        source,
        target,
        type,
        evidence_count: 0,
        file_count: 0,
        files: new Set(),
        provenance: [],
      };
      current.evidence_count += 1;
      if (fileName) current.files.add(fileName);
      if (provenance) current.provenance.push({ ...provenance, report_key: reportKey, file_name: fileName || provenance.file_name || "" });
      edgeMap.set(key, current);
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);
      if (sourceNode) sourceNode.linked_keys.add(target);
      if (targetNode) targetNode.linked_keys.add(source);
    };

    const entityDescriptorsForReport = (report) => {
      const descriptors = [];
      const entities = report?.key_fields?.ocr_entities || {};
      const details = entities?.details || {};
      const ocrText = String(report?.ocr_text || "");

      const addEntity = (type, rawValue, detailEntry, extra = {}) => {
        const value = normalizeGraphValue(type, rawValue);
        if (!value) return;
        const span = coerceSpan(detailEntry);
        descriptors.push({
          type,
          value,
          label: extra.label || value,
          provenance: {
            field: extra.field || "ocr_entities",
            source: span?.source || extra.source || "derived",
            raw: span?.raw || rawValue,
            excerpt: span ? textSnippet(ocrText, span.start, span.end) : "",
            confidence: Number.isFinite(span?.confidence) ? span.confidence : null,
          },
        });
      };

      for (const value of entities?.handles || []) {
        const normalized = normalizeHandleValue(value);
        const detail = Array.isArray(details.handles) ? details.handles.find((entry) => normalizeHandleValue(entry?.value) === normalized) : null;
        addEntity("handle", normalized, detail);
      }
      for (const value of entities?.emails || []) {
        const email = String(value || "").toLowerCase();
        const detail = Array.isArray(details.emails) ? details.emails.find((entry) => String(entry?.value || "").toLowerCase() === email) : null;
        addEntity("email", email, detail);
        const domain = normalizeDomainValue(email.split("@")[1] || "");
        if (domain) addEntity("domain", domain, detail, { field: "ocr_entities.email_domain", source: "email_domain" });
      }
      for (const value of entities?.phones || []) {
        const phone = String(value || "").trim();
        const detail = Array.isArray(details.phones) ? details.phones.find((entry) => String(entry?.value || "").trim() === phone || String(entry?.raw || "").trim() === phone) : null;
        addEntity("phone", phone, detail);
      }
      for (const value of entities?.urls || []) {
        const url = String(value || "").trim();
        const detail = Array.isArray(details.urls) ? details.urls.find((entry) => String(entry?.value || "").trim() === url || String(entry?.raw || "").trim() === url) : null;
        addEntity("url", url, detail);
        const domain = normalizeDomainValue(url);
        if (domain) addEntity("domain", domain, detail, { field: "ocr_entities.url_domain", source: "url_domain" });
      }
      if (report?.gps && Number.isFinite(report.gps.lat) && Number.isFinite(report.gps.lon)) {
        addEntity("gps", `${Number(report.gps.lat).toFixed(5)}, ${Number(report.gps.lon).toFixed(5)}`, null, {
          field: "gps",
          source: "metadata",
          raw: `${report.gps.lat},${report.gps.lon}`,
        });
      }
      if (report?.key_fields?.software) {
        addEntity("software", String(report.key_fields.software), null, { field: "key_fields.software", source: "metadata" });
      }
      if (report?.key_fields?.camera) {
        addEntity("camera", String(report.key_fields.camera), null, { field: "key_fields.camera", source: "metadata" });
      }
      return descriptors;
    };

    reports.forEach((report, index) => {
      const reportKey = reportKeyForGraph(report, index);
      const fileName = String(report?.file?.name || `image-${index + 1}`);
      upsertNode({
        key: reportKey,
        type: "file",
        value: fileName,
        label: fileName,
        reportKey,
        fileName,
        provenance: {
          field: "file.name",
          source: report?.generated_at ? "report_export" : "session",
          raw: fileName,
          excerpt: "",
        },
      });

      for (const descriptor of entityDescriptorsForReport(report)) {
        const entityKey = `${descriptor.type}:${normalizeGraphValue(descriptor.type, descriptor.value)}`;
        upsertNode({
          key: entityKey,
          type: descriptor.type,
          value: descriptor.value,
          label: descriptor.label,
          reportKey,
          fileName,
          provenance: descriptor.provenance,
        });
        upsertEdge({
          source: reportKey,
          target: entityKey,
          type: descriptor.type,
          reportKey,
          fileName,
          provenance: descriptor.provenance,
        });
      }
    });

    const nodes = Array.from(nodeMap.values()).map((node) => ({
      ...node,
      file_count: node.files.size,
      files: Array.from(node.files).sort(),
      provenance: node.provenance.slice(0, 24),
      linked_keys: Array.from(node.linked_keys),
      degree: node.linked_keys.size,
    })).sort((a, b) => {
      if (a.type === "file" && b.type !== "file") return -1;
      if (a.type !== "file" && b.type === "file") return 1;
      return b.file_count - a.file_count || b.evidence_count - a.evidence_count || a.label.localeCompare(b.label);
    });

    const edges = Array.from(edgeMap.values()).map((edge) => ({
      ...edge,
      file_count: edge.files.size,
      files: Array.from(edge.files).sort(),
      provenance: edge.provenance.slice(0, 24),
    })).sort((a, b) => b.file_count - a.file_count || b.evidence_count - a.evidence_count || a.key.localeCompare(b.key));

    return {
      nodes,
      edges,
      summary: {
        reports: reports.length,
        file_nodes: nodes.filter((node) => node.type === "file").length,
        entity_nodes: nodes.filter((node) => node.type !== "file").length,
        edges: edges.length,
      },
    };
  }

  function parseTimelineInstant(value, { ambiguous = false, label = "" } = {}) {
    if (value == null) return null;
    if (typeof value === "object") {
      const raw = String(value.normalized_utc || value.normalized || value.iso || value.value || value.raw || label || "").trim();
      if (!raw) return null;
      const parsed = Date.parse(raw);
      return {
        ts_ms: Number.isFinite(parsed) ? parsed : null,
        label: String(value.display || value.normalized || value.raw || raw),
        ambiguous: ambiguous || value.has_timezone === false || value.timezone_missing === true,
      };
    }
    const raw = String(value || "").trim();
    if (!raw) return null;
    let parsed = Date.parse(raw);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    if (!Number.isFinite(parsed) && dateOnly) parsed = Date.parse(`${raw}T00:00:00Z`);
    return {
      ts_ms: Number.isFinite(parsed) ? parsed : null,
      label: raw,
      ambiguous: ambiguous || dateOnly || (/T\d{2}:\d{2}/.test(raw) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)),
    };
  }

  function buildInvestigationTimeline({ reports = [], actionLog = [], lastEngineRun = null, resultIntake = null } = {}) {
    const events = [];
    const addEvent = (event) => {
      if (!event) return;
      events.push({
        ambiguous: false,
        ts_ms: null,
        time_label: "Unknown time",
        ...event,
      });
    };

    reports.forEach((report, index) => {
      const reportKey = reportKeyForGraph(report, index);
      const fileName = String(report?.file?.name || `image-${index + 1}`);
      const obtained = parseTimelineInstant(report?.source_reliability?.when_obtained);
      if (obtained) {
        addEvent({
          key: `${reportKey}:acquired`,
          category: "acquisition",
          kind: "when_obtained",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: obtained.ts_ms,
          time_label: obtained.label,
          ambiguous: obtained.ambiguous,
          label: "Source obtained",
          provenance: "source_reliability.when_obtained",
        });
      }

      const captured = parseTimelineInstant(report?.key_fields?.captured_at, { ambiguous: report?.key_fields?.captured_at?.has_timezone === false });
      if (captured) {
        addEvent({
          key: `${reportKey}:captured`,
          category: "claimed_capture",
          kind: "captured_at",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: captured.ts_ms,
          time_label: captured.label,
          ambiguous: captured.ambiguous,
          label: "Claimed capture time",
          provenance: "key_fields.captured_at",
        });
      }

      const generated = parseTimelineInstant(report?.generated_at);
      if (generated) {
        addEvent({
          key: `${reportKey}:exported`,
          category: "export",
          kind: "generated_at",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: generated.ts_ms,
          time_label: generated.label,
          ambiguous: generated.ambiguous,
          label: "Report exported",
          provenance: "generated_at",
        });
      }

      const uploadCreated = parseTimelineInstant(report?.upload?.created_at);
      if (uploadCreated) {
        addEvent({
          key: `${reportKey}:uploaded`,
          category: "launch",
          kind: "upload_created_at",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: uploadCreated.ts_ms,
          time_label: uploadCreated.label,
          ambiguous: uploadCreated.ambiguous,
          label: "Public upload created",
          provenance: "upload.created_at",
        });
      }

      const launchTs = Number(report?.launchpad?.ts);
      if (Number.isFinite(launchTs) && launchTs > 0) {
        addEvent({
          key: `${reportKey}:launchpad`,
          category: "launch",
          kind: "launchpad",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: launchTs,
          time_label: new Date(launchTs).toISOString(),
          label: "Launchpad/swarm staged",
          provenance: "launchpad.ts",
        });
      }

      const ocrDates = Array.isArray(report?.key_fields?.ocr_entities?.details?.dates)
        ? report.key_fields.ocr_entities.details.dates
        : Array.isArray(report?.key_fields?.ocr_entities?.dates)
          ? report.key_fields.ocr_entities.dates.map((value) => ({ value, offsets: [] }))
          : [];
      ocrDates.forEach((entry, entryIndex) => {
        const span = coerceSpan(entry);
        const parsed = parseTimelineInstant(entry?.value || span?.extra?.iso || span?.raw, {
          ambiguous: Number(span?.confidence || 0) < 0.9,
        });
        if (!parsed) return;
        addEvent({
          key: `${reportKey}:ocr-date:${entryIndex}`,
          category: "ocr_claim",
          kind: "ocr_date",
          report_key: reportKey,
          file_name: fileName,
          ts_ms: parsed.ts_ms,
          time_label: parsed.label,
          ambiguous: parsed.ambiguous,
          label: "OCR-extracted date",
          provenance: "key_fields.ocr_entities.dates",
          detail: span?.raw || entry?.value || "",
        });
      });

      const sessionActions = Array.isArray(report?.session_action_log) ? report.session_action_log : [];
      sessionActions.forEach((row, rowIndex) => {
        const parsed = parseTimelineInstant(row?.ts);
        if (!parsed) return;
        addEvent({
          key: `${reportKey}:action:${rowIndex}`,
          category: "analyst_action",
          kind: String(row?.event || "event"),
          report_key: reportKey,
          file_name: fileName,
          ts_ms: parsed.ts_ms,
          time_label: parsed.label,
          label: String(row?.event || "Analyst action"),
          detail: String(row?.detail || ""),
          provenance: "session_action_log",
        });
      });
    });

    actionLog.forEach((row, index) => {
      const parsed = parseTimelineInstant(row?.ts);
      if (!parsed) return;
      addEvent({
        key: `live-action:${index}`,
        category: "analyst_action",
        kind: String(row?.event || "event"),
        ts_ms: parsed.ts_ms,
        time_label: parsed.label,
        label: String(row?.event || "Analyst action"),
        detail: String(row?.detail || ""),
        provenance: "state.actionLog",
      });
    });

    if (lastEngineRun && Number.isFinite(Number(lastEngineRun.ts))) {
      addEvent({
        key: "live-run:last",
        category: "launch",
        kind: String(lastEngineRun.mode || "launchpad"),
        ts_ms: Number(lastEngineRun.ts),
        time_label: new Date(Number(lastEngineRun.ts)).toISOString(),
        label: lastEngineRun.mode === "swarm" ? "Swarm cockpit staged" : "Launchpad staged",
        detail: Object.keys(lastEngineRun.targets || {}).join(", "),
        provenance: "state.lastEngineRun.ts",
      });
    }

    const ingestedAt = parseTimelineInstant(resultIntake?.last_ingested_at);
    if (ingestedAt) {
      addEvent({
        key: "live-intake:last",
        category: "analyst_action",
        kind: "result_intake",
        ts_ms: ingestedAt.ts_ms,
        time_label: ingestedAt.label,
        label: "External results ingested",
        detail: `${Array.isArray(resultIntake?.entries) ? resultIntake.entries.length : 0} entries`,
        provenance: "result_intake.last_ingested_at",
      });
    }

    const categoryRank = {
      claimed_capture: 1,
      ocr_claim: 2,
      acquisition: 3,
      launch: 4,
      analyst_action: 5,
      export: 6,
    };

    const sorted = events
      .slice()
      .sort((a, b) =>
        (Number(a.ts_ms || Number.MAX_SAFE_INTEGER) - Number(b.ts_ms || Number.MAX_SAFE_INTEGER)) ||
        ((categoryRank[a.category] || 99) - (categoryRank[b.category] || 99)) ||
        String(a.label || "").localeCompare(String(b.label || "")),
      );

    return {
      events: sorted,
      summary: {
        total: sorted.length,
        ambiguous: sorted.filter((event) => event.ambiguous).length,
        categories: sorted.reduce((acc, event) => {
          acc[event.category] = (acc[event.category] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }

  const api = {
    buildEntityGraph,
    buildInvestigationTimeline,
    extractPivotsFromReport,
    getBatchSortValue,
    hammingHex,
    parseDimensions,
    sortBatchItems,
  };

  try {
    if (typeof window !== "undefined") window.BLUELENS_HELPERS = api;
  } catch {
    // ignore
  }

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch {
    // ignore
  }
})();
