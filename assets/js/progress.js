// On-device skill ladder, badges, and records. No account and no network.
//
// Technique status, counted only on a finished puzzle (a reveal does not count):
//   Locked       never seen in a solved path and never the subject of a hint
//   Learning     seen, with fewer than 3 clean solves
//   Comfortable  3 clean solves
//   Mastered     8 clean solves
// A clean solve for a technique means that technique was on the solution path
// and the player did not take a hint for it. A hint is recorded once, when
// that technique is first shown. Other techniques on the same path still
// count as clean. A check is a wrong digit you asked about. Checks are not
// technique hints, and they do not change clean, hinted, or the no-hint badges.
// "Your next technique" is the first one that is not yet Comfortable.
//
// The badge set is 30. Deviations, so it stays a short list:
//   Technique firsts are four leaps (Pointing, a pair, X-wing, a chain),
//   not a separate first badge for all 14 techniques. Mastered covers every
//   technique.
//   No-hint and speed badges are Easy, Hard, and Expert. Quick is too short
//   to mark, Not Easy sits between those, and Mental has no stable fair time.
//   Speed lines: Easy under 5:00, Hard under 15:00, Expert under 25:00.
//   One no-mistake badge, for any level, rather than one per level.
(function (root) {
  const SKILLS_KEY = "sudoku-skills";
  const STATS_KEY = "sudoku-stats";
  const SETTINGS_KEY = "sudoku-settings";
  const SAVE_KEY = "sudoku-progress";
  const COMFORTABLE_AT = 3;
  const MASTERED_AT = 8;
  const HISTORY_LIMIT = 200;

  const TECHNIQUES = [
    { slug: "naked-single", name: "Naked single" },
    { slug: "hidden-single", name: "Hidden single" },
    { slug: "pointing", name: "Pointing" },
    { slug: "claiming", name: "Claiming" },
    { slug: "naked-pair", name: "Naked pair" },
    { slug: "hidden-pair", name: "Hidden pair" },
    { slug: "naked-triple", name: "Naked triple" },
    { slug: "hidden-triple", name: "Hidden triple" },
    { slug: "quads", name: "Quads" },
    { slug: "x-wing", name: "X-wing" },
    { slug: "swordfish", name: "Swordfish" },
    { slug: "xy-wing", name: "XY-wing" },
    { slug: "coloring", name: "Simple coloring" },
    { slug: "xy-chain", name: "XY-chain" },
  ];

  const LEVELS = ["quick", "easy", "not easy", "hard", "expert", "mental"];
  const LEVEL_LABEL = {
    daily: "Daily",
    quick: "Quick",
    easy: "Easy",
    "not easy": "Not Easy",
    hard: "Hard",
    expert: "Expert",
    mental: "Mental",
  };

  const KNOWN = new Set(TECHNIQUES.map((tech) => tech.slug));
  const INDEX = new Map(TECHNIQUES.map((tech, index) => [tech.slug, index]));

  function nameOf(slug) {
    const found = TECHNIQUES.find((tech) => tech.slug === slug);
    return found ? found.name : slug;
  }

  function rankOf(level) {
    return LEVELS.indexOf(level);
  }

  function levelKey(level) {
    if (level === "daily") return "not easy";
    return LEVELS.includes(level) ? level : "";
  }

  function statusOf(row) {
    const seen = row ? row.seen | 0 : 0;
    const clean = row ? row.clean | 0 : 0;
    if (seen <= 0) return "locked";
    if (clean >= MASTERED_AT) return "mastered";
    if (clean >= COMFORTABLE_AT) return "comfortable";
    return "learning";
  }

  const STATUS_LABEL = {
    locked: "Locked",
    learning: "Learning",
    comfortable: "Comfortable",
    mastered: "Mastered",
  };

  function masteredBadges() {
    return TECHNIQUES.map((tech) => ({
      id: `mastered-${tech.slug}`,
      name: `${tech.name}, mastered`,
      detail: `Use ${tech.name} in ${MASTERED_AT} solved puzzles without a hint for it.`,
      icon: "medal",
      group: "mastered",
      test(ctx) {
        const row = ctx.data.techniques[tech.slug];
        return row != null && (row.clean | 0) >= MASTERED_AT;
      },
    }));
  }

  const BADGES = [
    {
      id: "first-pointing",
      name: "Pointing, unhinted",
      detail: "Solve a puzzle that needs Pointing, without a Pointing hint.",
      icon: "pointing",
      group: "first",
      test(ctx) {
        return ctx.path.includes("pointing") && !ctx.hints.has("pointing");
      },
    },
    {
      id: "first-pair",
      name: "A pair, unhinted",
      detail: "Solve a puzzle that needs a naked or hidden pair, without a hint for that pair.",
      icon: "pair",
      group: "first",
      test(ctx) {
        return ["naked-pair", "hidden-pair"].some((slug) => ctx.path.includes(slug) && !ctx.hints.has(slug));
      },
    },
    {
      id: "first-x-wing",
      name: "X-wing, unhinted",
      detail: "Solve a puzzle that needs an X-wing, without an X-wing hint.",
      icon: "xwing",
      group: "first",
      test(ctx) {
        return ctx.path.includes("x-wing") && !ctx.hints.has("x-wing");
      },
    },
    {
      id: "first-chain",
      name: "A chain, unhinted",
      detail: "Solve a puzzle that needs simple coloring or an XY-chain, without a hint for that technique.",
      icon: "chain",
      group: "first",
      test(ctx) {
        return ["coloring", "xy-chain"].some((slug) => ctx.path.includes(slug) && !ctx.hints.has(slug));
      },
    },
    ...masteredBadges(),
    {
      id: "streak-3",
      name: "Three-day streak",
      detail: "Finish the daily puzzle 3 days in a row.",
      icon: "flame",
      group: "streak",
      test(ctx) {
        return ctx.streak >= 3;
      },
    },
    {
      id: "streak-7",
      name: "Seven-day streak",
      detail: "Finish the daily puzzle 7 days in a row.",
      icon: "flame",
      group: "streak",
      test(ctx) {
        return ctx.streak >= 7;
      },
    },
    {
      id: "streak-30",
      name: "Thirty-day streak",
      detail: "Finish the daily puzzle 30 days in a row.",
      icon: "flame",
      group: "streak",
      test(ctx) {
        return ctx.streak >= 30;
      },
    },
    {
      id: "streak-100",
      name: "Hundred-day streak",
      detail: "Finish the daily puzzle 100 days in a row.",
      icon: "flame",
      group: "streak",
      test(ctx) {
        return ctx.streak >= 100;
      },
    },
    {
      id: "spotless",
      name: "Spotless",
      detail: "Finish a puzzle with no mistakes.",
      icon: "check",
      group: "puzzle",
      test(ctx) {
        return ctx.mistakes === 0 && ctx.level !== "";
      },
    },
    {
      id: "no-hint-easy",
      name: "Easy, no hints",
      detail: "Finish an Easy puzzle without a technique hint.",
      icon: "grid",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "easy" && ctx.hintCount === 0;
      },
    },
    {
      id: "no-hint-hard",
      name: "Hard, no hints",
      detail: "Finish a Hard puzzle without a technique hint.",
      icon: "grid",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "hard" && ctx.hintCount === 0;
      },
    },
    {
      id: "no-hint-expert",
      name: "Expert, no hints",
      detail: "Finish an Expert puzzle without a technique hint.",
      icon: "grid",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "expert" && ctx.hintCount === 0;
      },
    },
    {
      id: "speed-easy",
      name: "Easy in 5 minutes",
      detail: "Finish an Easy puzzle in under 5:00.",
      icon: "watch",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "easy" && ctx.seconds < 300;
      },
    },
    {
      id: "speed-hard",
      name: "Hard in 15 minutes",
      detail: "Finish a Hard puzzle in under 15:00.",
      icon: "watch",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "hard" && ctx.seconds < 900;
      },
    },
    {
      id: "speed-expert",
      name: "Expert in 25 minutes",
      detail: "Finish an Expert puzzle in under 25:00.",
      icon: "watch",
      group: "puzzle",
      test(ctx) {
        return ctx.level === "expert" && ctx.seconds < 1500;
      },
    },
    {
      id: "ceiling",
      name: "Ceiling breaker",
      detail: "Finish a puzzle with no mistakes and no technique hints, on a level harder than any you had already solved.",
      icon: "arrow",
      group: "puzzle",
      test(ctx) {
        if (ctx.mistakes !== 0 || ctx.hintCount !== 0) return false;
        if (!ctx.data.bestLevel) return false;
        const next = rankOf(ctx.levelKey);
        return next > rankOf(ctx.data.bestLevel);
      },
    },
  ];

  const BADGE_BY_ID = Object.fromEntries(BADGES.map((badge) => [badge.id, badge]));
  const GROUPS = [
    ["first", "Technique firsts"],
    ["mastered", "Mastered"],
    ["streak", "Streaks"],
    ["puzzle", "Puzzles"],
  ];

  const LEDGER_LEVELS = ["daily", ...LEVELS];

  function fresh() {
    return { version: 1, techniques: {}, badges: [], history: [], bestLevel: null, seeded: false, hintTotals: null };
  }

  function emptyLevel() {
    return { solves: 0, hints: 0, clean: 0, checks: 0 };
  }

  function clampCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.min(1_000_000, Math.round(number));
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

  function levelChecks(totals) {
    return Object.keys(totals.levels || {}).reduce((sum, level) => sum + (totals.levels[level].checks | 0), 0);
  }

  function ledgerSolves(totals) {
    if (!totals || !totals.levels) return 0;
    return Object.keys(totals.levels).reduce((sum, level) => sum + (totals.levels[level].solves | 0), 0);
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

  function formatRate(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    if (!Number.isFinite(rounded)) return "0";
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function readJson(key) {
    try {
      const store = root.localStorage;
      if (!store) return null;
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      const store = root.localStorage;
      if (!store) return;
      store.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  }

  function sanitizeHistory(item) {
    if (!item || typeof item.at !== "string") return null;
    return {
      at: item.at,
      level: typeof item.level === "string" ? item.level : "easy",
      seconds: Math.max(0, item.seconds | 0),
      mistakes: Math.max(0, item.mistakes | 0),
      hints: Math.max(0, item.hints | 0),
      checks: Math.max(0, item.checks | 0),
      hinted: Array.isArray(item.hinted) ? item.hinted.filter((slug) => KNOWN.has(slug)) : [],
      path: Array.isArray(item.path) ? item.path.filter((slug) => KNOWN.has(slug)) : [],
    };
  }

  let skillsBlocked = false;

  function normalizeSkills(stored) {
    const data = fresh();
    const techniques = stored.techniques || {};
    TECHNIQUES.forEach((tech) => {
      const row = techniques[tech.slug];
      if (!row) return;
      data.techniques[tech.slug] = {
        seen: Math.max(0, row.seen | 0),
        clean: Math.max(0, row.clean | 0),
        hinted: Math.max(0, row.hinted | 0),
      };
    });
    data.badges = Array.isArray(stored.badges) ? stored.badges.filter((id) => BADGE_BY_ID[id]) : [];
    data.history = Array.isArray(stored.history)
      ? stored.history.slice(0, HISTORY_LIMIT).map(sanitizeHistory).filter(Boolean)
      : [];
    data.bestLevel = LEVELS.includes(stored.bestLevel) ? stored.bestLevel : null;
    data.seeded = Boolean(stored.seeded);
    data.hintTotals =
      stored.hintTotals && typeof stored.hintTotals === "object" ? sanitizeTotals(stored.hintTotals) : null;
    return data;
  }

  function load() {
    let raw = null;
    try {
      const store = root.localStorage;
      if (!store) return fresh();
      raw = store.getItem(SKILLS_KEY);
    } catch {
      skillsBlocked = true;
      return fresh();
    }
    if (raw == null) return fresh();
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      skillsBlocked = true;
      return fresh();
    }
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      skillsBlocked = true;
      return fresh();
    }
    const version = stored.version == null ? 0 : stored.version | 0;
    if (!Number.isFinite(version) || version > 1) {
      skillsBlocked = true;
      return fresh();
    }
    const data = normalizeSkills(stored);
    if (version < 1) save(data);
    return data;
  }

  function save(data) {
    if (skillsBlocked) return;
    writeJson(SKILLS_KEY, data);
    if (root.SudokuAccount && typeof root.SudokuAccount.noteChange === "function") {
      root.SudokuAccount.noteChange();
    }
  }

  function replace(incoming) {
    if (skillsBlocked) return load();
    const data = normalizeSkills(incoming || {});
    writeJson(SKILLS_KEY, data);
    return data;
  }

  function shiftDate(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function streakEnding(completed, iso) {
    let count = 0;
    let cursor = iso;
    while (completed[cursor]) {
      count += 1;
      cursor = shiftDate(cursor, -1);
    }
    return count;
  }

  function streakNow(stats) {
    if (!stats || !stats.daily) return 0;
    const completed = stats.daily.completed || {};
    const longest = stats.daily.longestStreak || 0;
    const today = new Date().toISOString().slice(0, 10);
    const current = completed[today] ? streakEnding(completed, today) : streakEnding(completed, shiftDate(today, -1));
    return Math.max(longest, current);
  }

  function bestFromStats(stats) {
    if (!stats) return null;
    let best = null;
    const consider = (level, won) => {
      if (!won) return;
      if (!best || rankOf(level) > rankOf(best)) best = level;
    };
    if (stats.daily && stats.daily.won > 0) consider("not easy", true);
    LEVELS.forEach((level) => consider(level, stats[level] && stats[level].won > 0));
    return best;
  }

  function blankCtx(data, stats) {
    return {
      path: [],
      hints: new Set(),
      hintCount: 1,
      level: "",
      levelKey: "",
      seconds: 99999,
      mistakes: 1,
      data,
      streak: streakNow(stats),
    };
  }

  function awardMatching(data, ctx) {
    const unlocked = [];
    BADGES.forEach((badge) => {
      if (data.badges.includes(badge.id)) return;
      if (!badge.test(ctx)) return;
      data.badges.push(badge.id);
      unlocked.push(badge.id);
    });
    return unlocked;
  }

  function rowOf(data, slug) {
    if (!data.techniques[slug]) data.techniques[slug] = { seen: 0, clean: 0, hinted: 0 };
    return data.techniques[slug];
  }

  function prepare(stats) {
    const data = load();
    let changed = false;
    if (!data.seeded) {
      data.bestLevel = bestFromStats(stats);
      data.seeded = true;
      changed = true;
    }
    const unlocked = awardMatching(data, blankCtx(data, stats));
    if (changed || unlocked.length) save(data);
    return { data, unlocked };
  }

  function recordSolve(event, stats) {
    const data = load();
    if (!data.seeded) {
      data.seeded = true;
      data.bestLevel = null;
    }
    const source = event || {};
    const path = (source.path || []).filter((slug) => KNOWN.has(slug));
    const hintList = (source.hintSlugs || []).filter((slug) => KNOWN.has(slug));
    const hints = new Set(hintList);
    const checkCount = Math.min(80, clampCount(source.checks));
    const counted = new Set();
    path.forEach((slug) => {
      if (counted.has(slug)) return;
      counted.add(slug);
      const row = rowOf(data, slug);
      row.seen += 1;
      if (hints.has(slug)) row.hinted += 1;
      else row.clean += 1;
    });
    hints.forEach((slug) => {
      if (counted.has(slug)) return;
      const row = rowOf(data, slug);
      row.seen += 1;
      row.hinted += 1;
    });
    const levelName = source.level || "easy";
    if (!data.hintTotals || !ledgerSolves(data.hintTotals)) {
      data.hintTotals = data.history.length ? totalsFromHistory(data.history) : { checks: 0, levels: {} };
    }
    data.history.unshift(
      sanitizeHistory({
        at: source.at || new Date().toISOString(),
        level: levelName,
        seconds: Math.round(source.seconds || 0),
        mistakes: source.mistakes | 0,
        hints: hints.size,
        checks: checkCount,
        hinted: [...hints],
        path,
      })
    );
    if (data.history.length > HISTORY_LIMIT) data.history.length = HISTORY_LIMIT;
    const ledgerKey = LEDGER_LEVELS.includes(levelName) ? levelName : "easy";
    if (!data.hintTotals.levels[ledgerKey]) data.hintTotals.levels[ledgerKey] = emptyLevel();
    const ledgerRow = data.hintTotals.levels[ledgerKey];
    ledgerRow.solves += 1;
    ledgerRow.hints += hints.size;
    if (!hints.size) ledgerRow.clean += 1;
    ledgerRow.checks += checkCount;
    data.hintTotals.checks += checkCount;
    const ctx = {
      path,
      hints,
      hintCount: hints.size,
      level: source.level || "",
      levelKey: levelKey(source.level),
      seconds: Number(source.seconds) || 0,
      mistakes: source.mistakes | 0,
      data,
      streak: streakNow(stats),
    };
    const unlocked = awardMatching(data, ctx);
    const key = ctx.levelKey;
    if (key && (!data.bestLevel || rankOf(key) > rankOf(data.bestLevel))) data.bestLevel = key;
    save(data);
    return { unlocked, data };
  }

  // A practice finish marks the technique as seen. It is not a clean solve,
  // so it cannot unlock comfortable, mastered, speed, or no-hint badges.
  function recordPractice(slug) {
    if (!KNOWN.has(slug)) return { data: load() };
    const data = load();
    if (!data.seeded) {
      data.seeded = true;
      data.bestLevel = null;
    }
    const row = rowOf(data, slug);
    row.seen += 1;
    save(data);
    return { data };
  }

  function nextTechnique(data) {
    const source = data || load();
    for (let i = 0; i < TECHNIQUES.length; i++) {
      const slug = TECHNIQUES[i].slug;
      const status = statusOf(source.techniques[slug]);
      if (status !== "comfortable" && status !== "mastered") return slug;
    }
    return null;
  }

  function trainTarget(data) {
    const next = nextTechnique(data);
    if (next) return next;
    const source = data || load();
    for (let i = 0; i < TECHNIQUES.length; i++) {
      if (statusOf(source.techniques[TECHNIQUES[i].slug]) !== "mastered") return TECHNIQUES[i].slug;
    }
    return "xy-chain";
  }

  function comfortableSlugs(data) {
    const source = data || load();
    return TECHNIQUES.filter((tech) => {
      const status = statusOf(source.techniques[tech.slug]);
      return status === "comfortable" || status === "mastered";
    }).map((tech) => tech.slug);
  }

  function hardest(slugs) {
    let best = -1;
    let slug = null;
    (slugs || []).forEach((item) => {
      const index = INDEX.has(item) ? INDEX.get(item) : -1;
      if (index > best) {
        best = index;
        slug = item;
      }
    });
    return slug;
  }

  function article(name) {
    return /^(x|xy|[aeiou])/i.test(name) ? "an" : "a";
  }

  function emptyStats() {
    const bucket = () => ({ played: 0, won: 0, best: null, totalTime: 0 });
    const stats = { daily: { played: 0, won: 0, best: null, totalTime: 0, completed: {}, longestStreak: 0 } };
    LEVELS.forEach((level) => {
      stats[level] = bucket();
    });
    return stats;
  }

  function mergeStats(local, incoming) {
    const base = emptyStats();
    function apply(source) {
      if (!source || typeof source !== "object") return;
      Object.keys(base).forEach((key) => {
        const row = source[key];
        if (!row || typeof row !== "object") return;
        if (key === "daily") {
          base.daily.played = Math.max(base.daily.played, row.played | 0);
          base.daily.won = Math.max(base.daily.won, row.won | 0);
          base.daily.totalTime = Math.max(base.daily.totalTime, Number(row.totalTime) || 0);
          if (row.best != null && row.best !== "") {
            const best = Number(row.best);
            base.daily.best = base.daily.best == null ? best : Math.min(base.daily.best, best);
          }
          base.daily.longestStreak = Math.max(base.daily.longestStreak, row.longestStreak | 0);
          const completed = row.completed || {};
          Object.keys(completed).forEach((day) => {
            const next = completed[day];
            if (!next || typeof next.time !== "number") return;
            const prev = base.daily.completed[day];
            if (!prev || next.time < prev.time) {
              base.daily.completed[day] = { time: next.time, mistakes: next.mistakes | 0 };
            }
          });
          return;
        }
        base[key].played = Math.max(base[key].played, row.played | 0);
        base[key].won = Math.max(base[key].won, row.won | 0);
        base[key].totalTime = Math.max(base[key].totalTime, Number(row.totalTime) || 0);
        if (row.best != null && row.best !== "") {
          const best = Number(row.best);
          base[key].best = base[key].best == null ? best : Math.min(base[key].best, best);
        }
      });
    }
    apply(local);
    apply(incoming);
    return base;
  }

  function historyKey(item) {
    return `${item.at}|${item.level}|${item.seconds}|${item.mistakes}`;
  }

  function higherLevel(left, right) {
    if (!left) return right || null;
    if (!right) return left;
    return rankOf(right) > rankOf(left) ? right : left;
  }

  function mergeSkills(local, incoming) {
    const next = local || fresh();
    const leftHad = Boolean(local && local.hintTotals && typeof local.hintTotals === "object");
    const rightHad = Boolean(incoming && incoming.hintTotals && typeof incoming.hintTotals === "object");
    const leftLedger = leftHad ? sanitizeTotals(local.hintTotals) : null;
    const rightLedger = rightHad ? sanitizeTotals(incoming.hintTotals) : null;
    const leftHistory = local && Array.isArray(local.history) ? local.history.slice() : [];
    const rightHistory = incoming && Array.isArray(incoming.history) ? incoming.history.slice() : [];
    const source = incoming && incoming.techniques ? incoming.techniques : {};
    Object.keys(source).forEach((slug) => {
      if (!KNOWN.has(slug)) return;
      const other = source[slug] || {};
      const row = rowOf(next, slug);
      row.seen = Math.max(row.seen, other.seen | 0);
      row.clean = Math.max(row.clean, other.clean | 0);
      row.hinted = Math.max(row.hinted, other.hinted | 0);
    });
    const badges = new Set(next.badges);
    (incoming && incoming.badges ? incoming.badges : []).forEach((id) => {
      if (BADGE_BY_ID[id]) badges.add(id);
    });
    next.badges = [...badges];
    const seen = new Map(next.history.map((item) => [historyKey(item), item]));
    rightHistory.forEach((item) => {
      const clean = sanitizeHistory(item);
      if (!clean) return;
      const key = historyKey(clean);
      const prev = seen.get(key);
      if (prev) {
        if ((clean.checks | 0) > (prev.checks | 0)) prev.checks = clean.checks;
        return;
      }
      next.history.push(clean);
      seen.set(key, clean);
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
    next.bestLevel = higherLevel(next.bestLevel, LEVELS.includes(incoming && incoming.bestLevel) ? incoming.bestLevel : null);
    next.seeded = true;
    next.version = 1;
    return next;
  }

  function ledgerFor(skills) {
    const totals = skills && skills.hintTotals ? sanitizeTotals(skills.hintTotals) : null;
    const history = skills && skills.history ? skills.history : [];
    if (!totals || (!ledgerSolves(totals) && history.length)) return totalsFromHistory(history);
    return totals || { checks: 0, levels: {} };
  }

  function hintReport(data) {
    const skills = data || fresh();
    const techniques = TECHNIQUES.map((tech, index) => {
      const row = (skills.techniques && skills.techniques[tech.slug]) || { seen: 0, clean: 0, hinted: 0 };
      return {
        slug: tech.slug,
        name: tech.name,
        seen: row.seen | 0,
        clean: row.clean | 0,
        hinted: row.hinted | 0,
        index,
      };
    }).filter((row) => row.seen > 0 || row.clean > 0 || row.hinted > 0);
    techniques.sort((a, b) => b.hinted - a.hinted || b.seen - a.seen || a.index - b.index);
    const totals = ledgerFor(skills);
    const levels = LEDGER_LEVELS.filter((level) => totals.levels[level] && totals.levels[level].solves > 0).map((level) => {
      const row = totals.levels[level];
      return {
        level,
        label: LEVEL_LABEL[level] || level,
        solves: row.solves,
        hints: row.hints,
        perGame: row.solves ? Math.round((row.hints / row.solves) * 10) / 10 : 0,
        clean: row.clean,
        zeroPct: row.solves ? Math.round((100 * row.clean) / row.solves) : 0,
        checks: row.checks,
      };
    });
    const solves = levels.reduce((sum, row) => sum + row.solves, 0);
    const clean = levels.reduce((sum, row) => sum + row.clean, 0);
    return {
      totalHints: techniques.reduce((sum, row) => sum + row.hinted, 0),
      checks: totals.checks | 0,
      solves,
      zeroPct: solves ? Math.round((100 * clean) / solves) : null,
      levels,
      techniques,
    };
  }

  function hintMarkup(data, options) {
    const report = hintReport(data);
    const compact = Boolean(options && options.compact);
    const live = options && options.live && !options.live.practice ? options.live : null;
    const heading = compact ? "h3" : "h2";
    const title = compact ? "Hints" : "Your hints";
    const parts = [`<section class="hint-block"><${heading}>${title}</${heading}>`];
    if (!compact) {
      parts.push(
        `<p class="stats-note">Technique hints, counted once the first time you open that technique in a puzzle. A check is a wrong digit you asked about. It is not a hint. These stay on this device, and on your account if you are signed in.</p>`
      );
    }
    if (!report.techniques.length && !report.solves && !(live && (live.hints || live.checks))) {
      parts.push(`<p class="stats-empty">No finished puzzles stored here yet.</p>`);
    } else if (report.techniques.length || report.solves) {
      const zero = report.zeroPct == null ? "n/a" : `${report.zeroPct}%`;
      parts.push(`<dl class="stats-facts hint-facts">
        <div><dt>Technique hints</dt><dd>${report.totalHints}</dd></div>
        <div><dt>Checks</dt><dd>${report.checks}</dd></div>
        <div><dt>Finishes stored</dt><dd>${report.solves}</dd></div>
        <div><dt>No technique hints</dt><dd>${zero}</dd></div>
      </dl>`);
      if (report.levels.length) {
        const peak = Math.max(1, ...report.levels.map((row) => row.perGame));
        const bars = report.levels
          .map((row) => {
            const width = row.perGame ? Math.max(6, Math.round((row.perGame / peak) * 100)) : 0;
            return `<li class="hint-level"><span class="hint-level-name">${escapeHtml(row.label)}</span><span class="hint-level-track"><span style="width:${width}%"></span></span><span class="hint-level-value">${formatRate(row.perGame)}</span></li>`;
          })
          .join("");
        parts.push(
          `<h3 class="hint-sub">Hints per game</h3><ul class="hint-levels" role="img" aria-label="Average technique hints per finished game by level">${bars}</ul>`
        );
      }
      if (report.techniques.length) {
        const rows = report.techniques
          .map((row) => {
            const slug = encodeURIComponent(row.slug);
            return `<tr><th scope="row"><a href="/techniques/${slug}/">${escapeHtml(row.name)}</a> <a class="hint-practice" href="/?practice=${slug}">Practice</a></th><td>${row.seen}</td><td>${row.clean}</td><td>${row.hinted}</td></tr>`;
          })
          .join("");
        parts.push(
          `<h3 class="hint-sub">By technique</h3><div class="hint-table-wrap"><table class="hint-table"><thead><tr><th>Technique</th><th>Seen</th><th>Clean</th><th>Hinted</th></tr></thead><tbody>${rows}</tbody></table></div><p class="stats-note">Clean means that technique was on the path and you did not take a hint for it. The rows you hint most are first.</p>`
        );
      }
    }
    if (live && ((live.hints | 0) || (live.checks | 0))) {
      const hints = live.hints | 0;
      const checks = live.checks | 0;
      parts.push(
        `<p class="stats-note">This puzzle so far: ${hints} technique ${hints === 1 ? "hint" : "hints"}, ${checks} ${checks === 1 ? "check" : "checks"}.</p>`
      );
    }
    if (compact) parts.push(`<p class="streak-line"><a class="account-link" href="/stats/">All stats</a></p>`);
    parts.push(`</section>`);
    return parts.join("");
  }

  function exportBundle() {
    return {
      v: 1,
      exportedAt: new Date().toISOString(),
      stats: readJson(STATS_KEY),
      skills: load(),
      settings: readJson(SETTINGS_KEY),
      progress: readJson(SAVE_KEY),
    };
  }

  function encode(bundle) {
    const bytes = new TextEncoder().encode(JSON.stringify(bundle));
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return `sudoku1.${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
  }

  function decode(text) {
    const raw = String(text || "").trim();
    if (!raw) throw new Error("Paste a progress code or choose a file.");
    if (raw.startsWith("{")) return JSON.parse(raw);
    const body = raw.replace(/^sudoku1\./, "").replace(/\s+/g, "");
    const padded = body.replaceAll("-", "+").replaceAll("_", "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function importAll(text) {
    const bundle = decode(text);
    if (!bundle || bundle.v !== 1) throw new Error("That code is not a Sudoku progress file.");
    const current = skillsBlocked ? fresh() : load();
    skillsBlocked = false;
    const before = new Set(current.badges);
    save(mergeSkills(current, bundle.skills || {}));
    if (bundle.stats && typeof bundle.stats === "object") {
      writeJson(STATS_KEY, mergeStats(readJson(STATS_KEY), bundle.stats));
    }
    if (bundle.settings && typeof bundle.settings === "object") {
      writeJson(SETTINGS_KEY, { ...(readJson(SETTINGS_KEY) || {}), ...bundle.settings });
    }
    const saveOk =
      bundle.progress &&
      bundle.progress.version === 1 &&
      Array.isArray(bundle.progress.puzzle) &&
      bundle.progress.puzzle.length === 81;
    if (saveOk && !readJson(SAVE_KEY)) writeJson(SAVE_KEY, bundle.progress);
    const caught = prepare(readJson(STATS_KEY));
    return {
      added: caught.data.badges.filter((id) => !before.has(id)),
      unlocked: caught.unlocked,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function icon(kind) {
    const paths = {
      pointing:
        '<rect x="3" y="8" width="14" height="16" rx="2"/><rect x="19" y="13" width="10" height="6" rx="1"/>',
      pair: '<rect x="4" y="8" width="12" height="16" rx="2"/><rect x="16" y="8" width="12" height="16" rx="2" opacity=".55"/>',
      xwing: '<path d="M6 5h5.2L16 12.2 20.8 5H26l-7.2 11L26 27h-5.2L16 19.8 11.2 27H6l7.2-11z"/>',
      chain: '<circle cx="8" cy="18" r="5"/><circle cx="17" cy="10" r="5"/><circle cx="25" cy="19" r="5"/>',
      medal: '<path d="M16 2.8l2.8 6.6 7.2.6-5.5 4.6 1.7 7L16 17.8 9.8 21.6l1.7-7L6 10l7.2-.6z"/>',
      flame: '<path d="M16 3c1.6 4.2 6.6 6.2 6.6 12.2A6.6 6.6 0 0 1 9.4 17c.4-3.4 2.8-5.2 3.8-8.2.8 1.8 1.8 2.8 2.8 2.8 0-2.6 0-5.6 0-8.6z"/>',
      check:
        '<path fill-rule="evenodd" d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26zm-1.1 17.4-4.1-4.1 2-2 2.1 2.1 5.2-5.4 2 1.9z"/>',
      grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="12.5" y="4" width="7" height="7" rx="1"/><rect x="21" y="4" width="7" height="7" rx="1"/><rect x="4" y="12.5" width="7" height="7" rx="1"/><rect x="12.5" y="12.5" width="7" height="7" rx="1"/><rect x="21" y="12.5" width="7" height="7" rx="1"/><rect x="4" y="21" width="7" height="7" rx="1"/><rect x="12.5" y="21" width="7" height="7" rx="1"/><rect x="21" y="21" width="7" height="7" rx="1" opacity=".4"/>',
      watch:
        '<path fill-rule="evenodd" d="M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm1.3 5.2h-2.6V17h2.6z"/><rect x="14.2" y="1" width="3.6" height="4" rx="1"/>',
      arrow: '<path d="M16 3l7 8h-4v12h-6V11H9z"/><rect x="4" y="16" width="24" height="3" rx="1"/>',
    };
    const body = paths[kind] || paths.medal;
    return `<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">${body}</svg>`;
  }

  function celebrate(ids) {
    if (typeof document === "undefined" || !document.body) return;
    const badges = (ids || []).map((id) => BADGE_BY_ID[id]).filter(Boolean);
    if (!badges.length) return;
    let toast = document.getElementById("badge-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "badge-toast";
      toast.className = "badge-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    const shown = badges.slice(0, 2);
    const extra = badges.length - shown.length;
    const more =
      extra > 0
        ? `<a href="/skills/#badges">and ${extra} more</a>`
        : `<a href="/skills/#badges">Badge gallery</a>`;
    toast.innerHTML = `<div class="badge-toast-icons">${shown
      .map((badge) => `<span class="badge-toast-icon">${icon(badge.icon)}</span>`)
      .join("")}</div><div class="badge-toast-copy"><p class="badge-toast-kicker">${
      badges.length > 1 ? "Badges unlocked" : "Badge unlocked"
    }</p><p class="badge-toast-names">${shown.map((badge) => escapeHtml(badge.name)).join(" · ")}</p>${more}</div><button type="button" class="badge-toast-close" aria-label="Dismiss">×</button>`;
    toast.hidden = false;
    toast.querySelector(".badge-toast-close").addEventListener("click", () => {
      toast.hidden = true;
    });
    window.clearTimeout(toast._hide);
    toast._hide = window.setTimeout(() => {
      toast.hidden = true;
    }, 4500);
  }

  root.SudokuProgress = {
    TECHNIQUES,
    LEVELS,
    LEVEL_LABEL,
    BADGES,
    GROUPS,
    COMFORTABLE_AT,
    MASTERED_AT,
    STATUS_LABEL,
    load,
    replace,
    canSync() {
      return !skillsBlocked;
    },
    prepare,
    recordSolve,
    recordPractice,
    hintReport,
    hintMarkup,
    statusOf,
    nextTechnique,
    trainTarget,
    comfortableSlugs,
    nameOf,
    hardest,
    article,
    exportBundle,
    encode,
    decode,
    importAll,
    icon,
    celebrate,
    escapeHtml,
    streakNow,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
