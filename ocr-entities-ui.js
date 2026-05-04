/* global window */

(() => {
  const emptyRecon = { urls: [], emails: [], handles: [], phones: [], people: [], organizations: [], locations: [], dates: [], aliases: [] };

  const buildDetailIndex = (entries = []) =>
    new Map(
      (Array.isArray(entries) ? entries : [])
        .filter((entry) => entry && entry.value)
        .map((entry) => [String(entry.value).toLowerCase(), entry]),
    );

  const findDetail = (index, value) => index.get(String(value || "").toLowerCase()) || null;

  const confidenceLabel = (detail) => {
    const value = Number(detail?.confidence);
    return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "";
  };

  const offsetLabel = (detail) => {
    const first = Array.isArray(detail?.offsets) && detail.offsets.length ? detail.offsets[0] : null;
    return first ? `${first[0]}-${first[1]}` : "";
  };

  const normalizeReconEntities = ({ text, ocrPipeline, extractHandlesAndDomains }) => {
    const ent = ocrPipeline?.extractEntities?.(text) || emptyRecon;
    const extra = typeof extractHandlesAndDomains === "function" ? extractHandlesAndDomains(text) : { handles: [], domains: [] };
    const handles = Array.from(
      new Set(
        [...(ent.handles || []), ...(extra.handles || [])]
          .map((value) => ocrPipeline?.normalizeHandle?.(value) || String(value || "").replace(/^@/, "").trim())
          .filter(Boolean)
          .map((value) => `@${value}`),
      ),
    );
    const domains = Array.from(
      new Set(
        [
          ...(ent.urls || []).map((value) => ocrPipeline?.normalizeDomain?.(value)),
          ...(extra.domains || []).map((value) => ocrPipeline?.normalizeDomain?.(value)),
        ].filter(Boolean),
      ),
    );
    const phones = Array.from(
      new Set(
        (ent.phones || [])
          .map((value) => ocrPipeline?.normalizePhone?.(value))
          .filter(Boolean)
          .map((value) => value.e164 || value.digits || value.raw),
      ),
    );
    return { ent, handles, domains, phones };
  };

  const buildHandleReconOutput = ({ handles }) => {
    const items = (handles || []).slice(0, 8).map((handle) => {
      const clean = String(handle || "").replace(/^@/, "");
      return {
        type: "handle",
        label: handle,
        meta: "OCR-derived handle pivot",
        lines: ["Direct profile sweep prepared", "Use intake queue to merge pasted hits from engines or socials"],
        links: [
          { label: "Instagram", url: `https://www.instagram.com/${encodeURIComponent(clean)}/` },
          { label: "TikTok", url: `https://www.tiktok.com/@${encodeURIComponent(clean)}` },
          { label: "X", url: `https://x.com/${encodeURIComponent(clean)}` },
          { label: "Search", url: `https://www.google.com/search?q=${encodeURIComponent(handle)}` },
        ],
      };
    });
    return {
      mission: "handle_recon",
      summary: handles?.length ? `Handle recon prepared ${handles.length} normalized handles.` : "Handle recon found no stable OCR handles.",
      items,
    };
  };

  const buildDomainReconOutput = ({ ent, domains, normalizeDomain }) => {
    const items = (domains || []).slice(0, 8).map((domain) => {
      const relatedUrls = (ent?.urls || []).filter((url) => (typeof normalizeDomain === "function" ? normalizeDomain(url) : "") === domain).slice(0, 2);
      return {
        type: "domain",
        label: domain,
        meta: `${relatedUrls.length} OCR-linked URL${relatedUrls.length === 1 ? "" : "s"}`,
        lines: [...relatedUrls, "Normalized for site, WHOIS, DNS, CRT, and archive follow-up"],
        links: [
          { label: "Site search", url: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain}`)}` },
          { label: "WHOIS", url: `https://www.whois.com/whois/${encodeURIComponent(domain)}` },
          { label: "DNS", url: `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A` },
          { label: "CRT", url: `https://crt.sh/?q=${encodeURIComponent(domain)}` },
          { label: "Archive", url: `https://web.archive.org/web/*/${encodeURIComponent(`https://${domain}/*`)}` },
        ],
      };
    });
    return {
      mission: "domain_recon",
      summary: domains?.length ? `Domain recon normalized ${domains.length} domains from OCR and URL pivots.` : "Domain recon found no domains to normalize.",
      items,
    };
  };

  const detectScriptHint = ({ text, scriptHints = [] }) => {
    const value = String(text || "");
    if (!value) return null;
    const ranked = (scriptHints || [])
      .map((script) => ({ ...script, score: (value.match(script.test) || []).length }))
      .filter((script) => script.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (!top) return null;
    if (top.label !== "Latin" && top.score < 2) return null;
    if (top.label === "Latin" && top.score < 8) return null;
    return top;
  };

  const renderOcrLangHint = ({ text, element, scriptHints = [], getOcrLanguageLabel = (code) => code }) => {
    if (!element) return;
    const hint = detectScriptHint({ text, scriptHints });
    if (!hint) {
      element.hidden = true;
      return;
    }
    const labels = hint.models.slice(0, 3).map((code) => getOcrLanguageLabel(code)).join(" / ");
    element.hidden = false;
    element.textContent = `Weak script hint: ${hint.label} → try ${labels}`;
  };

  const renderOcrEntities = ({
    text,
    state,
    elements,
    ocrPipeline,
    copyText,
    renderPivotTaskResult,
    runPivotStructuredTask,
    setPivotTaskResult,
    logAction,
    recordEntityConfidenceReview,
    createReviewEntry,
  }) => {
    const wrap = elements?.ocrEntities;
    if (!wrap) return;

    const ent = ocrPipeline?.extractEntities?.(text) || emptyRecon;
    const total =
      (ent.urls?.length || 0) +
      (ent.emails?.length || 0) +
      (ent.handles?.length || 0) +
      (ent.phones?.length || 0) +
      (ent.people?.length || 0) +
      (ent.organizations?.length || 0) +
      (ent.locations?.length || 0) +
      (ent.dates?.length || 0) +
      (ent.aliases?.length || 0);

    if (!total) {
      state.ocrDerivedEntries = [];
      wrap.hidden = true;
      wrap.innerHTML = "";
      if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = true;
      return;
    }

    const detailIndex = {
      phones: buildDetailIndex(ent?.details?.phones),
      people: buildDetailIndex(ent?.details?.people),
      organizations: buildDetailIndex(ent?.details?.organizations),
      locations: buildDetailIndex(ent?.details?.locations),
      dates: buildDetailIndex(ent?.details?.dates),
      aliases: buildDetailIndex(ent?.details?.aliases),
    };

    const derivedEntries = [];
    wrap.hidden = false;
    wrap.innerHTML = "";
    if (elements.btnPivotSearch) elements.btnPivotSearch.disabled = false;

    const group = (title, source) => {
      const g = document.createElement("div");
      g.className = "pivot-group";
      const head = document.createElement("div");
      head.className = "pivot-head";
      head.textContent = source ? `${title} — ${source}` : title;
      g.appendChild(head);
      wrap.appendChild(g);
      return g;
    };

    const addLinkChip = (parent, label, url, { title } = {}) => {
      const a = document.createElement("a");
      a.className = "chip chip-link";
      a.href = url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.title = title || label;
      a.textContent = label;
      parent.appendChild(a);
    };

    const addCopyChip = (parent, label, value) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.title = `Copy ${label}`;
      b.textContent = label;
      b.addEventListener("click", () => void copyText(value));
      parent.appendChild(b);
    };

    const addInfoChip = (parent, label) => {
      if (!label) return;
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = label;
      parent.appendChild(chip);
    };

    const addTaskButton = (parent, { entityType, entityKey, entityValue }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.title = "Run structured acquisition task";
      button.textContent = "Acquire";
      parent.appendChild(button);

      const box = document.createElement("div");
      box.className = "pivot-task-box";
      box.hidden = true;
      parent.appendChild(box);

      renderPivotTaskResult(box, state.pivotTaskResults?.[entityKey] || null);
      button.addEventListener("click", async () => {
        button.disabled = true;
        renderPivotTaskResult(box, {
          status: "loading",
          summary: "Running structured acquisition…",
          lines: [`Lead: ${entityValue}`],
          links: [],
        });
        try {
          const result = await runPivotStructuredTask({ entityType, entityKey, entityValue });
          setPivotTaskResult(entityKey, result);
          renderPivotTaskResult(box, result);
          logAction("pivot_task_acquired", `${entityType}:${entityValue}`);
        } catch (error) {
          const failed = {
            status: "error",
            summary: "Structured acquisition failed.",
            lines: [error?.message || "unknown error"],
            links: [],
            entity_type: entityType,
            entity_key: entityKey,
            entity_value: entityValue,
            fetched_at: new Date().toISOString(),
          };
          setPivotTaskResult(entityKey, failed);
          renderPivotTaskResult(box, failed);
        } finally {
          button.disabled = false;
        }
      });
    };

    const addConfidence = (parent, { entityType, entityKey, entityValue }) => {
      const sel = document.createElement("select");
      sel.className = "select chip-select";
      sel.title = "Analyst confidence (manual)";
      sel.innerHTML =
        `<option value="unverified">?</option>` +
        `<option value="likely">~</option>` +
        `<option value="confirmed">✓</option>`;
      parent.appendChild(sel);
      sel.value = state.entityConfidence?.[entityKey] || "unverified";
      sel.addEventListener("change", () => {
        recordEntityConfidenceReview({ entityType, entityKey, entityValue, confidence: sel.value || "unverified" });
      });
    };

    const addDerivedEntry = ({ entityType, entityKey, entityValue, note }) => {
      derivedEntries.push(
        createReviewEntry({
          source: "derived",
          scope: "ocr_entity",
          field: "detected",
          value: entityValue,
          entityType,
          entityKey,
          entityValue,
          note,
        }),
      );
    };

    const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    const note = document.createElement("div");
    note.className = "pivot-head";
    note.textContent = "Manual pivots only — these are templated follow-ups from OCR hits, not investigative scoring.";
    wrap.appendChild(note);

    if (ent.handles?.length) {
      const g = group("Handles", "Source: direct OCR hit · Confidence: direct text");
      for (const raw of ent.handles.slice(0, 6)) {
        const h = ocrPipeline?.normalizeHandle?.(raw) || String(raw || "").replace(/^@/, "");
        if (!h) continue;
        const row = document.createElement("div");
        row.className = "pivot-row";
        addCopyChip(row, `@${h}`, `@${h}`);
        addInfoChip(row, "Manual follow-up");
        addLinkChip(row, "IG", `https://www.instagram.com/${encodeURIComponent(h)}/`, { title: "Open Instagram profile" });
        addLinkChip(row, "TikTok", `https://www.tiktok.com/@${encodeURIComponent(h)}`, { title: "Open TikTok profile" });
        addLinkChip(row, "X", `https://x.com/${encodeURIComponent(h)}`, { title: "Open X profile" });
        addLinkChip(row, "Search", google(`@${h}`), { title: "Search handle" });
        addDerivedEntry({ entityType: "handle", entityKey: `handle:${h.toLowerCase()}`, entityValue: `@${h}`, note: "Direct OCR hit" });
        addConfidence(row, { entityType: "handle", entityKey: `handle:${h.toLowerCase()}`, entityValue: `@${h}` });
        addTaskButton(row, { entityType: "handle", entityKey: `handle:${h.toLowerCase()}`, entityValue: `@${h}` });
        g.appendChild(row);
      }
    }

    if (ent.urls?.length) {
      const g = group("URLs / Domains", "Source: direct OCR hit · Confidence: direct text");
      for (const u of ent.urls.slice(0, 6)) {
        const d = ocrPipeline?.normalizeDomain?.(u);
        const row = document.createElement("div");
        row.className = "pivot-row";
        const short = String(u).replace(/^https?:\/\//i, "").slice(0, 44);
        addLinkChip(row, short, u, { title: "Open URL" });
        if (d) {
          addInfoChip(row, "Derived domain follow-up");
          addDerivedEntry({ entityType: "domain", entityKey: `domain:${d}`, entityValue: d, note: "Derived OCR follow-up" });
          addLinkChip(row, "WHOIS", `https://www.whois.com/whois/${encodeURIComponent(d)}`, { title: "WHOIS lookup" });
          addLinkChip(row, "DNS", `https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`, { title: "DNS over HTTPS (Google)" });
          addLinkChip(row, "CRT", `https://crt.sh/?q=${encodeURIComponent(d)}`, { title: "Certificate transparency" });
          addLinkChip(row, "Search", google(`site:${d}`), { title: "Search site" });
          addConfidence(row, { entityType: "domain", entityKey: `domain:${d}`, entityValue: d });
          addTaskButton(row, { entityType: "domain", entityKey: `domain:${d}`, entityValue: d });
        } else {
          addDerivedEntry({ entityType: "url", entityKey: `url:${String(u).toLowerCase()}`, entityValue: u, note: "Direct OCR hit" });
          addLinkChip(row, "Search", google(u), { title: "Search URL" });
          addTaskButton(row, { entityType: "url", entityKey: `url:${String(u).toLowerCase()}`, entityValue: u });
        }
        g.appendChild(row);
      }
    }

    if (ent.emails?.length) {
      const g = group("Emails", "Source: direct OCR hit · Confidence: direct text");
      for (const email of ent.emails.slice(0, 6)) {
        const row = document.createElement("div");
        row.className = "pivot-row";
        addCopyChip(row, email, email);
        addInfoChip(row, "Manual search");
        addLinkChip(row, "Search", google(`"${email}"`), { title: "Search email" });
        addLinkChip(row, "Breach?", google(`"${email}" breach`), { title: "Search breach mentions" });
        addDerivedEntry({ entityType: "email", entityKey: `email:${email.toLowerCase()}`, entityValue: email, note: "Direct OCR hit" });
        addConfidence(row, { entityType: "email", entityKey: `email:${email.toLowerCase()}`, entityValue: email });
        addTaskButton(row, { entityType: "email", entityKey: `email:${email.toLowerCase()}`, entityValue: email });
        g.appendChild(row);
      }
    }

    if (ent.phones?.length) {
      const g = group("Phones", "Source: direct OCR hit · Confidence: normalized rule set");
      for (const phone of ent.phones.slice(0, 6)) {
        const normalized = ocrPipeline?.normalizePhone?.(phone);
        const row = document.createElement("div");
        row.className = "pivot-row";
        const label = normalized?.e164 ? `${normalized.e164}${normalized.country_hint ? ` (${normalized.country_hint})` : ""}` : phone;
        addCopyChip(row, label, normalized?.e164 || phone);
        addInfoChip(row, normalized?.plausible === false ? "Needs analyst review" : "Normalized");
        addInfoChip(row, normalized?.region || "");
        if (normalized?.confidence != null) addInfoChip(row, `${Math.round(normalized.confidence * 100)}%`);
        const q = normalized?.e164 || normalized?.digits || phone;
        addLinkChip(row, "Search", google(`"${q}"`), { title: "Search phone" });
        addDerivedEntry({ entityType: "phone", entityKey: `phone:${String(q).replace(/\s+/g, "")}`, entityValue: label, note: "Direct OCR hit" });
        addConfidence(row, { entityType: "phone", entityKey: `phone:${String(q).replace(/\s+/g, "")}`, entityValue: label });
        addTaskButton(row, { entityType: "phone", entityKey: `phone:${String(q).replace(/\s+/g, "")}`, entityValue: label });
        g.appendChild(row);
      }
    }

    const addEnrichedGroup = ({ title, values = [], detailKey, entityType, noteText, searchBuilder, extraLinkBuilder, limit = 6 }) => {
      if (!values?.length) return;
      const g = group(title, noteText);
      for (const value of values.slice(0, limit)) {
        const row = document.createElement("div");
        row.className = "pivot-row";
        const detail = findDetail(detailIndex[detailKey], value);
        addCopyChip(row, value, value);
        if (detail?.source) addInfoChip(row, detail.source.replace(/_/g, " "));
        if (confidenceLabel(detail)) addInfoChip(row, confidenceLabel(detail));
        if (offsetLabel(detail)) addInfoChip(row, `@${offsetLabel(detail)}`);
        if (typeof searchBuilder === "function") addLinkChip(row, "Search", searchBuilder(value), { title: `Search ${entityType}` });
        if (typeof extraLinkBuilder === "function") {
          const extra = extraLinkBuilder(value);
          if (extra?.label && extra?.url) addLinkChip(row, extra.label, extra.url, { title: extra.label });
        }
        const entityKey = `${entityType}:${String(value).toLowerCase()}`;
        addDerivedEntry({ entityType, entityKey, entityValue: value, note: `Enriched OCR ${entityType}` });
        addConfidence(row, { entityType, entityKey, entityValue: value });
        addTaskButton(row, { entityType, entityKey, entityValue: value });
        g.appendChild(row);
      }
    };

    addEnrichedGroup({
      title: "People",
      values: ent.people,
      detailKey: "people",
      entityType: "person",
      noteText: "Layered extraction · title-case candidate",
      searchBuilder: (value) => google(`"${value}"`),
    });
    addEnrichedGroup({
      title: "Organizations",
      values: ent.organizations,
      detailKey: "organizations",
      entityType: "organization",
      noteText: "Layered extraction · organization suffix",
      searchBuilder: (value) => google(`"${value}"`),
    });
    addEnrichedGroup({
      title: "Locations",
      values: ent.locations,
      detailKey: "locations",
      entityType: "location",
      noteText: "Layered extraction · place candidate",
      searchBuilder: (value) => google(`"${value}" location`),
      extraLinkBuilder: (value) => ({ label: "Maps", url: `https://www.google.com/maps/search/${encodeURIComponent(value)}` }),
    });
    addEnrichedGroup({
      title: "Dates",
      values: ent.dates,
      detailKey: "dates",
      entityType: "date",
      noteText: "Layered extraction · normalized date candidate",
      searchBuilder: (value) => google(`"${value}"`),
    });
    addEnrichedGroup({
      title: "Aliases",
      values: ent.aliases,
      detailKey: "aliases",
      entityType: "alias",
      noteText: "Layered extraction · explicit or repeated alias",
      searchBuilder: (value) => google(`"${value}"`),
    });

    state.ocrDerivedEntries = derivedEntries;
  };

  const api = {
    normalizeReconEntities,
    buildHandleReconOutput,
    buildDomainReconOutput,
    detectScriptHint,
    renderOcrLangHint,
    renderOcrEntities,
  };

  try {
    if (typeof window !== "undefined") window.BLUELENS_OCR_ENTITIES = api;
  } catch {
    // ignore
  }

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch {
    // ignore
  }
})();
