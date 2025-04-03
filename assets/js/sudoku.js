// Global Variables
const grid = document.getElementById("sudoku-grid");
const mistakeCounters = document.querySelectorAll(".mistake-counter");
const timers = document.querySelectorAll(".timer");
const numberStatusGrid = document.getElementById("number-status-grid");
let board = Array(81).fill(0);
let notes = Array(81)
  .fill()
  .map(() => new Set());
let initialBoard = [];
let solution = [];
let mistakeCount = 0;
let gameOver = false;
let gameWon = false;
let highlightedNumber = null;
let timerInterval = null;
let autoCandidates = Array(81)
  .fill()
  .map(() => new Set());
let isAutoCandidatesEnabled = false;
let userSolved = Array(81).fill(false);
let selectedCell = null;
let inputMode = "guess";
let secondsElapsed = 0;
let currentDifficulty = "easy";

// Core Functions
function initializeGame() {
  console.log("Initializing game");
  createGrid();
  createNumberStatusGrid();
  updateMistakeCounter();
  const timerElement = document.getElementById("timer");
  if (timerElement) timerElement.textContent = "0:00";
  else console.warn("Timer element not found");
  resetPuzzleInfo();

  // Ensure controls are hidden on initial load
  const autoCandidatesRow = document.querySelector(".auto-candidates-row");
  const actionRow = document.querySelector(".action-row");
  if (autoCandidatesRow) autoCandidatesRow.classList.remove("visible");
  if (actionRow) actionRow.classList.remove("visible");
}

function hideStartOverlay() {
  const overlay = document.querySelector(".start-overlay");
  if (overlay) overlay.style.display = "none";
}

async function newGame() {
  console.log("newGame started");
  const newGameBtn = document.getElementById("new-game");
  const numberStatusGrid = document.querySelector(".number-status-grid");
  const autoCandidatesRow = document.querySelector(".auto-candidates-row"); // Reference row
  
  if (newGameBtn) {
    newGameBtn.disabled = true;
    newGameBtn.classList.add("loading");
  }
  if (numberStatusGrid) {
    numberStatusGrid.classList.remove("loaded");
  }
  if (autoCandidatesRow) {
    autoCandidatesRow.classList.remove("visible"); // Hide during loading
  }

  resetPuzzleInfo();
  removeOverlays();
  try {
    console.log("Generating new puzzle with difficulty:", currentDifficulty);
    const puzzle = generatePuzzle(currentDifficulty);
    if (!puzzle || puzzle.length !== 81)
      throw new Error("Invalid puzzle generated");
    const solutions = countSolutions(puzzle);
    if (solutions !== 1) throw new Error(`Puzzle has ${solutions} solutions`);
    const difficultyTargets = {
      quick: { minClues: 40, maxClues: 45, minTechnique: 0 },
      easy: { minClues: 36, maxClues: 40, minTechnique: 0 },
      "not easy": { minClues: 30, maxClues: 35, minTechnique: 1 },
      hard: { minClues: 27, maxClues: 31, minTechnique: 2 },
      expert: { minClues: 22, maxClues: 26, minTechnique: 3 },
      mental: { minClues: 17, maxClues: 24, minTechnique: 4 },
    };
    const analysis = analyzeDifficulty(puzzle, solution, currentDifficulty, difficultyTargets);

    initialBoard = puzzle.slice();
    board = puzzle.slice();
    notes = Array(81).fill().map(() => new Set());
    autoCandidates = Array(81).fill().map(() => new Set());
    mistakeCount = 0;
    secondsElapsed = 0;
    gameOver = false;
    gameWon = false;
    selectedCell = null;
    isAutoCandidatesEnabled = false;
    const autoCandidatesBtn = document.getElementById("auto-candidates");
    if (autoCandidatesBtn) autoCandidatesBtn.classList.remove("active");
    window.puzzleTechniques = analysis.techniquesUsed;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell) => {
      cell.innerHTML = "";
      cell.classList.remove(
        "initial", "user-solved", "button-solved", "notes", "invalid",
        "highlighted", "highlight-subgrid", "highlight-row", "highlight-column"
      );
      // Remove old listeners
      if (cell.clickHandler) cell.removeEventListener("click", cell.clickHandler);
      if (cell.keydownHandler) cell.removeEventListener("keydown", cell.keydownHandler);
      cell.clickHandler = (e) => editCell(parseInt(cell.dataset.index), e);
      cell.addEventListener("click", cell.clickHandler);
    });

    mistakeCounters.forEach((counter) => {
      if (counter) counter.innerHTML = "";
      else console.warn("Mistake counter element missing");
    });
    updateMistakeCounter();

    await thinkingAnimation(puzzle);
    updateGrid();
    updateNumberStatusGrid();
    setupNumberStatusGridListeners();

    console.log("Grid loaded, starting timer");
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const minutes = Math.floor(secondsElapsed / 60);
      const seconds = secondsElapsed % 60;
      const timeStr = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      timers.forEach((timer) => {
        if (timer) timer.textContent = timeStr;
        else console.warn("Timer element missing");
      });
    }, 1000);

    const clues = puzzle.filter((x) => x !== 0).length;
    const techniques = analysis.techniquesUsed;
    const solutionsCount = solutions;
    updatePuzzleInfo(clues, techniques, solutionsCount);

    const autoCandidatesRow = document.querySelector(".auto-candidates-row");
    const actionRow = document.querySelector(".action-row");
    const puzzleInfo = document.querySelector(".puzzle-info");
    if (autoCandidatesRow) autoCandidatesRow.classList.add("visible"); // Show after load
    if (actionRow) actionRow.classList.add("visible");
    if (puzzleInfo) puzzleInfo.classList.add("visible");

    const difficultyElement = document.getElementById("current-difficulty");
    if (difficultyElement) {
      difficultyElement.textContent = formatDifficulty(currentDifficulty);
    } else {
      console.warn("current-difficulty element not found");
    }

    if (numberStatusGrid) {
      numberStatusGrid.classList.add("loaded");
    }
    console.log("newGame completed");
  } catch (error) {
    console.error("Error in newGame:", error);
  } finally {
    if (newGameBtn) {
      newGameBtn.disabled = false;
      newGameBtn.classList.remove("loading");
    }
    if (numberStatusGrid && !numberStatusGrid.classList.contains("loaded")) {
      numberStatusGrid.classList.add("loaded");
    }
    if (autoCandidatesRow && !autoCandidatesRow.classList.contains("visible")) {
      autoCandidatesRow.classList.add("visible"); // Fallback
    }
  }
}

function formatDifficulty(difficulty) {
  return difficulty
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function updatePuzzleInfo(clues, techniques, solutions) {
  const puzzleInfo = document.querySelector(".puzzle-info");
  if (!puzzleInfo) {
    console.error(".puzzle-info not found in DOM");
    return;
  }
  document.getElementById("clue-count").textContent = clues;
  document.getElementById("techniques-list").textContent = techniques.length
    ? techniques.join(", ")
    : "None";
  document.getElementById("solution-count").textContent = solutions;
  puzzleInfo.classList.add("visible");
  console.log("Puzzle info updated:", { clues, techniques, solutions });
}

function resetPuzzleInfo() {
  const puzzleInfo = document.querySelector(".puzzle-info");
  if (!puzzleInfo) {
    console.error(".puzzle-info not found in DOM");
    return;
  }
  puzzleInfo.classList.remove("visible");
  document.getElementById("clue-count").textContent = "0";
  document.getElementById("techniques-list").textContent = "None";
  document.getElementById("solution-count").textContent = "1";
  console.log("Puzzle info reset");
}

function createGrid() {
  if (!grid) return console.error("Sudoku grid element not found");
  grid.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    grid.appendChild(cell);
  }
}

function editCell(index, event) {
  console.log("editCell started: index=", index, "event.target=", event.target);
  if (gameOver || gameWon) {
    console.log("editCell: Game over or won, exiting");
    return;
  }
  const cell = event.target.closest(".cell");
  if (!cell) {
    console.warn("editCell: No .cell found for index", index, "event.target:", event.target);
    return;
  }
  const isMobile = window.innerWidth <= 991;
  // TEMP: Force notes mode for testing
  inputMode = "notes";
  console.log("editCell: index=", index, "isMobile=", isMobile, "inputMode FORCED TO=", inputMode);

  console.log("Clearing other cell highlights");
  document.querySelectorAll(".cell").forEach((c) => {
    if (c !== cell) {
      c.classList.remove("highlighted", "highlight-subgrid", "highlight-row", "highlight-column");
    }
  });

  console.log("Clearing number-cell selections");
  document.querySelectorAll(".number-status-grid .number-cell").forEach((c) => c.classList.remove("selected"));

  selectedCell = cell;
  cell.classList.add("highlighted");
  console.log("Selected cell set:", selectedCell.dataset.index);
  highlightRelatedCells(index);

  if (board[index] !== 0) {
    console.log("Cell has value", board[index], "toggling highlight");
    toggleHighlight(board[index]);
    const numberCell = document.querySelector(`.number-status-grid .number-cell[data-number="${board[index]}"]`);
    if (numberCell) numberCell.classList.add("selected");
  } else {
    highlightedNumber = null;
    if (isMobile) {
      console.log("Mobile mode: showing notes overlay");
      showNotesOverlay(index, cell, true);
    } else {
      console.log("Desktop mode entered: mode=", inputMode);
      cell.contentEditable = false;
      const existingOverlay = cell.querySelector(".notes-overlay");
      if (existingOverlay) {
        console.log("Removing existing overlay");
        existingOverlay.remove();
      }
      console.log("Checking inputMode for notes: inputMode=", inputMode);
      if (inputMode === "notes") {
        console.log("Notes mode confirmed, calling showNotesOverlay");
        showNotesOverlay(index, cell, true);
      } else {
        console.log("Guess mode, skipping overlay");
      }
      cell.setAttribute("tabindex", "0");
      cell.removeEventListener("keydown", cell.keydownHandler);
      cell.keydownHandler = (e) => handleKeydown(e, index);
      cell.addEventListener("keydown", cell.keydownHandler);
      cell.focus();
      console.log("Cell focused:", document.activeElement === cell);
    }
  }

  console.log("Calling updateGrid from editCell");
  updateGrid();
  console.log("editCell completed");
}

function showNotesOverlay(index, cell, shouldShowOverlay) {
  console.log("showNotesOverlay: index=", index, "shouldShowOverlay=", shouldShowOverlay);
  const existingOverlay = cell.querySelector(".notes-overlay");
  if (existingOverlay) {
    console.log("Existing overlay found, removing it");
    existingOverlay.remove();
  }

  if (!shouldShowOverlay) {
    console.log("Notes overlay cancelled");
    return;
  }

  const overlay = document.createElement("div");
  overlay.classList.add("notes-overlay");
  overlay.style.display = "grid";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(224, 224, 224, 0.9)";
  overlay.style.zIndex = "10";
  console.log("Overlay created with styles:", overlay.style.cssText);

  function updateOverlay() {
    overlay.innerHTML = "";
    for (let num = 1; num <= 9; num++) {
      const option = document.createElement("div");
      option.classList.add("note-option");
      option.textContent = num;
      if (notes[index].has(num)) option.classList.add("selected");
      option.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Note overlay clicked, toggling:", num, "at index:", index);
        toggleNote(index, num);
        updateOverlay();
        updateGrid();
      });
      overlay.appendChild(option);
    }
    console.log("Overlay populated with options, innerHTML length:", overlay.innerHTML.length);
  }

  updateOverlay();
  cell.appendChild(overlay);
  console.log("Overlay appended to cell:", cell.dataset.index, "DOM check:", cell.querySelector(".notes-overlay") !== null);
  console.log("Overlay outerHTML:", cell.querySelector(".notes-overlay").outerHTML);
}

function setupNumberStatusGridListeners() {
  numberStatusGrid.removeEventListener("click", handleNumberStatusClick);
  numberStatusGrid.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault(); // Extra safety
    handleNumberStatusClick(e);
  }, { once: false });
}

function createNumberStatusGrid() {
  if (!numberStatusGrid) return console.error("Number status grid not found");
  numberStatusGrid.innerHTML = "";
  const isMobile = window.innerWidth <= 991;

  if (isMobile) {
    const modeRow = document.createElement("div");
    modeRow.classList.add("mode-row");

    const guessBtn = document.createElement("div");
    guessBtn.classList.add("mode-option", "guess-option");
    guessBtn.dataset.mode = "guess";
    guessBtn.textContent = "Guess";
    guessBtn.addEventListener("click", () => {
      inputMode = "guess";
      console.log("Mobile Guess button clicked, inputMode set to:", inputMode);
      updateNumberStatusGrid();
    });

    const candidateBtn = document.createElement("div");
    candidateBtn.classList.add("mode-option", "candidate-option");
    candidateBtn.dataset.mode = "notes";
    candidateBtn.textContent = "Candidate";
    candidateBtn.addEventListener("click", () => {
      inputMode = "notes";
      console.log("Mobile Candidate button clicked, inputMode set to:", inputMode);
      updateNumberStatusGrid();
    });

    modeRow.appendChild(guessBtn);
    modeRow.appendChild(candidateBtn);
    numberStatusGrid.appendChild(modeRow);

    const numberRow = document.createElement("div");
    numberRow.classList.add("number-row");
    for (let num = 1; num <= 9; num++) {
      const cell = document.createElement("div");
      cell.classList.add("number-cell");
      cell.dataset.number = num;
      cell.textContent = num;
      numberRow.appendChild(cell);
    }
    numberStatusGrid.appendChild(numberRow);
  } else {
    for (let num = 1; num <= 9; num++) {
      const cell = document.createElement("div");
      cell.classList.add("number-cell");
      const text = document.createElement("span");
      text.classList.add("number-text");
      text.textContent = num;
      cell.dataset.number = num;
      cell.appendChild(text);
      for (let i = 0; i < 9; i++) {
        const segment = document.createElement("div");
        segment.classList.add("segment");
        cell.appendChild(segment);
      }
      cell.style.pointerEvents = "auto";
      numberStatusGrid.appendChild(cell);
    }
    console.log("Desktop number status grid created, no mode buttons present");
  }
  setupNumberStatusGridListeners();
  updateNumberStatusGrid();
}

let lastClickTime = 0;
const clickCooldown = 200;

function handleNumberStatusClick(event) {
  const numberCell = event.target.closest(".number-cell");
  if (!numberCell) return;
  const num = parseInt(numberCell.dataset.number);
  const isMobile = window.innerWidth <= 991;
  const now = Date.now();

  if (now - lastClickTime < clickCooldown) {
    console.log("Click ignored due to debounce");
    return;
  }
  lastClickTime = now;

  console.log("Number clicked:", num, "selectedCell:", selectedCell ? selectedCell.dataset.index : "none");

  document.querySelectorAll(".number-status-grid .number-cell").forEach((c) => c.classList.remove("selected"));
  numberCell.classList.add("selected");

  if (!isMobile && selectedCell && initialBoard[selectedCell.dataset.index] === 0) {
    console.log("Number clicked:", num, "mode:", inputMode, "selectedCell:", selectedCell.dataset.index);
    if (inputMode === "guess") {
      console.log("Selected cell is editable, calling handleNumberInput");
      handleNumberInput(num);
    } else {
      console.log("Calling toggleHighlight for notes mode");
      toggleHighlight(num);
    }
  } else {
    console.log("No editable cell selected, highlighting all instances of", num);
    toggleHighlight(num);
  }
}

function updateNumberStatusGrid() {
  const numberCells = document.querySelectorAll(".number-cell");
  const isMobile = window.innerWidth <= 991;

  if (isMobile) {
    const guessBtn = document.querySelector(".guess-option");
    const candidateBtn = document.querySelector(".candidate-option");
    if (guessBtn && candidateBtn) {
      guessBtn.classList.remove("active");
      candidateBtn.classList.remove("active");
      if (inputMode === "guess") guessBtn.classList.add("active");
      else if (inputMode === "notes") candidateBtn.classList.add("active");
    }

    numberCells.forEach((cell) => {
      const num = parseInt(cell.dataset.number);
      if (num) {
        cell.classList.remove("guess-mode", "notes-mode");
        cell.classList.add(inputMode === "guess" ? "guess-mode" : "notes-mode");
      }
    });
  } else {
    const noteCounts = Array(10).fill(0);
    notes.forEach((noteSet) => noteSet.forEach((num) => noteCounts[num]++));

    const subgridIndices = [
      [0, 1, 2, 9, 10, 11, 18, 19, 20],
      [3, 4, 5, 12, 13, 14, 21, 22, 23],
      [6, 7, 8, 15, 16, 17, 24, 25, 26],
      [27, 28, 29, 36, 37, 38, 45, 46, 47],
      [30, 31, 32, 39, 40, 41, 48, 49, 50],
      [33, 34, 35, 42, 43, 44, 51, 52, 53],
      [54, 55, 56, 63, 64, 65, 72, 73, 74],
      [57, 58, 59, 66, 67, 68, 75, 76, 77],
      [60, 61, 62, 69, 70, 71, 78, 79, 80],
    ];

    numberCells.forEach((cell) => {
      const num = parseInt(cell.dataset.number);
      const segments = cell.querySelectorAll(".segment");

      let totalCount = 0;
      subgridIndices.forEach((indices, segmentIndex) => {
        const hasNumber = indices.some((index) => board[index] === num);
        segments[segmentIndex].classList.toggle("filled", hasNumber);
        if (hasNumber) totalCount++;
      });

      cell.classList.toggle("solved", totalCount === 9);
      cell.classList.toggle("noted", noteCounts[num] > 0 && totalCount < 9);
      cell.classList.remove("guess-mode", "notes-mode");
      if (selectedCell !== null) {
        cell.classList.add(inputMode === "guess" ? "guess-mode" : "notes-mode");
      }
    });
  }
}

function handleNumberInput(num) {
  if (!selectedCell || gameOver || gameWon) return;
  const index = parseInt(selectedCell.dataset.index);
  console.log("handleNumberInput: num=", num, "index=", index, "mode=", inputMode);
  if (initialBoard[index] !== 0) {
    console.log("Cell is initial, cannot edit:", index);
    return;
  }

  if (inputMode === "notes") {
    if (notes[index].has(num)) {
      notes[index].delete(num);
      console.log("Removed note", num, "from index", index);
    } else {
      notes[index].add(num);
      console.log("Added note", num, "to index", index);
    }
  } else {
    board[index] = num;
    userSolved[index] = true;
    notes[index].clear();
    console.log("Board updated, board[", index, "] =", board[index]);
    if (!isValidMove(index, num, board)) {
      mistakeCount++;
      selectedCell.textContent = num;
      selectedCell.classList.add("invalid");
      setTimeout(() => {
        board[index] = 0;
        selectedCell.textContent = "";
        selectedCell.classList.remove("invalid");
        updateGrid();
        console.log("Invalid guess cleared, board[", index, "] =", board[index]);
      }, 1000);
    } else {
      selectedCell.textContent = num;
      selectedCell.classList.add("user-solved");
      selectedCell.classList.remove("invalid");
      console.log("Valid guess set, board[", index, "] =", board[index]);
      checkForWin();
      // Deselect cell, keep highlights
      selectedCell.classList.remove("highlighted"); // Only remove cell-specific highlight
      selectedCell = null;
    }
  }
  updateGrid();
}

function computeAutoCandidates() {
  autoCandidates = Array(81)
    .fill()
    .map(() => new Set());
  for (let index = 0; index < 81; index++) {
    if (board[index] === 0 && initialBoard[index] === 0) {
      for (let num = 1; num <= 9; num++) {
        if (isValidMove(index, num, board)) {
          autoCandidates[index].add(num);
        }
      }
    }
  }
}

function updateGrid(clickedIndex = null) {
  const cells = document.querySelectorAll(".cell");
  console.log("updateGrid called, highlightedNumber:", highlightedNumber);
  cells.forEach((cell, index) => {
    const overlay = cell.querySelector(".notes-overlay");
    console.log("Cell[", index, "] has overlay:", !!overlay);
    if (!overlay) cell.innerHTML = "";
    cell.classList.remove(
      "notes", "highlight", "user-solved", "button-solved", "initial",
      "highlighted", "highlight-subgrid", "highlight-row", "highlight-column"
    );

    if (board[index] !== 0) {
      cell.textContent = board[index];
      if (initialBoard[index] !== 0) cell.classList.add("initial");
      else if (userSolved[index]) cell.classList.add("user-solved");
      else cell.classList.add("button-solved");
      if (overlay) {
        console.log("Removing overlay from filled cell[", index, "]");
        overlay.remove();
      }
    } else if (!overlay) {
      const displayNotes = new Set(notes[index]);
      if (isAutoCandidatesEnabled && autoCandidates[index]) {
        autoCandidates[index].forEach((n) => displayNotes.add(n));
      }
      if (displayNotes.size > 0) {
        cell.classList.add("notes");
        for (let num = 1; num <= 9; num++) {
          const span = document.createElement("span");
          span.textContent = displayNotes.has(num) ? num : "";
          cell.appendChild(span);
        }
        console.log("Inline notes added to cell[", index, "]:", [...displayNotes]);
      }
    } else {
      console.log("Preserving overlay for cell[", index, "]");
    }

    if (highlightedNumber && board[index] === highlightedNumber) {
      console.log("Applying highlight to cell at index:", index, "with value:", board[index]);
      cell.classList.add("highlight");
    }
  });

  if (selectedCell) {
    const index = parseInt(selectedCell.dataset.index);
    selectedCell.classList.add("highlighted");
    highlightRelatedCells(index);
    if (board[index] !== 0) {
      console.log("Selected cell[", index, "] set to", board[index], "textContent:", selectedCell.textContent);
    } else {
      console.log("Selected cell[", index, "] is empty, notes:", [...notes[index]], "overlay present:", !!selectedCell.querySelector(".notes-overlay"));
    }
  }
  updateMistakeCounter();
  updateNumberStatusGrid();

  const grid = document.querySelector(".sudoku-grid");
  if (grid) grid.offsetHeight;
}

function updateMistakeCounter() {
  mistakeCounters.forEach((counter) => {
    counter.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement("div");
      dot.classList.add("dot");
      if (i < mistakeCount) dot.classList.add("filled");
      counter.appendChild(dot);
    }
  });
  if (mistakeCount >= 4 && !gameOver && !gameWon) showGameOver();
}

function checkForWin() {
  if (
    !gameOver &&
    !gameWon &&
    board.every((val, idx) => val !== 0 && isValidMove(idx, val, board))
  ) {
    showSuccessAnimation();
  }
}

function toggleHighlight(num) {
  if (gameOver || gameWon) return;
  console.log("toggleHighlight called with num:", num, "gameOver:", gameOver, "gameWon:", gameWon);
  highlightedNumber = num; // Always set, no toggle
  console.log("highlightedNumber set to:", highlightedNumber);
  updateGrid();
}

function highlightRelatedCells(index) {
  console.log("highlightRelatedCells: index=", index);
  const row = Math.floor(index / 9);
  const col = index % 9;
  const subgridRow = Math.floor(row / 3) * 3;
  const subgridCol = Math.floor(col / 3) * 3;

  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell, i) => {
    const cellRow = Math.floor(i / 9);
    const cellCol = i % 9;
    if (cellRow === row) cell.classList.add("highlight-row");
    if (cellCol === col) cell.classList.add("highlight-column");
    if (
      Math.floor(cellRow / 3) === Math.floor(row / 3) &&
      Math.floor(cellCol / 3) === Math.floor(col / 3)
    ) {
      cell.classList.add("highlight-subgrid");
    }
  });
}

function toggleNote(index, num) {
  if (notes[index].has(num)) {
    notes[index].delete(num);
  } else {
    notes[index].add(num);
  }
  console.log(`Toggled ${num} at index ${index}`, notes[index]);
}

function clearNotesInSection(index, value) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let i = row * 9; i < row * 9 + 9; i++) notes[i].delete(value);
  for (let i = col; i < 81; i += 9) notes[i].delete(value);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      notes[(startRow + i) * 9 + (startCol + j)].delete(value);
    }
  }
}

function handleKeydown(event, index) {
  const cell = event.target;
  const key = event.key;
  console.log("Keydown:", key, "at index", index);

  if (key >= "1" && key <= "9") {
    event.preventDefault();
    const value = parseInt(key);
    console.log("Processing guess:", value, "Valid?", isValidMove(index, value, board));
    if (isValidMove(index, value, board)) {
      board[index] = value;
      userSolved[index] = true;
      notes[index].clear();
      clearNotesInSection(index, value);
      cell.textContent = value;
      cell.classList.remove("invalid");
      cell.classList.add("user-solved");
      cell.contentEditable = false;
      computeAutoCandidates();
      checkForWin();
      console.log("Keyboard valid guess, board[", index, "] =", board[index]);
      // Deselect cell, keep highlights
      selectedCell.classList.remove("highlighted"); // Only remove cell-specific highlight
      selectedCell = null;
    } else {
      mistakeCount++;
      cell.textContent = value;
      cell.classList.add("invalid");
      setTimeout(() => {
        board[index] = 0;
        cell.textContent = "";
        cell.classList.remove("invalid");
        cell.contentEditable = false;
        computeAutoCandidates();
        updateGrid();
        console.log("Keyboard invalid guess cleared, board[", index, "] =", board[index]);
      }, 1000);
    }
  } else if (key === "Backspace" || key === "Delete") {
    event.preventDefault();
    board[index] = 0;
    userSolved[index] = false;
    notes[index].clear();
    cell.textContent = "";
    cell.classList.remove("user-solved", "invalid");
    cell.contentEditable = false;
    computeAutoCandidates();
  } else if (key !== "Enter" && key !== "Tab") {
    event.preventDefault();
  }
  updateGrid();
}

function handleBlur(index) {
  const cell = document.querySelectorAll(".cell")[index];
  const value = cell.textContent.trim();

  if (
    cell.getAttribute("data-typed") === "true" &&
    value &&
    !isNaN(value) &&
    value >= 1 &&
    value <= 9 &&
    board[index] === 0
  ) {
    const num = parseInt(value);
    if (isValidMove(index, num, board)) {
      board[index] = num;
      userSolved[index] = true;
      notes[index].clear();
      clearNotesInSection(index, num);
      cell.classList.remove("button-solved", "initial", "invalid");
      cell.classList.add("user-solved");
    } else {
      mistakeCount++;
      cell.classList.add("invalid");
      setTimeout(() => {
        board[index] = 0;
        cell.textContent = "";
        cell.classList.remove("invalid");
        updateGrid(index);
      }, 1000);
    }
  }
  cell.contentEditable = false;
  cell.removeAttribute("data-typed");
  updateGrid(index);
}

function isValidMove(index, value, checkBoard) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  for (let i = 0; i < 9; i++) {
    if (checkBoard[row * 9 + i] === value && i !== col) return false;
    if (checkBoard[i * 9 + col] === value && i !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (
        checkBoard[(startRow + i) * 9 + (startCol + j)] === value &&
        startRow + i !== row &&
        startCol + j !== col
      )
        return false;
    }
  }
  return true;
}

function generatePuzzle(difficulty) {
  console.log(`Generating puzzle: ${difficulty}`);
  const difficultyTargets = {
    quick: { minClues: 40, maxClues: 45, minTechnique: 0 },
    easy: { minClues: 36, maxClues: 40, minTechnique: 0 },
    "not easy": { minClues: 30, maxClues: 35, minTechnique: 1 },
    hard: { minClues: 27, maxClues: 31, minTechnique: 2 },
    expert: { minClues: 22, maxClues: 26, minTechnique: 3 },
    mental: { minClues: 17, maxClues: 24, minTechnique: 4 },
  };
  const target = difficultyTargets[difficulty] || difficultyTargets.easy;
  const minClues = target.minClues;
  const maxClues = target.maxClues;
  const minTechnique = target.minTechnique;

  // Step 1: Generate a full grid
  let fullGrid = Array(81).fill(0);
  if (!generateFullGrid(fullGrid)) {
    console.warn("Failed to generate full grid, retrying");
    return generatePuzzle(difficulty);
  }
  solution = fullGrid.slice();
  let puzzle = fullGrid.slice();

  // Step 2: Remove clues to start near maxClues
  const indices = shuffleArray(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;
  const initialRemoveCount = 81 - maxClues;
  for (let i = 0; i < initialRemoveCount && clues > maxClues; i++) {
    const pos = indices[i];
    const temp = puzzle[pos];
    puzzle[pos] = 0;
    if (countSolutions(puzzle) !== 1) {
      puzzle[pos] = temp;
    } else {
      clues--;
    }
  }

  // Step 3: Analyze and adjust by adding clues if needed
  let attempts = 0;
  const maxAttempts = 100;
  let analysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
  console.log(`Initial puzzle: clues=${clues}, hardestTechnique=${analysis.hardestTechnique}`);

  while (analysis.hardestTechnique < minTechnique && clues < maxClues && attempts < maxAttempts) {
    const emptyIndices = indices.filter((i) => puzzle[i] === 0);
    if (emptyIndices.length === 0) break;

    const addIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    puzzle[addIndex] = solution[addIndex];
    clues++;

    if (countSolutions(puzzle) === 1) {
      analysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
      console.log(`Added clue at ${addIndex}: clues=${clues}, hardestTechnique=${analysis.hardestTechnique}`);
    } else {
      puzzle[addIndex] = 0;
      clues--;
    }
    attempts++;
  }

  // Step 4: Trim excess clues if above maxClues, keeping uniqueness and technique
  if (clues > maxClues && analysis.hardestTechnique >= minTechnique && countSolutions(puzzle) === 1) {
    let trimAttempts = 0;
    const trimMaxAttempts = 50;
    const filledIndices = indices.filter((i) => puzzle[i] !== 0);
    
    while (clues > maxClues && trimAttempts < trimMaxAttempts) {
      const removeIndex = filledIndices[Math.floor(Math.random() * filledIndices.length)];
      const temp = puzzle[removeIndex];
      puzzle[removeIndex] = 0;

      if (countSolutions(puzzle) === 1) {
        const newAnalysis = analyzeDifficulty(puzzle, solution, difficulty, difficultyTargets);
        if (newAnalysis.hardestTechnique >= minTechnique) {
          clues--;
          console.log(`Trimmed clue at ${removeIndex}: clues=${clues}, hardestTechnique=${newAnalysis.hardestTechnique}`);
          analysis = newAnalysis;
        } else {
          puzzle[removeIndex] = temp; // Revert if technique drops too low
        }
      } else {
        puzzle[removeIndex] = temp; // Revert if not unique
      }
      trimAttempts++;
    }
  }

  // Step 5: Final validation
  const finalUnique = countSolutions(puzzle) === 1;
  if (!finalUnique) {
    console.warn(`Puzzle not unique: clues=${clues}, retrying`);
    return generatePuzzle(difficulty);
  }
  if (analysis.hardestTechnique < minTechnique) {
    console.warn(`Technique too low: ${analysis.hardestTechnique}, retrying`);
    return generatePuzzle(difficulty);
  }
  if (clues < minClues) {
    console.warn(`Too few clues: clues=${clues}, retrying`);
    return generatePuzzle(difficulty);
  }

  console.log(`Puzzle generated: clues=${clues}, techniques=${analysis.techniquesUsed.join(", ")}`);
  return puzzle;
}

function generateFullGrid(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let num of nums) {
        if (isValidMove(i, num, grid)) {
          grid[i] = num;
          if (generateFullGrid(grid)) return true;
          grid[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function solvePuzzle(board) {
  const empty = board.indexOf(0);
  if (empty === -1) return true;
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(empty, num, board)) {
      board[empty] = num;
      if (solvePuzzle(board)) return true;
      board[empty] = 0;
    }
  }
  return false;
}

function shuffleArray(array) {
  if (!array || !Array.isArray(array)) {
    console.error("shuffleArray received invalid input:", array);
    return Array.from({ length: 81 }, (_, i) => i);
  }
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function analyzeDifficulty(base, solution, difficulty, difficultyTargets) {
  const target = difficultyTargets[difficulty] || difficultyTargets.easy;
  let tempBoard = base.slice();
  let hardestTechnique = -1;
  const techniquesUsed = [];

  console.log(
    "Analyzing techniques for board:",
    tempBoard.filter((x) => x !== 0).length,
    "clues"
  );

  let solved = false;
  for (let level = 0; level <= 4 && !solved; level++) {
    const progress = applyTechnique(level, tempBoard, true);
    if (progress) {
      hardestTechnique = level;
      const techniqueName = [
        "Singles",
        "Locked Candidates",
        "Naked/Hidden Pairs",
        "X-Wing/Unique Rectangle",
        "Swordfish/XY-Wing",
      ][level];
      if (!techniquesUsed.includes(techniqueName)) {
        techniquesUsed.push(techniqueName);
        console.log(`Level ${level} required: ${techniqueName}`);
      }
      applyTechnique(level, tempBoard, false);
      solved = tempBoard.every((val, i) => val === solution[i]);
    }
  }

  console.log(
    `Techniques required: ${
      techniquesUsed.length ? techniquesUsed.join(", ") : "None detected"
    }, Hardest: ${hardestTechnique}`
  );
  return { hardestTechnique, techniquesUsed };
}

function applyTechnique(level, board, analyzeOnly = false) {
  let progress = false;
  let tempBoard = analyzeOnly ? board.slice() : board;

  function getCandidates(index) {
    if (tempBoard[index] !== 0) return new Set();
    const candidates = new Set();
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(index, num, tempBoard)) candidates.add(num);
    }
    return candidates;
  }

  if (level === 0) {
    for (let i = 0; i < 81; i++) {
      if (tempBoard[i] === 0) {
        const candidates = getCandidates(i);
        if (candidates.size === 1) {
          progress = true;
          if (!analyzeOnly) {
            tempBoard[i] = [...candidates][0];
            console.log(`Naked Single at ${i}: ${tempBoard[i]}`);
          }
        }
      }
    }
    for (let unit = 0; unit < 27; unit++) {
      const cells = getUnitCells(unit);
      const counts = Array(10).fill(0);
      const positions = Array(10)
        .fill()
        .map(() => []);
      cells.forEach((i) => {
        if (tempBoard[i] === 0) {
          getCandidates(i).forEach((num) => {
            counts[num]++;
            positions[num].push(i);
          });
        }
      });
      for (let num = 1; num <= 9; num++) {
        if (counts[num] === 1 && positions[num].length === 1) {
          const i = positions[num][0];
          if (tempBoard[i] === 0) {
            progress = true;
            if (!analyzeOnly) {
              tempBoard[i] = num;
              console.log(`Hidden Single at ${i}: ${num}`);
            }
          }
        }
      }
    }
  } else if (level === 1) {
    for (let box = 0; box < 9; box++) {
      const boxStart = Math.floor(box / 3) * 27 + (box % 3) * 3;
      const boxCells = [];
      for (let i = 0; i < 9; i++)
        boxCells.push(boxStart + Math.floor(i / 3) * 9 + (i % 3));
      const boxCands = Array(10)
        .fill()
        .map(() => new Set());
      boxCells.forEach((i) => {
        if (tempBoard[i] === 0)
          getCandidates(i).forEach((num) => boxCands[num].add(i));
      });
      for (let num = 1; num <= 9; num++) {
        if (boxCands[num].size > 0) {
          const rows = [...boxCands[num]].map((i) => Math.floor(i / 9));
          const cols = [...boxCands[num]].map((i) => i % 9);
          if (new Set(rows).size === 1 || new Set(cols).size === 1) {
            progress = true;
            console.log(`Locked Candidates for ${num} in box ${box}`);
            if (!analyzeOnly) {
            }
          }
        }
      }
    }
  } else if (level === 2) {
    for (let unit = 0; unit < 27; unit++) {
      const cells = getUnitCells(unit);
      const cands = cells.map((i) =>
        tempBoard[i] === 0 ? getCandidates(i) : new Set()
      );
      for (let i = 0; i < 9; i++) {
        if (cands[i].size === 2) {
          for (let j = i + 1; j < 9; j++) {
            if (cands[j].size === 2 && setsEqual(cands[i], cands[j])) {
              progress = true;
              console.log(`Naked Pair in unit ${unit}: ${[...cands[i]]}`);
              if (!analyzeOnly) {
                cells.forEach((k, idx) => {
                  if (idx !== i && idx !== j && tempBoard[k] === 0) {
                    cands[i].forEach((num) => notes[k].delete(num));
                  }
                });
              }
            }
          }
        }
      }
    }
  } else if (level === 3) {
    for (let num = 1; num <= 9; num++) {
      const rowCands = Array(9)
        .fill()
        .map(() => new Set());
      for (let i = 0; i < 81; i++) {
        if (tempBoard[i] === 0 && getCandidates(i).has(num))
          rowCands[Math.floor(i / 9)].add(i % 9);
      }
      for (let r1 = 0; r1 < 8; r1++) {
        if (rowCands[r1].size === 2) {
          for (let r2 = r1 + 1; r2 < 9; r2++) {
            if (
              rowCands[r2].size === 2 &&
              setsEqual(rowCands[r1], rowCands[r2])
            ) {
              progress = true;
              console.log(`X-Wing for ${num} in rows ${r1}, ${r2}`);
              if (!analyzeOnly) {
              }
            }
          }
        }
      }
    }
  } else if (level === 4) {
    for (let num = 1; num <= 9; num++) {
      const rowCands = Array(9)
        .fill()
        .map(() => new Set());
      for (let i = 0; i < 81; i++) {
        if (tempBoard[i] === 0 && getCandidates(i).has(num))
          rowCands[Math.floor(i / 9)].add(i % 9);
      }
      for (let r1 = 0; r1 < 7; r1++) {
        if (rowCands[r1].size >= 2 && rowCands[r1].size <= 3) {
          for (let r2 = r1 + 1; r2 < 8; r2++) {
            if (rowCands[r2].size >= 2 && rowCands[r2].size <= 3) {
              for (let r3 = r2 + 1; r3 < 9; r3++) {
                if (rowCands[r3].size >= 2 && rowCands[r3].size <= 3) {
                  const cols = new Set([
                    ...rowCands[r1],
                    ...rowCands[r2],
                    ...rowCands[r3],
                  ]);
                  if (cols.size === 3) {
                    progress = true;
                    console.log(
                      `Swordfish for ${num} in rows ${r1}, ${r2}, ${r3}`
                    );
                    if (!analyzeOnly) {
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return progress;
}

function setsEqual(set1, set2) {
  if (set1.size !== set2.size) return false;
  return [...set1].every((item) => set2.has(item));
}

function getUnitCells(unit) {
  const cells = [];
  if (unit < 9) {
    for (let i = 0; i < 9; i++) cells.push(unit * 9 + i);
  } else if (unit < 18) {
    for (let i = 0; i < 9; i++) cells.push(i * 9 + (unit - 9));
  } else {
    const box = unit - 18;
    const start = Math.floor(box / 3) * 27 + (box % 3) * 3;
    for (let i = 0; i < 9; i++)
      cells.push(start + Math.floor(i / 3) * 9 + (i % 3));
  }
  return cells;
}

function canSolveWithSingles(board) {
  const temp = board.slice();
  let changed = true;
  while (changed && temp.indexOf(0) !== -1) {
    changed = false;
    for (let i = 0; i < 81; i++) {
      if (temp[i] === 0) {
        let candidates = [];
        for (let num = 1; num <= 9; num++) {
          if (isValidMove(i, num, temp)) candidates.push(num);
        }
        if (candidates.length === 1) {
          temp[i] = candidates[0];
          changed = true;
        } else if (candidates.length === 0) {
          return false;
        }
      }
    }
  }
  return temp.indexOf(0) === -1;
}

async function thinkingAnimation(finalBoard) {
  console.log("Starting thinking animation with board:", finalBoard);
  if (!finalBoard || finalBoard.every((val) => val === 0)) return;
  const cells = document.querySelectorAll(".cell");
  if (!cells.length) return;
  const clueIndices = finalBoard
    .map((value, index) => (value !== 0 ? index : null))
    .filter((index) => index !== null)
    .sort(() => Math.random() - 0.5);
  for (let i = 0; i < clueIndices.length; i++) {
    const index = clueIndices[i];
    cells[index].textContent = finalBoard[index];
    cells[index].classList.add("thinking-type");
    // console.log(`Animating cell ${index} with value ${finalBoard[index]}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
    cells[index].classList.remove("thinking-type");
  }
  console.log("Thinking animation completed");
}

function showSuccessAnimation() {
  gameWon = true;
  if (timerInterval) clearInterval(timerInterval);
  const elapsed = secondsElapsed;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  const grid = document.querySelector(".sudoku-grid");
  grid.classList.add("success-animation");
  setTimeout(() => grid.classList.remove("success-animation"), 2000);

  removeOverlays();
  const container = document.querySelector(".sudoku-container");
  const techniques = window.puzzleTechniques || [];
  const overlay = document.createElement("div");
  overlay.classList.add("success-overlay");
  overlay.innerHTML = `
    <div class="success-message">
      <h2>Well Done!</h2>
      <p>You solved the puzzle in ${timeString} with ${mistakeCount} mistake${
    mistakeCount === 1 ? "" : "s"
  }!</p>
      <p>Techniques required: ${
        techniques.length ? techniques.join(", ") : "Basic"
      }</p>
      <button class="cta-button play-again">Play Again</button>
    </div>
  `;
  container.appendChild(overlay);

  const playAgainBtn = overlay.querySelector(".play-again");
  playAgainBtn.addEventListener("click", newGame);
}

function showGameOver() {
  console.log("Showing game over");
  gameOver = true;
  if (timerInterval) clearInterval(timerInterval);

  removeOverlays();
  const overlay = document.createElement("div");
  overlay.classList.add("game-over-overlay");
  overlay.innerHTML = `
    <div class="game-over-message">
      <h2>Game Over</h2>
      <p>Too many mistakes! Want to try again?</p>
      <button class="cta-button play-again">Play Again</button>
    </div>
  `;
  document.querySelector(".sudoku-container").appendChild(overlay);
  document.querySelector(".play-again").addEventListener("click", newGame);
}

function resetGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  board = initialBoard.slice();
  notes = Array(81)
    .fill()
    .map(() => new Set());
  mistakeCount = 0;
  secondsElapsed = 0;

  updateGrid();
  updateNumberStatusGrid();
  mistakeCounters.forEach((counter) => (counter.innerHTML = ""));
  document.getElementById("timer").textContent = "0:00";
  hideStartOverlay();
}

function removeOverlays() {
  try {
    const overlays = document.querySelectorAll(
      ".success-overlay, .game-over-overlay"
    );
    console.log("Removing overlays, found:", overlays.length);
    overlays.forEach((overlay) => {
      console.log("Removing overlay:", overlay.className);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      } else {
        console.warn("Overlay has no parent:", overlay);
      }
    });
  } catch (error) {
    console.error("Error in removeOverlays:", error);
  }
}

function countSolutions(board) {
  let solutions = 0;
  function solveAll(b) {
    const empty = b.indexOf(0);
    if (empty === -1) {
      solutions++;
      return;
    }
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(empty, num, b)) {
        b[empty] = num;
        solveAll(b);
        b[empty] = 0;
      }
    }
  }
  const temp = board.slice();
  solveAll(temp);
  console.log(`Solutions found: ${solutions}`);
  if (solutions === 0) console.error("No solutions for board:", temp);
  if (solutions > 1) console.warn("Multiple solutions detected:", solutions);
  return solutions;
}

// Debounce Function
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
const debouncedUpdateGrid = debounce(updateGrid, 50);

// Event Listeners (at the end)
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
  const required = {
    grid: document.getElementById("sudoku-grid"),
    mistakeCounter: document.getElementById("mistake-counter"),
    numberStatusGrid: document.getElementById("number-status-grid"),
    timer: document.getElementById("timer"),
    autoCandidates: document.getElementById("auto-candidates"),
    newGame: document.getElementById("new-game"),
    difficultyDropdown: document.getElementById("difficulty-dropup"),
    puzzleInfo: document.querySelector(".puzzle-info"),
    currentDifficulty: document.getElementById("current-difficulty"),
  };
  if (Object.values(required).some((el) => !el)) {
    console.error(
      "Missing elements:",
      Object.keys(required).filter((k) => !required[k])
    );
    return;
  }

  initializeGame();
  inputMode = "guess";
  updateNumberStatusGrid();

  const newGameBtn = document.getElementById("new-game");
  const dropdown = document.getElementById("difficulty-dropup");
  const difficultyOptions = document.querySelectorAll(".difficulty-option");

  if (!newGameBtn) console.error("New Game button not found");
  if (!dropdown) console.error("Difficulty dropdown not found");

  newGameBtn.addEventListener("click", (e) => {
    console.log("New Game clicked, toggling dropup");
    if (dropdown.classList.contains("open")) {
      dropdown.classList.remove("open");
    } else {
      dropdown.classList.add("open");
    }
    e.stopPropagation();
  });

  difficultyOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      currentDifficulty = option.dataset.value;
      console.log("Difficulty selected:", currentDifficulty);
      option.classList.add("loading");
      await new Promise((resolve) => setTimeout(resolve, 0));
      await newGame();
      option.classList.remove("loading");
      dropdown.classList.remove("open");
    });
  });

  document.addEventListener("click", (e) => {
    if (!newGameBtn.contains(e.target) && !dropdown.contains(e.target)) {
      console.log("Outside click, closing dropup");
      dropdown.classList.remove("open");
    }
  });

  const autoCandidatesBtn = document.getElementById("auto-candidates");
  const resetBtn = document.querySelector(".reset-puzzle"); // Updated selector
  const solveBtn = document.getElementById("solve-puzzle"); // Updated selector

  if (autoCandidatesBtn) {
    autoCandidatesBtn.addEventListener("click", () => {
      console.log("Auto candidates clicked");
      if (!gameOver && !gameWon) {
        isAutoCandidatesEnabled = !isAutoCandidatesEnabled;
        console.log("isAutoCandidatesEnabled:", isAutoCandidatesEnabled);
        autoCandidatesBtn.classList.toggle("active", isAutoCandidatesEnabled);
        if (isAutoCandidatesEnabled) {
          computeAutoCandidates();
        }
        updateGrid();
        updateNumberStatusGrid();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      console.log("Reset clicked");
      resetGame();
    });
  } else {
    console.warn("Reset button not found");
  }

  if (solveBtn) {
    solveBtn.addEventListener("click", () => {
      console.log("Solve clicked");
      solveGame();
    });
  } else {
    console.warn("Solve button not found");
  }

  const modeButtons = document.querySelectorAll(".mode-btn");
  console.log("Mode buttons found:", modeButtons.length);
  modeButtons.forEach((btn, idx) => {
    console.log(`Mode button ${idx}:`, btn.dataset.mode, btn.textContent);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mode = btn.dataset.mode;
      console.log("Mode button clicked, setting inputMode to:", mode);
      inputMode = mode;
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      console.log("Theme button clicked");
      document.body.classList.toggle("dark-theme");
      localStorage.setItem(
        "theme",
        document.body.classList.contains("dark-theme") ? "dark" : "light"
      );
    });
  } else {
    console.warn("Theme button not found");
  }

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
});

function solveGame() {
  if (solvePuzzle(board)) {
    updateGrid();
    showSuccessAnimation();
  } else {
    console.error("No solution found for current board");
  }
}