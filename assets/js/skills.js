// Skill ladder page. Reads the same on-device progress as the game.
(function () {
  const root = document.getElementById("skills-root");
  const progress = window.SudokuProgress;
  if (!root || !progress) return;

  const stats = readStats();
  const caught = progress.prepare(stats);
  let historyOpen = false;

  render();
  if (caught.unlocked.length) progress.celebrate(caught.unlocked);
  bind();

  function readStats() {
    try {
      return JSON.parse(localStorage.getItem("sudoku-stats") || "null");
    } catch {
      return null;
    }
  }

  function formatTime(seconds) {
    if (seconds == null || Number.isNaN(Number(seconds))) return "–";
    const total = Math.max(0, Math.floor(Number(seconds)));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function formatWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function render() {
    const data = progress.load();
    const freshStats = readStats();
    root.innerHTML = [
      renderNext(data),
      renderLadder(data),
      renderRecords(data, freshStats),
      renderBadges(data),
      renderTransfer(),
    ].join("");
  }

  function renderNext(data) {
    const slug = progress.trainTarget(data);
    const tech = progress.TECHNIQUES.find((item) => item.slug === slug);
    const row = data.techniques[slug] || { seen: 0, clean: 0, hinted: 0 };
    const status = progress.statusOf(row);
    const next = progress.nextTechnique(data);
    const title = next ? "Your next technique" : "Keep polishing";
    const blurb = next
      ? `${progress.escapeHtml(tech.name)} is the first technique that is not comfortable yet.`
      : "Every technique is comfortable. This is the next one that is not mastered.";
    return `<section class="next-card" aria-labelledby="next-title">
      <p class="eyebrow" id="next-title">${title}</p>
      <h2>${progress.escapeHtml(tech.name)}</h2>
      <p class="next-status"><span class="status status-${status}">${progress.STATUS_LABEL[status]}</span> ${row.clean} of ${progress.MASTERED_AT} clean</p>
      <p>${blurb}</p>
      <div class="next-actions">
        <a class="primary-btn" href="/?train=${encodeURIComponent(slug)}">Train</a>
        <a class="secondary-btn" href="/techniques/${slug}/">Technique page</a>
      </div>
    </section>`;
  }

  function renderLadder(data) {
    const next = progress.nextTechnique(data);
    const rows = progress.TECHNIQUES.map((tech) => {
      const row = data.techniques[tech.slug] || { seen: 0, clean: 0, hinted: 0 };
      const status = progress.statusOf(row);
      const mark = tech.slug === next ? " is-next" : "";
      const note = tech.slug === next ? '<span class="next-flag">Your next technique</span>' : "";
      return `<li class="ladder-row${mark}">
        <span class="status status-${status}">${progress.STATUS_LABEL[status]}</span>
        <a href="/techniques/${tech.slug}/">${progress.escapeHtml(tech.name)}</a>
        ${note}
        <span class="ladder-count">${row.clean} clean</span>
      </li>`;
    }).join("");
    return `<section aria-labelledby="ladder-title">
      <h2 id="ladder-title">Techniques</h2>
      <p class="skills-note">Comfortable is ${progress.COMFORTABLE_AT} solved puzzles that needed the technique, with no hint for it. Mastered is ${progress.MASTERED_AT}. Learning means you have seen it. Locked means it has not come up.</p>
      <ol class="ladder">${rows}</ol>
    </section>`;
  }

  function renderRecords(data, freshStats) {
    const bucket = (id) => (freshStats && freshStats[id]) || { won: 0, best: null };
    const lines = [["daily", "Daily"], ...progress.LEVELS.map((id) => [id, progress.LEVEL_LABEL[id]])]
      .map(([id, label]) => {
        const row = bucket(id);
        return `<tr><th>${label}</th><td>${row.best == null ? "–" : formatTime(row.best)}</td><td>${row.won || 0}</td></tr>`;
      })
      .join("");
    const streak = progress.streakNow(freshStats);
    const longest = (freshStats && freshStats.daily && freshStats.daily.longestStreak) || 0;
    const history = data.history || [];
    const visible = historyOpen ? history : history.slice(0, 12);
    const items = visible
      .map((item) => {
        const label = progress.LEVEL_LABEL[item.level] || item.level;
        const mistakes = item.mistakes === 1 ? "1 mistake" : `${item.mistakes} mistakes`;
        const hinted =
          item.hinted && item.hinted.length
            ? ` · hint: ${item.hinted.map((slug) => progress.escapeHtml(progress.nameOf(slug))).join(", ")}`
            : item.hints
              ? " · hint"
              : "";
        return `<li><span>${progress.escapeHtml(label)} · ${formatTime(item.seconds)} · ${mistakes}${hinted}</span><time datetime="${progress.escapeHtml(item.at)}">${formatWhen(item.at)}</time></li>`;
      })
      .join("");
    const more =
      history.length > 12
        ? `<button type="button" class="secondary-btn" id="history-more">${historyOpen ? "Show fewer" : `Show all ${history.length}`}</button>`
        : "";
    const list = history.length
      ? `<ol class="history">${items}</ol>${more}`
      : `<p class="skills-note">Solved puzzles will show up here.</p>`;
    return `<section aria-labelledby="records-title">
      <h2 id="records-title">Records</h2>
      <p class="streak-line">Daily streak ${streak} · longest ${longest}</p>
      <table class="stats-table"><thead><tr><th>Puzzle</th><th>Best</th><th>Won</th></tr></thead><tbody>${lines}</tbody></table>
      <h3>History</h3>
      ${list}
    </section>`;
  }

  function renderBadges(data) {
    const owned = new Set(data.badges);
    const groups = progress.GROUPS.map(([id, title]) => {
      const cards = progress.BADGES.filter((badge) => badge.group === id)
        .map((badge) => {
          const locked = !owned.has(badge.id);
          return `<li class="badge-card${locked ? " is-locked" : ""}">
            <span class="badge-icon">${progress.icon(badge.icon)}</span>
            <span class="badge-name">${progress.escapeHtml(badge.name)}</span>
            <span class="badge-detail">${progress.escapeHtml(badge.detail)}</span>
          </li>`;
        })
        .join("");
      return `<h3>${title}</h3><ul class="badge-grid">${cards}</ul>`;
    }).join("");
    const count = data.badges.length;
    return `<section id="badges" aria-labelledby="badges-title">
      <h2 id="badges-title">Badges</h2>
      <p class="skills-note">${count} of ${progress.BADGES.length} unlocked. Locked badges stay visible with their criteria.</p>
      ${groups}
    </section>`;
  }

  function renderTransfer() {
    return `<section aria-labelledby="transfer-title">
      <h2 id="transfer-title">Move devices</h2>
      <p class="skills-note">Export a file or a code, then import it on the other device. No account. Importing keeps the better of each record and will not replace a puzzle you are in the middle of.</p>
      <div class="transfer-actions">
        <button type="button" class="primary-btn" id="export-file">Download file</button>
        <button type="button" class="secondary-btn" id="export-code">Copy code</button>
      </div>
      <label class="transfer-label" for="export-text">Progress code</label>
      <textarea id="export-text" class="transfer-text" readonly rows="3"></textarea>
      <label class="transfer-label" for="import-text">Import code</label>
      <textarea id="import-text" class="transfer-text" rows="3" placeholder="Paste a sudoku1. code or the file contents"></textarea>
      <div class="transfer-actions">
        <label class="secondary-btn file-btn" for="import-file">Choose file</label>
        <input id="import-file" class="file-input" type="file" accept="application/json,.json,text/plain">
        <button type="button" class="primary-btn" id="import-go">Import</button>
      </div>
      <p id="transfer-note" class="skills-note" role="status"></p>
    </section>`;
  }

  function bind() {
    root.addEventListener("click", (event) => {
      const more = event.target.closest("#history-more");
      if (more) {
        historyOpen = !historyOpen;
        render();
        return;
      }
      if (event.target.id === "export-file") download();
      if (event.target.id === "export-code") copyCode();
      if (event.target.id === "import-go") importText(document.getElementById("import-text").value);
    });
    root.addEventListener("change", (event) => {
      if (event.target.id !== "import-file") return;
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => importText(String(reader.result || ""));
      reader.readAsText(file);
    });
  }

  function note(message) {
    const el = document.getElementById("transfer-note");
    if (el) el.textContent = message;
  }

  function download() {
    const bundle = progress.exportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sudoku-progress.json";
    link.click();
    URL.revokeObjectURL(url);
    note("Downloaded sudoku-progress.json.");
  }

  function copyCode() {
    const code = progress.encode(progress.exportBundle());
    const box = document.getElementById("export-text");
    box.value = code;
    box.focus();
    box.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(
        () => note("Progress code copied."),
        () => note("Progress code selected. Copy it from the box.")
      );
    } else {
      note("Progress code selected. Copy it from the box.");
    }
  }

  function importText(text) {
    try {
      const result = progress.importAll(text);
      render();
      const added = result.added.length;
      note(added ? `Imported. ${added} ${added === 1 ? "badge" : "badges"} added.` : "Imported.");
      if (result.unlocked.length) progress.celebrate(result.unlocked);
      const settings = JSON.parse(localStorage.getItem("sudoku-settings") || "{}");
      if (settings.theme) document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : settings.theme === "light" ? "light" : document.documentElement.dataset.theme;
    } catch (error) {
      note(error && error.message ? error.message : "Could not import that progress.");
    }
  }
})();
