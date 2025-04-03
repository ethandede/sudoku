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
      <p class="supporting-text">A little puzzle-solving fun built with pure JavaScript—test your skills and try the
        harder levels when you're ready...with only 4 mistakes allowed!</p>

      <div class="sudoku-layout">
        <!-- Skyscraper Ad Column -->
        <div class="ad-skyscraper-column">
          <div id="ad-skyscraper" class="skyscraper-placeholder">
            <div
              style="width: 160px; height: 600px; background: #ccc; display: flex; text-align:center; justify-content: center; align-items: center;">
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
            <span class="status-item"><span class="label">Mistakes:</span> <span class="mistake-counter"
                id="mistake-counter"></span></span>
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
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
              </div>
              <div class="difficulty-option" data-value="easy">
                <i class="fas fa-feather"></i><span>Easy</span>
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
              </div>
              <div class="difficulty-option" data-value="not easy">
                <i class="fas fa-wind"></i><span>Not Easy</span>
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
              </div>
              <div class="difficulty-option" data-value="hard">
                <i class="fas fa-hammer"></i><span>Hard</span>
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
              </div>
              <div class="difficulty-option" data-value="expert">
                <i class="fas fa-brain"></i><span>Expert</span>
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
              </div>
              <div class="difficulty-option" data-value="mental">
                <i class="fas fa-skull"></i><span>Mental</span>
                <div class="spinner-container">
                  <div class="loading-spinner"></div>
                </div>
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
              <div
                style="width: 300px; height: 250px; background: #ccc; display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                Square Ad 1 (300x250)
              </div>
            </div>
            <div id="ad-square-2" class="aside-placeholder">
              <div
                style="width: 300px; height: 250px; background: #ccc; display: flex; justify-content: center; align-items: center;">
                Square Ad 2 (300x250)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard Ad -->
      <div class="ad-leaderboard">
        <div id="ad-leaderboard" class="horizontal-placeholder">
          <div
            style="width: 728px; height: 90px; background: #ccc; display: flex; justify-content: center; align-items: center;">
            Leaderboard Ad (728x90)
          </div>
        </div>
      </div>
      <div class="sudoku-copy">
        <h2>Play Sudoku Sudoku Online - Free Puzzles for Everyone at Sudokusudoku.com</h2>
        <p>Welcome to <strong>Sudokusudoku.com</strong>, your ultimate destination to <strong>play sudoku
            online</strong> for free! Whether you're a beginner looking for <strong>easy sudoku puzzles</strong> or an
          expert tackling <a href="https://sudoku.com/killer" target="_blank" title="Killer Sudoku"><strong>killer sudoku</strong></a> and <strong>sudoku hard</strong>, we've got it all. Enjoy
          <strong>free sudoku games</strong> anytime, anywhere—no downloads needed. Our <strong>sudoku game
            online</strong> combines classic fun with modern convenience, making it one of the <strong>best online
            sudoku</strong> experiences around. Dive into <a href="https://www.livesudoku.com/en/daily-sudoku.php" target="_blank" title="Daily Sudoku Challenge"><strong>daily sudoku challenges</strong></a>, explore
          <strong>block sudoku</strong> twists, or relax with <strong>sudoku puzzles</strong> designed for all skill
          levels!</p>

        <h3>Sudoku for Beginners, Medium, and Hard Levels</h3>
        <p>At Sudokusudoku.com, we cater to everyone. Start with <strong>sudoku easy</strong> to learn the ropes, test
          your skills with <strong>sudoku medium</strong>, or challenge yourself with <strong>sudoku hard</strong>
          puzzles. Our <strong>sudoku puzzles online</strong> include <a href="https://www.nytimes.com/puzzles/sudoku/easy" target="_blank" title="NY Times Sudoku Easy"><strong>nyt sudoku easy</strong></a>, <strong>nyt
            sudoku medium</strong>, and <strong>nyt sudoku hard</strong>-inspired designs, plus <strong>sudoku puzzles
            medium</strong> and <strong>sudoku puzzles easy</strong> for a balanced experience. Whether you prefer
          <strong>free sudoku easy</strong> or something tougher, you'll find it here!</p>

        <h3>Explore Sudoku Variants</h3>
        <p>Love variety? Try <strong>killer sudoku online</strong>, a twist on the classic game, or enjoy <strong>block
            sudoku woody puzzle game</strong> and <strong>wood block sudoku</strong> for a unique spin. Our
          <strong>sudoku blocks</strong> and <strong>block puzzle sudoku</strong> options blend Tetris-like fun with
          traditional logic. For word lovers, <strong>wordoku</strong> and <strong>wordoku online</strong> offer a fresh
          challenge. Prefer a physical feel? Check out our inspiration from <strong>wooden sudoku board</strong> games
          and <strong>sudoku wooden board game</strong> designs—all playable digitally!</p>

        <h3>Why Choose Sudokusudoku.com?</h3>
        <p>Sudokusudoku.com is more than just a <strong>sudoku game app</strong>—it's a <strong>free sudoku app without
            ads</strong> (no interruptions!), offering <strong>sudoku offline</strong> play and <strong>sudoku online
            free</strong>. Unlike other <strong>sudoku apps</strong>, we prioritize simplicity and fun, rivaling the
          <strong>best sudoku app free</strong> options like <a href="https://sudoku.com/" target="_blank" title="Easybrain Sudoku"><strong>easybrain sudoku</strong></a> or <strong>brainium
            sudoku</strong>. Enjoy <strong>classic sudoku</strong>, <strong>sudoku 247</strong>, and <strong>daily
            sudoku online</strong> with no need to <strong>download sudoku</strong>—just play instantly!</p>

        <h3>Daily Challenges and More</h3>
        <p>Stay sharp with our <strong>daily sudoku</strong> and <strong>sudoku daily challenge</strong>, inspired by
          sources like <a href="https://www.nytimes.com/puzzles/sudoku/medium" target="_blank" title="NY Times Sudoku Medium"><strong>sudoku nyt</strong></a> and <a href="https://www.nytimes.com/puzzles/sudoku/medium" target="_blank" title="NY Times Sudoku Medium"></a><strong>new york times sudoku medium</strong>. Want to play
          offline? Our <a href="https://sudoku.cba.si/" target="_blank" title="Sudoku printable"><strong>sudoku printable</strong></a> puzzles let you take the fun anywhere. From <strong>free sudoku
            puzzles</strong> to <strong>sudoku game download</strong> alternatives, Sudokusudoku.com keeps you
          entertained every day!</p>

        <p><strong>Ready to solve?</strong> <a href="#">Play sudoku free</a> now at Sudokusudoku.com—your home for
          <strong>sudoku online easy</strong>, <strong>sudoku medium free</strong>, and beyond. No <strong>sudoku app no
            ads</strong> needed—just pure puzzle fun!</p>
      </div>
    </div>
  </section>
</main>

<?php get_footer(); ?>