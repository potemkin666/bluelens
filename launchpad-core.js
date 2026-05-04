/* global window */

(() => {
  const getRunEngines = ({ run, engineOrder = [] } = {}) => {
    const fromTargets = Object.keys(run?.targets || {});
    const fromQueue = Object.keys(run?.queue || {});
    return Array.from(new Set([...(engineOrder || []).filter((engine) => fromTargets.includes(engine) || fromQueue.includes(engine)), ...fromTargets, ...fromQueue])).filter(Boolean);
  };

  const updateRunQueueStatus = ({ run, engine, patch = {}, runQueueStatus = { queued: "queued" } } = {}) => {
    if (!run || !engine) return run;
    run.queue = run.queue && typeof run.queue === "object" ? run.queue : {};
    const current = run.queue[engine] && typeof run.queue[engine] === "object" ? run.queue[engine] : {};
    run.queue[engine] = {
      status: current.status || runQueueStatus.queued || "queued",
      attempts: Number(current.attempts || 0),
      updated_at: new Date().toISOString(),
      ...current,
      ...patch,
      updated_at: patch.updated_at || new Date().toISOString(),
    };
    return run;
  };

  const createEngineRunRecord = ({
    engines = [],
    mode = "launchpad",
    url = "",
    artifact = "original",
    reverseSearchUrl = () => "",
    runQueueStatus = { prepared: "prepared", queued: "queued" },
  } = {}) => {
    const queue = {};
    const targets = {};
    const chosen = {};
    for (const engine of engines) {
      queue[engine] = {
        status: url ? runQueueStatus.prepared : runQueueStatus.queued,
        attempts: 0,
        updated_at: new Date().toISOString(),
        detail: url ? "Target prepared" : "Awaiting upload handoff",
      };
      chosen[engine] = true;
      targets[engine] = url ? reverseSearchUrl(engine, url) : "";
    }
    return {
      ts: Date.now(),
      mode,
      url,
      artifact,
      targets,
      chosen,
      opened: {},
      blocked: {},
      queue,
    };
  };

  const openTargetsForRun = ({ run, engines, engineOrder = [], openUrl = () => null, updateRunQueueStatus: updateStatus, runQueueStatus = {} } = {}) => {
    if (!run || !run.targets) return { openedCount: 0, blockedCount: 0 };
    const openList = Array.from(new Set((engines || []).filter((engine) => run.targets?.[engine])));
    let openedCount = 0;
    let blockedCount = 0;
    run.opened = run.opened && typeof run.opened === "object" ? run.opened : {};
    run.blocked = run.blocked && typeof run.blocked === "object" ? run.blocked : {};
    for (const engine of openList) {
      const target = run.targets[engine];
      const opened = openUrl(target);
      if (opened) {
        run.opened[engine] = true;
        delete run.blocked[engine];
        openedCount += 1;
        updateStatus?.(run, engine, { status: runQueueStatus.opened || "opened" });
      } else {
        run.blocked[engine] = true;
        blockedCount += 1;
        updateStatus?.(run, engine, { status: runQueueStatus.blocked || "blocked" });
      }
    }
    run.ts = Date.now();
    return { openedCount, blockedCount };
  };

  const hydrateRunTargets = ({ run, engines = [], url = "", reverseSearchUrl = () => "", updateRunQueueStatus: updateStatus, openLens = true, runQueueStatus = {} } = {}) => {
    run.url = url;
    run.targets = Object.fromEntries(engines.map((engine) => [engine, reverseSearchUrl(engine, url)]));
    for (const engine of engines) {
      updateStatus?.(run, engine, {
        status: engine === "lens" && openLens ? runQueueStatus.ready || "ready" : runQueueStatus.prepared || "prepared",
        detail: engine === "lens" && openLens ? "Wait tab can now open the provider target" : "Engine target prepared for manual intake",
      });
    }
    return run;
  };

  const prepareLaunchpadRun = async ({
    engines = [],
    openLens = true,
    mode = "launchpad",
    labelPrefix = "Launchpad",
    createRun = createEngineRunRecord,
    openWaitJob = () => ({ jobId: "", opened: false }),
    updateRunQueueStatus: updateStatus,
    persistRun = () => {},
    ensurePublicUrl = async () => "",
    reverseSearchUrl = () => "",
    publishWaitState = () => {},
    runQueueStatus = {},
    getArtifact = () => "original",
  } = {}) => {
    const run = createRun({ engines, mode, reverseSearchUrl, runQueueStatus, artifact: getArtifact() });
    let waitJob = null;
    if (openLens && engines.includes("lens")) {
      waitJob = openWaitJob("lens", `${labelPrefix} · Lens`);
      updateStatus?.(run, "lens", {
        job_id: waitJob.jobId,
        attempts: 1,
        status: waitJob.opened ? runQueueStatus.uploading || "uploading" : runQueueStatus.blocked || "blocked",
        detail: waitJob.opened ? "Lens wait tab is awaiting upload handoff" : "Lens wait tab was blocked before handoff",
      });
      if (!waitJob.opened) run.blocked.lens = true;
    }
    persistRun(run);
    const url = await ensurePublicUrl({ purpose: "lens" });
    run.artifact = getArtifact();
    hydrateRunTargets({ run, engines, url, reverseSearchUrl, updateRunQueueStatus: updateStatus, openLens, runQueueStatus });
    if (waitJob?.jobId && waitJob.opened) publishWaitState(waitJob.jobId, { url });
    persistRun(run);
    return run;
  };

  const prepareEngineSwarm = async ({
    engines = [],
    labelPrefix = "Swarm",
    createRun = createEngineRunRecord,
    openWaitJob = () => ({ jobId: "", opened: false }),
    updateRunQueueStatus: updateStatus,
    persistRun = () => {},
    ensurePublicUrl = async () => "",
    reverseSearchUrl = () => "",
    publishWaitState = () => {},
    runQueueStatus = {},
    getArtifact = () => "original",
    sleep = async () => {},
    delayMs = 0,
    engineLabel = {},
  } = {}) => {
    const run = createRun({ engines, mode: "swarm", reverseSearchUrl, runQueueStatus, artifact: getArtifact() });
    for (const engine of engines) {
      const wait = openWaitJob(engine, `${labelPrefix} · ${engineLabel[engine] || engine}`, { initialStatus: runQueueStatus.queued || "queued" });
      updateStatus?.(run, engine, {
        job_id: wait.jobId,
        attempts: 1,
        status: wait.opened ? runQueueStatus.queued || "queued" : runQueueStatus.blocked || "blocked",
        detail: wait.opened ? "Wait tab queued for upload handoff" : "Wait tab blocked before upload handoff",
      });
      if (!wait.opened) run.blocked[engine] = true;
    }
    persistRun(run);
    const url = await ensurePublicUrl({ purpose: "lens" });
    run.artifact = getArtifact();
    run.url = url;
    run.targets = Object.fromEntries(engines.map((engine) => [engine, reverseSearchUrl(engine, url)]));
    for (let index = 0; index < engines.length; index += 1) {
      const engine = engines[index];
      const jobId = run.queue?.[engine]?.job_id || "";
      updateStatus?.(run, engine, { status: runQueueStatus.ready || "ready", detail: `Provider target staged (${index + 1}/${engines.length})` });
      if (jobId && !run.blocked?.[engine]) publishWaitState(jobId, { url });
      persistRun(run);
      if (index < engines.length - 1 && delayMs > 0) await sleep(delayMs);
    }
    return run;
  };

  const api = {
    getRunEngines,
    updateRunQueueStatus,
    createEngineRunRecord,
    openTargetsForRun,
    prepareLaunchpadRun,
    prepareEngineSwarm,
  };

  try {
    if (typeof window !== "undefined") window.BLUELENS_LAUNCHPAD = api;
  } catch {
    // ignore
  }

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch {
    // ignore
  }
})();
