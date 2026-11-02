// Adapted from Rare UI's Delete Button.
// Copyright (c) 2026 Swami Malode
// https://rareui.com
// https://github.com/swamimalode07/rare-ui
//
// Permission is granted to use, copy, modify, and distribute this software
// as part of an application or website, including a commercial product.
// Keep this notice, and keep a visible link to https://rareui.com.
// Commons Clause v1.0: do not sell, sublicense, or redistribute the
// component on its own or as a ported component library.
//
// Vanilla port. The lid lifts, a confirm and a cancel slide out, and a
// check marks the action. Escape, the bin, or the cross backs out.
// Nothing here is mounted on the board, keypad, or puzzle reset.
(function (root) {
  const WALL_TOP = 6;
  const WALL_TOP_OPEN = 13.5;
  const WALL_BASE = 20;
  const HOLD = { deleted: 1400, kept: 600 };

  function bezier(x1, y1, x2, y2) {
    function sample(axis, t) {
      const c = 3 * (1 - t) * (1 - t) * t;
      const d = 3 * (1 - t) * t * t;
      return c * (axis === "x" ? x1 : y1) + d * (axis === "x" ? x2 : y2) + t * t * t;
    }
    return function (x) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 14; i += 1) {
        const mid = (lo + hi) / 2;
        if (sample("x", mid) < x) lo = mid;
        else hi = mid;
      }
      return sample("y", (lo + hi) / 2);
    };
  }

  const ease = bezier(0.32, 0.72, 0, 1);

  function reducedMotion() {
    return Boolean(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function wallPath(top) {
    const y = Math.round(top * 100) / 100;
    const wall = Math.round((WALL_BASE - top) * 100) / 100;
    return `M19 ${y}v${wall}a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V${y}`;
  }

  function iconSvg(className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", className);
    return svg;
  }

  function path(d, pathLength) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    if (pathLength) el.setAttribute("pathLength", pathLength);
    return el;
  }

  function create(options) {
    const settings = options || {};
    const label = settings.label || "Delete";
    const note = settings.note || "";
    const triggerLabel = settings.triggerLabel || label;
    const confirmLabel = settings.confirmLabel || `Confirm ${label}`;
    const cancelLabel = settings.cancelLabel || "Cancel";
    const statusDeleted = settings.statusDeleted || "Deleted";
    const statusKept = settings.statusKept || "Kept";

    const action = document.createElement("div");
    action.className = "rare-action";

    const copy = document.createElement("div");
    copy.className = "rare-action-copy";
    const heading = document.createElement("p");
    heading.className = "rare-action-label";
    heading.textContent = label;
    copy.append(heading);
    if (note) {
      const noteEl = document.createElement("p");
      noteEl.className = "rare-action-note";
      noteEl.textContent = note;
      copy.append(noteEl);
    }

    const widget = document.createElement("div");
    widget.className = "rare-delete";
    widget.dataset.state = "closed";
    widget.dataset.status = "idle";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "rare-delete-trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", triggerLabel);

    const bin = iconSvg("rare-bin");
    bin.setAttribute("stroke-width", "2");
    const wall = path(wallPath(WALL_TOP));
    wall.setAttribute("class", "rare-wall");
    const lid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    lid.setAttribute("class", "rare-lid");
    lid.append(path("M3 6h18"), path("M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"));
    bin.append(wall, lid);

    const done = iconSvg("rare-done");
    done.setAttribute("stroke-width", "2.5");
    done.hidden = true;
    done.append(path("M4 12.5 9.5 18 20 7", "1"));
    trigger.append(bin, done);

    const status = document.createElement("span");
    status.className = "rare-sr";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const panel = document.createElement("div");
    panel.className = "rare-delete-panel";
    panel.setAttribute("aria-hidden", "true");
    const notch = document.createElement("span");
    notch.className = "rare-delete-notch";
    notch.setAttribute("aria-hidden", "true");

    function circle(className, aria, glyph) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rare-circle ${className}`;
      button.setAttribute("aria-label", aria);
      button.tabIndex = -1;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "3.5");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      svg.append(path(glyph));
      button.append(svg);
      return button;
    }

    const confirm = circle("rare-circle-confirm", confirmLabel, "M4 12.5 9.5 18 20 7");
    const cancel = circle("rare-circle-cancel", cancelLabel, "M6 6 18 18M18 6 6 18");
    panel.append(notch, confirm, cancel);

    widget.append(trigger, status, panel);
    action.append(copy, widget);

    let open = false;
    let mode = "idle";
    let holdTimer = 0;
    let wallToken = 0;
    let wallTop = WALL_TOP;

    function setOpen(next) {
      open = next;
      widget.dataset.state = next ? "open" : "closed";
      trigger.setAttribute("aria-expanded", next ? "true" : "false");
      panel.setAttribute("aria-hidden", next ? "false" : "true");
      confirm.tabIndex = next ? 0 : -1;
      cancel.tabIndex = next ? 0 : -1;
      if ("inert" in panel) panel.inert = !next;
      animateWall(next);
    }

    function animateWall(toOpen) {
      const from = wallTop;
      const to = toOpen ? WALL_TOP_OPEN : WALL_TOP;
      const token = (wallToken += 1);
      if (reducedMotion()) {
        wallTop = to;
        wall.setAttribute("d", wallPath(to));
        return;
      }
      const start = root.performance.now();
      function frame(now) {
        if (token !== wallToken) return;
        const t = Math.min(1, (now - start) / 560);
        wallTop = from + (to - from) * ease(t);
        wall.setAttribute("d", wallPath(wallTop));
        if (t < 1) root.requestAnimationFrame(frame);
      }
      root.requestAnimationFrame(frame);
    }

    function showBin() {
      done.hidden = true;
      bin.hidden = false;
    }

    function settle(next) {
      mode = next;
      widget.dataset.status = next;
      status.textContent = next === "deleted" ? statusDeleted : statusKept;
      setOpen(false);
      if (next === "deleted") {
        bin.hidden = true;
        done.hidden = false;
      } else {
        showBin();
        if (!reducedMotion() && typeof bin.animate === "function") {
          bin.animate([{ scale: 1 }, { scale: 0.86, offset: 0.45 }, { scale: 1 }], { duration: 450, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
        }
      }
      trigger.focus();
      root.clearTimeout(holdTimer);
      holdTimer = root.setTimeout(() => {
        mode = "idle";
        widget.dataset.status = "idle";
        status.textContent = "";
        showBin();
      }, HOLD[next]);
      if (next === "deleted" && typeof settings.onConfirm === "function") settings.onConfirm();
      if (next === "kept" && typeof settings.onCancel === "function") settings.onCancel();
    }

    trigger.addEventListener("click", () => {
      if (open) {
        settle("kept");
        return;
      }
      root.clearTimeout(holdTimer);
      mode = "idle";
      widget.dataset.status = "idle";
      status.textContent = "";
      showBin();
      setOpen(true);
    });
    confirm.addEventListener("click", () => {
      if (open) settle("deleted");
    });
    cancel.addEventListener("click", () => {
      if (open) settle("kept");
    });
    widget.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        settle("kept");
      }
    });

    return action;
  }

  root.RareDelete = { create };
})(typeof globalThis !== "undefined" ? globalThis : window);
