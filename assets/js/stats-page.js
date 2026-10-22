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
    if (seconds == null) return "—";
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
          <p class="stats-col-count">${bar.count}</p>
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
          <span class="stats-tech-count">${row.count}</span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function facts(bucket) {
    return `<dl class="stats-facts">
      <div><dt>Starts</dt><dd>${bucket.starts}</dd></div>
      <div><dt>Finishes</dt><dd>${bucket.finishes}</dd></div>
      <div><dt>Median solve</dt><dd>${clock(bucket.medianSeconds)}</dd></div>
      <div><dt>25th–75th</dt><dd>${clock(bucket.p25Seconds)} – ${clock(bucket.p75Seconds)}</dd></div>
      <div><dt>Median mistakes</dt><dd>${bucket.medianMistakes == null ? "—" : bucket.medianMistakes}</dd></div>
      <div><dt>Solved with no hints</dt><dd>${bucket.noHintPct == null ? "—" : `${bucket.noHintPct}%`}</dd></div>
    </dl>`;
  }

  function card(kind, label) {
    const bucket = bucketFor(kind);
    if (!bucket || bucket.suppressed) {
      return `<section class="stats-card" id="stats-${kind.replace(/\s+/g, "-")}">
        <h2>${escapeHtml(label)}</h2>
        <p class="stats-empty">Not enough data yet.</p>
      </section>`;
    }
    const hint = bucket.topHint
      ? `<p class="stats-note">Most-hinted technique: ${escapeHtml(bucket.topHint.name)}.</p>`
      : "";
    return `<section class="stats-card" id="stats-${kind.replace(/\s+/g, "-")}">
      <h2>${escapeHtml(label)}</h2>
      <p class="stats-lead">${bucket.solvePct}% solved · median ${clock(bucket.medianSeconds)}</p>
      ${facts(bucket)}
      <h3>How puzzles ended</h3>
      ${outcomeBar(bucket)}
      <h3>Solve times</h3>
      ${histogram(bucket)}
      <h3>Hardest hint used</h3>
      ${techniques(bucket)}
      ${hint}
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

  function render() {
    todayLine();
    root.innerHTML = ORDER.map(([kind, label]) => card(kind, label)).join("");
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
