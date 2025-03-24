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
      <h2>Sudoku - Sudoku Online</h2>
      <p class="supporting-text">A little puzzle-solving fun built with pure JavaScript—test your skills and try the harder levels when you're ready...with only 4 mistakes allowed!</p>

      <div class="sudoku-layout">
        <!-- Skyscraper Ad Column -->
        <div class="ad-skyscraper-column">
          <div id="ad-skyscraper" class="skyscraper-placeholder">
            <div style="width: 160px; height: 600px; background: #ccc; display: flex; text-align:center; justify-content: center; align-items: center;">
              Skyscraper Ad (160x600)
            </div>
          </div>
        </div>

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
            <div class="control-row toggle-row auto-candidates-row">
              <label for="auto-candidates">Auto-Candidates:</label>
              <input type="checkbox" id="auto-candidates" class="auto-candidates-checkbox">
            </div>
            <!-- Puzzle Info Section -->
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
                <i class="fas fa-bolt"></i><span>Quick</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
              <div class="difficulty-option" data-value="easy">
                <i class="fas fa-feather"></i><span>Easy</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
              <div class="difficulty-option" data-value="not easy">
                <i class="fas fa-wind"></i><span>Not Easy</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
              <div class="difficulty-option" data-value="hard">
                <i class="fas fa-hammer"></i><span>Hard</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
              <div class="difficulty-option" data-value="expert">
                <i class="fas fa-brain"></i><span>Expert</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
              <div class="difficulty-option" data-value="mental">
                <i class="fas fa-skull"></i><span>Mental</span>
                  <div class="spinner-container"><div class="loading-spinner"></div></div>
              </div>
            </div>
            <div class="control-row action-row">
              <button class="cta-button reset-puzzle">Reset Puzzle</button>
              <button class="cta-button solve-puzzle" id="solve-puzzle">Solve Puzzle</button>
            </div>
          </div>
        </div>

        <!-- Square Ads Column -->
        <div class="ad-square-column">
          <div class="ad-square-wrapper">
            <div id="ad-square-1" class="aside-placeholder">
              <div style="width: 300px; height: 250px; background: #ccc; display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                Square Ad 1 (300x250)
              </div>
            </div>
            <div id="ad-square-2" class="aside-placeholder">
              <div style="width: 300px; height: 250px; background: #ccc; display: flex; justify-content: center; align-items: center;">
                Square Ad 2 (300x250)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard Ad -->
      <div class="ad-leaderboard">
        <div id="ad-leaderboard" class="horizontal-placeholder">
          <div style="width: 728px; height: 90px; background: #ccc; display: flex; justify-content: center; align-items: center;">
            Leaderboard Ad (728x90)
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<?php get_footer(); ?>