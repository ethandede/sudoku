// Apply one hint step to the player's board.
// Placement techniques (naked and hidden singles) write the digit.
// Elimination techniques remove those digits from notes, record them so
// auto-candidates and the next solver step honor them, and leave a resulting
// single for the next hint.

export function cellName(index) {
  const row = Math.floor(index / 9) + 1;
  const col = (index % 9) + 1;
  return `row ${row}, column ${col}`;
}

export function placesOnApply(step) {
  return Boolean(step && step.place && (step.slug === "naked-single" || step.slug === "hidden-single"));
}

export function peerIndexes(index) {
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
  return [...set];
}

export function legalCandidates(board, removed, index) {
  if (!board || board[index]) return [];
  const peers = peerIndexes(index);
  const gone = removed || [];
  const found = [];
  for (let number = 1; number <= 9; number += 1) {
    if (peers.some((other) => board[other] === number)) continue;
    if (gone.some((item) => item.index === index && item.digit === number)) continue;
    found.push(number);
  }
  return found;
}

function listPhrase(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function grouped(eliminate) {
  const byCell = new Map();
  for (const item of eliminate || []) {
    if (!item) continue;
    if (!byCell.has(item.index)) byCell.set(item.index, []);
    const digits = byCell.get(item.index);
    if (!digits.includes(item.digit)) digits.push(item.digit);
  }
  for (const digits of byCell.values()) digits.sort((a, b) => a - b);
  return byCell;
}

function housePhrase(entries, lead) {
  const digit = entries[0].digits[0];
  const rows = entries.map((entry) => Math.floor(entry.index / 9) + 1);
  const cols = entries.map((entry) => (entry.index % 9) + 1);
  const oneRow = rows.every((row) => row === rows[0]);
  const oneCol = cols.every((col) => col === cols[0]);
  if (oneRow && !oneCol) return `${digit} from ${lead}row ${rows[0]}, columns ${listPhrase(cols.map(String))}`;
  if (oneCol && !oneRow) return `${digit} from ${lead}column ${cols[0]}, rows ${listPhrase(rows.map(String))}`;
  return `${digit} from ${lead}${listPhrase(entries.map((entry) => cellName(entry.index)))}`;
}

export function eliminationSentence(eliminate, notes) {
  const noted = [];
  const missing = [];
  for (const [index, digits] of grouped(eliminate)) {
    const had = [];
    const absent = [];
    const list = (notes && notes[index]) || [];
    for (const digit of digits) {
      if (list.includes(digit)) had.push(digit);
      else absent.push(digit);
    }
    if (had.length) noted.push({ index, digits: had });
    if (absent.length) missing.push({ index, digits: absent });
  }
  const parts = [];
  const sameDigit = (entries) =>
    entries.every((entry) => entry.digits.length === 1 && entry.digits[0] === entries[0].digits[0]);
  if (noted.length) {
    const body = sameDigit(noted)
      ? housePhrase(noted, "your notes in ")
      : listPhrase(noted.map((entry) => `${listPhrase(entry.digits.map(String))} from your notes in ${cellName(entry.index)}`));
    parts.push(`Removed ${body}.`);
  }
  if (missing.length) {
    const body = sameDigit(missing)
      ? housePhrase(missing, "")
      : listPhrase(missing.map((entry) => `${listPhrase(entry.digits.map(String))} from ${cellName(entry.index)}`));
    parts.push(`Ruled out ${body}.`);
  }
  return parts.join(" ");
}

export function resultCopy(step, notesBefore, placed) {
  if (placesOnApply(step)) {
    if (!placed || !step.place) return step.explain;
    return `${step.explain} Placed ${step.place.digit} in ${cellName(step.place.index)}.`;
  }
  const ruled = eliminationSentence(step.eliminate, notesBefore);
  const chain =
    step.place && !placed
      ? `The next hint can place ${step.place.digit} in ${cellName(step.place.index)}.`
      : "";
  return [step.explain, ruled, chain].filter(Boolean).join(" ");
}

export function applyHintStep(state, step) {
  const notes = (state.notes || []).map((list) => new Set(list || []));
  while (notes.length < 81) notes.push(new Set());
  const before = notes.map((set) => [...set]);
  const removed = (state.removed || []).map((item) => ({ index: item.index, digit: item.digit }));
  const board = (state.board || []).slice();
  for (const item of step.eliminate || []) {
    notes[item.index].delete(item.digit);
    if (!removed.some((kept) => kept.index === item.index && kept.digit === item.digit)) {
      removed.push({ index: item.index, digit: item.digit });
    }
  }
  let placed = false;
  if (placesOnApply(step)) {
    const place = step.place;
    const puzzle = state.puzzle || [];
    const solution = state.solution || [];
    if (
      puzzle[place.index] === 0 &&
      place.digit === solution[place.index] &&
      board[place.index] !== place.digit
    ) {
      board[place.index] = place.digit;
      notes[place.index].clear();
      placed = true;
      for (const other of peerIndexes(place.index)) notes[other].delete(place.digit);
    }
  }
  return {
    board,
    notes: notes.map((set) => [...set].sort((a, b) => a - b)),
    removed: removed.filter((item) => board[item.index] === 0),
    placed,
    chain: Boolean(step.place && !placed && !placesOnApply(step)),
    copy: resultCopy(step, before, placed),
  };
}
