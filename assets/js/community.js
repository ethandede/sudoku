// Anonymous community stats. Classic script, loaded on the game page only.
// The random id lives in localStorage (sudoku-anon-id), never in a cookie.
// Personal stats stay in sudoku-stats and are not read or written here.
// Puzzle keys match functions/stats-core.mjs: SHA-256 of the seed, or of the
// 81 givens joined with no separator when there is no seed.
(function () {
  const ID_KEY = "sudoku-anon-id";
  const QUEUE_KEY = "sudoku-anon-queue";
  const OPEN_KEY = "sudoku-anon-open";
  const SETTINGS_KEY = "sudoku-settings";
  const HEX_32 = /^[a-f0-9]{32}$/;
  const LEVEL_LABELS = {
    daily: "Daily",
    quick: "Quick",
    easy: "Easy",
    "not easy": "Not Easy",
    hard: "Hard",
    expert: "Expert",
    mental: "Mental",
  };

  let consentPromise = null;
  let summaryCache = null;
  let summaryAt = 0;
  let flushing = null;
  let startGate = Promise.resolve();

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  }

  function setting(name, fallback) {
    const stored = readJson(SETTINGS_KEY);
    if (stored && typeof stored[name] === "boolean") return stored[name];
    return fallback;
  }

  function sharingOn() {
    return setting("shareStats", true);
  }

  function showLineOn() {
    return setting("showCommunityStats", true);
  }

  function readQueue() {
    const queue = readJson(QUEUE_KEY);
    return Array.isArray(queue) ? queue : [];
  }

  function writeQueue(queue) {
    writeJson(QUEUE_KEY, queue.slice(-30));
  }

  function readOpen() {
    const open = readJson(OPEN_KEY);
    if (!open || typeof open !== "object") return null;
    return open;
  }

  function writeOpen(open) {
    writeJson(OPEN_KEY, open);
  }

  function clearOpen() {
    try {
      localStorage.removeItem(OPEN_KEY);
    } catch {
      /* private mode */
    }
  }

  function forgetSharing() {
    try {
      localStorage.removeItem(ID_KEY);
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(OPEN_KEY);
    } catch {
      /* private mode */
    }
  }

  function randomHex(bytes) {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return [...buffer].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(text) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function puzzleKey(seed, givens) {
    const material = typeof seed === "string" && seed.length > 0 ? seed : (givens || []).join("");
    return sha256Hex(material);
  }

  function deviceClass() {
    const width = document.documentElement.clientWidth || (window.visualViewport && window.visualViewport.width) || 0;
    if (width > 0 && width < 768) return "phone";
    if (width >= 768 && width < 1024) return "tablet";
    return "desktop";
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function hasId() {
    try {
      return HEX_32.test(localStorage.getItem(ID_KEY) || "");
    } catch {
      return false;
    }
  }

  function analyticsGranted() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(false), 2500);
      try {
        if (typeof window.gtag !== "function") {
          window.clearTimeout(timer);
          finish(false);
          return;
        }
        window.gtag("get", "G-TFNKPH6DNY", "analytics_storage", (value) => {
          window.clearTimeout(timer);
          finish(value === "granted");
        });
      } catch {
        window.clearTimeout(timer);
        finish(false);
      }
    });
  }

  async function loadConsent() {
    try {
      const response = await fetch("/api/stats/consent", {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return { required: true, granted: false, checked: false };
      const data = await response.json();
      if (!data.consentRequired) return { required: false, granted: true, checked: true };
      const granted = await analyticsGranted();
      return { required: true, granted, checked: true };
    } catch {
      return { required: true, granted: hasId(), checked: false };
    }
  }

  function ensureConsent() {
    if (!consentPromise) consentPromise = loadConsent();
    return consentPromise;
  }

  async function clientId() {
    if (!sharingOn()) return null;
    if (!window.crypto || !crypto.getRandomValues || !crypto.subtle) return null;
    const consent = await ensureConsent();
    if (consent.required && !consent.granted) {
      if (consent.checked) forgetSharing();
      return null;
    }
    try {
      const existing = localStorage.getItem(ID_KEY) || "";
      if (HEX_32.test(existing)) return existing;
      if (consent.required && !consent.checked) return null;
      const created = randomHex(16);
      localStorage.setItem(ID_KEY, created);
      return created;
    } catch {
      return null;
    }
  }

  function enqueue(path, body) {
    const queue = readQueue();
    queue.push({ path, body, attempts: 0 });
    writeQueue(queue);
  }

  function finishPayload(open, outcome) {
    let client = null;
    try {
      client = localStorage.getItem(ID_KEY);
    } catch {
      client = null;
    }
    return {
      clientId: client,
      playId: open.playId,
      puzzleKey: open.puzzleKey,
      outcome,
      elapsedSeconds: Math.max(0, Math.round(open.elapsed || 0)),
      mistakes: Math.max(0, Math.min(12, Math.round(open.mistakes || 0))),
      hintsUsed: Math.max(0, Math.min(80, Math.round(open.hintsUsed || 0))),
      hardestHint: open.hintsUsed ? open.hardestHint || "" : "",
      notesUsed: Boolean(open.notesUsed),
      deviceClass: deviceClass(),
    };
  }

  function automatedClient() {
    try {
      if (navigator.webdriver) return true;
      return /HeadlessChrome/i.test(navigator.userAgent || "");
    } catch {
      return false;
    }
  }

  function trackGame(name, params) {
    if (automatedClient() || typeof window.gtag !== "function") return;
    const fields = params || {};
    window.gtag("event", name, fields);
  }

  function trackGameNow(name, params) {
    if (automatedClient() || typeof window.gtag !== "function") return;
    const fields = {};
    Object.keys(params || {}).forEach((key) => {
      fields[key] = params[key];
    });
    fields.transport_type = "beacon";
    window.gtag("event", name, fields);
  }

  // Consent Mode is already set before gtag loads: denied in the EEA, the
  // UK, and Switzerland until the prompt, granted elsewhere. Calling gtag
  // here does not bypass that. The anon-id gate stays separate.
  function analyticsFields(open, info) {
    const isDaily = info && typeof info.isDaily === "boolean" ? info.isDaily : Boolean(open && open.isDaily);
    let level = open && open.level;
    if (info && info.kind && info.kind !== "daily") level = info.kind;
    if (!level) level = isDaily ? "not easy" : "easy";
    return {
      level,
      is_daily: isDaily,
      elapsed_seconds: Math.max(0, Math.round((info && info.elapsed) || (open && open.elapsed) || 0)),
      mistakes: Math.max(0, Math.round((info && info.mistakes) || (open && open.mistakes) || 0)),
      hints_used: Math.max(0, Math.round((info && info.hintsUsed) || (open && open.hintsUsed) || 0)),
    };
  }

  function wasLogged(open) {
    if (!open) return false;
    if (open.logged === true || open.logging === true) return true;
    if (open.logged === false) return false;
    return Boolean(open.playId);
  }

  function queueFinish(open, outcome) {
    if (!open || !wasLogged(open) || !sharingOn() || !hasId()) return;
    const previous = open.finishOutcome || null;
    if (previous === outcome) return;
    if (previous && previous !== "abandoned") return;
    enqueue("/api/stats/finish", finishPayload(open, outcome));
    open.finishOutcome = outcome;
    open.done = outcome !== "abandoned";
    writeOpen(open);
  }

  function closePrevious() {
    const open = readOpen();
    if (!open) return;
    if (!open.done && !open.gaEnd && open.gaStart && !open.over) {
      trackGame("game_abandon", analyticsFields(open));
      open.gaEnd = "abandon";
    }
    if (!open.done) queueFinish(open, open.over ? "failed" : "abandoned");
    clearOpen();
    void flush();
  }

  async function flush() {
    if (flushing) return flushing;
    flushing = flushNow().finally(() => {
      flushing = null;
    });
    return flushing;
  }

  async function flushNow() {
    const queue = readQueue();
    let finish = null;
    let startPlayId = null;
    let startDropped = false;
    while (queue.length) {
      const item = queue[0];
      let response;
      try {
        response = await fetch(item.path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(item.body),
          keepalive: true,
        });
      } catch {
        writeQueue(queue);
        return { offline: true, finish, startPlayId, startDropped };
      }
      if (response.status === 400 || response.status === 429 || response.status === 404) {
        if (item.path.indexOf("/start") !== -1) startDropped = true;
        queue.shift();
        continue;
      }
      if (!response.ok) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 5) queue.shift();
        writeQueue(queue);
        return { offline: true, finish, startPlayId, startDropped };
      }
      const parsed = await response.json().catch(() => ({ ok: true }));
      queue.shift();
      if (item.path.indexOf("/start") !== -1) {
        startDropped = false;
        startPlayId = parsed.playId || item.body.playId;
      }
      if (item.path.indexOf("/finish") !== -1) finish = parsed;
    }
    writeQueue(queue);
    return { offline: false, finish, startPlayId, startDropped };
  }

  function beaconQueue() {
    const queue = readQueue();
    if (!queue.length || typeof navigator.sendBeacon !== "function") return;
    const item = queue[0];
    const blob = new Blob([JSON.stringify(item.body)], { type: "application/json" });
    if (navigator.sendBeacon(item.path, blob)) {
      queue.shift();
      writeQueue(queue);
    }
  }

  function bucketFor(summary, kind) {
    if (!summary || !summary.windows || !summary.windows["30d"]) return null;
    const windowed = summary.windows["30d"];
    if (kind === "daily") return windowed.daily;
    return windowed.levels ? windowed.levels[kind] : null;
  }

  function lineText(summary, kind) {
    const bucket = bucketFor(summary, kind);
    if (!bucket || bucket.suppressed || bucket.medianSeconds == null) return "";
    return `Median ${formatClock(bucket.medianSeconds)} · ${bucket.solvePct}% solve`;
  }

  function paintLine(kind) {
    const line = document.getElementById("community-line");
    if (!line) return;
    if (!showLineOn()) {
      line.hidden = true;
      line.textContent = "";
      return;
    }
    const text = lineText(summaryCache, kind);
    line.hidden = !text;
    line.textContent = text;
  }

  async function refreshSummary() {
    if (summaryCache && Date.now() - summaryAt < 9 * 60 * 1000) return summaryCache;
    try {
      const response = await fetch("/api/stats/summary");
      if (!response.ok) return summaryCache;
      summaryCache = await response.json();
      summaryAt = Date.now();
      return summaryCache;
    } catch {
      return summaryCache;
    }
  }

  function levelLabel(kind) {
    return LEVEL_LABELS[kind] || "this level";
  }

  function paintSolvedElement(text) {
    const line = document.getElementById("solved-community");
    if (!line) return;
    if (!text) {
      line.hidden = true;
      line.textContent = "";
      return;
    }
    line.hidden = false;
    line.textContent = text;
  }

  function solvedSentence(view) {
    const parts = [];
    if (view.beatPct != null && view.medianSeconds != null) {
      parts.push(
        `You beat ${view.beatPct}% of solvers on ${view.levelLabel}. Median ${formatClock(view.medianSeconds)}.`
      );
    } else if (view.medianSeconds != null) {
      parts.push(`Median ${formatClock(view.medianSeconds)} on ${view.levelLabel}.`);
    }
    if (view.today) {
      if (view.today.suppressed || view.today.medianSeconds == null) {
        parts.push("Today's solve rate: not enough data yet.");
      } else {
        parts.push(
          `Today's daily: ${view.today.solvePct}% solved · median ${formatClock(view.today.medianSeconds)}.`
        );
      }
    }
    return parts.join(" ");
  }

  function viewFrom(kind, isDaily, finish, summary) {
    const bucket = bucketFor(summary, kind);
    const community = finish && finish.community;
    const todaySource = isDaily ? (finish && finish.today) || (summary && summary.today && summary.today.daily) : null;
    return {
      levelLabel: levelLabel(kind),
      beatPct: community && community.beatPct != null ? community.beatPct : null,
      medianSeconds:
        community && community.medianSeconds != null
          ? community.medianSeconds
          : bucket && !bucket.suppressed
            ? bucket.medianSeconds
            : null,
      today: todaySource,
    };
  }

  function reconcile(saved) {
    const open = readOpen();
    if (!open || open.done) return;
    if (saved && saved.anonPlayId && saved.anonPlayId === open.playId) {
      if (typeof saved.elapsed === "number") open.elapsed = Math.round(saved.elapsed);
      open.over = Boolean(saved.over);
      open.notesUsed = Boolean(saved.notesUsed || saved.auto);
      open.mistakes = saved.mistakes || 0;
      writeOpen(open);
      return;
    }
    closePrevious();
  }

  async function boot() {
    const consent = await ensureConsent();
    if (consent.required && consent.checked && !consent.granted) forgetSharing();
    await flush();
    await refreshSummary();
  }

  async function openGame(info) {
    closePrevious();
    if (automatedClient()) return null;
    const key = await puzzleKey(info.seed, info.givens);
    const playId = randomHex(16);
    writeOpen({
      playId,
      puzzleKey: key,
      level: info.level,
      isDaily: Boolean(info.isDaily),
      date: info.isDaily ? info.date : null,
      elapsed: 0,
      over: false,
      mistakes: 0,
      hintsUsed: 0,
      hardestHint: "",
      notesUsed: Boolean(info.notesUsed),
      done: false,
      logged: false,
      logging: false,
      dropped: false,
      gaStart: false,
      gaEnd: null,
    });
    return playId;
  }

  function onNewGame(info) {
    const run = startGate.then(() => openGame(info));
    startGate = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  async function beginLogging(info) {
    if (automatedClient()) return null;
    const open = readOpen();
    if (!open || open.done) return null;
    if (info) noteProgress(info);
    const current = readOpen();
    if (!current || current.done) return null;
    if (!current.gaStart) {
      current.gaStart = true;
      writeOpen(current);
      trackGame("game_start", { level: current.level, is_daily: Boolean(current.isDaily) });
    }
    if (current.logged || current.logging || current.dropped) return current.logged ? current.playId : null;
    // Sessions saved before starts moved to the first move already have a row.
    if (current.logged == null && current.playId) {
      current.logged = true;
      writeOpen(current);
      return current.playId;
    }
    const id = await clientId();
    const again = readOpen();
    if (!again || again.playId !== current.playId || again.done) return null;
    if (!id) return null;
    again.logging = true;
    writeOpen(again);
    enqueue("/api/stats/start", {
      clientId: id,
      playId: again.playId,
      puzzleKey: again.puzzleKey,
      level: again.level,
      isDaily: Boolean(again.isDaily),
      date: again.isDaily ? again.date : null,
    });
    const flushed = await flush();
    const saved = readOpen();
    if (!saved || saved.playId !== again.playId) return flushed.startPlayId || null;
    saved.logging = false;
    if (flushed.startDropped) {
      saved.dropped = true;
      saved.logged = false;
      writeOpen(saved);
      return null;
    }
    saved.logged = true;
    writeOpen(saved);
    return saved.playId;
  }

  function noteFirstMove(info) {
    const run = startGate.then(() => beginLogging(info));
    startGate = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  function leave(info, event) {
    if (event && event.persisted) {
      beaconQueue();
      return;
    }
    if (info) noteProgress(info);
    const open = readOpen();
    if (!open || open.done || open.gaEnd || !open.gaStart) {
      beaconQueue();
      return;
    }
    if (open.over || (info && info.outcome === "failed")) {
      queueFinish(open, "failed");
      beaconQueue();
      return;
    }
    trackGameNow("game_abandon", analyticsFields(open, info));
    open.gaEnd = "abandon";
    writeOpen(open);
    queueFinish(open, "abandoned");
    beaconQueue();
  }

  function noteProgress(partial) {
    const open = readOpen();
    if (!open || open.done) return;
    if (typeof partial.elapsed === "number") open.elapsed = Math.round(partial.elapsed);
    if (typeof partial.over === "boolean") open.over = partial.over;
    if (typeof partial.mistakes === "number") open.mistakes = partial.mistakes;
    if (typeof partial.hintsUsed === "number") open.hintsUsed = partial.hintsUsed;
    if (typeof partial.hardestHint === "string") open.hardestHint = partial.hardestHint;
    if (typeof partial.notesUsed === "boolean") open.notesUsed = partial.notesUsed;
    writeOpen(open);
  }

  async function commitFinish(info) {
    const open = readOpen();
    if (open && info) noteProgress(info);
    const current = readOpen();
    if (info && info.outcome === "solved" && current && current.gaStart && current.gaEnd !== "complete") {
      trackGame("game_complete", analyticsFields(current, info));
      current.gaEnd = "complete";
    } else if (current && !current.gaEnd) {
      current.gaEnd = "closed";
    }
    if (!current) return;
    if (info && typeof info.elapsed === "number") current.elapsed = Math.round(info.elapsed);
    if (info && typeof info.mistakes === "number") current.mistakes = info.mistakes;
    if (info && typeof info.hintsUsed === "number") current.hintsUsed = info.hintsUsed;
    if (info && typeof info.hardestHint === "string") current.hardestHint = info.hardestHint;
    if (info && typeof info.notesUsed === "boolean") current.notesUsed = info.notesUsed;
    writeOpen(current);
    queueFinish(current, info.outcome);
  }

  function rememberFinish(info) {
    const run = startGate.then(() => commitFinish(info));
    startGate = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  async function completeFinish(info) {
    const flushed = await flush();
    const summary = await refreshSummary();
    const view = viewFrom(info.kind, info.isDaily, flushed.finish, summary);
    paintSolvedElement(solvedSentence(view));
    return view;
  }

  async function paintPublicSolved(info) {
    const summary = await refreshSummary();
    const view = viewFrom(info.kind, info.isDaily, null, summary);
    paintSolvedElement(solvedSentence(view));
  }

  function setSharing(on) {
    if (!on) forgetSharing();
    consentPromise = null;
  }

  window.addEventListener("pagehide", beaconQueue);
  window.addEventListener("online", () => {
    flush();
  });

  window.SudokuCommunity = {
    boot,
    reconcile,
    onNewGame,
    noteFirstMove,
    leave,
    noteProgress,
    rememberFinish,
    completeFinish,
    paintPublicSolved,
    paintLine,
    setSharing,
    refreshSummary,
  };
})();
