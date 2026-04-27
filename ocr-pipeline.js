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

  const extractEntities = (text) => {
    const t = String(text || "");
    const urls = [];
    const emails = [];
    const handles = [];
    const phones = [];

    const pushUniq = (arr, v, norm = (x) => x) => {
      const n = norm(v);
      if (!n) return;
      if (arr.some((x) => norm(x) === n)) return;
      arr.push(v);
    };

    for (const m of t.matchAll(/\bhttps?:\/\/[^\s<>()\]]+/gi)) {
      pushUniq(urls, m[0], (x) => x.toLowerCase().replace(/[),.]+$/g, ""));
    }
    for (const m of t.matchAll(/\bwww\.[^\s<>()\]]+/gi)) {
      const raw = m[0].replace(/[),.]+$/g, "");
      pushUniq(urls, `https://${raw}`, (x) => x.toLowerCase());
    }

    for (const m of t.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
      pushUniq(emails, m[0], (x) => x.toLowerCase());
    }

    for (const m of t.matchAll(/(?:^|[^A-Z0-9._%+-])@([A-Z0-9._]{2,32})\b/gi)) {
      pushUniq(handles, `@${m[1]}`, (x) => x.toLowerCase());
    }

    for (const m of t.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)) {
      const raw = m[0].trim();
      const norm = raw.replace(/[^\d+]/g, "");
      if (norm.replace(/\D/g, "").length < 9) continue;
      pushUniq(phones, raw, (x) => x.replace(/[^\d+]/g, ""));
    }

    return { urls, emails, handles, phones };
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
    const s = String(e164 || "");
    const map = [
      ["+1", "US/CA"],
      ["+44", "UK"],
      ["+33", "FR"],
      ["+49", "DE"],
      ["+34", "ES"],
      ["+39", "IT"],
      ["+31", "NL"],
      ["+46", "SE"],
      ["+47", "NO"],
      ["+48", "PL"],
      ["+61", "AU"],
      ["+81", "JP"],
      ["+7", "RU/KZ"],
    ];
    for (const [p, label] of map) {
      if (s.startsWith(p)) return label;
    }
    return null;
  };

  const normalizePhone = (raw) => {
    const s0 = String(raw || "").trim();
    if (!s0) return null;
    let s = s0.replace(/[^\d+]/g, "");
    if (!s) return null;
    if (s.startsWith("00")) s = `+${s.slice(2)}`;
    const digits = s.replace(/\D/g, "");
    if (digits.length < 9) return null;

    let e164 = null;
    if (s.startsWith("+")) e164 = `+${digits}`;
    else if (digits.length === 11 && digits.startsWith("1")) e164 = `+${digits}`;

    const hint = e164 ? phoneCountryHint(e164) : null;
    return { raw: s0, digits, e164, country_hint: hint };
  };

  const api = {
    preprocessOtsu,
    preprocessAdaptive,
    extractEntities,
    normalizeDomain,
    normalizeHandle,
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
