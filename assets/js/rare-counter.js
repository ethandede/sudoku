// Adapted from Rare UI's Animated Counter.
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
// Vanilla port. Digits sit on a wheel (0 through 9, plus a trailing 0)
// and roll upward. A mask fades the top and bottom of each window.
// This page counts once, when the number scrolls into view. The final
// width is reserved first, so a new place does not slide the layout.
(function (root) {
  const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const WHEEL = FACES.concat([0]);
  const LINE = 1.5;

  function groupDigits(value) {
    return String(Math.abs(value | 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function reducedMotion() {
    return Boolean(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function build(node, target) {
    const formatted = groupDigits(target);
    const width = Math.ceil(node.getBoundingClientRect().width);
    if (width > 0) node.style.minWidth = `${width}px`;
    node.classList.add("rare-counter");
    node.replaceChildren();

    const sr = document.createElement("span");
    sr.className = "rare-sr";
    sr.textContent = formatted;

    const wheels = document.createElement("span");
    wheels.className = "rare-wheels";
    wheels.setAttribute("aria-hidden", "true");

    for (const char of formatted) {
      const cell = document.createElement("span");
      if (char >= "0" && char <= "9") {
        cell.className = "rare-slot rare-digit";
        cell.style.setProperty("--digit", char);
        const sizer = document.createElement("span");
        sizer.className = "rare-sizer";
        sizer.textContent = "0";
        const windowEl = document.createElement("span");
        windowEl.className = "rare-window";
        const strip = document.createElement("span");
        strip.className = "rare-wheel";
        WHEEL.forEach((face) => {
          const item = document.createElement("span");
          item.textContent = String(face);
          strip.append(item);
        });
        windowEl.append(strip);
        cell.append(sizer, windowEl);
      } else {
        cell.className = "rare-slot rare-mark";
        cell.textContent = char;
      }
      wheels.append(cell);
    }

    node.append(sr, wheels);
    node.style.setProperty("--rare-line", String(LINE));
  }

  function play(node) {
    if (node.dataset.rolled === "1" || !node.isConnected) return;
    const target = Number(node.dataset.count);
    if (!Number.isInteger(target) || target <= 0) return;
    node.dataset.rolled = "1";
    const formatted = groupDigits(target);
    if (node.textContent !== formatted) node.textContent = formatted;
    if (reducedMotion()) return;
    build(node, target);
    root.requestAnimationFrame(() => {
      if (!node.isConnected) return;
      root.requestAnimationFrame(() => {
        if (node.isConnected) node.classList.add("is-rolling");
      });
    });
  }

  function arm(node) {
    if (!node || node.dataset.armed === "1") return;
    if (node.closest && node.closest(".play-column, .sudoku-grid, .number-pad")) return;
    const target = Number(node.dataset.count);
    if (!Number.isInteger(target) || target <= 0) return;
    node.dataset.armed = "1";
    const formatted = groupDigits(target);
    if (!node.querySelector(".rare-wheels") && node.textContent !== formatted) node.textContent = formatted;
    if (typeof IntersectionObserver !== "function") {
      play(node);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        play(node);
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
  }

  function watch(scope) {
    const rootNode = scope && scope.querySelectorAll ? scope : document;
    rootNode.querySelectorAll(".count-up[data-count]").forEach(arm);
  }

  root.RareCounter = { watch, groupDigits, WHEEL, LINE };
})(typeof globalThis !== "undefined" ? globalThis : window);
