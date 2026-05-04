/* global window */

// Lightweight OCR preprocessing + entity extraction helpers.
// Exposed as `window.OCR_PIPELINE` for the non-module app.js script.
(() => {
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });

  const otsuThreshold = (hist, total) => {
    let sum = 0;
    for (let t = 0; t < 256; t += 1) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 127;

    for (let t = 0; t < 256; t += 1) {
      wB += hist[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;

      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > varMax) {
        varMax = between;
        threshold = t;
      }
    }

    return threshold;
  };

  const preprocessOtsu = async (imageSrc, { maxDim = 1600 } = {}) => {
    const img = typeof imageSrc === "string" ? await loadImage(imageSrc) : imageSrc;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(0.6, Math.min(3.0, maxDim / Math.max(iw, ih)));
    const w = Math.max(1, Math.floor(iw * scale));
    const h = Math.max(1, Math.floor(ih * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const hist = new Array(256).fill(0);
    let avg = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      hist[l] += 1;
      avg += l;
    }
    const total = d.length / 4;
    avg /= Math.max(1, total);
    const th = otsuThreshold(hist, total);
    const invert = avg < 110;

    for (let i = 0; i < d.length; i += 4) {
      const l = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      let v = l > th ? 255 : 0;
      if (invert) v = 255 - v;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  const preprocessAdaptive = async (imageSrc, { maxDim = 2000 } = {}) => {
    const img = typeof imageSrc === "string" ? await loadImage(imageSrc) : imageSrc;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(0.75, Math.min(3.2, maxDim / Math.max(iw, ih)));
    const w = Math.max(1, Math.floor(iw * scale));
    const h = Math.max(1, Math.floor(ih * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const gray = new Uint8ClampedArray(w * h);
    let avg = 0;
    let min = 255;
    let max = 0;

    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      const l = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      gray[p] = l;
      avg += l;
      if (l < min) min = l;
      if (l > max) max = l;
    }
    avg /= Math.max(1, gray.length);

    const span = Math.max(10, max - min);
    for (let i = 0; i < gray.length; i += 1) {
      gray[i] = Math.max(0, Math.min(255, Math.round(((gray[i] - min) * 255) / span)));
    }

    const sharp = new Uint8ClampedArray(gray.length);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = y * w + x;
        const c = gray[idx];
        const l = x > 0 ? gray[idx - 1] : c;
        const r = x + 1 < w ? gray[idx + 1] : c;
        const u = y > 0 ? gray[idx - w] : c;
        const dn = y + 1 < h ? gray[idx + w] : c;
        const v = Math.round(5 * c - l - r - u - dn);
        sharp[idx] = Math.max(0, Math.min(255, v));
      }
    }

    const invert = avg < 110;
    const block = 24;
    for (let by = 0; by < h; by += block) {
      for (let bx = 0; bx < w; bx += block) {
        const y2 = Math.min(h, by + block);
        const x2 = Math.min(w, bx + block);
        let sum = 0;
        let count = 0;
        for (let y = by; y < y2; y += 1) {
          const row = y * w;
          for (let x = bx; x < x2; x += 1) {
            sum += sharp[row + x];
            count += 1;
          }
        }
        const mean = sum / Math.max(1, count);
        const th = mean - 12;

        for (let y = by; y < y2; y += 1) {
          const row = y * w;
          for (let x = bx; x < x2; x += 1) {
            const p = row + x;
            let v = sharp[p] > th ? 255 : 0;
            if (invert) v = 255 - v;
            const o = p * 4;
            d[o] = v;
            d[o + 1] = v;
            d[o + 2] = v;
            d[o + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  const clampConfidence = (value, fallback = 0.5) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100));
  };

  const ENTITY_DETAIL_KEYS = ["urls", "emails", "handles", "phones", "people", "organizations", "locations", "dates", "aliases"];

  const PERSON_STOPWORDS = new Set([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "Street",
    "Avenue",
    "Road",
    "Boulevard",
    "Airport",
    "Station",
    "University",
    "Company",
    "Agency",
    "Department",
    "Foundation",
    "Institute",
  ]);

  const ORGANIZATION_SUFFIXES = /(inc|llc|ltd|limited|corp|corporation|company|co\.?|group|studio|university|college|school|bank|agency|department|ministry|foundation|institute|association|press|media|hospital|clinic|hotel|restaurant|museum|council|office)$/i;
  const LOCATION_SUFFIXES = /(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|park|plaza|square|airport|station|beach|river|harbor|harbour|mount|mountain|valley|city|county|district|province|state)$/i;

  const PHONE_RULES = [
    { code: "971", region: "AE", region_name: "United Arab Emirates", nsnMin: 8, nsnMax: 9, nationalPattern: /^0\d{8,9}$/, nationalTransform: (digits) => `+971${digits.slice(1)}`, nationalConfidence: 0.68 },
    { code: "380", region: "UA", region_name: "Ukraine", nsnMin: 9, nsnMax: 9, nationalPattern: /^0\d{9}$/, nationalTransform: (digits) => `+380${digits.slice(1)}`, nationalConfidence: 0.68 },
    { code: "972", region: "IL", region_name: "Israel", nsnMin: 8, nsnMax: 9, nationalPattern: /^0\d{8,9}$/, nationalTransform: (digits) => `+972${digits.slice(1)}`, nationalConfidence: 0.67 },
    { code: "420", region: "CZ", region_name: "Czech Republic", nsnMin: 9, nsnMax: 9, nationalPattern: /^\d{9}$/, nationalTransform: (digits) => `+420${digits}`, nationalConfidence: 0.56 },
    { code: "385", region: "HR", region_name: "Croatia", nsnMin: 8, nsnMax: 9, nationalPattern: /^0\d{8,9}$/, nationalTransform: (digits) => `+385${digits.slice(1)}`, nationalConfidence: 0.65 },
    { code: "353", region: "IE", region_name: "Ireland", nsnMin: 7, nsnMax: 9, nationalPattern: /^0\d{8,9}$/, nationalTransform: (digits) => `+353${digits.slice(1)}`, nationalConfidence: 0.63 },
    { code: "351", region: "PT", region_name: "Portugal", nsnMin: 9, nsnMax: 9, nationalPattern: /^9\d{8}$/, nationalTransform: (digits) => `+351${digits}`, nationalConfidence: 0.58 },
    { code: "358", region: "FI", region_name: "Finland", nsnMin: 7, nsnMax: 10, nationalPattern: /^0(?:4|5)\d{6,8}$/, nationalTransform: (digits) => `+358${digits.slice(1)}`, nationalConfidence: 0.63 },
    { code: "352", region: "LU", region_name: "Luxembourg", nsnMin: 8, nsnMax: 11 },
    { code: "90", region: "TR", region_name: "Türkiye", nsnMin: 10, nsnMax: 10, nationalPattern: /^0\d{10}$/, nationalTransform: (digits) => `+90${digits.slice(1)}`, nationalConfidence: 0.69 },
    { code: "91", region: "IN", region_name: "India", nsnMin: 10, nsnMax: 10, nationalPattern: /^[6-9]\d{9}$/, nationalTransform: (digits) => `+91${digits}`, nationalConfidence: 0.62 },
    { code: "81", region: "JP", region_name: "Japan", nsnMin: 9, nsnMax: 10, nationalPattern: /^0\d{9,10}$/, nationalTransform: (digits) => `+81${digits.slice(1)}`, nationalConfidence: 0.68 },
    { code: "82", region: "KR", region_name: "South Korea", nsnMin: 9, nsnMax: 10, nationalPattern: /^0\d{9,10}$/, nationalTransform: (digits) => `+82${digits.slice(1)}`, nationalConfidence: 0.66 },
    { code: "61", region: "AU", region_name: "Australia", nsnMin: 9, nsnMax: 9, nationalPattern: /^0\d{9}$/, nationalTransform: (digits) => `+61${digits.slice(1)}`, nationalConfidence: 0.7 },
    { code: "64", region: "NZ", region_name: "New Zealand", nsnMin: 8, nsnMax: 10, nationalPattern: /^0\d{8,10}$/, nationalTransform: (digits) => `+64${digits.slice(1)}`, nationalConfidence: 0.66 },
    { code: "55", region: "BR", region_name: "Brazil", nsnMin: 10, nsnMax: 11, nationalPattern: /^0?\d{10,11}$/, nationalTransform: (digits) => `+55${digits.replace(/^0/, "")}`, nationalConfidence: 0.6 },
    { code: "52", region: "MX", region_name: "Mexico", nsnMin: 10, nsnMax: 10, nationalPattern: /^\d{10}$/, nationalTransform: (digits) => `+52${digits}`, nationalConfidence: 0.58 },
    { code: "49", region: "DE", region_name: "Germany", nsnMin: 10, nsnMax: 13, nationalPattern: /^0\d{10,12}$/, nationalTransform: (digits) => `+49${digits.slice(1)}`, nationalConfidence: 0.64 },
    { code: "44", region: "GB", region_name: "United Kingdom", nsnMin: 10, nsnMax: 10, nationalPattern: /^0\d{10}$/, nationalTransform: (digits) => `+44${digits.slice(1)}`, nationalConfidence: 0.72 },
    { code: "33", region: "FR", region_name: "France", nsnMin: 9, nsnMax: 9, nationalPattern: /^0\d{9}$/, nationalTransform: (digits) => `+33${digits.slice(1)}`, nationalConfidence: 0.71 },
    { code: "34", region: "ES", region_name: "Spain", nsnMin: 9, nsnMax: 9, nationalPattern: /^\d{9}$/, nationalTransform: (digits) => `+34${digits}`, nationalConfidence: 0.58 },
    { code: "39", region: "IT", region_name: "Italy", nsnMin: 8, nsnMax: 10, nationalPattern: /^0\d{8,10}$/, nationalTransform: (digits) => `+39${digits}`, nationalConfidence: 0.65 },
    { code: "31", region: "NL", region_name: "Netherlands", nsnMin: 9, nsnMax: 9, nationalPattern: /^0\d{9}$/, nationalTransform: (digits) => `+31${digits.slice(1)}`, nationalConfidence: 0.67 },
    { code: "46", region: "SE", region_name: "Sweden", nsnMin: 7, nsnMax: 10, nationalPattern: /^0\d{7,10}$/, nationalTransform: (digits) => `+46${digits.slice(1)}`, nationalConfidence: 0.64 },
    { code: "47", region: "NO", region_name: "Norway", nsnMin: 8, nsnMax: 8, nationalPattern: /^\d{8}$/, nationalTransform: (digits) => `+47${digits}`, nationalConfidence: 0.54 },
    { code: "48", region: "PL", region_name: "Poland", nsnMin: 9, nsnMax: 9, nationalPattern: /^\d{9}$/, nationalTransform: (digits) => `+48${digits}`, nationalConfidence: 0.56 },
    { code: "7", region: "RU/KZ", region_name: "Russia / Kazakhstan", nsnMin: 10, nsnMax: 10, nationalPattern: /^[78]\d{9}$/, nationalTransform: (digits) => `+7${digits.slice(1)}`, nationalConfidence: 0.61 },
    { code: "27", region: "ZA", region_name: "South Africa", nsnMin: 9, nsnMax: 9, nationalPattern: /^0\d{9}$/, nationalTransform: (digits) => `+27${digits.slice(1)}`, nationalConfidence: 0.66 },
    { code: "1", region: "US/CA", region_name: "United States / Canada", nsnMin: 10, nsnMax: 10, nationalPattern: /^[2-9]\d{9}$/, nationalTransform: (digits) => `+1${digits}`, nationalConfidence: 0.74 },
  ];

  const PHONE_RULES_BY_CODE = [...PHONE_RULES].sort((a, b) => b.code.length - a.code.length);

  const findPhoneRuleByE164 = (digits) => {
    const normalizedDigits = String(digits || "").replace(/\D/g, "");
    for (const rule of PHONE_RULES_BY_CODE) {
      if (!normalizedDigits.startsWith(rule.code)) continue;
      const nationalDigits = normalizedDigits.slice(rule.code.length);
      if (nationalDigits.length < rule.nsnMin || nationalDigits.length > rule.nsnMax) continue;
      return { ...rule, nationalDigits };
    }
    return null;
  };

  const findPhoneRuleByNational = (digits) => {
    const normalizedDigits = String(digits || "").replace(/\D/g, "");
    return (
      PHONE_RULES.filter((rule) => rule.nationalPattern && rule.nationalPattern.test(normalizedDigits)).sort(
        (a, b) => (b.nationalConfidence || 0) - (a.nationalConfidence || 0) || b.code.length - a.code.length,
      )[0] || null
    );
  };

  const prettyPhoneGroups = (digits, groups) => {
    const cleaned = String(digits || "").replace(/\D/g, "");
    if (!cleaned) return "";
    const sizes = Array.isArray(groups) && groups.length ? groups : [];
    if (!sizes.length) return cleaned;
    const parts = [];
    let offset = 0;
    for (const size of sizes) {
      if (offset >= cleaned.length) break;
      parts.push(cleaned.slice(offset, offset + size));
      offset += size;
    }
    if (offset < cleaned.length) parts.push(cleaned.slice(offset));
    return parts.filter(Boolean).join(" ");
  };

  const prettyNationalPhone = (rule, nationalDigits) => {
    const digits = String(nationalDigits || "").replace(/\D/g, "");
    if (!rule || !digits) return digits;
    switch (rule.region) {
      case "US/CA":
        return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits;
      case "GB":
        return digits.length === 10 ? `0${digits.slice(0, 4)} ${digits.slice(4)}` : `0${digits}`;
      case "FR":
        return prettyPhoneGroups(`0${digits}`, [2, 2, 2, 2, 2]);
      case "AU":
        return prettyPhoneGroups(`0${digits}`, [2, 4, 4]);
      case "JP":
        return prettyPhoneGroups(`0${digits}`, [2, 4, 4]);
      default:
        return digits;
    }
  };

  const normalizeDateValue = (raw) => {
    const value = String(raw || "").trim();
    if (!value) return { raw: value, normalized: "", iso: "" };
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return { raw: value, normalized: value, iso: value };

    const slashMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (slashMatch) {
      const a = Number(slashMatch[1]);
      const b = Number(slashMatch[2]);
      const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
      const month = a > 12 ? b : a;
      const day = a > 12 ? a : b;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { raw: value, normalized: iso, iso };
      }
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = parsed.toISOString().slice(0, 10);
      return { raw: value, normalized: iso, iso };
    }
    return { raw: value, normalized: value, iso: "" };
  };

  const createEntityCollector = () => {
    const details = Object.fromEntries(ENTITY_DETAIL_KEYS.map((key) => [key, []]));
    const maps = Object.fromEntries(ENTITY_DETAIL_KEYS.map((key) => [key, new Map()]));
    const spans = [];

    const record = (type, value, normalized, { start = 0, end = 0, confidence = 0.5, source = "", raw = "", extra = {} } = {}) => {
      if (!ENTITY_DETAIL_KEYS.includes(type)) return null;
      const displayValue = String(value || "").trim();
      const normalizedValue = String(normalized || displayValue).trim();
      if (!displayValue || !normalizedValue) return null;

      const key = normalizedValue.toLowerCase();
      const entry = maps[type].get(key) || {
        value: displayValue,
        normalized: normalizedValue,
        confidence: clampConfidence(confidence),
        source,
        offsets: [],
        raw_values: [],
        ...extra,
      };
      entry.value = entry.value || displayValue;
      entry.normalized = entry.normalized || normalizedValue;
      entry.confidence = Math.max(entry.confidence || 0, clampConfidence(confidence));
      if (source && !entry.source) entry.source = source;
      if (raw && !entry.raw_values.includes(raw)) entry.raw_values.push(raw);
      if (start >= 0 && end > start) {
        const hasOffset = entry.offsets.some(([s, e]) => s === start && e === end);
        if (!hasOffset) entry.offsets.push([start, end]);
      }
      Object.assign(entry, extra || {});
      maps[type].set(key, entry);
      return entry;
    };

    const recordSpan = (type, value, normalized, meta = {}) => {
      const entry = record(type, value, normalized, meta);
      if (!entry) return;
      spans.push({
        type,
        value: entry.value,
        normalized: entry.normalized,
        confidence: entry.confidence,
        source: meta.source || entry.source || "",
        start: Number(meta.start || 0),
        end: Number(meta.end || 0),
      });
    };

    const finalize = () => {
      const topLevel = Object.fromEntries(ENTITY_DETAIL_KEYS.map((key) => [key, details[key]]));
      for (const key of ENTITY_DETAIL_KEYS) {
        details[key] = Array.from(maps[key].values()).sort((a, b) => {
          const aOffset = a.offsets?.[0]?.[0] ?? Number.MAX_SAFE_INTEGER;
          const bOffset = b.offsets?.[0]?.[0] ?? Number.MAX_SAFE_INTEGER;
          return aOffset - bOffset || String(a.value).localeCompare(String(b.value));
        });
        topLevel[key] = details[key].map((entry) => entry.value);
      }
      return { ...topLevel, details, spans: spans.sort((a, b) => a.start - b.start || a.end - b.end) };
    };

    return { recordSpan, finalize };
  };

  const hasOverlap = (offsets, start, end) =>
    Array.isArray(offsets) &&
    offsets.some(([s, e]) => Math.max(Number(s || 0), start) < Math.min(Number(e || 0), end));

  const extractEntities = (text) => {
    const t = String(text || "");
    const collector = createEntityCollector();

    for (const m of t.matchAll(/\bhttps?:\/\/[^\s<>()\]]+/gi)) {
      const raw = m[0].replace(/[),.]+$/g, "");
      collector.recordSpan("urls", raw, raw.toLowerCase(), {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + raw.length,
        confidence: 0.99,
        source: "url_regex",
        raw,
      });
    }
    for (const m of t.matchAll(/\bwww\.[^\s<>()\]]+/gi)) {
      const raw = m[0].replace(/[),.]+$/g, "");
      const value = `https://${raw}`;
      collector.recordSpan("urls", value, value.toLowerCase(), {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + raw.length,
        confidence: 0.95,
        source: "url_www_regex",
        raw,
      });
    }

    for (const m of t.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
      collector.recordSpan("emails", m[0], m[0].toLowerCase(), {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + m[0].length,
        confidence: 0.99,
        source: "email_regex",
        raw: m[0],
      });
    }

    for (const m of t.matchAll(/(?:^|[^A-Z0-9._%+-])@([A-Z0-9._]{2,32})\b/gi)) {
      const value = `@${m[1]}`;
      const offset = Number(m.index || 0) + m[0].lastIndexOf("@");
      collector.recordSpan("handles", value, value.toLowerCase(), {
        start: offset,
        end: offset + value.length,
        confidence: 0.94,
        source: "handle_regex",
        raw: value,
      });
    }

    for (const m of t.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)) {
      const raw = m[0].trim();
      const normalized = normalizePhone(raw);
      if (!normalized?.digits || normalized.digits.length < 8) continue;
      collector.recordSpan("phones", raw, normalized.e164 || normalized.digits, {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + raw.length,
        confidence: normalized.confidence ?? 0.65,
        source: normalized.e164 ? "phone_rule_e164" : "phone_rule_local",
        raw,
        extra: {
          e164: normalized.e164 || null,
          region: normalized.region || null,
          region_name: normalized.region_name || null,
          plausible: normalized.plausible !== false,
          international: normalized.international || null,
          national: normalized.national || null,
        },
      });
    }

    for (const m of t.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi)) {
      const normalized = normalizeDateValue(m[0]);
      collector.recordSpan("dates", normalized.normalized || m[0], normalized.iso || normalized.normalized || m[0], {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + m[0].length,
        confidence: 0.88,
        source: "date_textual",
        raw: m[0],
        extra: { raw: m[0], iso: normalized.iso || null },
      });
    }
    for (const m of t.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
      const normalized = normalizeDateValue(m[0]);
      collector.recordSpan("dates", normalized.normalized || m[0], normalized.iso || normalized.normalized || m[0], {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + m[0].length,
        confidence: 0.96,
        source: "date_iso",
        raw: m[0],
        extra: { raw: m[0], iso: normalized.iso || null },
      });
    }
    for (const m of t.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g)) {
      const normalized = normalizeDateValue(m[0]);
      collector.recordSpan("dates", normalized.normalized || m[0], normalized.iso || normalized.normalized || m[0], {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + m[0].length,
        confidence: 0.76,
        source: "date_numeric",
        raw: m[0],
        extra: { raw: m[0], iso: normalized.iso || null },
      });
    }

    for (const m of t.matchAll(/\b(?:[A-Z][\w&.-]*\s+){0,4}(?:Inc|LLC|Ltd|Limited|Corp|Corporation|Company|Co\.?|Group|Studio|University|College|School|Bank|Agency|Department|Ministry|Foundation|Institute|Association|Press|Media|Hospital|Clinic|Hotel|Restaurant|Museum|Council|Office)\b/g)) {
      const value = m[0].trim();
      collector.recordSpan("organizations", value, value.toLowerCase(), {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + value.length,
        confidence: 0.83,
        source: "org_suffix",
        raw: value,
      });
    }

    for (const m of t.matchAll(/\b(?:in|at|from|near|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g)) {
      const value = m[1].trim();
      if (PERSON_STOPWORDS.has(value.split(/\s+/)[0])) continue;
      collector.recordSpan("locations", value, value.toLowerCase(), {
        start: Number(m.index || 0) + m[0].lastIndexOf(value),
        end: Number(m.index || 0) + m[0].lastIndexOf(value) + value.length,
        confidence: 0.62,
        source: "location_preposition",
        raw: value,
      });
    }
    for (const m of t.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Park|Plaza|Square|Airport|Station|Beach|River|Harbor|Harbour|Mount|Mountain|Valley|City|County|District|Province|State))\b/g)) {
      const value = m[1].trim();
      collector.recordSpan("locations", value, value.toLowerCase(), {
        start: Number(m.index || 0),
        end: Number(m.index || 0) + value.length,
        confidence: 0.8,
        source: "location_suffix",
        raw: value,
      });
    }

    for (const m of t.matchAll(/\b(?:aka|alias|called|named)\s+["“]?([A-Za-z0-9_.@-]{2,40}(?:\s+[A-Za-z0-9_.@-]{2,40})?)["”]?/gi)) {
      const value = m[1].trim();
      collector.recordSpan("aliases", value, value.toLowerCase(), {
        start: Number(m.index || 0) + m[0].lastIndexOf(value),
        end: Number(m.index || 0) + m[0].lastIndexOf(value) + value.length,
        confidence: 0.82,
        source: "alias_explicit",
        raw: value,
      });
    }

    const repeatedTokenCounts = new Map();
    for (const m of t.matchAll(/\b[A-Za-z][A-Za-z0-9_.-]{2,24}\b/g)) {
      const token = m[0];
      const key = token.toLowerCase();
      const entry = repeatedTokenCounts.get(key) || { value: token, offsets: [] };
      entry.offsets.push([Number(m.index || 0), Number(m.index || 0) + token.length]);
      repeatedTokenCounts.set(key, entry);
    }
    for (const [, entry] of repeatedTokenCounts.entries()) {
      if (entry.offsets.length < 2) continue;
      if (!/[._-]/.test(entry.value) && entry.value.toLowerCase() === entry.value) continue;
      collector.recordSpan("aliases", entry.value, entry.value.toLowerCase(), {
        start: entry.offsets[0][0],
        end: entry.offsets[0][1],
        confidence: 0.58,
        source: "alias_repeated",
        raw: entry.value,
        extra: { repeated_count: entry.offsets.length, offsets: entry.offsets.slice() },
      });
    }

    const prelim = collector.finalize();
    const occupied = [
      ...prelim.details.organizations.flatMap((entry) => entry.offsets || []),
      ...prelim.details.locations.flatMap((entry) => entry.offsets || []),
      ...prelim.details.dates.flatMap((entry) => entry.offsets || []),
    ];

    for (const m of t.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g)) {
      const value = m[1].trim();
      const words = value.split(/\s+/);
      if (words.some((word) => PERSON_STOPWORDS.has(word))) continue;
      if (ORGANIZATION_SUFFIXES.test(value) || LOCATION_SUFFIXES.test(value)) continue;
      const start = Number(m.index || 0);
      const end = start + value.length;
      if (hasOverlap(occupied, start, end)) continue;
      occupied.push([start, end]);
      prelim.details.people.push({
        value,
        normalized: value.toLowerCase(),
        confidence: 0.68,
        source: "person_title_case",
        offsets: [[start, end]],
        raw_values: [value],
      });
      prelim.spans.push({
        type: "people",
        value,
        normalized: value.toLowerCase(),
        confidence: 0.68,
        source: "person_title_case",
        start,
        end,
      });
    }

    prelim.details.people.sort((a, b) => (a.offsets?.[0]?.[0] ?? 0) - (b.offsets?.[0]?.[0] ?? 0));
    prelim.people = prelim.details.people.map((entry) => entry.value);
    prelim.organizations = prelim.details.organizations.map((entry) => entry.value);
    prelim.locations = prelim.details.locations.map((entry) => entry.value);
    prelim.dates = prelim.details.dates.map((entry) => entry.value);
    prelim.aliases = prelim.details.aliases.map((entry) => entry.value);
    prelim.spans.sort((a, b) => a.start - b.start || a.end - b.end);
    return prelim;
  };

  const normalizeDomain = (hostOrUrl) => {
    try {
      const s = String(hostOrUrl || "").trim();
      if (!s) return null;
      const u = s.includes("://") ? new URL(s) : new URL(`https://${s}`);
      const h = (u.hostname || "").toLowerCase().replace(/^www\./i, "");
      return h || null;
    } catch {
      return null;
    }
  };

  const normalizeHandle = (h) => {
    const s = String(h || "").trim();
    const core = s.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
    return core.length >= 2 ? core : null;
  };

  const phoneCountryHint = (e164) => {
    const digits = String(e164 || "").replace(/[^\d]/g, "");
    const rule = findPhoneRuleByE164(digits);
    return rule ? `${rule.region}${rule.region_name ? ` · ${rule.region_name}` : ""}` : null;
  };

  const normalizePhone = (raw) => {
    const s0 = String(raw || "").trim();
    if (!s0) return null;
    const withoutExtension = s0.replace(/\s*(?:ext\.?|extension|x)\s*\d+\s*$/i, "");
    let s = withoutExtension.replace(/[^\d+]/g, "");
    if (!s) return null;
    if (s.startsWith("011")) s = `+${s.slice(3)}`;
    else if (s.startsWith("00")) s = `+${s.slice(2)}`;
    const digits = s.replace(/\D/g, "");
    if (digits.length < 7) return null;

    let e164 = null;
    let rule = null;
    let nationalDigits = "";
    let plausible = digits.length >= 8 && digits.length <= 15;
    let confidence = plausible ? 0.38 : 0.12;

    if (s.startsWith("+")) {
      rule = findPhoneRuleByE164(digits);
      if (rule) {
        nationalDigits = rule.nationalDigits || digits.slice(rule.code.length);
        e164 = `+${digits}`;
        plausible = nationalDigits.length >= rule.nsnMin && nationalDigits.length <= rule.nsnMax;
        confidence = plausible ? 0.97 : 0.46;
      } else if (digits.length >= 8 && digits.length <= 15) {
        e164 = `+${digits}`;
        nationalDigits = digits;
        plausible = true;
        confidence = 0.52;
      }
    } else {
      rule = findPhoneRuleByNational(digits);
      if (rule && typeof rule.nationalTransform === "function") {
        e164 = String(rule.nationalTransform(digits));
        const e164Digits = e164.replace(/[^\d]/g, "");
        const resolved = findPhoneRuleByE164(e164Digits);
        rule = resolved || rule;
        nationalDigits = rule?.nationalDigits || e164Digits.slice((rule?.code || "").length);
        plausible = true;
        confidence = clampConfidence(rule.nationalConfidence || 0.6);
      } else if (digits.length === 11 && digits.startsWith("1")) {
        e164 = `+${digits}`;
        rule = findPhoneRuleByE164(digits);
        nationalDigits = digits.slice(1);
        plausible = true;
        confidence = 0.74;
      }
    }

    const hint = e164 ? phoneCountryHint(e164) : rule ? `${rule.region}${rule.region_name ? ` · ${rule.region_name}` : ""}` : null;
    return {
      raw: s0,
      digits,
      e164,
      region: rule?.region || null,
      region_name: rule?.region_name || null,
      country_hint: hint,
      plausible,
      confidence: clampConfidence(confidence),
      international: e164 ? e164 : null,
      national: rule && nationalDigits ? prettyNationalPhone(rule, nationalDigits) : null,
    };
  };

  const api = {
    preprocessOtsu,
    preprocessAdaptive,
    extractEntities,
    normalizeDomain,
    normalizeHandle,
    phoneCountryHint,
    normalizePhone,
  };

  try {
    if (typeof window !== "undefined") window.OCR_PIPELINE = api;
  } catch {
    // ignore
  }

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch {
    // ignore
  }
})();
