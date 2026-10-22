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

  function savedTheme() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return stored.theme || "system";
    } catch {
      return "system";
    }
  }

  function applyDocumentTheme(theme) {
    const dark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }

  applyDocumentTheme(savedTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    applyDocumentTheme(savedTheme());
  });

  initNavigation();

  const grid = document.getElementById("sudoku-grid");
  if (!grid || !window.SudokuGenerator) return;

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
  };

  let settings = loadSettings();
  let stats = loadStats();
  let cells = [];
  let state = blankState();
  let lastTick = 0;
  let saveTimer = 0;
  let pendingRequest = null;
  let generation = 0;
  let busy = false;
  let hintView = null;
  let hoverIndex = null;
  let finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let keyboardNav = false;

  applyTheme();
  buildGrid();
  buildPad();
  bindControls();
  syncSettingsForm();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  setInterval(tick, 250);
  document.addEventListener("visibilitychange", onVisibility);

  const saved = readSave();
  pendingRequest = requestFromUrl();
  if (saved) {
    showModal("resume-modal");
    document.getElementById("resume-detail").textContent = resumeText(saved);
  } else {
    beginNew(pendingRequest || { kind: "easy" }, { count: true });
  }

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
      won: false,
      revealed: false,
      scored: false,
      counted: false,
      auto: false,
      metadata: null,
      removed: [],
    };
  }

  function emptyNotes() {
    return Array.from({ length: 81 }, () => new Set());
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return { ...defaultSettings, ...stored };
    } catch {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
  }

  function freshStats() {
    const bucket = () => ({ played: 0, won: 0, best: null, totalTime: 0 });
    const stats = { daily: { ...bucket(), completed: {}, longestStreak: 0 } };
    ORDER.forEach((id) => {
      stats[id] = bucket();
    });
    return stats;
  }

  function loadStats() {
    try {
      const stored = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
      const base = freshStats();
      if (!stored) return base;
      for (const key of Object.keys(base)) {
        base[key] = { ...base[key], ...(stored[key] || {}) };
      }
      base.daily.completed = stored.daily?.completed || {};
      return base;
    } catch {
      return freshStats();
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      /* private mode */
    }
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
    const dark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }

  function requestFromUrl() {
    const params = new URLSearchParams(window.location.search);
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
    url.search = kind === "daily" ? "?daily" : `?difficulty=${kind.replace(/\s+/g, "-")}`;
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
        button.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "touch") finePointer = false;
          if (event.pointerType === "mouse") {
            finePointer = true;
            keyboardNav = false;
          }
        });
        button.addEventListener("pointerenter", (event) => {
          if (event.pointerType !== "mouse") return;
          setHover(index);
        });
        button.addEventListener("pointerleave", () => {
          if (hoverIndex === index) setHover(null);
        });
        rowEl.appendChild(button);
        cells.push(button);
      }
      grid.appendChild(rowEl);
    }
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
      button.append(map, digit);
      button.setAttribute("aria-label", `Number ${n}`);
      button.addEventListener("click", () => onNumber(n));
      pad.appendChild(button);
    }
  }

  function bindControls() {
    document.querySelectorAll(".difficulty-tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.difficulty;
        beginNew({ kind }, { count: true });
      });
    });
    document.getElementById("mode-normal").addEventListener("click", () => setMode("normal"));
    document.getElementById("mode-notes").addEventListener("click", () => setMode("notes"));
    document.getElementById("erase-btn").addEventListener("click", () => erase(state.selected));
    document.getElementById("hint-btn").addEventListener("click", () => advanceHint());
    document.getElementById("hint-next").addEventListener("click", () => advanceHint());
    document.getElementById("hint-dismiss").addEventListener("click", () => dismissHint());
    bindHintSwipe();
    undoBtn.addEventListener("click", undo);
    pauseBtn.addEventListener("click", () => {
      if (state.running) pause(true);
      else if (!state.won && !state.over) resume();
    });
    document.getElementById("resume-btn").addEventListener("click", resume);
    autoBox.addEventListener("change", () => {
      state.auto = autoBox.checked;
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
      if (!moreMenu.contains(event.target) && event.target !== moreBtn) closeMenu();
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
      const savedGame = readSave();
      if (savedGame) restoreSave(savedGame);
      else beginNew(pendingRequest || { kind: "easy" }, { count: true });
    });
    document.getElementById("resume-no").addEventListener("click", () => {
      hideModal("resume-modal");
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* private mode */
      }
      beginNew(pendingRequest || { kind: "easy" }, { count: true });
    });
    document.getElementById("solved-new").addEventListener("click", () => {
      hideModal("solved-modal");
      beginNew({ kind: state.kind }, { count: true });
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
      beginNew({ kind: state.kind }, { count: true });
    });
    document.addEventListener("keydown", onKey);
  }

  function onSettingChange(event) {
    const input = event.target;
    if (input.name === "theme") settings.theme = input.value;
    else if (input.dataset.setting) settings[input.dataset.setting] = input.checked;
    saveSettings();
    applyTheme();
    if (input.dataset.setting === "autoCandidates" && !state.won) {
      state.auto = settings.autoCandidates;
      autoBox.checked = state.auto;
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

  function beginNew(request, { count }) {
    dismissHint();
    const kind = request.kind || "easy";
    const date = todayString();
    const token = ++generation;
    busy = true;
    state.running = false;
    setCover(true, "Shuffling a puzzle…", false);
    window.setTimeout(() => {
      if (token !== generation) return;
      const seeded = kind === "daily";
      const difficulty = seeded ? DAILY : kind;
      const result = window.SudokuGenerator.generate(
        difficulty,
        seeded ? `daily:${date}` : undefined
      );
      const already = seeded && stats.daily.completed[date];
      state = blankState();
      state.kind = kind;
      state.dailyDate = seeded ? date : null;
      state.puzzle = result.puzzle.slice();
      state.solution = result.solution.slice();
      state.board = result.puzzle.slice();
      state.metadata = result.metadata;
      state.auto = settings.autoCandidates;
      state.selected = firstEmpty();
      autoBox.checked = state.auto;
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
      if (count) recordStart();
      state.counted = true;
      busy = false;
      render();
      setCover(false);
      resume();
      announce(`${labelFor(kind)} puzzle ready`);
      writeSave();
    }, 30);
  }

  function recordStart() {
    const key = state.kind === "daily" ? "daily" : state.kind;
    if (key === "daily" && stats.daily.completed[state.dailyDate]) return;
    stats[key].played += 1;
    saveStats();
  }

  function recordWin() {
    if (state.revealed) return;
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
      return;
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
  }

  function select(index, focus) {
    if (index < 0 || index > 80) return;
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
    if (state.mode === "notes") toggleNote(state.selected, number);
    else place(state.selected, number);
  }

  function place(index, number) {
    if (state.puzzle[index] !== 0 || state.board[index] === number) return;
    dismissHint();
    pushUndo();
    if (number !== state.solution[index]) state.removed = [];
    state.board[index] = number;
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
        render();
        showModal("over-modal");
        writeSave();
        return;
      }
    } else {
      state.slashed.delete(index);
    }
    render();
    if (isSolved()) finish(false);
    else writeSave();
  }

  function toggleNote(index, number) {
    if (state.puzzle[index] !== 0 || state.board[index] !== 0) return;
    pushUndo();
    if (state.notes[index].has(number)) state.notes[index].delete(number);
    else state.notes[index].add(number);
    render();
    writeSave();
  }

  function erase(index) {
    if (blocked() || state.puzzle[index] !== 0) return;
    if (state.board[index] === 0 && state.notes[index].size === 0) return;
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
    dismissHint();
  }

  function openHint() {
    const wrong = firstWrong();
    if (wrong >= 0) {
      hintView = { kind: "wrong", stage: 1, index: wrong, key: hintKey() };
      showHint();
      return;
    }
    const solverApi = window.SudokuSolver;
    const step = solverApi && solverApi.explain ? solverApi.explain(state.board, state.removed) : null;
    if (!step) {
      announce("No logical step from here");
      return;
    }
    hintView = { kind: "step", stage: 1, step, key: hintKey() };
    showHint();
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
      kicker.textContent = "Check the board";
      if (hintView.stage === 1) {
        text.textContent = "A digit on the board is wrong, so the next technique wouldn't be trustworthy.";
        next.textContent = "Show it";
      } else if (hintView.stage === 2) {
        text.textContent = `The ${digit} in row ${row}, column ${col} doesn't belong.`;
        next.textContent = "Clear it";
      } else {
        text.textContent = `Cleared the wrong digit in row ${row}, column ${col}.`;
        next.hidden = true;
      }
    } else {
      const step = hintView.step;
      kicker.textContent = step.name;
      learn.hidden = false;
      learn.href = `/techniques/${step.slug}`;
      if (hintView.stage === 1) {
        text.textContent = step.look;
        next.textContent = "Show why";
      } else if (hintView.stage === 2) {
        text.textContent = step.explain;
        next.textContent = step.place ? "Place it" : "Apply";
      } else {
        text.textContent = step.place
          ? `${step.explain} Placed ${step.place.digit}.`
          : `${step.explain} Those candidates are gone.`;
        next.hidden = true;
      }
    }
    render();
    announce(text.textContent);
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
      hintView.key = hintKey();
      showHint();
      writeSave();
      return;
    }
    const step = hintView.step;
    pushUndo();
    (step.eliminate || []).forEach((item) => {
      state.notes[item.index].delete(item.digit);
      if (!state.removed.some((kept) => kept.index === item.index && kept.digit === item.digit)) {
        state.removed.push({ index: item.index, digit: item.digit });
      }
    });
    if (
      step.place &&
      state.puzzle[step.place.index] === 0 &&
      step.place.digit === state.solution[step.place.index] &&
      state.board[step.place.index] !== step.place.digit
    ) {
      const digit = step.place.digit;
      const index = step.place.index;
      state.board[index] = digit;
      state.notes[index].clear();
      state.slashed.delete(index);
      peerIndexes(index).forEach((other) => state.notes[other].delete(digit));
    }
    state.removed = state.removed.filter((item) => state.board[item.index] === 0);
    hintView.stage = 3;
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
    state.removed = [];
    state.undo = [];
    state.mistakes = 0;
    dismissHint();
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
    state.board = snap.board;
    state.notes = snap.notes.map((list) => new Set(list));
    state.removed = (snap.removed || []).map((item) => ({ index: item.index, digit: item.digit }));
    state.mistakes = snap.mistakes;
    state.slashed = new Set(snap.slashed);
    state.won = snap.won;
    state.revealed = snap.revealed;
    state.over = snap.over;
    if (!state.over) hideModal("over-modal");
    if (!state.won) hideModal("solved-modal");
    render();
    if (!state.won && !state.over && !state.userPaused) resume();
    writeSave();
  }

  function pushUndo() {
    state.undo.push({
      board: state.board.slice(),
      notes: state.notes.map((set) => [...set]),
      mistakes: state.mistakes,
      slashed: [...state.slashed],
      removed: state.removed.map((item) => ({ index: item.index, digit: item.digit })),
      won: state.won,
      revealed: state.revealed,
      over: state.over,
    });
    if (state.undo.length > 80) state.undo.shift();
  }

  function finish(revealed) {
    hintView = null;
    const hintSheet = document.getElementById("hint-sheet");
    if (hintSheet) hintSheet.hidden = true;
    state.revealed = revealed;
    state.won = true;
    state.undo = [];
    state.userPaused = false;
    state.hidePaused = false;
    pause(false);
    if (!revealed) recordWin();
    render();
    showSolved(false);
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* private mode */
    }
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
    const found = new Set();
    if (state.board[index] !== 0) return found;
    for (let number = 1; number <= 9; number += 1) {
      let ok = true;
      for (const other of peerIndexes(index)) {
        if (state.board[other] === number) {
          ok = false;
          break;
        }
      }
      if (ok && !state.removed.some((item) => item.index === index && item.digit === number)) found.add(number);
    }
    return found;
  }

  function setHover(index) {
    if (hoverIndex === index) return;
    hoverIndex = index;
    render();
  }

  // Possible digits are a preview: under the pointer, on the selected cell
  // when there is no hover (touch) or when the player is moving with the keyboard.
  // Manual notes stay a separate mark and are not written by the preview.
  function wantsPreview(index) {
    if (state.board[index] !== 0) return false;
    if (index === hoverIndex) return true;
    if (index !== state.selected) return false;
    return !finePointer || keyboardNav;
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
        hint.step.eliminate.forEach((item) => {
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
      cell.classList.toggle("hint-eliminate", hint && hint.stage >= 2 && hintEliminate.has(index));
      cell.classList.toggle("hint-place", hint && hint.stage >= 2 && index === hintPlace);
      cell.setAttribute("aria-selected", selected ? "true" : "false");
      cell.dataset.value = String(value);
      cell.replaceChildren();
      if (value) {
        cell.append(document.createTextNode(String(value)));
      } else {
        const marks = document.createElement("span");
        marks.className = "marks";
        marks.setAttribute("aria-hidden", "true");
        const computed = state.auto || wantsPreview(index) ? candidatesFor(index) : null;
        const ghost = hint && hint.stage === 2 ? hintCandidates.get(index) : null;
        const struck = hint && hint.stage === 2 ? hintStruck.get(index) : null;
        for (let number = 1; number <= 9; number += 1) {
          const mark = document.createElement("span");
          mark.dataset.digit = String(number);
          mark.textContent = String(number);
          if (struck && struck.has(number)) mark.classList.add("on", "struck");
          else if (ghost && ghost.has(number)) mark.classList.add("on", "hint-note");
          else if (state.notes[index].has(number)) mark.classList.add("on", "user-note");
          else if (computed && computed.has(number)) mark.classList.add("on", state.auto ? "auto" : "preview");
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
    labelEl.textContent = labelFor(state.kind);
    timerEl.textContent = formatTime(state.elapsed);
    timerEl.parentElement.classList.toggle("is-hidden", !settings.showTimer);
    mistakeEl.classList.toggle("is-hidden", !settings.showMistakes);
    mistakeEl.querySelectorAll(".dots i").forEach((dot, index) => {
      dot.classList.toggle("used", index < state.mistakes);
    });
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
      segments.forEach((segment, box) => {
        const on = boxHas[number][box];
        segment.classList.toggle("on", on);
        if (on) filled += 1;
      });
      button.classList.toggle("complete", filled === 9);
      button.setAttribute(
        "aria-label",
        settings.showBoxMap ? `Number ${number}, in ${filled} of 9 boxes` : `Number ${number}`
      );
    });
    pauseBtn.textContent = state.running ? "Pause" : "Resume";
    pauseBtn.setAttribute("aria-label", state.running ? "Pause timer" : "Resume timer");
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
      if (state.auto || wantsPreview(index)) {
        const candidates = [...candidatesFor(index)].filter((number) => !notes.includes(number));
        if (candidates.length) text += `, candidates ${candidates.join(", ")}`;
      }
    } else if (given) text += `, given ${value}`;
    else text += state.slashed.has(index) ? `, your ${value}, incorrect` : `, your ${value}`;
    if (index === state.selected) text += ", selected";
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

  function labelFor(kind) {
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
    if (!state.running) return;
    const now = performance.now();
    state.elapsed += (now - lastTick) / 1000;
    lastTick = now;
    timerEl.textContent = formatTime(state.elapsed);
    if (Math.floor(state.elapsed) % 5 === 0) scheduleSave();
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

  function showBoardCover(text) {
    const show = Boolean(text);
    boardWrap.classList.toggle("is-paused", show);
    cover.hidden = !show;
    if (show) coverText.textContent = text;
    document.getElementById("resume-btn").hidden = text !== "Paused";
  }

  function setCover(show, text, withButton) {
    boardWrap.classList.toggle("is-paused", show);
    cover.hidden = !show;
    if (show) coverText.textContent = text;
    document.getElementById("resume-btn").hidden = !withButton;
  }

  function onVisibility() {
    if (document.hidden) {
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
    if (event.key === "Tab") keyboardNav = true;
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
      keyboardNav = true;
      select(next, true);
    }
  }

  function openModal() {
    return document.querySelector(".modal:not([hidden])");
  }

  function showModal(id) {
    const modal = document.getElementById(id);
    modal.hidden = false;
    const focus = modal.querySelector("button, input");
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

  function showSolved(already) {
    const title = document.getElementById("solved-title");
    const summary = document.getElementById("solved-summary");
    const extra = document.getElementById("solved-stats");
    title.textContent = state.revealed ? "Puzzle revealed" : already ? "Completed" : "Solved";
    const bits = [
      labelFor(state.kind),
      formatTime(state.elapsed),
      `${state.mistakes} ${state.mistakes === 1 ? "mistake" : "mistakes"}`,
    ];
    summary.textContent = bits.join(" · ");
    const bucket = stats[state.kind === "daily" ? "daily" : state.kind];
    const average = bucket.won ? formatTime(bucket.totalTime / bucket.won) : "–";
    extra.textContent =
      state.kind === "daily"
        ? `Streak ${currentStreak()} · best ${bucket.best == null ? "–" : formatTime(bucket.best)} · won ${bucket.won}`
        : `Won ${bucket.won} of ${bucket.played} · best ${bucket.best == null ? "–" : formatTime(bucket.best)} · average ${average}`;
    paintConfetti();
    showModal("solved-modal");
    announce(title.textContent);
  }

  function paintConfetti() {
    const host = document.querySelector("#solved-modal .confetti");
    host.replaceChildren();
    const colors = ["#ef7d12", "#1d5c78", "#bf3978", "#f4efe6", "#2f9e44"];
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
    body.innerHTML = `<table class="stats-table"><thead><tr><th>Puzzle</th><th>Played</th><th>Won</th><th>Best</th><th>Average</th></tr></thead><tbody>${table}</tbody></table><p class="streak-line">Daily streak ${currentStreak()} · longest ${
      stats.daily.longestStreak || 0
    }</p>`;
    showModal("stats-modal");
  }

  function nextKind(kind) {
    if (kind === "daily") return "hard";
    const index = ORDER.indexOf(kind);
    return ORDER[(index + 1) % ORDER.length];
  }

  function announce(message) {
    live.textContent = "";
    window.setTimeout(() => {
      live.textContent = message;
    }, 20);
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(writeSave, 150);
  }

  function writeSave() {
    if (state.won || !state.counted) return;
    const payload = {
      version: 1,
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
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      /* private mode */
    }
  }

  function readSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!saved || saved.version !== 1) return null;
      if (!Array.isArray(saved.puzzle) || saved.puzzle.length !== 81) return null;
      if (!Array.isArray(saved.board) || saved.board.length !== 81) return null;
      if (!Array.isArray(saved.solution) || saved.solution.length !== 81) return null;
      return saved;
    } catch {
      return null;
    }
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
    autoBox.checked = state.auto;
    writeUrl(state.kind);
    render();
    resume();
    announce("Game resumed");
  }

  function resumeText(saved) {
    const name = saved.kind === "daily" ? `Daily · ${formatDay(saved.dailyDate)}` : LABELS[saved.kind] || "Saved";
    return `${name} is in progress at ${formatTime(saved.elapsed || 0)}.`;
  }
})();
