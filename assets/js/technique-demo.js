// Steps a baked technique example: the pattern, the elimination, the result.
(function () {
  const dataEl = document.getElementById("technique-example");
  const board = document.getElementById("technique-board");
  if (!dataEl || !board) return;

  const data = JSON.parse(dataEl.textContent);
  const cells = Array.from(board.querySelectorAll(".cell"));
  const text = document.getElementById("technique-step-text");
  const label = document.getElementById("technique-step-label");
  const prev = document.getElementById("technique-prev");
  const next = document.getElementById("technique-next");
  const step = data.step;
  const pattern = new Set(step.pattern || []);
  const region = new Set(step.region || []);
  const struck = new Map();
  (step.eliminate || []).forEach((item) => {
    if (!struck.has(item.index)) struck.set(item.index, new Set());
    struck.get(item.index).add(item.digit);
  });
  let stage = 0;

  function resultSentence() {
    if (step.place) {
      const row = Math.floor(step.place.index / 9) + 1;
      const col = (step.place.index % 9) + 1;
      return `Place ${step.place.digit} in row ${row}, column ${col}.`;
    }
    return "Those candidates are eliminated.";
  }

  const stages = [
    { label: "See the pattern", text: step.look },
    { label: "What gets eliminated", text: step.explain },
    { label: "The result", text: resultSentence() },
  ];

  function marks(index, showStruck) {
    const digits = new Set(data.pencil[index] || []);
    const gone = struck.get(index) || new Set();
    if (stage === 2) gone.forEach((digit) => digits.delete(digit));
    const wrap = document.createElement("span");
    wrap.className = "marks";
    wrap.setAttribute("aria-hidden", "true");
    for (let number = 1; number <= 9; number += 1) {
      const mark = document.createElement("span");
      mark.textContent = String(number);
      if (digits.has(number)) mark.classList.add("on", "hint-note");
      if (showStruck && stage === 1 && gone.has(number)) mark.classList.add("on", "struck");
      wrap.appendChild(mark);
    }
    return wrap;
  }

  function render() {
    const current = stages[stage];
    cells.forEach((cell, index) => {
      let value = data.board[index];
      if (stage === 2 && step.place && step.place.index === index) value = step.place.digit;
      const given = data.given[index] !== 0 && value === data.given[index] && value !== 0;
      cell.classList.toggle("given", given);
      cell.classList.toggle("user", !given && value !== 0);
      cell.classList.toggle("hint-region", stage >= 0 && region.has(index));
      cell.classList.toggle("hint-pattern", pattern.has(index) && (stage < 2 || !step.place || step.place.index !== index));
      cell.classList.toggle("hint-eliminate", stage >= 1 && struck.has(index));
      cell.classList.toggle("hint-place", stage >= 1 && step.place && step.place.index === index);
      cell.replaceChildren();
      if (value) cell.append(document.createTextNode(String(value)));
      else cell.append(marks(index, true));
    });
    label.textContent = current.label;
    text.textContent = current.text;
    prev.disabled = stage === 0;
    next.disabled = stage === stages.length - 1;
  }

  prev.addEventListener("click", () => {
    if (stage > 0) stage -= 1;
    render();
  });
  next.addEventListener("click", () => {
    if (stage < stages.length - 1) stage += 1;
    render();
  });
  board.style.touchAction = "manipulation";
  render();
})();
