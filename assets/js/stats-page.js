// Public community stats. Reads GET /api/stats/summary and draws the charts
// with plain markup. No chart library, and no gameplay id is created here.
(function () {
  const root = document.getElementById("stats-root");
  if (!root) return;

  const ORDER = [
    ["daily", "Daily"],
    ["quick", "Quick"],
    ["easy", "Easy"],
    ["not easy", "Not Easy"],
    ["hard", "Hard"],
    ["expert", "Expert"],
    ["mental", "Mental"],
  ];

  const OUTCOMES = [
    ["solved", "Solved", "solvePct"],
    ["revealed", "Gave up", "revealedPct"],
    ["failed", "Failed", "failedPct"],
    ["abandoned", "Abandoned", "abandonedPct"],
  ];

  let summary = null;
  let windowKey = "30d";

  function clock(seconds) {
    if (seconds == null) return "n/a";
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function bucketFor(kind) {
    if (!summary || !summary.windows || !summary.windows[windowKey]) return null;
    const selected = summary.windows[windowKey];
    return kind === "daily" ? selected.daily : selected.levels[kind];
  }

  function outcomeBar(bucket) {
    const segments = OUTCOMES.map(([key, label, pctKey]) => {
      const count = bucket[key] || 0;
      const pct = bucket[pctKey] || 0;
      return `<span class="stats-seg stats-seg-${key}" style="flex:${count} ${count} 0" title="${escapeHtml(label)} ${pct}%"></span>`;
    }).join("");
    const legend = OUTCOMES.map(([key, label, pctKey]) => {
      return `<li><i class="stats-swatch stats-seg-${key}"></i>${escapeHtml(label)} ${bucket[pctKey]}%</li>`;
    }).join("");
    return `<div class="stats-bar" role="img" aria-label="Outcome breakdown">${segments}</div><ul class="stats-legend">${legend}</ul>`;
  }

  const SHORT_TIME = {
    lt2: "<2",
    m2: "2–5",
    m5: "5–10",
    m10: "10–20",
    m20: "20–40",
    m40: "40+",
  };

  function histogram(bucket) {
    const bars = bucket.timeBuckets || [];
    const peak = Math.max(1, ...bars.map((bar) => bar.count));
    const columns = bars
      .map((bar) => {
        const height = Math.round((bar.count / peak) * 100);
        const shortLabel = SHORT_TIME[bar.id] || bar.label;
        return `<div class="stats-col">
          <div class="stats-col-plot"><span style="height:${height}%"></span></div>
          <p class="stats-col-count">${countSpan(bar.count)}</p>
          <p class="stats-col-label" title="${escapeHtml(bar.label)}">${escapeHtml(shortLabel)}</p>
        </div>`;
      })
      .join("");
    return `<p class="stats-note">Solved times, in minutes.</p><div class="stats-hist" role="img" aria-label="Solve time distribution in minutes">${columns}</div>`;
  }

  function techniques(bucket) {
    const rows = bucket.topHints || [];
    if (!rows.length) return `<p class="stats-empty">No hinted techniques in this group.</p>`;
    const peak = Math.max(1, ...rows.map((row) => row.count));
    return `<ul class="stats-tech">${rows
      .map((row) => {
        const width = Math.max(8, Math.round((row.count / peak) * 100));
        return `<li>
          <span class="stats-tech-name">${escapeHtml(row.name)}</span>
          <span class="stats-tech-track"><span style="width:${width}%"></span></span>
          <span class="stats-tech-count">${countSpan(row.count)}</span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function countSpan(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return escapeHtml(value);
    return `<span class="count-up" data-count="${n}">${n}</span>`;
  }

  function hintsLabel(value) {
    if (value == null || Number.isNaN(Number(value))) return "n/a";
    const rounded = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function facts(bucket) {
    const mistakes = bucket.medianMistakes == null ? "n/a" : countSpan(bucket.medianMistakes);
    const noHints = bucket.noHintPct == null ? "n/a" : `${countSpan(bucket.noHintPct)}%`;
    return `<dl class="stats-facts">
      <div><dt>Starts</dt><dd>${countSpan(bucket.starts)}</dd></div>
      <div><dt>Finishes</dt><dd>${countSpan(bucket.finishes)}</dd></div>
      <div><dt>Median solve</dt><dd>${clock(bucket.medianSeconds)}</dd></div>
      <div><dt>25th–75th</dt><dd>${clock(bucket.p25Seconds)} – ${clock(bucket.p75Seconds)}</dd></div>
      <div><dt>Median mistakes</dt><dd>${mistakes}</dd></div>
      <div><dt>Average hints</dt><dd>${hintsLabel(bucket.avgHints)}</dd></div>
      <div><dt>Solved with no hints</dt><dd>${noHints}</dd></div>
    </dl>`;
  }

  function hintCompare() {
    const rows = [];
    ORDER.forEach(([kind, label]) => {
      const bucket = bucketFor(kind);
      if (!bucket || bucket.suppressed || bucket.avgHints == null || !bucket.solved) return;
      rows.push({ label, avg: bucket.avgHints });
    });
    if (!rows.length) {
      return `<section class="stats-card" id="stats-hint-average"><h2>Average hints</h2><p class="stats-empty">Not enough data yet.</p></section>`;
    }
    const peak = Math.max(1, ...rows.map((row) => row.avg));
    const bars = rows
      .map((row) => {
        const width = row.avg ? Math.max(6, Math.round((row.avg / peak) * 100)) : 0;
        return `<li class="hint-level"><span class="hint-level-name">${escapeHtml(row.label)}</span><span class="hint-level-track"><span style="width:${width}%"></span></span><span class="hint-level-value">${hintsLabel(row.avg)}</span></li>`;
      })
      .join("");
    return `<section class="stats-card" id="stats-hint-average"><h2>Average hints</h2><p class="stats-note">Technique hints per solved game. Practice, headless browsers, and groups under ${summary.minFinishes || 20} finishes stay out.</p><ul class="hint-levels" role="img" aria-label="Average technique hints per solved game by level">${bars}</ul></section>`;
  }

  function card(kind, label) {
    const bucket = bucketFor(kind);
    if (!bucket || bucket.suppressed) {
      return `<section class="stats-card" id="stats-${kind.replace(/\s+/g, "-")}">
        <h2>${escapeHtml(label)}</h2>
        <p class="stats-empty">Not enough data yet.</p>
      </section>`;
    }
    return `<section class="stats-card" id="stats-${kind.replace(/\s+/g, "-")}">
      <h2>${escapeHtml(label)}</h2>
      <p class="stats-lead">${countSpan(bucket.solvePct)}% solved · median ${clock(bucket.medianSeconds)}</p>
      ${facts(bucket)}
      <h3>How puzzles ended</h3>
      ${outcomeBar(bucket)}
      <h3>Solve times</h3>
      ${histogram(bucket)}
      <h3>Techniques that needed a hint</h3>
      ${techniques(bucket)}
      <p class="stats-note">Each play counts once, as its hardest hint. Solves with no hints are the percentage above.</p>
    </section>`;
  }

  function todayLine() {
    const today = summary && summary.today && summary.today.daily;
    const host = document.getElementById("stats-today");
    if (!host) return;
    if (!today || today.suppressed || today.medianSeconds == null) {
      host.textContent = "Today's daily: not enough data yet.";
      return;
    }
    host.textContent = `Today's daily: ${today.solvePct}% solved · median ${clock(today.medianSeconds)}.`;
  }

  function gameTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds)));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function timeSpan(seconds) {
    if (seconds == null || Number.isNaN(Number(seconds))) return "–";
    const total = Math.max(0, Math.floor(Number(seconds)));
    const text = gameTime(total);
    if (total <= 0) return text;
    return `<span class="count-up" data-count="${total}" data-format="time">${text}</span>`;
  }

  function countText(node, value) {
    if (node.dataset.format === "time") return gameTime(value);
    return String(Math.round(value));
  }

  function animateCounts(scope) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    scope.querySelectorAll("[data-count]").forEach((node) => {
      const target = Number(node.dataset.count);
      if (!Number.isInteger(target) || target <= 0) return;
      const finalText = node.textContent;
      const width = Math.ceil(node.getBoundingClientRect().width);
      if (width > 0) node.style.minWidth = `${width}px`;
      const start = performance.now();
      const duration = 650;
      node.textContent = countText(node, 0);
      function frame(now) {
        if (!node.isConnected) return;
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        node.textContent = countText(node, target * eased);
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        node.textContent = finalText;
      }
      requestAnimationFrame(frame);
    });
  }

  function renderYourGames() {
    const host = document.getElementById("your-games");
    if (!host) return;
    const progress = window.SudokuProgress;
    if (!progress || typeof progress.playerRecord !== "function") {
      host.innerHTML = `<section class="hint-block"><h2>Your games</h2><p class="stats-empty">Your game record is not available in this browser.</p></section>`;
      return;
    }
    const record = progress.playerRecord();
    const rows = record.levels
      .map((level) => {
        return `<tr><th scope="row">${escapeHtml(level.label)}</th><td>${countSpan(level.played)}</td><td>${timeSpan(level.best)}</td><td>${timeSpan(level.average)}</td></tr>`;
      })
      .join("");
    host.innerHTML = `<section class="hint-block">
      <h2>Your games</h2>
      <p class="stats-note">Played, best, and average match the solved screen. The streak is the daily run. These stay on this device, and on your account if you are signed in.</p>
      <p class="streak-line">Daily streak ${countSpan(record.streak)} · longest ${countSpan(record.longest)}</p>
      <div class="your-games-wrap">
        <table class="hint-table your-games">
          <thead><tr><th>Puzzle</th><th>Played</th><th>Best</th><th>Average</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
    animateCounts(host);
  }

  function renderYours() {
    const host = document.getElementById("your-hints");
    if (!host) return;
    if (!window.SudokuProgress || typeof window.SudokuProgress.hintMarkup !== "function") {
      host.innerHTML = `<section class="hint-block"><h2>Your hints</h2><p class="stats-empty">Your hint record is not available in this browser.</p></section>`;
      return;
    }
    host.innerHTML = window.SudokuProgress.hintMarkup(window.SudokuProgress.load());
  }

  function render() {
    todayLine();
    root.innerHTML = hintCompare() + ORDER.map(([kind, label]) => card(kind, label)).join("");
    animateCounts(root);
  }

  function bindWindow() {
    document.querySelectorAll("[data-stats-window]").forEach((button) => {
      button.addEventListener("click", () => {
        windowKey = button.dataset.statsWindow;
        document.querySelectorAll("[data-stats-window]").forEach((other) => {
          const selected = other === button;
          other.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        render();
      });
    });
  }

  renderYourGames();
  renderYours();
  bindWindow();
  fetch("/api/stats/summary")
    .then((response) => {
      if (!response.ok) throw new Error("status");
      return response.json();
    })
    .then((body) => {
      summary = body;
      render();
    })
    .catch(() => {
      root.innerHTML = `<p class="stats-empty">Community stats are not available right now.</p>`;
    });
})();
