// Merge rules for the optional account. The Pages Functions import this file.
// The build copies it into the browser bundle. Keep it free of imports.

export const BUNDLE_VERSION = 1;
export const STATS_VERSION = 1;
export const SKILLS_VERSION = 1;
export const SETTINGS_VERSION = 1;
export const PROGRESS_VERSION = 1;

export const LEVELS = ["quick", "easy", "not easy", "hard", "expert", "mental"];
const LEVEL_KEYS = ["daily", ...LEVELS];

const TECHNIQUES = [
  "naked-single",
  "hidden-single",
  "pointing",
  "claiming",
  "naked-pair",
  "hidden-pair",
  "naked-triple",
  "hidden-triple",
  "quads",
  "x-wing",
  "swordfish",
  "xy-wing",
  "coloring",
  "xy-chain",
];
const TECHNIQUE_SET = new Set(TECHNIQUES);

const SETTING_FLAGS = [
  "checkGuesses",
  "showTimer",
  "showMistakes",
  "autoCandidates",
  "highlightRowCol",
  "highlightBox",
  "highlightSame",
  "highlightConflicts",
  "showBoxMap",
  "haptics",
  "shareStats",
  "showCommunityStats",
];
const THEMES = new Set(["system", "light", "dark"]);
const KINDS = new Set(["daily", ...LEVELS]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_LIMIT = 200;

function emptyBucket() {
  return { played: 0, won: 0, best: null, totalTime: 0 };
}

export function emptyStats() {
  const stats = {
    version: STATS_VERSION,
    daily: { ...emptyBucket(), completed: {}, longestStreak: 0 },
  };
  LEVELS.forEach((level) => {
    stats[level] = emptyBucket();
  });
  return stats;
}

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampCount(value) {
  const number = finite(value);
  if (number == null || number < 0) return 0;
  return Math.min(1_000_000, Math.round(number));
}

function bucketFrom(row) {
  const bucket = emptyBucket();
  if (!row || typeof row !== "object") return bucket;
  bucket.played = clampCount(row.played);
  bucket.won = clampCount(row.won);
  bucket.totalTime = clampCount(row.totalTime);
  const best = finite(row.best);
  if (best != null && best >= 0 && best < 1_000_000) bucket.best = best;
  return bucket;
}

function completedFrom(raw) {
  const completed = {};
  if (!raw || typeof raw !== "object") return completed;
  const days = Object.keys(raw).filter((day) => DAY.test(day)).sort();
  days.slice(-4000).forEach((day) => {
    const row = raw[day];
    const time = row && finite(row.time);
    if (time == null || time < 0 || time > 100_000) return;
    completed[day] = { time, mistakes: clampCount(row.mistakes) };
  });
  return completed;
}

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function longestRun(completed) {
  const days = Object.keys(completed || {}).sort();
  let best = 0;
  let run = 0;
  let prev = "";
  days.forEach((day) => {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  });
  return best;
}

function applyStats(base, source) {
  if (!source || typeof source !== "object") return;
  LEVEL_KEYS.forEach((key) => {
    const row = source[key];
    if (!row || typeof row !== "object") return;
    const bucket = bucketFrom(row);
    base[key].played = Math.max(base[key].played, bucket.played);
    base[key].won = Math.max(base[key].won, bucket.won);
    base[key].totalTime = Math.max(base[key].totalTime, bucket.totalTime);
    if (bucket.best != null) {
      base[key].best = base[key].best == null ? bucket.best : Math.min(base[key].best, bucket.best);
    }
    if (key !== "daily") return;
    base.daily.longestStreak = Math.max(base.daily.longestStreak, clampCount(row.longestStreak));
    const completed = completedFrom(row.completed);
    Object.keys(completed).forEach((day) => {
      const next = completed[day];
      const prev = base.daily.completed[day];
      if (!prev || next.time < prev.time) base.daily.completed[day] = next;
    });
  });
}

export function mergeStats(local, incoming) {
  const base = emptyStats();
  applyStats(base, local);
  applyStats(base, incoming);
  base.daily.longestStreak = Math.max(base.daily.longestStreak, longestRun(base.daily.completed));
  return base;
}

export function migrateStats(stored) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return { ok: false };
  const version = stored.version == null ? 0 : stored.version | 0;
  if (!Number.isFinite(version) || version > STATS_VERSION) return { ok: false, future: version > STATS_VERSION };
  return { ok: true, stats: mergeStats(stored, null), changed: version < STATS_VERSION };
}

const LEDGER_LEVELS = ["daily", ...LEVELS];

function emptyLevel() {
  return { solves: 0, hints: 0, clean: 0, checks: 0 };
}

function sanitizeLevel(row) {
  const base = emptyLevel();
  if (!row || typeof row !== "object") return base;
  base.solves = clampCount(row.solves);
  base.hints = clampCount(row.hints);
  base.clean = Math.min(base.solves, clampCount(row.clean));
  base.checks = clampCount(row.checks);
  return base;
}

function levelChecks(totals) {
  return Object.keys(totals.levels || {}).reduce((sum, level) => sum + (totals.levels[level].checks | 0), 0);
}

function sanitizeTotals(raw) {
  const totals = { checks: 0, levels: {} };
  if (!raw || typeof raw !== "object") return totals;
  LEDGER_LEVELS.forEach((level) => {
    if (!raw.levels || !raw.levels[level]) return;
    const row = sanitizeLevel(raw.levels[level]);
    if (row.solves || row.hints || row.checks) totals.levels[level] = row;
  });
  totals.checks = Math.max(clampCount(raw.checks), levelChecks(totals));
  return totals;
}

function totalsFromHistory(history) {
  const totals = { checks: 0, levels: {} };
  (history || []).forEach((item) => {
    if (!item) return;
    const level = LEDGER_LEVELS.includes(item.level) ? item.level : "easy";
    if (!totals.levels[level]) totals.levels[level] = emptyLevel();
    const row = totals.levels[level];
    const hints = clampCount(item.hints);
    const checks = clampCount(item.checks);
    row.solves += 1;
    row.hints += hints;
    if (!hints) row.clean += 1;
    row.checks += checks;
    totals.checks += checks;
  });
  return totals;
}

function mergeLevel(left, right) {
  const solves = Math.max(left.solves | 0, right.solves | 0);
  return {
    solves,
    hints: Math.max(left.hints | 0, right.hints | 0),
    clean: Math.min(solves, Math.max(left.clean | 0, right.clean | 0)),
    checks: Math.max(left.checks | 0, right.checks | 0),
  };
}

function mergeTotals(left, right) {
  const levels = {};
  LEDGER_LEVELS.forEach((level) => {
    const a = left && left.levels && left.levels[level];
    const b = right && right.levels && right.levels[level];
    if (!a && !b) return;
    levels[level] = mergeLevel(a || emptyLevel(), b || emptyLevel());
  });
  const merged = { checks: Math.max(clampCount(left && left.checks), clampCount(right && right.checks)), levels };
  merged.checks = Math.max(merged.checks, levelChecks(merged));
  return merged;
}

function freshSkills() {
  return { version: SKILLS_VERSION, techniques: {}, badges: [], history: [], bestLevel: null, seeded: false, hintTotals: null };
}

function sanitizeHistory(item) {
  if (!item || typeof item !== "object" || typeof item.at !== "string" || item.at.length > 40) return null;
  const hinted = Array.isArray(item.hinted) ? item.hinted.filter((slug) => TECHNIQUE_SET.has(slug)).slice(0, 20) : [];
  const path = Array.isArray(item.path) ? item.path.filter((slug) => TECHNIQUE_SET.has(slug)).slice(0, 20) : [];
  return {
    at: item.at,
    level: typeof item.level === "string" ? item.level.slice(0, 20) : "easy",
    seconds: clampCount(item.seconds),
    mistakes: clampCount(item.mistakes),
    hints: clampCount(item.hints),
    checks: clampCount(item.checks),
    hinted,
    path,
  };
}

function historyKey(item) {
  return `${item.at}|${item.level}|${item.seconds}|${item.mistakes}`;
}

function uniqueSlugs(list) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach((slug) => {
    if (TECHNIQUE_SET.has(slug) && !out.includes(slug)) out.push(slug);
  });
  return out.slice(0, 30);
}

export function mergeSkills(local, incoming) {
  const next = freshSkills();
  const left = local && typeof local === "object" ? local : {};
  const right = incoming && typeof incoming === "object" ? incoming : {};
  const leftHad = Boolean(left.hintTotals && typeof left.hintTotals === "object");
  const rightHad = Boolean(right.hintTotals && typeof right.hintTotals === "object");
  const leftLedger = leftHad ? sanitizeTotals(left.hintTotals) : null;
  const rightLedger = rightHad ? sanitizeTotals(right.hintTotals) : null;
  const leftHistory = Array.isArray(left.history) ? left.history : [];
  const rightHistory = Array.isArray(right.history) ? right.history : [];
  TECHNIQUES.forEach((slug) => {
    const a = left.techniques && left.techniques[slug];
    const b = right.techniques && right.techniques[slug];
    if (!a && !b) return;
    next.techniques[slug] = {
      seen: Math.max(clampCount(a && a.seen), clampCount(b && b.seen)),
      clean: Math.max(clampCount(a && a.clean), clampCount(b && b.clean)),
      hinted: Math.max(clampCount(a && a.hinted), clampCount(b && b.hinted)),
    };
  });
  const badges = new Set();
  [left.badges, right.badges].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((id) => {
      if (typeof id === "string" && /^[a-z0-9-]{1,48}$/.test(id)) badges.add(id);
    });
  });
  next.badges = [...badges].slice(0, 64);
  const seen = new Map();
  next.history = [];
  [leftHistory, rightHistory].forEach((list) => {
    list.forEach((item) => {
      const clean = sanitizeHistory(item);
      if (!clean) return;
      const key = historyKey(clean);
      const prev = seen.get(key);
      if (prev) {
        if ((clean.checks | 0) > (prev.checks | 0)) prev.checks = clean.checks;
        return;
      }
      seen.set(key, clean);
      next.history.push(clean);
    });
  });
  next.history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  if (next.history.length > HISTORY_LIMIT) next.history.length = HISTORY_LIMIT;
  if (!leftHad && !rightHad) next.hintTotals = totalsFromHistory(next.history);
  else {
    next.hintTotals = mergeTotals(
      leftLedger || totalsFromHistory(leftHistory),
      rightLedger || totalsFromHistory(rightHistory)
    );
  }
  const leftLevel = LEVELS.includes(left.bestLevel) ? left.bestLevel : null;
  const rightLevel = LEVELS.includes(right.bestLevel) ? right.bestLevel : null;
  if (!leftLevel) next.bestLevel = rightLevel;
  else if (!rightLevel) next.bestLevel = leftLevel;
  else next.bestLevel = LEVELS.indexOf(rightLevel) > LEVELS.indexOf(leftLevel) ? rightLevel : leftLevel;
  next.seeded = Boolean(left.seeded || right.seeded);
  return next;
}

export function migrateSkills(stored) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return { ok: false };
  const version = stored.version == null ? 0 : stored.version | 0;
  if (!Number.isFinite(version) || version > SKILLS_VERSION) return { ok: false, future: version > SKILLS_VERSION };
  return { ok: true, skills: mergeSkills(stored, null), changed: version < SKILLS_VERSION };
}

export function sanitizeSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const settings = { version: SETTINGS_VERSION };
  if (THEMES.has(input.theme)) settings.theme = input.theme;
  SETTING_FLAGS.forEach((key) => {
    if (typeof input[key] === "boolean") settings[key] = input[key];
  });
  const updatedAt = finite(input.updatedAt);
  if (updatedAt != null && updatedAt > 0) settings.updatedAt = updatedAt;
  return settings;
}

export function mergeSettings(local, incoming) {
  const left = sanitizeSettings(local) || { version: SETTINGS_VERSION };
  const right = sanitizeSettings(incoming) || { version: SETTINGS_VERSION };
  const leftAt = left.updatedAt || 0;
  const rightAt = right.updatedAt || 0;
  const older = leftAt > rightAt ? right : left;
  const newer = leftAt > rightAt ? left : right;
  return { ...older, ...newer, version: SETTINGS_VERSION, updatedAt: Math.max(leftAt, rightAt) || undefined };
}

export function migrateSettings(stored) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return { ok: false };
  const version = stored.version == null ? 0 : stored.version | 0;
  if (!Number.isFinite(version) || version > SETTINGS_VERSION) return { ok: false, future: version > SETTINGS_VERSION };
  const settings = sanitizeSettings(stored);
  if (!settings) return { ok: false };
  return { ok: true, settings, changed: version < SETTINGS_VERSION };
}

function cellLine(value) {
  if (!Array.isArray(value) || value.length !== 81) return null;
  const cells = [];
  for (let index = 0; index < 81; index += 1) {
    const number = value[index];
    if (!Number.isInteger(number) || number < 0 || number > 9) return null;
    cells.push(number);
  }
  return cells;
}

function notesFrom(value) {
  const empty = () => Array.from({ length: 81 }, () => []);
  if (!Array.isArray(value) || value.length !== 81) return empty();
  return value.map((list) => {
    if (!Array.isArray(list)) return [];
    const digits = [];
    list.forEach((item) => {
      const number = item | 0;
      if (number >= 1 && number <= 9 && !digits.includes(number)) digits.push(number);
    });
    return digits;
  });
}

export function sanitizeProgress(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if ((input.version | 0) !== PROGRESS_VERSION) return null;
  if (!KINDS.has(input.kind)) return null;
  const puzzle = cellLine(input.puzzle);
  const solution = cellLine(input.solution);
  const board = cellLine(input.board);
  if (!puzzle || !solution || !board) return null;
  const updatedAt = finite(input.updatedAt);
  const progress = {
    version: PROGRESS_VERSION,
    kind: input.kind,
    dailyDate: typeof input.dailyDate === "string" && DAY.test(input.dailyDate) ? input.dailyDate : null,
    puzzle,
    solution,
    board,
    notes: notesFrom(input.notes),
    removed: Array.isArray(input.removed)
      ? input.removed.slice(0, 81).filter((item) => item && Number.isInteger(item.index) && Number.isInteger(item.digit))
      : [],
    mistakes: clampCount(input.mistakes),
    slashed: Array.isArray(input.slashed)
      ? input.slashed.map((item) => item | 0).filter((item) => item >= 0 && item < 81).slice(0, 81)
      : [],
    undo: Array.isArray(input.undo) ? input.undo.slice(-80) : [],
    selected: Math.min(80, clampCount(input.selected)),
    mode: input.mode === "notes" ? "notes" : "normal",
    elapsed: clampCount(input.elapsed),
    auto: Boolean(input.auto),
    counted: Boolean(input.counted),
    scored: Boolean(input.scored),
    hintSlugs: uniqueSlugs(input.hintSlugs),
    checks: clampCount(input.checks),
    train: typeof input.train === "string" ? input.train.slice(0, 40) : null,
    practice: typeof input.practice === "string" && TECHNIQUE_SET.has(input.practice) ? input.practice : null,
    practiceMiss: Boolean(input.practiceMiss),
    practiceFilled: Boolean(input.practiceFilled),
    fastForwarded: Boolean(input.fastForwarded),
    baseRemoved: Array.isArray(input.baseRemoved)
      ? input.baseRemoved
          .slice(0, 81)
          .filter((item) => item && Number.isInteger(item.index) && item.index >= 0 && item.index < 81 && Number.isInteger(item.digit) && item.digit >= 1 && item.digit <= 9)
          .map((item) => ({ index: item.index, digit: item.digit }))
      : [],
    puzzleId: typeof input.puzzleId === "string" ? input.puzzleId.slice(0, 80) : null,
    anonPlayId: typeof input.anonPlayId === "string" ? input.anonPlayId.slice(0, 80) : null,
    notesUsed: Boolean(input.notesUsed),
    over: Boolean(input.over),
    updatedAt: updatedAt != null && updatedAt > 0 ? updatedAt : 0,
  };
  if (input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)) {
    try {
      const encoded = JSON.stringify(input.metadata);
      if (encoded.length <= 30_000) progress.metadata = JSON.parse(encoded);
    } catch {
      /* drop metadata that cannot be stored */
    }
  }
  try {
    if (JSON.stringify(progress.undo).length > 80_000) progress.undo = [];
  } catch {
    progress.undo = [];
  }
  return progress;
}

export function migrateProgress(stored) {
  if (stored == null) return { ok: true, progress: null, changed: false };
  if (typeof stored !== "object" || Array.isArray(stored)) return { ok: false };
  const version = stored.version == null ? 0 : stored.version | 0;
  if (version > PROGRESS_VERSION) return { ok: false, future: true };
  const progress = sanitizeProgress({ ...stored, version: PROGRESS_VERSION });
  if (!progress) return { ok: false };
  return { ok: true, progress, changed: version < PROGRESS_VERSION || !stored.updatedAt };
}

function progressStamp(bundle) {
  if (!bundle || typeof bundle !== "object") return { progress: null, at: 0, has: false };
  const has = Object.prototype.hasOwnProperty.call(bundle, "progress");
  if (!has) return { progress: null, at: 0, has: false };
  if (bundle.progress == null) {
    const at = finite(bundle.progressUpdatedAt);
    return { progress: null, at: at != null && at > 0 ? at : 0, has: true };
  }
  const progress = sanitizeProgress(bundle.progress);
  if (!progress) return { progress: null, at: 0, has: false };
  const outer = finite(bundle.progressUpdatedAt);
  const at = Math.max(progress.updatedAt || 0, outer != null && outer > 0 ? outer : 0);
  progress.updatedAt = at;
  return { progress, at, has: true };
}

export function mergeAccount(stored, incoming) {
  const base = stored && typeof stored === "object" ? stored : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  const leftProgress = progressStamp(base);
  const rightProgress = progressStamp(next);
  let progress = leftProgress.has ? leftProgress.progress : null;
  let progressUpdatedAt = leftProgress.has ? leftProgress.at : 0;
  if (rightProgress.has && rightProgress.at > progressUpdatedAt) {
    progress = rightProgress.progress;
    progressUpdatedAt = rightProgress.at;
  }
  return {
    v: BUNDLE_VERSION,
    stats: next.stats ? mergeStats(base.stats, next.stats) : base.stats ? mergeStats(base.stats, null) : null,
    skills: next.skills ? mergeSkills(base.skills, next.skills) : base.skills ? mergeSkills(base.skills, null) : null,
    settings: next.settings ? mergeSettings(base.settings, next.settings) : base.settings ? mergeSettings(base.settings, null) : null,
    progress,
    progressUpdatedAt,
  };
}

export function sanitizeBundle(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const bundle = {};
  if (input.stats && typeof input.stats === "object") {
    const migrated = migrateStats(input.stats);
    if (migrated.ok) bundle.stats = migrated.stats;
  }
  if (input.skills && typeof input.skills === "object") {
    const migrated = migrateSkills(input.skills);
    if (migrated.ok) bundle.skills = migrated.skills;
  }
  if (input.settings && typeof input.settings === "object") {
    const migrated = migrateSettings(input.settings);
    if (migrated.ok) bundle.settings = migrated.settings;
  }
  const progress = progressStamp(input);
  if (progress.has) {
    bundle.progress = progress.progress;
    bundle.progressUpdatedAt = progress.at;
  }
  return bundle;
}
