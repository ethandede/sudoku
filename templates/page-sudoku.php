<?php
/**
 * Template Name: Sudoku
 * Template Post Type: page
 * Description: Template for Ethan Ede's Sudoku page, styled to match the site
 */
get_header();
?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/js/all.min.js" crossorigin="anonymous"></script>

<main id="sudoku" class="sudoku-page">
  <section class="sudoku-container">
    <div class="container">
      <h2>Sudoku Know!</h2>
      <p class="supporting-text">A little puzzle-solving fun built with JavaScript—test your skills with only 4 mistakes allowed!</p>

      <div class="sudoku-layout">
        <!-- Grid Wrapper -->
        <div class="grid-wrapper">
          <!-- Status Bar -->
          <div class="status-bar">
            <span class="status-item"><span class="label">Time:</span> <span class="timer" id="timer">0:00</span></span>
            <span class="status-item"><span class="label difficulty">Difficulty:</span>
              <h3 id="current-difficulty" class="current-difficulty">---</h3>
            </span>
            <span class="status-item"><span class="label">Mistakes:</span> <span class="mistake-counter" id="mistake-counter"></span></span>
          </div>
          <!-- Grid -->
          <div id="sudoku-grid" class="sudoku-grid"></div>
        </div>
        <!-- Controls Column -->
        <div class="controls-column">
          <!-- Number Status Grid -->
          <div id="number-status-grid" class="number-status-grid">
            <?php
            $used_numbers = [2, 5, 8]; // Example: numbers fully used
            $selected_number = 1; // Example: currently selected number
            // Example: valid guess positions for each number (row, col) in the main grid
            $valid_guesses = [
              1 => [], // No valid guesses for 1
              2 => [[1, 2], [2, 1], [3, 3], [4, 5], [5, 4], [6, 6], [7, 8], [8, 7], [9, 9]], // All positions for 2
              3 => [[2, 3], [5, 6]], // Example positions for 3
              // ... add for other numbers
            ];
            for ($num = 1; $num <= 9; $num++):
              // Map main grid positions to sub-grid positions
              $filled_segments = [];
              if (isset($valid_guesses[$num])) {
                foreach ($valid_guesses[$num] as $pos) {
                  $row = $pos[0];
                  $col = $pos[1];
                  // Map the 9x9 grid position to the 3x3 sub-grid position
                  $sub_row = ceil($row / 3);
                  $sub_col = ceil($col / 3);
                  $segment_index = ($sub_row - 1) * 3 + $sub_col;
                  $filled_segments[] = $segment_index;
                }
              }
            ?>
              <div class="number-cell <?php echo in_array($num, $used_numbers) ? 'used' : ''; ?> <?php echo $num === $selected_number ? 'selected' : ''; ?>">
                <span class="number-text"><?php echo $num; ?></span>
                <?php for ($i = 1; $i <= 9; $i++): ?>
                  <div class="segment <?php echo in_array($i, $filled_segments) ? 'filled' : ''; ?>"></div>
                <?php endfor; ?>
              </div>
            <?php endfor; ?>
          </div>

          <!-- Unified Controls -->
          <div id="sudoku-controls" class="sudoku-controls">
            <!-- New Puzzle Info Section -->
            <div class="puzzle-info">
              <div class="info-item">
                <span class="label">Clues:</span>
                <span id="clue-count">0</span>
              </div>
              <div class="info-item">
                <span class="label">Techniques:</span>
                <span id="techniques-list">None</span>
              </div>
              <div class="info-item">
                <span class="label">Solutions:</span>
                <span id="solution-count">1</span>
              </div>
            </div>

            <button class="cta-button new-game" id="new-game">
              New Game <i class="fas fa-caret-up"></i>
            </button>
            <div class="difficulty-dropup" id="difficulty-dropup">
              <div class="difficulty-option" data-value="quick">
                <i class="fas fa-bolt"></i> Quick
              </div>
              <div class="difficulty-option" data-value="easy">
                <i class="fas fa-feather"></i> Easy
              </div>
              <div class="difficulty-option" data-value="not easy">
                <i class="fas fa-wind"></i> Not Easy
              </div>
              <div class="difficulty-option" data-value="hard">
                <i class="fas fa-hammer"></i> Hard
              </div>
              <div class="difficulty-option" data-value="expert">
                <i class="fas fa-brain"></i> Expert
              </div>
              <div class="difficulty-option" data-value="mental">
                <i class="fas fa-skull"></i> Mental
              </div>
            </div>
            <div class="control-row toggle-row auto-candidates-row">
              <label for="auto-candidates">Auto-Candidates:</label>
              <input type="checkbox" id="auto-candidates" class="auto-candidates-checkbox">
            </div>
            <div class="control-row action-row">
              <button class="cta-button reset-puzzle">Reset Puzzle</button>
              <button class="cta-button solve-puzzle" id="solve-puzzle">Solve Puzzle</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
<?php get_footer(); ?>