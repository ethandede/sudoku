<?php
/**
 * Template Name: Sudoku Game Home Page
 * Template Post Type: page
 * Description: Homepage for the Sudoku game
 */
get_header();
?>

<main id="home">
  <!-- Color controls UI -->
  <?php get_template_part('partials/color-controls'); ?>

  <!-- Navigation -->
  <nav class="site-nav">
    <div class="container">
      <div class="nav-content">
        <h3 class="nav-title">Sudoku</h3>
        <ul class="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="/sudoku">Play Sudoku</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <h1>Play Sudoku</h1>
      <p>Challenge yourself with the classic number puzzle game</p>
      <a href="/sudoku" class="hero-button cta-button">Start Playing</a>
    </div>  
  </section>
  
</main>

<?php get_footer(); ?>
