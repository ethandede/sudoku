// Permanent /daily/YYYY-MM-DD/ pages.
// The grid is generate("not easy", "daily:YYYY-MM-DD"), the same seed ?daily
// uses for that UTC date, so the pages are not baked into the build.
// A Pages Function renders one and returns 404 for anything else.
//
// The archive is every UTC date from DAILY_START through today.
// DAILY_START is 2026-10-21, the day the daily seed became the UTC date.
// That list grows by one URL a day. It is not a rolling window: older
// permalinks stay valid, and the build only writes sitemap rows for them.

export const DAILY_START = "2026-10-21";
export const SITE = "https://sudokusudoku.com";
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = [
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
];
const SITEMAP_CAP = 45000;

export function utcToday(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isRealDate(iso) {
  const match = DAY.exec(String(iso || ""));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function shiftIso(iso, days) {
  const match = DAY.exec(iso);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function longDate(iso) {
  const match = DAY.exec(iso);
  if (!match || !isRealDate(iso)) return "";
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

// live: this UTC date, counts as today's daily.
// archive: an earlier published daily, scored as a normal Not Easy.
// future / invalid / unreleased: no page.
export function dateStatus(iso, today) {
  if (!isRealDate(iso) || !isRealDate(today)) return "invalid";
  if (iso < DAILY_START) return "unreleased";
  if (iso > today) return "future";
  if (iso === today) return "live";
  return "archive";
}

export function parseDailyPath(pathname) {
  const match = /^\/daily\/(\d{4}-\d{2}-\d{2})\/?$/.exec(String(pathname || ""));
  return match ? match[1] : null;
}

export function dailyPath(iso) {
  return `/daily/${iso}/`;
}

export function dailyMeta(iso) {
  if (!isRealDate(iso)) throw new Error(`No daily meta for ${iso}`);
  const spoken = longDate(iso);
  const path = dailyPath(iso);
  return {
    path,
    title: `Daily Sudoku for ${spoken} | SudokuSudoku`,
    description: `Daily Sudoku for ${spoken}. The same Not Easy grid as the daily puzzle on that UTC date, with hints that teach the move.`,
    term: "daily sudoku",
    crumb: `Daily Sudoku for ${spoken}`,
  };
}

export function listDailyDates(today) {
  if (!isRealDate(today) || today < DAILY_START) return [];
  const dates = [];
  let cursor = DAILY_START;
  while (cursor <= today) {
    dates.push(cursor);
    if (dates.length > SITEMAP_CAP) {
      throw new Error("Daily sitemap is past the sitemap limit. Split it before adding more dates.");
    }
    const next = shiftIso(cursor, 1);
    if (!next || next <= cursor) throw new Error("Daily date cursor did not advance");
    cursor = next;
  }
  return dates;
}

export function gameRequest({ pathname, search, today }) {
  const path = String(pathname || "");
  const iso = parseDailyPath(path);
  if (iso || path === "/daily" || path === "/daily/" || path.startsWith("/daily/")) {
    const status = iso ? dateStatus(iso, today) : "invalid";
    if (status === "live") {
      return {
        kind: "daily",
        seed: `daily:${iso}`,
        countsAsDaily: true,
        shareDate: iso,
        permalink: true,
        archive: false,
      };
    }
    if (status === "archive") {
      return {
        kind: "not easy",
        seed: `daily:${iso}`,
        countsAsDaily: false,
        shareDate: iso,
        permalink: true,
        archive: true,
      };
    }
    return { unavailable: true };
  }
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  if (params.has("daily")) {
    return {
      kind: "daily",
      seed: `daily:${today}`,
      countsAsDaily: true,
      shareDate: today,
      permalink: false,
      archive: false,
    };
  }
  return null;
}

// Fields launchNew copies onto the game. progress.js builds streaks only
// from stats.daily.completed, and recordWin writes that map solely when
// kind is "daily". An archive play stays "not easy" so a later visit
// cannot fill a gap in the run.
export function launchFields(request, today) {
  const source = request || {};
  if (source.unavailable) return { unavailable: true };
  const archive = source.archive === true;
  const countsAsDaily = archive
    ? false
    : source.countsAsDaily === true || (source.countsAsDaily == null && source.kind === "daily");
  const shareDate = source.shareDate || (countsAsDaily ? today : null);
  const dated = archive || countsAsDaily;
  if (dated && !isRealDate(shareDate)) return { unavailable: true };
  return {
    kind: countsAsDaily ? "daily" : archive ? "not easy" : source.kind || "easy",
    difficulty: dated ? "not easy" : source.kind || "easy",
    seed: dated ? `daily:${shareDate}` : source.seed || null,
    countsAsDaily,
    shareDate: dated ? shareDate : null,
    permalink: Boolean(source.permalink),
    archive,
    dailyDate: countsAsDaily ? shareDate : null,
    assignPuzzleId: !dated,
    unavailable: false,
  };
}
