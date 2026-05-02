(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const engine = params.get("engine") || "";
  const label = params.get("label") || engine || "Engine";
  const key = `osint:${token}:${engine}`;

  const title = document.getElementById("title");
  const msg = document.getElementById("msg");
  const link = document.getElementById("link");
  const closeBtn = document.getElementById("close");

  function buildTitle(text) {
    title.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = text;
    title.appendChild(strong);
    title.appendChild(document.createTextNode(" — waiting for public image URL…"));
  }

  function buildTarget(url) {
    const enc = encodeURIComponent(url);
    switch (engine) {
      case "lens":
        return `https://lens.google.com/uploadbyurl?url=${enc}`;
      case "bing":
        return `https://www.bing.com/images/search?q=imgurl:${enc}&view=detailv2&iss=sbi`;
      case "tineye":
        return `https://tineye.com/search?url=${enc}`;
      case "yandex":
        return `https://yandex.com/images/search?rpt=imageview&url=${enc}`;
      default:
        return `https://www.google.com/searchbyimage?image_url=${enc}`;
    }
  }

  function setManualLink(target) {
    link.textContent = "";
    const anchor = document.createElement("a");
    anchor.href = target;
    anchor.textContent = "Open manually";
    link.appendChild(anchor);
  }

  function applyData(data) {
    if (!data) return false;
    if (data.status) {
      msg.textContent = data.status === "uploading" ? "Uploading... (check main tab)" : String(data.status);
      return true;
    }
    if (data.err) {
      msg.textContent = `Error: ${data.err}`;
      return true;
    }
    if (data.url) {
      const target = buildTarget(data.url);
      setManualLink(target);
      window.location.replace(target);
      return true;
    }
    return false;
  }

  function tickStorage() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (!raw) return;
    try {
      applyData(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  async function tickApi() {
    if (!token || !engine) return;
    try {
      const r = await fetch(`/api/status?token=${encodeURIComponent(token)}&engine=${encodeURIComponent(engine)}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = await r.json();
      applyData(d);
    } catch {
      // ignore
    }
  }

  buildTitle(label);
  document.title = `BlueLens - ${label}`;
  if (closeBtn) {
    closeBtn.addEventListener("click", () => window.close());
  } else {
    console.warn("BlueLens wait page: close button missing");
  }

  let bc = null;
  try {
    bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("osint-lens") : null;
  } catch {
    bc = null;
  }
  if (bc) {
    bc.addEventListener("message", (ev) => {
      const data = ev && ev.data;
      if (!data || data.token !== token || data.engine !== engine) return;
      applyData(data);
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === key) tickStorage();
  });

  window.setInterval(tickStorage, 250);
  window.setInterval(() => void tickApi(), 350);
  void tickApi();
  tickStorage();
})();
