// Site navigation (every page) and the Sudoku game (home page only).
(function () {
  const MISTAKE_LIMIT = 4;
  const ORDER = ["quick", "easy", "not easy", "hard", "expert", "mental"];
  const DAILY = "not easy";
  const LABELS = {
    daily: "Daily",
    quick: "Quick",
    easy: "Easy",
    "not easy": "Not Easy",
    hard: "Hard",
    expert: "Expert",
    mental: "Mental",
  };
  const SETTINGS_KEY = "sudoku-settings";
  const SAVE_KEY = "sudoku-progress";
  const DONE_KEY = "sudoku-completed";
  const STATS_KEY = "sudoku-stats";

  function initNavigation() {
    const mobileToggle = document.querySelector(".mobile-menu-toggle");
    const navMenu = document.querySelector(".nav-menu");
    const dropdownToggles = document.querySelectorAll(".has-dropdown");

    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener("click", () => {
        mobileToggle.classList.toggle("active");
        navMenu.classList.toggle("active");
      });
    }

    dropdownToggles.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".dropdown-toggle");
      if (toggle && window.innerWidth <= 768) {
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          dropdown.classList.toggle("active");
        });
      }
    });
  }

  function requestPersistentStorage() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === "function") {
        navigator.storage.persist();
      }
    } catch {
      /* the browser declined or has no storage manager */
    }
  }

  function savedTheme() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return stored.theme || "system";
    } catch {
      return "system";
    }
  }

  const THEME_COLORS = { light: "#f4f6f8", dark: "#121416" };

  function applyDocumentTheme(theme) {
    const dark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    document.documentElement.classList.toggle("is-standalone", standalone);
    const chosen = theme === "light" || theme === "dark";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute("media") || "";
      if (chosen) {
        meta.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
        return;
      }
      meta.setAttribute("content", media.includes("dark") ? THEME_COLORS.dark : THEME_COLORS.light);
    });
  }

  function initAppShell() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });
    }).catch(() => {
      /* private mode or insecure origin */
    });
  }

  applyDocumentTheme(savedTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    applyDocumentTheme(savedTheme());
  });

  requestPersistentStorage();
  initNavigation();
  initAppShell();

  const grid = document.getElementById("sudoku-grid");
  if (!grid || !window.SudokuGenerator) return;

  const INSTALL_KEY = "sudoku-install-dismissed";
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!handheld()) return;
    event.preventDefault();
    deferredInstall = event;
  });
  window.addEventListener("appinstalled", () => dismissInstall());

  const timerEl = document.getElementById("timer");
  const pauseBtn = document.getElementById("pause-btn");
  const labelEl = document.getElementById("puzzle-label");
  const mistakeEl = document.getElementById("mistake-counter");
  const boardWrap = document.getElementById("board-wrap");
  const cover = document.getElementById("board-cover");
  const coverText = document.getElementById("board-cover-text");
  const live = document.getElementById("live-region");
  const undoBtn = document.getElementById("undo-btn");
  const autoBox = document.getElementById("auto-candidates");
  const pad = document.getElementById("number-pad");
  const moreMenu = document.getElementById("more-menu");
  const moreBtn = document.getElementById("more-btn");

  const defaultSettings = {
    theme: "system",
    checkGuesses: true,
    showTimer: true,
    showMistakes: true,
    autoCandidates: false,
    highlightRowCol: true,
    highlightBox: true,
    highlightSame: true,
    highlightConflicts: true,
    showBoxMap: true,
    haptics: true,
    shareStats: true,
    showCommunityStats: true,
  };

  let statsBlocked = false;
  let settingsBlocked = false;
  let progressBlocked = false;
  let settingsQuiet = false;
  let statsQuiet = false;
  let settings = loadSettings();
  let stats = loadStats();
  if (window.SudokuProgress) {
    const caught = window.SudokuProgress.prepare(stats);
    if (caught.unlocked.length) window.SudokuProgress.celebrate(caught.unlocked);
  }
  let cells = [];
  let state = blankState();
  let lastTick = performance.now();
  let lastSavedSecond = -1;
  let saveTimer = 0;
  let announceTimer = 0;
  let pendingRequest = null;
  let offeredSave = null;
  let generation = 0;
  let busy = false;
  let hintView = null;
  // Fill highlights stay until the player acts. No dismiss timer.
  let fillReview = null;
  let fillFadeTimer = 0;
  let pendingSolved = null;
  const GHOST_DELAY = 320;
  let hoverSpot = null;
  let ghostTimer = 0;
  let spotPress = null;

  applyTheme();
  buildGrid();
  buildPad();
  bindControls();
  syncSettingsForm();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  setInterval(tick, 250);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", (event) => {
    if (window.SudokuCommunity && state.puzzle.some((value) => value !== 0)) {
      window.SudokuCommunity.leave(communitySnapshot(state.over ? "failed" : "abandoned"), event);
    }
    if (window.SudokuAccount) window.SudokuAccount.flush();
  });
  if (window.SudokuAccount) {
    window.SudokuAccount.attach({
      snapshot: accountSnapshot,
      apply: applyAccountBundle,
    });
  }
  void startGame();

  function blankState() {
    return {
      kind: "easy",
      dailyDate: null,
      puzzle: Array(81).fill(0),
      solution: Array(81).fill(0),
      board: Array(81).fill(0),
      notes: emptyNotes(),
      mistakes: 0,
      slashed: new Set(),
      undo: [],
      selected: 0,
      mode: "normal",
      elapsed: 0,
      running: false,
      userPaused: false,
      hidePaused: false,
      over: false,
      puzzleId: null,
      won: false,
      revealed: false,
      scored: false,
      counted: false,
      auto: false,
      metadata: null,
      removed: [],
      hintSlugs: [],
      checks: 0,
      train: null,
      practice: null,
      practiceMiss: false,
      practiceFilled: false,
      fastForwarded: false,
      replaySolved: false,
      baseRemoved: [],
      anonPlayId: null,
      notesUsed: false,
      gameplayMarked: false,
    };
  }

  function emptyNotes() {
    return Array.from({ length: 81 }, () => new Set());
  }

  function loadSettings() {
    let raw = null;
    try {
      raw = localStorage.getItem(SETTINGS_KEY);
    } catch {
      settingsBlocked = true;
      return { ...defaultSettings };
    }
    if (raw == null) return { ...defaultSettings };
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      settingsBlocked = true;
      return { ...defaultSettings };
    }
    const migrated = window.SudokuAccountMerge
      ? window.SudokuAccountMerge.migrateSettings(stored)
      : { ok: true, settings: stored, changed: false };
    if (!migrated.ok) {
      settingsBlocked = true;
      return { ...defaultSettings };
    }
    if (migrated.changed) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated.settings));
      } catch {
        /* private mode */
      }
    }
    return { ...defaultSettings, ...migrated.settings };
  }

  function saveSettings(options) {
    if (settingsBlocked) return;
    if (!options || !options.keepStamp) settings.updatedAt = Date.now();
    settings.version = 1;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
    if (!settingsQuiet && (!options || !options.quiet)) noteAccount();
  }

  function freshStats() {
    const bucket = () => ({ played: 0, won: 0, best: null, totalTime: 0 });
    const next = { version: 1, daily: { ...bucket(), completed: {}, longestStreak: 0 } };
    ORDER.forEach((id) => {
      next[id] = bucket();
    });
    return next;
  }

  function loadStats() {
    let raw = null;
    try {
      raw = localStorage.getItem(STATS_KEY);
    } catch {
      statsBlocked = true;
      return freshStats();
    }
    if (raw == null) return freshStats();
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      statsBlocked = true;
      return freshStats();
    }
    const migrated = window.SudokuAccountMerge
      ? window.SudokuAccountMerge.migrateStats(stored)
      : { ok: false };
    if (!migrated.ok) {
      statsBlocked = true;
      return freshStats();
    }
    if (migrated.changed) {
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(migrated.stats));
      } catch {
        /* private mode */
      }
    }
    return migrated.stats;
  }

  function saveStats(options) {
    if (statsBlocked) return;
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      /* private mode */
    }
    if (!statsQuiet && (!options || !options.quiet)) noteAccount();
  }

  function noteAccount() {
    if (window.SudokuAccount) window.SudokuAccount.noteChange();
  }

  function progressStamp() {
    try {
      return Number(localStorage.getItem("sudoku-progress-at")) || 0;
    } catch {
      return 0;
    }
  }

  function accountSnapshot() {
    const bundle = { v: 1 };
    if (!statsBlocked) bundle.stats = stats;
    if (!settingsBlocked) bundle.settings = settings;
    if (window.SudokuProgress && typeof window.SudokuProgress.canSync === "function" && window.SudokuProgress.canSync()) {
      bundle.skills = window.SudokuProgress.load();
    }
    if (!progressBlocked) {
      const saved = readSave();
      if (!progressBlocked) {
        bundle.progress = saved;
        bundle.progressUpdatedAt = saved && saved.updatedAt ? saved.updatedAt : progressStamp();
      }
    }
    return bundle;
  }

  function applyAccountBundle(bundle) {
    if (!bundle || typeof bundle !== "object") return;
    if (bundle.stats && !statsBlocked && window.SudokuAccountMerge) {
      const migrated = window.SudokuAccountMerge.migrateStats(bundle.stats);
      if (migrated.ok) {
        stats = migrated.stats;
        statsQuiet = true;
        saveStats({ quiet: true });
        statsQuiet = false;
      }
    }
    if (bundle.skills && window.SudokuProgress && typeof window.SudokuProgress.replace === "function") {
      window.SudokuProgress.replace(bundle.skills);
    }
    if (bundle.settings && !settingsBlocked) {
      const migrated = window.SudokuAccountMerge
        ? window.SudokuAccountMerge.migrateSettings(bundle.settings)
        : { ok: true, settings: bundle.settings };
      if (migrated.ok) {
        settings = { ...defaultSettings, ...migrated.settings };
        settingsQuiet = true;
        saveSettings({ quiet: true, keepStamp: true });
        settingsQuiet = false;
        applyTheme();
        syncSettingsForm();
      }
    }
    if (!progressBlocked && Object.prototype.hasOwnProperty.call(bundle, "progress")) {
      const at = Number(bundle.progressUpdatedAt) || (bundle.progress && bundle.progress.updatedAt) || 0;
      const progress = bundle.progress;
      if (progress && progress.kind && !isCompletedProgress(progress)) {
        storeSlot(progress.kind, progress, at);
      } else if (!progress && at > progressStamp()) {
        try {
          localStorage.removeItem(SAVE_KEY);
          localStorage.setItem("sudoku-progress-at", String(at));
        } catch {
          /* private mode */
        }
      }
    }
    render();
  }

  function difficultyLabel(kind) {
    if (kind === "daily") return "Daily";
    return LABELS[kind] || "Easy";
  }

  async function startGame() {
    pendingRequest = requestFromUrl();
    const kind = (pendingRequest && pendingRequest.kind) || "easy";
    state.kind = kind;
    labelEl.textContent = difficultyLabel(kind);
    setCover(true, "", false);
    let pulled = false;
    if (window.SudokuAccount && navigator.onLine !== false) {
      try {
        await Promise.race([
          window.SudokuAccount.pullBeforePlay(),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), 8000);
          }),
        ]);
        pulled = true;
      } catch {
        pulled = false;
      }
    }
    if (!pulled && window.SudokuAccount) {
      window.SudokuAccount.invalidate();
      window.SudokuAccount.holdProgress();
    }
    migrateLegacySave();
    if (pendingRequest && pendingRequest.unavailablePractice) {
      showPracticeUnavailable();
      return;
    }
    const practiceStart = Boolean(pendingRequest && pendingRequest.practice);
    const done = !practiceStart ? completionFor(pendingRequest) : null;
    const saved = readMatching(pendingRequest);
    if (window.SudokuCommunity) {
      window.SudokuCommunity.reconcile(saved);
      window.SudokuCommunity.boot().then(() => {
        window.SudokuCommunity.paintLine(saved && !state.counted ? saved.kind : state.kind);
      });
    }
    if (done) {
      showCompleted(done);
      return;
    }
    if (saved) showResume(saved);
    else beginNew(freshRequest(pendingRequest, kind), { count: !practiceStart });
  }

  function resumeLabel(saved) {
    if (saved.practice && window.SudokuProgress) return `Practice · ${window.SudokuProgress.nameOf(saved.practice)}`;
    if (saved.train && window.SudokuProgress) return `Train · ${window.SudokuProgress.nameOf(saved.train)}`;
    return difficultyLabel(saved.kind);
  }

  function showResume(saved) {
    offeredSave = saved;
    const label = resumeLabel(saved);
    const time = formatTime(saved.elapsed || 0);
    document.getElementById("resume-yes").textContent = `Resume ${label} (${time})`;
    document.getElementById("resume-no").textContent = `New ${label} puzzle`;
    document.getElementById("resume-detail").textContent = `${label} is in progress at ${time}.`;
    labelEl.textContent = label;
    timerEl.textContent = time;
    setCover(true, "", false);
    showModal("resume-modal");
  }

  function showCompleted(record) {
    state = blankState();
    state.kind = record.kind || "easy";
    state.dailyDate = record.dailyDate || null;
    state.puzzle = record.puzzle.slice();
    state.solution = record.solution.slice();
    state.board = record.solution.slice();
    state.puzzleId = record.puzzleId || null;
    state.elapsed = record.elapsed || 0;
    state.mistakes = record.mistakes || 0;
    state.won = true;
    state.counted = true;
    state.scored = true;
    state.replaySolved = true;
    state.auto = settings.autoCandidates;
    autoBox.checked = state.auto;
    labelEl.textContent = difficultyLabel(state.kind);
    writeUrl(state.kind);
    busy = false;
    render();
    setCover(false);
    showSolved(true);
  }

  function todayString(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function shiftDate(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function formatDay(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function streakEnding(iso) {
    let count = 0;
    let cursor = iso;
    while (stats.daily.completed[cursor]) {
      count += 1;
      cursor = shiftDate(cursor, -1);
    }
    return count;
  }

  function currentStreak() {
    const today = todayString();
    if (stats.daily.completed[today]) return streakEnding(today);
    return streakEnding(shiftDate(today, -1));
  }

  function applyTheme() {
    applyDocumentTheme(settings.theme);
  }

  function requestFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const puzzle = params.get("p");
    if (puzzle && window.SudokuShare) {
      const parsed = window.SudokuShare.parseId(puzzle);
      if (parsed) {
        return {
          kind: parsed.kind,
          puzzleId: parsed.id,
          seed: parsed.seed || null,
          givens: parsed.givens || null,
        };
      }
    }
    const practice = (params.get("practice") || "").trim().toLowerCase();
    if (practice) {
      const practiceLevel = window.SudokuGenerator && window.SudokuGenerator.trainLevel(practice);
      if (practiceLevel) return { kind: practiceLevel, practice };
      return { unavailablePractice: practice };
    }
    const train = (params.get("train") || "").trim().toLowerCase();
    const trainLevel = window.SudokuGenerator && window.SudokuGenerator.trainLevel(train);
    if (trainLevel) return { kind: trainLevel, train };
    if (params.has("daily")) return { kind: "daily" };
    const raw = params.get("difficulty");
    if (!raw) return null;
    const key = raw.trim().toLowerCase().replace(/\s+/g, "-");
    const map = {
      quick: "quick",
      easy: "easy",
      "not-easy": "not easy",
      hard: "hard",
      expert: "expert",
      mental: "mental",
    };
    return map[key] ? { kind: map[key] } : null;
  }

  function writeUrl(kind) {
    const url = new URL(window.location.href);
    if (kind === "daily") url.search = "?daily";
    else if (state.puzzleId) url.search = `?p=${encodeURIComponent(state.puzzleId)}`;
    else if (state.practice) url.search = `?practice=${encodeURIComponent(state.practice)}`;
    else if (state.train) url.search = `?train=${encodeURIComponent(state.train)}`;
    else url.search = `?difficulty=${kind.replace(/\s+/g, "-")}`;
    history.replaceState(null, "", url);
  }

  function buildGrid() {
    grid.replaceChildren();
    grid.setAttribute("aria-rowcount", "9");
    grid.setAttribute("aria-colcount", "9");
    cells = [];
    for (let row = 0; row < 9; row += 1) {
      const rowEl = document.createElement("div");
      rowEl.className = "grid-row";
      rowEl.setAttribute("role", "row");
      for (let col = 0; col < 9; col += 1) {
        const index = row * 9 + col;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cell";
        if (col === 2 || col === 5) button.classList.add("border-right");
        if (row === 2 || row === 5) button.classList.add("border-bottom");
        button.dataset.index = String(index);
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-rowindex", String(row + 1));
        button.setAttribute("aria-colindex", String(col + 1));
        button.addEventListener("click", () => select(index, false));
        rowEl.appendChild(button);
        cells.push(button);
      }
      grid.appendChild(rowEl);
    }
    bindNoteSpots();
  }

  // One faint digit on a selected empty cell, after the pointer rests on that
  // spot. Touch never ghosts. A click toggles the note only when the cell was
  // already selected, so the first tap still just selects.
  function spotFromEvent(event) {
    const mark = event.target.closest ? event.target.closest(".marks span") : null;
    if (!mark || !grid.contains(mark)) return null;
    const cell = mark.closest(".cell");
    if (!cell) return null;
    return { index: Number(cell.dataset.index), digit: Number(mark.dataset.digit) };
  }

  function clearGhostTimer() {
    if (ghostTimer) window.clearTimeout(ghostTimer);
    ghostTimer = 0;
  }

  function clearGhost() {
    clearGhostTimer();
    hoverSpot = null;
    grid.querySelectorAll(".marks span.ghost").forEach((mark) => mark.classList.remove("ghost"));
  }

  function paintGhost() {
    if (!hoverSpot) return;
    const { index, digit } = hoverSpot;
    if (index !== state.selected || state.board[index] !== 0 || state.notes[index].has(digit)) return;
    const mark = cells[index].querySelector(`.marks span[data-digit="${digit}"]`);
    if (!mark || mark.classList.contains("user-note") || mark.classList.contains("struck") || mark.classList.contains("hint-note")) return;
    mark.classList.add("ghost");
  }

  function bindNoteSpots() {
    grid.addEventListener("pointerover", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const spot = spotFromEvent(event);
      if (!spot || spot.index !== state.selected || state.board[spot.index] !== 0) {
        clearGhost();
        return;
      }
      if (hoverSpot && hoverSpot.index === spot.index && hoverSpot.digit === spot.digit) return;
      clearGhost();
      const pending = spot;
      ghostTimer = window.setTimeout(() => {
        ghostTimer = 0;
        if (state.selected !== pending.index || state.board[pending.index] !== 0) return;
        hoverSpot = pending;
        paintGhost();
      }, GHOST_DELAY);
    });
    grid.addEventListener("pointerout", (event) => {
      if (!event.target.isConnected) return;
      const spot = spotFromEvent(event);
      if (!spot) return;
      const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".marks span") : null;
      const same =
        next &&
        Number(next.closest(".cell").dataset.index) === spot.index &&
        Number(next.dataset.digit) === spot.digit;
      if (same) return;
      clearGhostTimer();
      if (hoverSpot && hoverSpot.index === spot.index && hoverSpot.digit === spot.digit) {
        hoverSpot = null;
        grid.querySelectorAll(".marks span.ghost").forEach((mark) => mark.classList.remove("ghost"));
      }
    });
    grid.addEventListener(
      "pointerdown",
      (event) => {
        const spot = spotFromEvent(event);
        if (!spot || (event.pointerType === "mouse" && event.button !== 0)) {
          spotPress = null;
          return;
        }
        spotPress = {
          index: spot.index,
          digit: spot.digit,
          wasSelected: state.selected === spot.index && state.board[spot.index] === 0,
        };
      },
      true
    );
    grid.addEventListener(
      "click",
      (event) => {
        const spot = spotFromEvent(event);
        if (!spotPress || !spot) return;
        if (spot.index !== spotPress.index || spot.digit !== spotPress.digit || !spotPress.wasSelected) return;
        spotPress = null;
        if (blocked()) return;
        event.preventDefault();
        event.stopPropagation();
        clearGhostTimer();
        toggleNote(spot.index, spot.digit);
      },
      true
    );
  }

  function buildPad() {
    pad.replaceChildren();
    for (let n = 1; n <= 9; n += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.number = String(n);
      const map = document.createElement("span");
      map.className = "box-map";
      map.setAttribute("aria-hidden", "true");
      for (let box = 0; box < 9; box += 1) {
        const segment = document.createElement("i");
        map.appendChild(segment);
      }
      const digit = document.createElement("span");
      digit.className = "pad-digit";
      const glyph = document.createElement("span");
      glyph.textContent = String(n);
      digit.appendChild(glyph);
      const left = document.createElement("span");
      left.className = "pad-left";
      left.textContent = "9";
      button.append(map, digit, left);
      button.setAttribute("aria-label", `Number ${n}`);
      button.addEventListener("click", () => onNumber(n));
      pad.appendChild(button);
    }
  }

  function closeLevelMenu() {
    const tabs = document.getElementById("difficulty-tabs");
    if (!tabs) return;
    tabs.classList.remove("is-open");
    if (labelEl) labelEl.setAttribute("aria-expanded", "false");
  }

  function bindControls() {
    document.querySelectorAll(".difficulty-tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.difficulty;
        if (window.SudokuCommunity) window.SudokuCommunity.paintLine(kind);
        closeLevelMenu();
        beginNew({ kind }, { count: true });
      });
    });
    labelEl.addEventListener("click", () => {
      const tabs = document.getElementById("difficulty-tabs");
      const open = tabs.classList.toggle("is-open");
      labelEl.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.getElementById("help-btn").addEventListener("click", () => advanceHint());
    document.getElementById("more-stats").addEventListener("click", () => {
      closeMenu();
      openStats();
    });
    buildTechniquePickers();
    document.getElementById("more-fill").addEventListener("click", () => {
      closeMenu();
      showModal("fill-modal");
    });
    document.getElementById("more-practice").addEventListener("click", () => {
      closeMenu();
      showModal("practice-modal");
    });
    document.getElementById("mode-normal").addEventListener("click", () => setMode("normal"));
    document.getElementById("mode-notes").addEventListener("click", () => setMode("notes"));
    document.getElementById("erase-btn").addEventListener("click", () => erase(state.selected));
    document.getElementById("hint-btn").addEventListener("click", () => advanceHint());
    document.getElementById("hint-next").addEventListener("click", () => advanceHint());
    document.getElementById("hint-fill").addEventListener("click", () => {
      const slug = hintView && hintView.step && hintView.step.slug;
      if (slug) fillTechnique(slug);
    });
    document.getElementById("hint-dismiss").addEventListener("click", () => dismissHint());
    document.getElementById("share-text").addEventListener("click", () => {
      void onShareText();
    });
    document.getElementById("share-image").addEventListener("click", () => {
      void onShareImage();
    });
    document.getElementById("install-dismiss").addEventListener("click", () => dismissInstall());
    document.getElementById("install-go").addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      dismissInstall();
    });
    bindHintSwipe();
    undoBtn.addEventListener("click", undo);
    const fillUndo = document.getElementById("fill-undo");
    const fillDone = document.getElementById("fill-done");
    if (fillUndo) fillUndo.addEventListener("click", undo);
    if (fillDone) {
      fillDone.addEventListener("click", () => {
        dismissFillReview();
        render();
      });
    }
    pauseBtn.addEventListener("click", () => {
      if (state.running) pause(true);
      else if (!state.won && !state.over) resume();
    });
    document.getElementById("resume-btn").addEventListener("click", resume);
    autoBox.addEventListener("change", () => {
      state.auto = autoBox.checked;
      settings.autoCandidates = state.auto;
      saveSettings();
      if (state.auto) state.notesUsed = true;
      render();
      writeSave();
    });
    moreBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = moreMenu.hasAttribute("hidden");
      moreMenu.toggleAttribute("hidden", !open);
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    moreMenu.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      closeMenu();
      runAction(action);
    });
    document.addEventListener("click", (event) => {
      if (!moreMenu.contains(event.target) && event.target !== moreBtn && !moreBtn.contains(event.target)) closeMenu();
      const tabs = document.getElementById("difficulty-tabs");
      if (!tabs || !tabs.classList.contains("is-open")) return;
      if (tabs.contains(event.target) || event.target === labelEl || labelEl.contains(event.target)) return;
      closeLevelMenu();
    });
    document.getElementById("stats-btn").addEventListener("click", openStats);
    document.getElementById("settings-btn").addEventListener("click", () => {
      syncSettingsForm();
      showModal("settings-modal");
    });
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => hideModal(button.dataset.close));
    });
    document.querySelectorAll("#settings-modal input").forEach((input) => {
      input.addEventListener("change", onSettingChange);
    });
    document.getElementById("resume-modal").addEventListener("cancel", (event) => {
      event.preventDefault();
    });
    document.getElementById("resume-yes").addEventListener("click", () => {
      hideModal("resume-modal");
      const kind = (pendingRequest && pendingRequest.kind) || state.kind || "easy";
      const savedGame = offeredSave && saveMatches(offeredSave, pendingRequest) ? offeredSave : readMatching(pendingRequest);
      if (savedGame && inProgress(savedGame)) restoreSave(savedGame);
      else beginNew(freshRequest(pendingRequest, kind), { count: true });
    });
    document.getElementById("resume-no").addEventListener("click", () => {
      hideModal("resume-modal");
      const kind = (pendingRequest && pendingRequest.kind) || state.kind || "easy";
      clearSlot(offeredSave || { kind });
      beginNew(freshRequest(pendingRequest, kind), { count: true });
    });
    document.getElementById("solved-new").addEventListener("click", () => {
      hideModal("solved-modal");
      if (state.practice) beginNew({ kind: state.kind, practice: state.practice }, { count: false });
      else beginNew({ kind: state.kind }, { count: true });
    });
    document.getElementById("solved-next").addEventListener("click", () => {
      hideModal("solved-modal");
      beginNew({ kind: nextKind(state.kind) }, { count: true });
    });
    document.getElementById("over-undo").addEventListener("click", () => {
      hideModal("over-modal");
      undo();
    });
    document.getElementById("over-new").addEventListener("click", () => {
      hideModal("over-modal");
      if (state.practice) beginNew({ kind: state.kind, practice: state.practice }, { count: false });
      else beginNew({ kind: state.kind }, { count: true });
    });
    document.addEventListener("keydown", onKey);
  }

  function onSettingChange(event) {
    const input = event.target;
    if (input.name === "theme") settings.theme = input.value;
    else if (input.dataset.setting) settings[input.dataset.setting] = input.checked;
    saveSettings();
    if (input.dataset.setting === "shareStats" && window.SudokuCommunity) {
      window.SudokuCommunity.setSharing(input.checked);
      if (!input.checked) state.anonPlayId = null;
    }
    if (input.dataset.setting === "showCommunityStats" && window.SudokuCommunity) {
      window.SudokuCommunity.paintLine(state.kind);
    }
    applyTheme();
    if (input.dataset.setting === "autoCandidates" && !state.won) {
      state.auto = settings.autoCandidates;
      autoBox.checked = state.auto;
      writeSave();
    }
    render();
    announce("Settings updated");
  }

  function syncSettingsForm() {
    document.querySelectorAll("#settings-modal input[name=theme]").forEach((input) => {
      input.checked = input.value === settings.theme;
    });
    document.querySelectorAll("#settings-modal [data-setting]").forEach((input) => {
      input.checked = Boolean(settings[input.dataset.setting]);
    });
  }

  function syncNotesFromStep(step) {
    const clears =
      window.SudokuHintApply && window.SudokuHintApply.noteClears
        ? window.SudokuHintApply.noteClears(step)
        : step.eliminate || [];
    clears.forEach((item) => {
      if (state.notes[item.index]) state.notes[item.index].delete(item.digit);
    });
    if (!step.place || (step.slug !== "naked-single" && step.slug !== "hidden-single")) return;
    const index = step.place.index;
    const digit = step.place.digit;
    if (state.notes[index]) state.notes[index].clear();
    state.slashed.delete(index);
    peerIndexes(index).forEach((other) => state.notes[other].delete(digit));
  }

  function lockPlaced() {
    for (let index = 0; index < 81; index += 1) {
      if (state.board[index] !== 0) state.puzzle[index] = state.board[index];
    }
  }

  function preparePractice() {
    state.practiceNote = "";
    const slug = state.practice;
    if (!slug || !window.SudokuPractice || !window.SudokuSolver || !window.SudokuSolver.explain) return;
    const name = window.SudokuProgress ? window.SudokuProgress.nameOf(slug) : slug;
    const path = (state.metadata && state.metadata.path) || [];
    const approximate = Boolean(state.metadata && state.metadata.trainApproximate);
    if (approximate || !path.includes(slug)) {
      state.practiceMiss = true;
      state.practiceNote = `No puzzle lined up on ${name}. This one stays off your records.`;
      return;
    }
    const originalBoard = state.board.slice();
    const originalRemoved = state.removed.map((item) => ({ index: item.index, digit: item.digit }));
    pushUndo();
    const jumped = window.SudokuPractice.fastForward(
      state.board,
      state.removed,
      slug,
      (board, removed) => window.SudokuSolver.explain(board, removed),
      state.solution,
      syncNotesFromStep
    );
    if (!jumped.ready) {
      state.undo.pop();
      state.board = originalBoard;
      state.removed = originalRemoved;
      state.notes = emptyNotes();
      state.practiceMiss = true;
      state.practiceNote = `No puzzle lined up on ${name}. This one stays off your records.`;
      return;
    }
    lockPlaced();
    state.fastForwarded = true;
    if (window.SudokuPractice.wantsCandidates(slug)) state.auto = true;
    state.practiceNote = window.SudokuPractice.promptFor(name);
    if (jumped.touches && jumped.touches.length) showFillReview(jumped.touches, name);
    else state.undo.pop();
  }

  function buildTechniquePickers() {
    const techniques = window.SudokuProgress ? window.SudokuProgress.TECHNIQUES : [];
    const fillList = document.getElementById("fill-list");
    const practiceList = document.getElementById("practice-list");
    if (fillList) {
      fillList.replaceChildren();
      techniques.forEach((tech) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-btn";
        button.textContent = window.SudokuPractice ? window.SudokuPractice.fillLabel(tech.slug) : tech.name;
        button.addEventListener("click", () => {
          hideModal("fill-modal");
          fillTechnique(tech.slug);
        });
        fillList.appendChild(button);
      });
    }
    if (practiceList) {
      practiceList.replaceChildren();
      techniques.forEach((tech) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-btn";
        button.textContent = tech.name;
        button.addEventListener("click", () => {
          hideModal("practice-modal");
          const level = window.SudokuGenerator && window.SudokuGenerator.trainLevel(tech.slug);
          if (!level) return;
          beginNew({ kind: level, practice: tech.slug }, { count: false });
        });
        practiceList.appendChild(button);
      });
    }
  }

  function beginNew(request, { count }) {
    if (state.counted && !state.won && !state.over && state.puzzle.some((value) => value !== 0)) writeSave();
    dismissHint();
    clearFillReview();
    const kind = request.kind || "easy";
    const date = todayString();
    const token = ++generation;
    busy = true;
    state.running = false;
    const practiceName =
      request.practice && window.SudokuProgress ? window.SudokuProgress.nameOf(request.practice) : "";
    setCover(true, practiceName ? `Finding ${practiceName}…` : "Shuffling a puzzle…", false);
    window.setTimeout(() => {
      void launchNew(request, kind, date, token, count);
    }, 30);
  }

  async function launchNew(request, kind, date, token, count) {
    if (token !== generation) return;
    const done = request && !request.practice ? completionFor(request) : null;
    if (done) {
      showCompleted(done);
      return;
    }
    const seeded = kind === "daily";
    const difficulty = seeded ? DAILY : kind;
    const train = request.train || null;
    const practiceSlug = request.practice || null;
    const techniqueSlug = practiceSlug || train;
    let puzzleId = null;
    let result = null;
    if (request.givens && window.SudokuShare) {
      result = window.SudokuShare.materialize(request.givens, difficulty);
      puzzleId = request.puzzleId || null;
    }
    if (!result && techniqueSlug && window.SudokuGenerator.generateForTechnique) {
      const allowed = window.SudokuProgress ? window.SudokuProgress.comfortableSlugs() : [];
      const seed = request.seed || (window.SudokuShare ? window.SudokuShare.mintId(difficulty) : undefined);
      result = window.SudokuGenerator.generateForTechnique(techniqueSlug, { allowed, seed });
      if (window.SudokuShare) puzzleId = window.SudokuShare.idFromGivens(difficulty, result.puzzle);
    } else if (!result) {
      const seed = seeded
        ? `daily:${date}`
        : request.seed || (window.SudokuShare ? window.SudokuShare.mintId(difficulty) : undefined);
      if (!seeded) puzzleId = request.puzzleId || seed || null;
      result = window.SudokuGenerator.generate(difficulty, seed);
    }
    if (token !== generation) return;
    const already = seeded && stats.daily.completed[date];
    state = blankState();
    state.kind = kind;
    state.train = practiceSlug ? null : train;
    state.practice = practiceSlug;
    state.puzzleId = seeded ? null : puzzleId;
    state.dailyDate = seeded ? date : null;
    state.puzzle = result.puzzle.slice();
    state.solution = result.solution.slice();
    state.board = result.puzzle.slice();
    state.metadata = result.metadata;
    state.auto = settings.autoCandidates;
    preparePractice();
    if (state.auto) state.notesUsed = true;
    state.selected = firstEmpty();
    autoBox.checked = state.auto;
    state.baseRemoved = state.removed.map((item) => ({ index: item.index, digit: item.digit }));
    writeUrl(kind);
    if (already) {
      state.board = result.solution.slice();
      state.won = true;
      state.elapsed = already.time || 0;
      state.counted = true;
      busy = false;
      render();
      setCover(false);
      showSolved(true);
      return;
    }
    if (count && !practiceSlug) recordStart();
    state.counted = true;
    const level = (result.metadata && result.metadata.difficulty) || difficulty;
    if (practiceSlug && window.SudokuCommunity && window.SudokuCommunity.abandonOpen) {
      window.SudokuCommunity.abandonOpen();
    } else if (window.SudokuCommunity) {
      try {
        state.anonPlayId = await window.SudokuCommunity.onNewGame({
          level,
          isDaily: seeded,
          date: seeded ? date : null,
          seed: result.metadata && result.metadata.seed,
          givens: result.puzzle,
          notesUsed: state.notesUsed,
        });
      } catch {
        state.anonPlayId = null;
      }
    }
    if (token !== generation) return;
    busy = false;
    render();
    setCover(false);
    resume();
    const approximate = train && !practiceSlug && result.metadata && result.metadata.trainApproximate;
    const trainName = train && window.SudokuProgress ? window.SudokuProgress.nameOf(train) : "";
    announce(
      fillReview && fillReview.summary
        ? fillReview.summary
        : state.practiceNote
          ? state.practiceNote
          : approximate
            ? `No puzzle stopped at ${trainName}. ${labelFor(kind)} is ready.`
            : `${labelFor(kind)} puzzle ready`
    );
    writeSave();
    if (window.SudokuCommunity) window.SudokuCommunity.paintLine(kind);
  }

  function recordStart() {
    const key = state.kind === "daily" ? "daily" : state.kind;
    if (key === "daily" && stats.daily.completed[state.dailyDate]) return;
    stats[key].played += 1;
    saveStats();
  }

  function recordWin() {
    if (state.revealed) return [];
    if (state.practice || state.fastForwarded) {
      state.scored = true;
      return [];
    }
    const key = state.kind === "daily" ? "daily" : state.kind;
    const bucket = stats[key];
    if (state.scored) {
      if (bucket.best == null || state.elapsed < bucket.best) bucket.best = state.elapsed;
      if (key === "daily" && stats.daily.completed[state.dailyDate]) {
        const prev = stats.daily.completed[state.dailyDate];
        if (state.elapsed < prev.time) {
          prev.time = Math.round(state.elapsed);
          prev.mistakes = state.mistakes;
        }
      }
      saveStats();
      return [];
    }
    if (key === "daily") {
      if (!stats.daily.completed[state.dailyDate]) {
        stats.daily.completed[state.dailyDate] = {
          time: Math.round(state.elapsed),
          mistakes: state.mistakes,
        };
        const streak = streakEnding(state.dailyDate);
        stats.daily.longestStreak = Math.max(stats.daily.longestStreak || 0, streak);
      }
    }
    bucket.won += 1;
    bucket.totalTime += state.elapsed;
    if (bucket.best == null || state.elapsed < bucket.best) bucket.best = state.elapsed;
    state.scored = true;
    saveStats();
    return awardSolve(key);
  }

  function solutionPath() {
    const meta = state.metadata;
    if (meta && Array.isArray(meta.path) && meta.path.length) return meta.path.slice();
    if (!window.SudokuSolver || !window.SudokuSolver.grade) return [];
    try {
      return window.SudokuSolver.grade(state.puzzle).path || [];
    } catch {
      return [];
    }
  }

  function awardSolve(level) {
    if (!window.SudokuProgress) return [];
    const result = window.SudokuProgress.recordSolve(
      {
        level,
        seconds: state.elapsed,
        mistakes: state.mistakes,
        hintSlugs: techniqueHints(),
        checks: state.checks || 0,
        path: solutionPath(),
        at: new Date().toISOString(),
      },
      stats
    );
    return result.unlocked || [];
  }

  function select(index, focus) {
    if (index < 0 || index > 80) return;
    if (fillReview) {
      if (fillReview.cells.length && !fillReview.fading && describeFillCell(index)) {
        /* the first press names the technique and fades the marks */
      } else dismissFillReview();
    }
    state.selected = index;
    render();
    if (focus) cells[index].focus();
  }

  function setMode(mode) {
    state.mode = mode;
    render();
    announce(mode === "notes" ? "Notes mode" : "Normal mode");
  }

  function onNumber(number) {
    if (blocked()) return;
    const hadReview = Boolean(fillReview);
    dismissFillReview();
    const before = state.undo.length;
    if (state.mode === "notes") toggleNote(state.selected, number);
    else place(state.selected, number);
    if (hadReview && state.undo.length === before) render();
  }

  function markGameplay() {
    if (state.practice || state.fastForwarded || state.gameplayMarked || !window.SudokuCommunity) return;
    state.gameplayMarked = true;
    const pending = window.SudokuCommunity.noteFirstMove(communitySnapshot("abandoned"));
    state.startPromise = pending;
    if (pending && typeof pending.then === "function") {
      pending
        .then((playId) => {
          if (playId) state.anonPlayId = playId;
        })
        .catch(() => {});
    }
  }

  function place(index, number) {
    if (state.puzzle[index] !== 0 || state.board[index] === number) return;
    dismissHint();
    pushUndo();
    if (number !== state.solution[index]) state.removed = [];
    state.board[index] = number;
    buzz(number === state.solution[index] ? 12 : [18, 40, 24]);
    state.notes[index].clear();
    peerIndexes(index).forEach((other) => state.notes[other].delete(number));
    if (number === state.solution[index]) state.slashed.delete(index);
    else state.removed = state.removed.filter((item) => state.board[item.index] === 0);
    if (settings.checkGuesses && number !== state.solution[index]) {
      state.slashed.add(index);
      state.mistakes += 1;
      announce("That number conflicts");
      if (state.mistakes >= MISTAKE_LIMIT) {
        state.over = true;
        pause(false);
        markGameplay();
        render();
        showModal("over-modal");
        writeSave();
        return;
      }
    } else {
      state.slashed.delete(index);
    }
    markGameplay();
    render();
    if (isSolved()) finish(false);
    else writeSave();
  }

  function toggleNote(index, number) {
    if (state.puzzle[index] !== 0 || state.board[index] !== 0) return;
    pushUndo();
    if (state.notes[index].has(number)) state.notes[index].delete(number);
    else {
      state.notes[index].add(number);
      state.notesUsed = true;
      markGameplay();
    }
    render();
    writeSave();
  }

  function erase(index) {
    if (blocked() || state.puzzle[index] !== 0) return;
    dismissFillReview();
    if (state.board[index] === 0 && state.notes[index].size === 0) {
      render();
      return;
    }
    dismissHint();
    pushUndo();
    state.removed = [];
    state.board[index] = 0;
    state.notes[index].clear();
    state.slashed.delete(index);
    render();
    writeSave();
  }

  function runAction(action) {
    if (busy) return;
    if (action !== "reset" && (state.userPaused || state.hidePaused)) return;
    if (action === "hint") hint();
    else if (action === "check-cell") checkCell();
    else if (action === "check-puzzle") checkPuzzle();
    else if (action === "reveal-cell") revealCell();
    else if (action === "reveal-puzzle") revealPuzzle();
    else if (action === "reset") resetPuzzle();
  }

  function hintKey() {
    const removed = state.removed.map((item) => `${item.index}:${item.digit}`).join(",");
    return `${state.board.join(",")}|${removed}`;
  }

  function dismissHint() {
    hintView = null;
    const sheet = document.getElementById("hint-sheet");
    if (sheet) sheet.hidden = true;
    if (cells.length) render();
  }

  function bindHintSwipe() {
    const sheet = document.getElementById("hint-sheet");
    let swipe = null;
    sheet.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, a")) return;
      swipe = { x: event.clientX, y: event.clientY, x2: event.clientX, y2: event.clientY };
    });
    sheet.addEventListener("pointermove", (event) => {
      if (!swipe) return;
      swipe.x2 = event.clientX;
      swipe.y2 = event.clientY;
    });
    const finish = () => {
      if (!swipe) return;
      const dy = swipe.y2 - swipe.y;
      const dx = swipe.x2 - swipe.x;
      swipe = null;
      if (dy > 40 && Math.abs(dy) > Math.abs(dx)) dismissHint();
    };
    sheet.addEventListener("pointerup", finish);
    sheet.addEventListener("pointercancel", finish);
  }

  function firstWrong() {
    for (let index = 0; index < 81; index += 1) {
      if (state.board[index] && state.board[index] !== state.solution[index]) return index;
    }
    return -1;
  }

  function advanceHint() {
    if (blocked()) return;
    if (hintView && hintView.key !== hintKey()) hintView = null;
    if (!hintView) {
      openHint();
      return;
    }
    if (hintView.stage === 1) {
      hintView.stage = 2;
      showHint();
      return;
    }
    if (hintView.stage === 2) {
      applyHint();
      return;
    }
    if (hintView.stage === 3 && hintView.follow) {
      hintView.keptEliminate = (hintView.step.eliminate || []).slice();
      hintView.step = hintView.follow;
      hintView.follow = null;
      hintView.followUp = true;
      hintView.chain = false;
      hintView.stage = 2;
      hintView.key = hintKey();
      applyHint();
      return;
    }
    if (hintView.stage === 3 && hintView.continueHint) {
      dismissHint();
      openHint();
      return;
    }
    dismissHint();
  }

  function noteTechniqueHint(slug) {
    if (!slug) return;
    if (!state.hintSlugs) state.hintSlugs = [];
    if (state.hintSlugs.includes(slug)) return;
    state.hintSlugs.push(slug);
  }

  function noteCheck() {
    if (state.practice) return;
    state.checks = (state.checks | 0) + 1;
  }

  function techniqueHints() {
    const slugs = [];
    (state.hintSlugs || []).forEach((slug) => {
      if (typeof slug === "string" && slug && !slugs.includes(slug)) slugs.push(slug);
    });
    state.hintSlugs = slugs;
    return slugs;
  }

  function openHint() {
    const wrong = firstWrong();
    if (wrong >= 0) {
      hintView = { kind: "wrong", stage: 1, index: wrong, key: hintKey() };
      noteCheck();
      showHint();
      writeSave();
      return;
    }
    const solverApi = window.SudokuSolver;
    const step = solverApi && solverApi.explain ? solverApi.explain(state.board, state.removed) : null;
    if (!step) {
      announce("No logical step from here");
      return;
    }
    hintView = { kind: "step", stage: 1, step, key: hintKey() };
    noteTechniqueHint(step.slug);
    showHint();
    writeSave();
  }

  function showHint() {
    const sheet = document.getElementById("hint-sheet");
    const text = document.getElementById("hint-text");
    const kicker = document.getElementById("hint-kicker");
    const next = document.getElementById("hint-next");
    const learn = document.getElementById("hint-learn");
    sheet.hidden = false;
    next.hidden = false;
    if (hintView.kind === "wrong") {
      const index = hintView.index;
      const digit = state.board[index];
      const row = Math.floor(index / 9) + 1;
      const col = (index % 9) + 1;
      learn.hidden = true;
      const fill = document.getElementById("hint-fill");
      if (fill) fill.hidden = true;
      kicker.textContent = "Check the board";
      if (hintView.stage === 1) {
        text.textContent = "A digit on the board is wrong, so the next technique wouldn't be trustworthy.";
        next.textContent = "Show it";
      } else if (hintView.stage === 2) {
        text.textContent = `The ${digit} in row ${row}, column ${col} doesn't belong.`;
        next.textContent = "Clear it";
      } else {
        text.textContent = `Cleared the wrong digit in row ${row}, column ${col}.`;
        if (hintView.continueHint) {
          next.hidden = false;
          next.textContent = "Next hint";
        } else {
          next.hidden = true;
        }
      }
    } else {
      const step = hintView.step;
      kicker.textContent = step.name;
      learn.hidden = false;
      learn.href = `/techniques/${step.slug}/`;
      const fill = document.getElementById("hint-fill");
      if (fill) {
        fill.hidden = false;
        fill.textContent = window.SudokuPractice ? window.SudokuPractice.fillLabel(step.slug) : "Fill all of these";
      }
      if (hintView.stage === 1) {
        text.textContent = step.look;
        next.textContent = "Show why";
      } else if (hintView.stage === 2) {
        text.textContent = step.explain;
        next.textContent = window.SudokuHintApply.placesOnApply(step) ? "Place it" : "Apply";
      } else {
        text.textContent =
          hintView.resultText ||
          (window.SudokuHintApply.placesOnApply(step)
            ? `${step.explain} Placed ${step.place.digit}.`
            : `${step.explain} ${window.SudokuHintApply.eliminationSentence(step.eliminate, [])}`);
        if (hintView.follow) {
          next.hidden = false;
          next.textContent = "Place it";
        } else {
          next.hidden = true;
        }
      }
    }
    render();
    announce(text.textContent);
    focusAfterHint();
  }

  function focusAfterHint() {
    const next = document.getElementById("hint-next");
    if (next && !next.hidden) {
      if (next.textContent === "Place it") next.setAttribute("aria-keyshortcuts", "Enter");
      else next.removeAttribute("aria-keyshortcuts");
      next.focus();
      return;
    }
    if (!hintView || hintView.kind !== "step" || hintView.stage !== 3 || !hintView.step.place) return;
    const index = hintView.step.place.index;
    if (state.board[index] !== hintView.step.place.digit || !cells[index]) return;
    cells[index].focus();
  }

  function applyHint() {
    if (!hintView) return;
    if (hintView.kind === "wrong") {
      const index = hintView.index;
      pushUndo();
      state.board[index] = 0;
      state.notes[index].clear();
      state.slashed.delete(index);
      state.removed = [];
      hintView.stage = 3;
      hintView.continueHint = true;
      hintView.key = hintKey();
      showHint();
      writeSave();
      return;
    }
    const step = hintView.step;
    const followUp = Boolean(hintView.followUp);
    pushUndo();
    if (followUp) noteTechniqueHint(step.slug);
    hintView.followUp = false;
    const applied = window.SudokuHintApply.applyHintStep(
      {
        notes: state.notes.map((set) => [...set]),
        removed: state.removed,
        board: state.board,
        puzzle: state.puzzle,
        solution: state.solution,
      },
      step
    );
    state.board = applied.board;
    state.notes = applied.notes.map((list) => new Set(list));
    state.removed = applied.removed;
    if (applied.placed) {
      state.slashed.delete(step.place.index);
      state.selected = step.place.index;
    }
    let follow = null;
    if (applied.chain && window.SudokuSolver && window.SudokuSolver.explain && step.place) {
      const nextStep = window.SudokuSolver.explain(state.board, state.removed);
      if (
        nextStep &&
        window.SudokuHintApply.placesOnApply(nextStep) &&
        nextStep.place &&
        nextStep.place.index === step.place.index &&
        nextStep.place.digit === step.place.digit
      ) {
        follow = nextStep;
      }
    }
    hintView.stage = 3;
    hintView.follow = follow;
    hintView.chain = Boolean(follow);
    hintView.continueHint = false;
    hintView.resultText = applied.copy;
    hintView.key = hintKey();
    if (isSolved()) finish(false);
    else {
      showHint();
      writeSave();
    }
  }

  function hint() {
    advanceHint();
  }

  function motionReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fillMarkAt(index) {
    if (!fillReview) return null;
    for (let i = 0; i < fillReview.cells.length; i += 1) {
      if (fillReview.cells[i].index === index) return fillReview.cells[i];
    }
    return null;
  }

  function clearFillReview() {
    window.clearTimeout(fillFadeTimer);
    fillFadeTimer = 0;
    fillReview = null;
    clearAnnounce();
  }

  function showFillReview(touches, nextName) {
    const api = window.SudokuPractice;
    clearFillReview();
    if (!api || !api.batchesOf) return;
    const batches = api.batchesOf(touches || []);
    const marked = api.highlightOf(batches);
    if (!marked.length) return;
    marked.forEach((cell, order) => {
      cell.delay = order * 50;
    });
    fillReview = {
      cells: marked,
      summary: api.reviewCopy(batches, nextName || ""),
      short: api.reviewCopyShort ? api.reviewCopyShort(batches, nextName || "") : "",
      detail: "",
      fading: false,
      keep: false,
      armed: false,
    };
  }

  function dismissFillReview() {
    if (!fillReview) return;
    if (motionReduced() || !fillReview.cells.length || fillReview.fading) {
      const pending = pendingSolved;
      clearFillReview();
      if (pending && state.won) {
        pendingSolved = null;
        showSolved(false, pending.unlocked);
      }
      return;
    }
    fillReview.fading = true;
    fillReview.keep = false;
  }

  function describeFillCell(index) {
    if (!fillReview || fillReview.fading) return false;
    const mark = fillMarkAt(index);
    if (!mark || !window.SudokuPractice) return false;
    fillReview.detail = window.SudokuPractice.cellDetail(mark);
    announce(fillReview.detail);
    if (motionReduced()) {
      fillReview.cells = [];
      return true;
    }
    fillReview.fading = true;
    fillReview.keep = true;
    return true;
  }

  function finishFillFade() {
    if (!fillReview || !fillReview.fading) return;
    window.clearTimeout(fillFadeTimer);
    fillFadeTimer = 0;
    const pending = fillReview.keep ? null : pendingSolved;
    if (fillReview.keep) {
      fillReview.cells = [];
      fillReview.fading = false;
      fillReview.keep = false;
      fillReview.armed = false;
    } else {
      fillReview = null;
      pendingSolved = null;
    }
    render();
    if (pending && state.won) showSolved(false, pending.unlocked);
  }

  function armFillFade() {
    if (!fillReview || !fillReview.fading || fillReview.armed) return;
    fillReview.armed = true;
    let pending = 0;
    cells.forEach((cell) => {
      if (!cell.classList.contains("fill-fading")) return;
      pending += 1;
      const onEnd = (event) => {
        if (event.propertyName !== "background-color") return;
        cell.removeEventListener("transitionend", onEnd);
        pending -= 1;
        if (pending <= 0) finishFillFade();
      };
      cell.addEventListener("transitionend", onEnd);
    });
    fillFadeTimer = window.setTimeout(() => {
      if (fillReview && fillReview.fading) finishFillFade();
    }, 420);
  }

  // Every currently available step of one technique, stored as a single undo.
  function fillTechnique(slug) {
    if (blocked() || !slug) return;
    const practiceApi = window.SudokuPractice;
    const solver = window.SudokuSolver;
    if (!practiceApi || !solver || !solver.explain) return;
    const probe = solver.explain(state.board, state.removed);
    const label = practiceApi.fillLabel(slug);
    if (!probe || probe.slug !== slug) {
      dismissHint();
      announce(probe ? `${label} isn't available yet. Next up is ${probe.name}.` : `${label} isn't available. Nothing legal is left.`);
      return;
    }
    dismissHint();
    pushUndo();
    const beforeBoard = state.board.slice();
    const beforeNotes = state.notes.map((set) => [...set]);
    const beforeRemoved = state.removed.map((item) => ({ index: item.index, digit: item.digit }));
    state.fastForwarded = true;
    if (state.practice && slug === state.practice) state.practiceFilled = true;
    const result = practiceApi.fillAll(
      state.board,
      state.removed,
      slug,
      (board, removed) => solver.explain(board, removed),
      state.solution,
      syncNotesFromStep
    );
    const stepName = (result.applied[0] && result.applied[0].name) || label;
    result.touches = practiceApi.visibleFillTouches({
      beforeBoard,
      beforeNotes,
      beforeRemoved,
      board: state.board,
      notes: state.notes.map((set) => [...set]),
      removed: state.removed,
      slug,
      name: stepName,
      auto: state.auto,
    });
    showFillReview(result.touches, "");
    const count = result.applied.length;
    const message = fillReview ? fillReview.summary : `${label}: ${count} ${count === 1 ? "step" : "steps"}.`;
    if (isSolved()) {
      clearFillReview();
      finish(false);
      return;
    }
    render();
    writeSave();
    announce(message);
  }

  function revealCell() {
    if (blocked()) return;
    dismissHint();
    const index = state.selected;
    if (state.puzzle[index] !== 0) return;
    pushUndo();
    state.board[index] = state.solution[index];
    state.notes[index].clear();
    state.slashed.delete(index);
    peerIndexes(index).forEach((other) => state.notes[other].delete(state.solution[index]));
    render();
    if (isSolved()) finish(false);
    else writeSave();
  }

  function revealPuzzle() {
    if (state.won) return;
    pushUndo();
    state.board = state.solution.slice();
    state.notes = emptyNotes();
    state.slashed.clear();
    state.removed = [];
    render();
    finish(true);
  }

  function checkCell() {
    const index = state.selected;
    if (!state.board[index] || state.puzzle[index] !== 0) return;
    if (state.board[index] !== state.solution[index]) {
      state.slashed.add(index);
      announce("This cell is wrong");
    } else {
      state.slashed.delete(index);
      announce("This cell is correct");
    }
    render();
  }

  function checkPuzzle() {
    let wrong = 0;
    state.board.forEach((value, index) => {
      if (state.puzzle[index] !== 0 || value === 0) return;
      if (value !== state.solution[index]) {
        state.slashed.add(index);
        wrong += 1;
      }
    });
    announce(wrong ? `${wrong} wrong ${wrong === 1 ? "cell" : "cells"}` : "No mistakes found");
    render();
  }

  function resetPuzzle() {
    hideModal("over-modal");
    hideModal("solved-modal");
    state.board = state.puzzle.slice();
    state.notes = emptyNotes();
    state.slashed.clear();
    state.removed = (state.baseRemoved || []).map((item) => ({ index: item.index, digit: item.digit }));
    state.undo = [];
    state.mistakes = 0;
    dismissHint();
    clearFillReview();
    pendingSolved = null;
    state.elapsed = 0;
    state.over = false;
    state.won = false;
    state.revealed = false;
    state.selected = firstEmpty();
    render();
    resume();
    writeSave();
  }

  function nextHelpCell(start) {
    for (let step = 0; step < 81; step += 1) {
      const index = (start + step) % 81;
      if (state.puzzle[index] === 0 && state.board[index] !== state.solution[index]) return index;
    }
    return -1;
  }

  function undo() {
    const snap = state.undo.pop();
    if (!snap) return;
    dismissHint();
    clearFillReview();
    pendingSolved = null;
    state.board = snap.board;
    state.notes = snap.notes.map((list) => new Set(list));
    state.removed = (snap.removed || []).map((item) => ({ index: item.index, digit: item.digit }));
    state.mistakes = snap.mistakes;
    state.slashed = new Set(snap.slashed);
    state.won = snap.won;
    state.revealed = snap.revealed;
    state.over = snap.over;
    if (Array.isArray(snap.puzzle)) state.puzzle = snap.puzzle.slice();
    if (Array.isArray(snap.hintSlugs)) state.hintSlugs = snap.hintSlugs.slice();
    if (typeof snap.elapsed === "number") state.elapsed = snap.elapsed;
    if (!state.over) hideModal("over-modal");
    if (!state.won) hideModal("solved-modal");
    render();
    if (!state.won && !state.over && !state.userPaused) resume();
    writeSave();
  }

  function pushUndo() {
    state.undo.push({
      board: state.board.slice(),
      puzzle: state.puzzle.slice(),
      notes: state.notes.map((set) => [...set]),
      mistakes: state.mistakes,
      slashed: [...state.slashed],
      removed: state.removed.map((item) => ({ index: item.index, digit: item.digit })),
      hintSlugs: (state.hintSlugs || []).slice(),
      elapsed: state.elapsed,
      won: state.won,
      revealed: state.revealed,
      over: state.over,
    });
    if (state.undo.length > 80) state.undo.shift();
  }

  function communitySnapshot(outcome) {
    const slugs = techniqueHints();
    const hardest =
      window.SudokuProgress && slugs.length ? window.SudokuProgress.hardest(slugs) || "" : "";
    return {
      outcome,
      elapsed: Math.round(state.elapsed || 0),
      mistakes: state.mistakes || 0,
      hintsUsed: slugs.length,
      hardestHint: hardest,
      notesUsed: Boolean(state.notesUsed || state.auto),
      kind: state.kind,
      isDaily: state.kind === "daily",
      over: Boolean(state.over),
    };
  }

  function finish(revealed) {
    hintView = null;
    const hintSheet = document.getElementById("hint-sheet");
    if (hintSheet) hintSheet.hidden = true;
    state.revealed = revealed;
    state.won = true;
    if (!fillReview) state.undo = [];
    state.userPaused = false;
    state.hidePaused = false;
    pause(false);
    const assisted = Boolean(state.practice || state.fastForwarded);
    const snapshot = communitySnapshot(revealed ? "revealed" : "solved");
    const started = state.startPromise || Promise.resolve();
    if (window.SudokuCommunity) {
      if (assisted && window.SudokuCommunity.skipFinish) window.SudokuCommunity.skipFinish();
      else {
        const posted = started
          .then(() => window.SudokuCommunity.rememberFinish(snapshot))
          .then(() => window.SudokuCommunity.completeFinish(snapshot));
        if (posted && typeof posted.catch === "function") {
          posted.catch(() => {
            /* a failed finish request must not reset or reload the board */
          });
        }
      }
    }
    if (!revealed) recordCompleted();
    clearSave();
    if (!revealed && state.practice && !state.practiceFilled && !state.practiceMiss && window.SudokuProgress && window.SudokuProgress.recordPractice) {
      window.SudokuProgress.recordPractice(state.practice);
    }
    const unlocked = revealed || assisted ? [] : recordWin();
    if (assisted) state.scored = true;
    render();
    if (window.SudokuAccount) window.SudokuAccount.flush();
    if (fillReview) {
      pendingSolved = { unlocked };
      return;
    }
    showSolved(false, unlocked);
    if (unlocked.length && window.SudokuProgress) window.SudokuProgress.celebrate(unlocked);
  }

  function isSolved() {
    return state.board.every((value, index) => value === state.solution[index] && value !== 0);
  }

  function blocked() {
    return (
      busy ||
      state.won ||
      state.over ||
      state.userPaused ||
      state.hidePaused ||
      !state.puzzle.some((value) => value !== 0)
    );
  }

  function firstEmpty() {
    const index = state.puzzle.findIndex((value) => value === 0);
    return index < 0 ? 0 : index;
  }

  function peerIndexes(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const set = new Set();
    for (let i = 0; i < 9; i += 1) {
      set.add(row * 9 + i);
      set.add(i * 9 + col);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) set.add((boxRow + r) * 9 + (boxCol + c));
    }
    set.delete(index);
    return set;
  }

  function candidatesFor(index) {
    return new Set(window.SudokuHintApply.legalCandidates(state.board, state.removed, index));
  }

  function conflictDots() {
    const dots = new Set();
    if (settings.highlightConflicts) {
      const units = [];
      for (let row = 0; row < 9; row += 1) {
        units.push(Array.from({ length: 9 }, (_, col) => row * 9 + col));
      }
      for (let col = 0; col < 9; col += 1) {
        units.push(Array.from({ length: 9 }, (_, row) => row * 9 + col));
      }
      for (let box = 0; box < 9; box += 1) {
        const cellsInBox = [];
        const boxRow = Math.floor(box / 3) * 3;
        const boxCol = (box % 3) * 3;
        for (let r = 0; r < 3; r += 1) {
          for (let c = 0; c < 3; c += 1) cellsInBox.push((boxRow + r) * 9 + (boxCol + c));
        }
        units.push(cellsInBox);
      }
      units.forEach((unit) => {
        const grouped = new Map();
        unit.forEach((index) => {
          const value = state.board[index];
          if (!value) return;
          if (!grouped.has(value)) grouped.set(value, []);
          grouped.get(value).push(index);
        });
        grouped.forEach((list) => {
          if (list.length > 1) list.forEach((index) => dots.add(index));
        });
      });
    }
    state.slashed.forEach((index) => {
      const value = state.board[index];
      if (!value) return;
      peerIndexes(index).forEach((other) => {
        if (state.board[other] === value) dots.add(other);
      });
    });
    return dots;
  }

  function render() {
    const dots = conflictDots();
    const selectedValue = state.board[state.selected] || 0;
    const hint = hintView && hintView.key === hintKey() ? hintView : null;
    const hintPattern = new Set();
    const hintRegion = new Set();
    const hintEliminate = new Set();
    const hintStruck = new Map();
    const hintCandidates = new Map();
    let hintPlace = -1;
    if (hint && hint.kind === "wrong" && hint.stage >= 2) hintPlace = hint.index;
    if (hint && hint.kind === "step") {
      hint.step.region.forEach((index) => hintRegion.add(index));
      hint.step.pattern.forEach((index) => hintPattern.add(index));
      if (hint.stage >= 2) {
        const eliminations = [...(hint.step.eliminate || []), ...(hint.keptEliminate || [])];
        eliminations.forEach((item) => {
          hintEliminate.add(item.index);
          if (!hintStruck.has(item.index)) hintStruck.set(item.index, new Set());
          hintStruck.get(item.index).add(item.digit);
        });
        hint.step.candidates.forEach((item) => hintCandidates.set(item.index, new Set(item.digits)));
        if (hint.step.place) hintPlace = hint.step.place.index;
      }
    }
    cells.forEach((cell, index) => {
      const value = state.board[index];
      const given = state.puzzle[index] !== 0;
      const selected = index === state.selected;
      const hinted =
        hintPattern.has(index) || hintRegion.has(index) || hintEliminate.has(index) || index === hintPlace;
      const same =
        !hinted &&
        settings.highlightSame &&
        selectedValue !== 0 &&
        value === selectedValue &&
        !selected;
      const peer = !hinted && !selected && !same && isPeer(index);
      cell.classList.toggle("given", given);
      cell.classList.toggle("user", !given && value !== 0);
      cell.classList.toggle("selected", selected);
      cell.classList.toggle("same", same);
      cell.classList.toggle("peer", peer);
      cell.classList.toggle("wrong", state.slashed.has(index) && value !== 0);
      cell.classList.toggle("hint-region", hintRegion.has(index));
      cell.classList.toggle("hint-pattern", hintPattern.has(index));
      cell.classList.toggle("hint-eliminate", hint && hint.stage >= 2 && !value && hintEliminate.has(index));
      cell.classList.toggle("hint-place", hint && hint.stage >= 2 && index === hintPlace);
      const mark = fillMarkAt(index);
      cell.classList.toggle("fill-placed", Boolean(mark && mark.kind === "placed"));
      cell.classList.toggle("fill-cleared", Boolean(mark && mark.kind !== "placed"));
      cell.classList.toggle("fill-fading", Boolean(mark && fillReview.fading));
      if (mark && !fillReview.fading) cell.style.setProperty("--fill-delay", `${mark.delay || 0}ms`);
      else cell.style.removeProperty("--fill-delay");
      cell.removeAttribute("title");
      cell.setAttribute("aria-selected", selected ? "true" : "false");
      cell.dataset.value = String(value);
      cell.replaceChildren();
      if (value) {
        cell.append(document.createTextNode(String(value)));
      } else {
        const marks = document.createElement("span");
        marks.className = "marks";
        marks.setAttribute("aria-hidden", "true");
        const computed = state.auto ? candidatesFor(index) : null;
        const ghost = hint && hint.stage === 2 ? hintCandidates.get(index) : null;
        const struck = hint && hint.stage >= 2 ? hintStruck.get(index) : null;
        const cleared = new Set();
        if (!state.auto) {
          state.removed.forEach((item) => {
            if (item.index === index) cleared.add(item.digit);
          });
        }
        for (let number = 1; number <= 9; number += 1) {
          const mark = document.createElement("span");
          mark.dataset.digit = String(number);
          mark.textContent = String(number);
          if (struck && struck.has(number)) mark.classList.add("on", "struck");
          else if (ghost && ghost.has(number)) mark.classList.add("on", "hint-note");
          else if (state.notes[index].has(number)) mark.classList.add("on", "user-note");
          else if (cleared.has(number)) mark.classList.add("on", "struck");
          else if (computed && computed.has(number)) mark.classList.add("on", "auto");
          marks.appendChild(mark);
        }
        cell.appendChild(marks);
      }
      if (dots.has(index) && !state.slashed.has(index)) {
        const dot = document.createElement("span");
        dot.className = "conflict-dot";
        dot.setAttribute("aria-hidden", "true");
        cell.appendChild(dot);
      }
      cell.setAttribute("aria-label", cellLabel(index));
    });

    document.querySelectorAll(".difficulty-tabs button").forEach((button) => {
      const active = button.dataset.difficulty === state.kind;
      button.setAttribute("aria-selected", active ? "true" : "false");
      if (button.dataset.difficulty === "daily" && stats.daily.completed[todayString()]) {
        button.textContent = "Daily ✓";
      } else if (button.dataset.difficulty === "daily") {
        button.textContent = "Daily";
      }
    });
    const fullLabel = labelFor(state.kind);
    const shortLabel = state.practice && window.SudokuProgress ? window.SudokuProgress.nameOf(state.practice) : "";
    if (shortLabel && shortLabel !== fullLabel) pairText(labelEl, fullLabel, shortLabel);
    else labelEl.textContent = fullLabel;
    timerEl.textContent = formatTime(state.elapsed);
    timerEl.parentElement.classList.toggle("is-hidden", !settings.showTimer);
    mistakeEl.classList.toggle("is-hidden", !settings.showMistakes);
    const mistakeCount = document.getElementById("mistake-count");
    if (mistakeCount) mistakeCount.textContent = String(Math.min(state.mistakes, MISTAKE_LIMIT));
    mistakeEl.setAttribute(
      "aria-label",
      `Mistakes, ${Math.min(state.mistakes, MISTAKE_LIMIT)} of ${MISTAKE_LIMIT}`
    );
    document.getElementById("mode-normal").setAttribute("aria-pressed", state.mode === "normal");
    document.getElementById("mode-notes").setAttribute("aria-pressed", state.mode === "notes");
    undoBtn.disabled = state.undo.length === 0;
    const boxHas = Array.from({ length: 10 }, () => Array(9).fill(false));
    state.board.forEach((value, index) => {
      if (!value || state.slashed.has(index)) return;
      const row = Math.floor(index / 9);
      const col = index % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      boxHas[value][box] = true;
    });
    pad.classList.toggle("map-off", !settings.showBoxMap);
    pad.querySelectorAll("button").forEach((button) => {
      const number = Number(button.dataset.number);
      const segments = button.querySelectorAll(".box-map i");
      let filled = 0;
      let placed = 0;
      state.board.forEach((value) => {
        if (value === number) placed += 1;
      });
      segments.forEach((segment, box) => {
        const on = boxHas[number][box];
        segment.classList.toggle("on", on);
        if (on) filled += 1;
      });
      const left = Math.max(0, 9 - placed);
      const count = button.querySelector(".pad-left");
      if (count) count.textContent = String(left);
      const done = left === 0;
      button.classList.toggle("complete", done);
      button.disabled = done;
      const boxes = settings.showBoxMap ? `, in ${filled} of 9 boxes` : "";
      button.setAttribute("aria-label", `Number ${number}, ${left} left${boxes}`);
    });
    pauseBtn.dataset.state = state.running ? "running" : "paused";
    pauseBtn.setAttribute("aria-label", state.running ? "Pause timer" : "Resume timer");
    paintGhost();
    paintPracticePrompt();
    paintFillChip();
    if (fillReview && fillReview.fading) armFillFade();
  }

  function cellLabel(index) {
    const row = Math.floor(index / 9) + 1;
    const col = (index % 9) + 1;
    const value = state.board[index];
    const given = state.puzzle[index] !== 0;
    let text = `Row ${row}, column ${col}`;
    if (!value) {
      const notes = [...state.notes[index]].sort((a, b) => a - b);
      text += ", empty";
      if (notes.length) text += `, notes ${notes.join(", ")}`;
      if (state.auto) {
        const candidates = [...candidatesFor(index)].filter((number) => !notes.includes(number));
        if (candidates.length) text += `, candidates ${candidates.join(", ")}`;
      }
    } else if (given) text += `, given ${value}`;
    else text += state.slashed.has(index) ? `, your ${value}, incorrect` : `, your ${value}`;
    if (index === state.selected) text += ", selected";
    const mark = fillMarkAt(index);
    if (mark && window.SudokuPractice) text += `. ${window.SudokuPractice.cellDetail(mark)}`;
    return text;
  }

  function isPeer(index) {
    const selected = state.selected;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const selectedRow = Math.floor(selected / 9);
    const selectedCol = selected % 9;
    const sameRow = row === selectedRow;
    const sameCol = col === selectedCol;
    const sameBox =
      Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
      Math.floor(col / 3) === Math.floor(selectedCol / 3);
    if ((sameRow || sameCol) && settings.highlightRowCol) return true;
    if (sameBox && settings.highlightBox) return true;
    return false;
  }

  function pairText(el, full, short) {
    el.replaceChildren();
    const wide = document.createElement("span");
    wide.className = "copy-full";
    wide.textContent = full;
    const narrow = document.createElement("span");
    narrow.className = "copy-short";
    narrow.textContent = short || full;
    el.append(wide, narrow);
  }

  function paintPracticePrompt() {
    const el = document.getElementById("practice-prompt");
    if (!el) return;
    if (!state.practice || state.won || state.over) {
      el.hidden = true;
      return;
    }
    const api = window.SudokuPractice;
    if (state.practiceMiss) {
      const full = state.practiceNote || "Practice puzzle. This one stays off your records.";
      pairText(el, full, "Practice stays off your records.");
      el.hidden = false;
      return;
    }
    const step = window.SudokuSolver && window.SudokuSolver.explain ? window.SudokuSolver.explain(state.board, state.removed) : null;
    if (!step || step.slug !== state.practice) {
      el.hidden = true;
      return;
    }
    const name = window.SudokuProgress ? window.SudokuProgress.nameOf(state.practice) : state.practice;
    const full = api ? api.promptFor(name) : `${name} is the next move. Find it.`;
    const short = api && api.promptShort ? api.promptShort(name) : `Find the ${name}.`;
    pairText(el, full, short);
    el.hidden = false;
  }

  function paintFillChip() {
    const chip = document.getElementById("fill-chip");
    if (!chip) return;
    const text = document.getElementById("fill-chip-text");
    const undo = document.getElementById("fill-undo");
    if (!fillReview) {
      chip.hidden = true;
      return;
    }
    const message = fillReview.detail || fillReview.summary || "";
    const narrow = fillReview.detail ? message : fillReview.short || message;
    if (text) {
      pairText(text, message, narrow);
      text.removeAttribute("title");
    }
    chip.hidden = false;
    if (undo) undo.disabled = state.undo.length === 0;
  }

  function labelFor(kind) {
    const approximate = state.metadata && state.metadata.trainApproximate;
    if (state.practice && window.SudokuProgress) return `Practice · ${window.SudokuProgress.nameOf(state.practice)}`;
    if (state.train && window.SudokuProgress && !approximate) return `Train · ${window.SudokuProgress.nameOf(state.train)}`;
    if (kind === "daily" && state.dailyDate) return `Daily · ${formatDay(state.dailyDate)}`;
    return LABELS[kind] || "Easy";
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function tick() {
    if (!state.running || document.hidden) {
      lastTick = performance.now();
      return;
    }
    const now = performance.now();
    const gap = (now - lastTick) / 1000;
    lastTick = now;
    if (gap > 0 && gap <= 1.25) state.elapsed += gap;
    timerEl.textContent = formatTime(state.elapsed);
    const second = Math.floor(state.elapsed);
    if (second !== lastSavedSecond && second > 0 && second % 5 === 0) {
      lastSavedSecond = second;
      writeSave();
    }
  }

  function pause(byUser) {
    state.running = false;
    if (byUser) state.userPaused = true;
    const show = !state.won && !state.over && (byUser || state.userPaused || state.hidePaused);
    showBoardCover(show ? "Paused" : "");
    render();
  }

  function resume() {
    if (state.won || state.over) return;
    state.userPaused = false;
    state.hidePaused = false;
    state.running = true;
    lastTick = performance.now();
    showBoardCover("");
    render();
  }

  function hidePracticeUnavailable() {
    const link = document.getElementById("practice-unavailable");
    if (link) link.hidden = true;
  }

  function showPracticeUnavailable() {
    state.running = false;
    setCover(true, "Practice for this technique isn't available yet", false);
    const link = document.getElementById("practice-unavailable");
    if (link) link.hidden = false;
  }

  function showBoardCover(text) {
    const show = Boolean(text);
    boardWrap.classList.toggle("is-paused", show);
    cover.hidden = !show;
    if (show) coverText.textContent = text;
    hidePracticeUnavailable();
    document.getElementById("resume-btn").hidden = text !== "Paused";
  }

  function setCover(show, text, withButton) {
    boardWrap.classList.toggle("is-paused", show);
    cover.hidden = !show;
    if (show) coverText.textContent = text;
    hidePracticeUnavailable();
    document.getElementById("resume-btn").hidden = !withButton;
  }

  function onVisibility() {
    if (document.hidden) {
      if (window.SudokuAccount) window.SudokuAccount.flush();
      if (state.running) {
        state.hidePaused = true;
        pause(false);
      }
    } else if (state.hidePaused && !state.userPaused && !state.won && !state.over) {
      resume();
    }
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const modal = openModal();
    if (modal) {
      if (event.key === "Escape" && modal.id !== "resume-modal") hideModal(modal.id);
      return;
    }
    if (event.key === "Escape") {
      if (!moreMenu.hasAttribute("hidden")) {
        closeMenu();
        return;
      }
      if (fillReview) {
        event.preventDefault();
        dismissFillReview();
        render();
        return;
      }
      closeMenu();
      return;
    }
    if (!moreMenu.hasAttribute("hidden")) return;
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      setMode(state.mode === "notes" ? "normal" : "notes");
      return;
    }
    if (state.userPaused || state.hidePaused || state.won || state.over) return;
    if (event.key >= "1" && event.key <= "9") {
      event.preventDefault();
      onNumber(Number(event.key));
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      erase(state.selected);
      return;
    }
    const arrows = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in arrows) {
      event.preventDefault();
      const delta = arrows[event.key];
      const row = Math.floor(state.selected / 9);
      const col = state.selected % 9;
      let next = state.selected + delta;
      if (event.key === "ArrowLeft" && col === 0) return;
      if (event.key === "ArrowRight" && col === 8) return;
      if (event.key === "ArrowUp" && row === 0) return;
      if (event.key === "ArrowDown" && row === 8) return;
      if (next < 0 || next > 80) return;
      select(next, true);
    }
  }

  function openModal() {
    return document.querySelector(".modal:not([hidden])");
  }

  function showModal(id) {
    const modal = document.getElementById(id);
    modal.hidden = false;
    const focus = [...modal.querySelectorAll("button, input")].find((el) => !el.hidden && !el.closest("[hidden]"));
    if (focus) focus.focus();
  }

  function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
  }

  function closeMenu() {
    moreMenu.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
  }

  function badgeNames(ids) {
    const list = window.SudokuProgress && window.SudokuProgress.BADGES;
    if (!list || !ids) return [];
    return ids
      .map((id) => list.find((badge) => badge.id === id))
      .filter(Boolean)
      .map((badge) => badge.name);
  }

  function shareInfo(names) {
    const daily = state.kind === "daily";
    const puzzleId = currentPuzzleId();
    const hints = techniqueHints().length;
    return {
      kindLabel: daily ? `Daily · ${window.SudokuShare.shortDate(state.dailyDate)}` : labelFor(state.kind),
      time: formatTime(state.elapsed),
      hints,
      mistakes: state.mistakes || 0,
      hardest: (state.metadata && state.metadata.hardestName) || "single",
      badges: names || [],
      url: daily ? window.SudokuShare.dailyUrl() : window.SudokuShare.puzzleUrl(puzzleId),
      patternKey: daily ? `daily:${state.dailyDate}` : puzzleId,
      dateLine: window.SudokuShare.longDate(daily ? state.dailyDate : todayString()),
    };
  }

  function currentPuzzleId() {
    if (state.kind === "daily") return null;
    if (state.puzzleId) return state.puzzleId;
    if (window.SudokuShare && state.puzzle && state.puzzle.length === 81) {
      state.puzzleId = window.SudokuShare.idFromGivens(state.kind, state.puzzle);
    }
    return state.puzzleId;
  }

  function showShareToast(message) {
    const toast = document.getElementById("share-toast");
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    window.clearTimeout(showShareToast.timer);
    showShareToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  async function onShareText() {
    const info = window.SudokuShare && window.SudokuShare.current();
    if (!info) return;
    const text = window.SudokuShare.shareText(info);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await copyText(text);
      showShareToast("Copied");
    } catch {
      showShareToast("Could not copy");
    }
  }

  function canvasBlob(canvas) {
    const data = canvas.toDataURL("image/png");
    const binary = atob(data.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: "image/png" });
  }

  async function onShareImage() {
    const info = window.SudokuShare && window.SudokuShare.current();
    if (!info) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    window.SudokuShare.paintCard(canvas, info);
    const blob = canvasBlob(canvas);
    const file = new File([blob], "sudokusudoku.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: window.SudokuShare.shareText(info) });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sudokusudoku.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showShareToast("Image saved");
  }

  function showSolved(already, badgeIds) {
    const title = document.getElementById("solved-title");
    const summary = document.getElementById("solved-summary");
    const extra = document.getElementById("solved-stats");
    title.textContent = state.revealed
      ? "Puzzle revealed"
      : state.replaySolved
        ? "Solved"
        : state.practice
          ? "Practiced"
          : already
            ? "Completed"
            : "Solved";
    const bits = [
      labelFor(state.kind),
      formatTime(state.elapsed),
      `${state.mistakes} ${state.mistakes === 1 ? "mistake" : "mistakes"}`,
    ];
    summary.textContent = bits.join(" · ");
    const bucket = stats[state.kind === "daily" ? "daily" : state.kind];
    const average = bucket.won ? formatTime(bucket.totalTime / bucket.won) : "–";
    if (state.replaySolved) extra.textContent = "You solved this.";
    else if (state.practice) extra.textContent = "Practice doesn't count toward times, streaks, or badges.";
    else if (state.fastForwarded) extra.textContent = "Filled steps don't count toward times or badges.";
    else
      extra.textContent =
        state.kind === "daily"
          ? `Streak ${currentStreak()} · best ${bucket.best == null ? "–" : formatTime(bucket.best)} · won ${bucket.won}`
          : `Won ${bucket.won} of ${bucket.played} · best ${bucket.best == null ? "–" : formatTime(bucket.best)} · average ${average}`;
    paintPractice();
    paintConfetti();
    const shareRow = document.getElementById("share-actions");
    const shareable = !state.revealed && !state.practice && !state.fastForwarded && window.SudokuShare;
    if (shareRow) shareRow.hidden = !shareable;
    if (shareable) window.SudokuShare.remember(shareInfo(badgeNames(badgeIds)));
    if (already && window.SudokuCommunity) {
      window.SudokuCommunity.paintPublicSolved({
        kind: state.kind,
        isDaily: state.kind === "daily",
      });
    }
    showModal("solved-modal");
    if (!state.revealed && !already) offerInstall();
    announce(title.textContent);
  }

  function paintPractice() {
    const line = document.getElementById("solved-practice");
    if (!line) return;
    const api = window.SudokuProgress;
    if (state.practice && api) {
      const name = api.nameOf(state.practice);
      line.innerHTML = state.practiceMiss
        ? `This one never reached ${api.escapeHtml(name)}. <a href="/skills/">Skill ladder</a>`
        : `${api.escapeHtml(name)} practice stays off your records. <a href="/?practice=${encodeURIComponent(state.practice)}">Practice it again</a>`;
      line.hidden = false;
      return;
    }
    const hints = state.revealed ? [] : techniqueHints();
    if (api && hints.length) {
      const slug = api.hardest(hints);
      const name = api.nameOf(slug);
      line.innerHTML = `You used ${api.article(name)} ${api.escapeHtml(name)} hint. <a href="/?train=${encodeURIComponent(slug)}">Practice it?</a> <a href="/skills/">Skill ladder</a>`;
    } else {
      line.innerHTML = `<a href="/skills/">Skill ladder</a>`;
    }
    line.hidden = false;
  }

  function isIos() {
    const ua = navigator.userAgent || "";
    return (
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function handheld() {
    if (document.documentElement.classList.contains("is-standalone")) return false;
    if (isIos()) return true;
    if (/Android/i.test(navigator.userAgent || "")) return true;
    return (
      window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(max-width: 820px)").matches
    );
  }

  function installDismissed() {
    try {
      return localStorage.getItem(INSTALL_KEY) === "1";
    } catch {
      return true;
    }
  }

  function dismissInstall() {
    try {
      localStorage.setItem(INSTALL_KEY, "1");
    } catch {
      /* private mode */
    }
    const prompt = document.getElementById("install-prompt");
    if (prompt) prompt.hidden = true;
  }

  function offerInstall() {
    const prompt = document.getElementById("install-prompt");
    if (!prompt || installDismissed() || !handheld()) {
      if (prompt) prompt.hidden = true;
      return;
    }
    const detail = document.getElementById("install-detail");
    const go = document.getElementById("install-go");
    if (isIos()) {
      detail.textContent = "Tap the Share button, then Add to Home Screen.";
      go.hidden = true;
    } else if (deferredInstall) {
      detail.textContent = "Add Sudoku to your home screen and it opens like an app.";
      go.hidden = false;
    } else {
      detail.textContent = "Open the browser menu and tap Add to Home Screen.";
      go.hidden = true;
    }
    prompt.hidden = false;
  }

  function buzz(pattern) {
    if (!settings.haptics || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* this device does not vibrate */
    }
  }

  function paintConfetti() {
    const host = document.querySelector("#solved-modal .confetti");
    host.replaceChildren();
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent-color").trim() || "#0c4f86";
    const lifted = style.getPropertyValue("--accent-on-dark").trim() || "#9ed2f8";
    const colors = [accent, lifted, "#1e232b", "#e6e9ed", "#2f9e44"];
    for (let i = 0; i < 18; i += 1) {
      const piece = document.createElement("span");
      piece.style.left = `${6 + Math.random() * 88}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${(i % 6) * 0.05}s`;
      host.appendChild(piece);
    }
  }

  function openStats() {
    const body = document.getElementById("stats-body");
    const rows = [["daily", "Daily"], ...ORDER.map((id) => [id, LABELS[id]])];
    const table = rows
      .map(([id, label]) => {
        const bucket = stats[id];
        const average = bucket.won ? formatTime(bucket.totalTime / bucket.won) : "–";
        return `<tr><th>${label}</th><td>${bucket.played}</td><td>${bucket.won}</td><td>${
          bucket.best == null ? "–" : formatTime(bucket.best)
        }</td><td>${average}</td></tr>`;
      })
      .join("");
    const hintHtml =
      window.SudokuProgress && window.SudokuProgress.hintMarkup
        ? window.SudokuProgress.hintMarkup(window.SudokuProgress.load(), {
            compact: true,
            live: {
              hints: techniqueHints().length,
              checks: state.checks | 0,
              practice: Boolean(state.practice || state.fastForwarded),
            },
          })
        : "";
    body.innerHTML = `<table class="stats-table"><thead><tr><th>Puzzle</th><th>Played</th><th>Won</th><th>Best</th><th>Average</th></tr></thead><tbody>${table}</tbody></table><p class="streak-line">Daily streak ${currentStreak()} · longest ${
      stats.daily.longestStreak || 0
    }</p>${hintHtml}<p class="streak-line"><a class="account-link" href="/skills/">Skill ladder</a></p>`;
    showModal("stats-modal");
  }

  function nextKind(kind) {
    if (kind === "daily") return "hard";
    const index = ORDER.indexOf(kind);
    return ORDER[(index + 1) % ORDER.length];
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    live.textContent = "";
    announceTimer = window.setTimeout(() => {
      live.textContent = message;
    }, 20);
  }

  function clearAnnounce() {
    window.clearTimeout(announceTimer);
    if (live) live.textContent = "";
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(writeSave, 150);
  }

  function slotId(source) {
    if (!source || typeof source === "string") return `sudoku-progress:${source || "easy"}`;
    if (source.practice) return `sudoku-progress:practice:${source.practice}`;
    if (source.train) return `sudoku-progress:train:${source.train}`;
    return `sudoku-progress:${source.kind || "easy"}`;
  }

  function requestKind(request) {
    return (request && request.kind) || "easy";
  }

  function puzzleMatches(saved, request) {
    if (!request || !request.puzzleId) return true;
    const ids = [saved.puzzleId, saved.givensId].filter(Boolean);
    return ids.includes(request.puzzleId);
  }

  function saveMatches(saved, request) {
    if (!saved || !inProgress(saved)) return false;
    if (request && request.practice) return saved.practice === request.practice && puzzleMatches(saved, request);
    if (request && request.train) return !saved.practice && saved.train === request.train && puzzleMatches(saved, request);
    if (saved.practice || saved.train) return false;
    if (saved.kind !== requestKind(request)) return false;
    return puzzleMatches(saved, request);
  }

  function freshRequest(request, kind) {
    const nextKind = requestKind(request) || kind || "easy";
    if (!request) return { kind: kind || "easy" };
    if (request.puzzleId && completionFor(request)) return { kind: nextKind };
    return request;
  }

  function readMatching(request) {
    const wanted = request && (request.practice || request.train || request.kind) ? request : { kind: "easy" };
    const slotted = loadStored(slotId(wanted), false);
    const legacy = loadStored(SAVE_KEY, false);
    const found = [];
    if (saveMatches(slotted, wanted)) found.push(slotted);
    if (saveMatches(legacy, wanted) && (!slotted || legacy !== slotted)) found.push(legacy);
    found.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
    return found[0] || null;
  }

  function loadStored(key, block) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      if (block) progressBlocked = true;
      return null;
    }
    if (raw == null) return null;
    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      if (block) progressBlocked = true;
      return null;
    }
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      if (block) progressBlocked = true;
      return null;
    }
    if ((saved.version | 0) !== 1) {
      if (block) progressBlocked = true;
      return null;
    }
    if (!Array.isArray(saved.puzzle) || saved.puzzle.length !== 81) {
      if (block) progressBlocked = true;
      return null;
    }
    if (!Array.isArray(saved.board) || saved.board.length !== 81) {
      if (block) progressBlocked = true;
      return null;
    }
    if (!Array.isArray(saved.solution) || saved.solution.length !== 81) {
      if (block) progressBlocked = true;
      return null;
    }
    if (!saved.updatedAt) saved.updatedAt = Date.now();
    return saved;
  }

  function readSave(kind) {
    if (kind) return readMatching(typeof kind === "string" ? { kind } : kind);
    return loadStored(SAVE_KEY, true);
  }

  function migrateLegacySave() {
    const keys = [SAVE_KEY, "quick", "easy", "not easy", "hard", "expert", "mental", "daily"].map((kind, index) =>
      index === 0 ? SAVE_KEY : `sudoku-progress:${kind}`
    );
    keys.forEach((key) => {
      const saved = loadStored(key, false);
      if (!saved || !inProgress(saved)) return;
      const dest = slotId(saved);
      if (dest === key) return;
      const slotted = loadStored(dest, false);
      const savedAt = Number(saved.updatedAt) || 0;
      const slotAt = slotted ? Number(slotted.updatedAt) || 0 : 0;
      try {
        if (!(slotted && slotAt > savedAt)) localStorage.setItem(dest, JSON.stringify(saved));
        if (key !== SAVE_KEY) localStorage.removeItem(key);
      } catch {
        /* private mode */
      }
    });
  }

  function storeSlot(kind, progress, at) {
    if (progressBlocked || !progress || !inProgress(progress)) return;
    const key = slotId(progress);
    const current = loadStored(key, false);
    const slotAt = current && current.updatedAt ? Number(current.updatedAt) : 0;
    if (!(at > slotAt)) return;
    const stamped = { ...progress, kind: progress.kind || kind, updatedAt: at };
    try {
      localStorage.setItem(key, JSON.stringify(stamped));
      const playing = Boolean(state.counted && !state.won);
      if (!playing || slotId(state) === key) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(stamped));
        localStorage.setItem("sudoku-progress-at", String(at));
      }
    } catch {
      /* private mode */
    }
  }

  function inProgress(saved) {
    if (!saved || saved.won || saved.over) return false;
    if (!Array.isArray(saved.board) || !Array.isArray(saved.solution)) return false;
    const solved = saved.board.every((value, index) => value === saved.solution[index] && value !== 0);
    return !solved;
  }

  function readCompleted() {
    try {
      const raw = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch {
      return {};
    }
  }

  function completionId(kind, puzzleId, dailyDate) {
    if (kind === "daily") return dailyDate ? `daily:${dailyDate}` : "";
    return puzzleId || "";
  }

  function completionFor(request) {
    if (!request) return null;
    const all = readCompleted();
    if (request.kind === "daily") {
      const record = all[`daily:${todayString()}`];
      return record && Array.isArray(record.solution) ? record : null;
    }
    if (!request.puzzleId) return null;
    const record = all[request.puzzleId];
    return record && Array.isArray(record.solution) ? record : null;
  }

  function isCompletedProgress(progress) {
    if (!progress) return false;
    const id = completionId(progress.kind, progress.puzzleId, progress.dailyDate);
    if (!id) return false;
    return Boolean(readCompleted()[id]);
  }

  function recordCompleted() {
    if (!state.solution || !state.solution.length) return;
    const ids = [];
    if (state.kind === "daily") {
      if (state.dailyDate) ids.push(`daily:${state.dailyDate}`);
    } else {
      const current = currentPuzzleId();
      if (current) ids.push(current);
      if (window.SudokuShare && Array.isArray(state.puzzle) && state.puzzle.length === 81) {
        const givensId = window.SudokuShare.idFromGivens(state.kind, state.puzzle);
        if (givensId && !ids.includes(givensId)) ids.push(givensId);
      }
    }
    if (!ids.length) return;
    const all = readCompleted();
    const record = {
      kind: state.kind,
      puzzleId: state.puzzleId || ids[0],
      dailyDate: state.dailyDate || null,
      elapsed: Math.floor(state.elapsed || 0),
      mistakes: state.mistakes || 0,
      puzzle: state.puzzle,
      solution: state.solution,
      at: Date.now(),
    };
    ids.forEach((id) => {
      all[id] = record;
    });
    const storedIds = Object.keys(all);
    if (storedIds.length > 40) {
      storedIds
        .sort((a, b) => (all[a].at || 0) - (all[b].at || 0))
        .slice(0, storedIds.length - 40)
        .forEach((key) => {
          delete all[key];
        });
    }
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(all));
    } catch {
      /* private mode */
    }
  }

  function clearSlot(source) {
    if (progressBlocked || !source) return;
    const key = slotId(source);
    const at = Date.now();
    try {
      localStorage.removeItem(key);
      const legacy = loadStored(SAVE_KEY, false);
      if (!legacy || slotId(legacy) === key) {
        localStorage.removeItem(SAVE_KEY);
        localStorage.setItem("sudoku-progress-at", String(at));
      }
    } catch {
      /* private mode */
    }
    noteAccount();
  }

  function clearSave() {
    clearSlot(state);
  }

  function writeSave() {
    if (progressBlocked) return;
    if (state.won || !state.counted || state.replaySolved) return;
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      kind: state.kind,
      dailyDate: state.dailyDate,
      puzzle: state.puzzle,
      solution: state.solution,
      board: state.board,
      notes: state.notes.map((set) => [...set]),
      removed: state.removed,
      mistakes: state.mistakes,
      slashed: [...state.slashed],
      undo: state.undo,
      selected: state.selected,
      mode: state.mode,
      elapsed: state.elapsed,
      auto: state.auto,
      counted: state.counted,
      scored: state.scored,
      metadata: state.metadata,
      hintSlugs: techniqueHints(),
      checks: state.checks | 0,
      train: state.train || null,
      practice: state.practice || null,
      practiceMiss: Boolean(state.practiceMiss),
      practiceFilled: Boolean(state.practiceFilled),
      fastForwarded: Boolean(state.fastForwarded),
      baseRemoved: (state.baseRemoved || []).map((item) => ({ index: item.index, digit: item.digit })),
      puzzleId: state.puzzleId || null,
      givensId:
        window.SudokuShare && state.kind !== "daily" && Array.isArray(state.puzzle)
          ? window.SudokuShare.idFromGivens(state.kind, state.puzzle) || null
          : null,
      anonPlayId: state.anonPlayId || null,
      notesUsed: Boolean(state.notesUsed),
      over: Boolean(state.over),
    };
    if (!state.practice && window.SudokuCommunity && (state.anonPlayId || state.gameplayMarked)) {
      window.SudokuCommunity.noteProgress(communitySnapshot(state.over ? "failed" : "abandoned"));
    }
    try {
      localStorage.setItem(slotId(state), JSON.stringify(payload));
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      localStorage.setItem("sudoku-progress-at", String(payload.updatedAt));
    } catch {
      /* private mode */
    }
    noteAccount();
  }

  function restoreSave(saved) {
    state = blankState();
    state.kind = saved.kind;
    state.dailyDate = saved.dailyDate;
    state.puzzle = saved.puzzle.slice();
    state.solution = saved.solution.slice();
    state.board = saved.board.slice();
    state.notes = saved.notes.map((list) => new Set(list));
    state.removed = Array.isArray(saved.removed)
      ? saved.removed.map((item) => ({ index: item.index, digit: item.digit }))
      : [];
    state.mistakes = saved.mistakes || 0;
    state.slashed = new Set(saved.slashed || []);
    state.undo = Array.isArray(saved.undo) ? saved.undo : [];
    state.selected = saved.selected || 0;
    state.mode = saved.mode === "notes" ? "notes" : "normal";
    state.elapsed = saved.elapsed || 0;
    state.auto = Boolean(saved.auto);
    state.counted = true;
    state.scored = Boolean(saved.scored);
    state.metadata = saved.metadata;
    state.hintSlugs = Array.isArray(saved.hintSlugs) ? saved.hintSlugs.filter((slug) => typeof slug === "string") : [];
    state.checks = Math.max(0, saved.checks | 0);
    techniqueHints();
    state.train = typeof saved.train === "string" ? saved.train : null;
    state.practice = typeof saved.practice === "string" ? saved.practice : null;
    state.practiceMiss = Boolean(saved.practiceMiss);
    state.practiceFilled = Boolean(saved.practiceFilled);
    state.fastForwarded = Boolean(saved.fastForwarded);
    state.baseRemoved = Array.isArray(saved.baseRemoved)
      ? saved.baseRemoved.map((item) => ({ index: item.index, digit: item.digit }))
      : [];
    state.puzzleId = typeof saved.puzzleId === "string" ? saved.puzzleId : null;
    state.anonPlayId = typeof saved.anonPlayId === "string" ? saved.anonPlayId : null;
    state.notesUsed = Boolean(saved.notesUsed || saved.auto);
    autoBox.checked = state.auto;
    writeUrl(state.kind);
    render();
    resume();
    if (window.SudokuCommunity) window.SudokuCommunity.paintLine(state.kind);
    announce("Game resumed");
  }

  function resumeText(saved) {
    if (saved.practice && window.SudokuProgress) {
      return `Practice · ${window.SudokuProgress.nameOf(saved.practice)} is in progress at ${formatTime(saved.elapsed || 0)}.`;
    }
    const name = saved.kind === "daily" ? `Daily · ${formatDay(saved.dailyDate)}` : LABELS[saved.kind] || "Saved";
    return `${name} is in progress at ${formatTime(saved.elapsed || 0)}.`;
  }
})();
