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
      <p class="supporting-text">A little puzzle-solving fun built with JavaScript—test your skills with only 4 mistakes
        allowed!</p>

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
          <div id="number-status-grid" class="number-status-grid"></div>

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
              <!-- <button class="cta-button" id="check-solutions">Check for Unique Solution</button> -->
              <!-- <button class="cta-button" id="debug-win">Debug Win</button> -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
<?php get_footer(); ?>