<?php
/**
 * Template for single article posts
 */

get_header();
?>

<main id="article-single" class="article-single-page">
  <?php
  while (have_posts()) : the_post();
  ?>
    <article class="article-content">
      <div class="container">
        <header class="article-header">
          <div class="article-meta">
            <span class="article-date"><?php echo get_the_date(); ?></span>
            <span class="article-reading-time"><?php echo sudoku_reading_time(); ?> min read</span>
          </div>

          <h1 class="article-title"><?php the_title(); ?></h1>

          <?php if (has_post_thumbnail()) : ?>
            <div class="article-featured-image">
              <?php the_post_thumbnail('large'); ?>
            </div>
          <?php endif; ?>
        </header>

        <div class="article-body">
          <?php the_content(); ?>
        </div>

        <footer class="article-footer">
          <div class="article-tags">
            <?php the_tags('<span class="tags-label">Tags:</span> ', ', '); ?>
          </div>

          <div class="article-navigation">
            <?php
            $prev_post = get_previous_post();
            $next_post = get_next_post();

            if ($prev_post) :
            ?>
              <a href="<?php echo get_permalink($prev_post); ?>" class="nav-prev">
                <span class="nav-label">← Previous Article</span>
                <span class="nav-title"><?php echo get_the_title($prev_post); ?></span>
              </a>
            <?php endif; ?>

            <?php if ($next_post) : ?>
              <a href="<?php echo get_permalink($next_post); ?>" class="nav-next">
                <span class="nav-label">Next Article →</span>
                <span class="nav-title"><?php echo get_the_title($next_post); ?></span>
              </a>
            <?php endif; ?>
          </div>

          <div class="back-to-articles">
            <a href="<?php echo home_url('/articles'); ?>" class="cta-button">← Back to All Articles</a>
          </div>
        </footer>
      </div>
    </article>
  <?php endwhile; ?>
</main>

<?php get_footer(); ?>
