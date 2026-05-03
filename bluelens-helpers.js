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
          // Old reports or manual edits can leave multiple leading @ symbols; normalize them to a single public handle form.
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

  const api = {
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
