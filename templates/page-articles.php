<?php
/**
 * Template Name: Articles
 * Description: Displays all blog articles
 */

get_header();
?>

<main id="articles" class="articles-page">
  <div class="container">
    <header class="page-header">
      <h1>Sudoku Articles & Guides</h1>
      <p class="page-description">Learn strategies, tips, and everything you need to master Sudoku</p>
    </header>

    <div class="articles-grid">
      <?php
      $args = array(
        'post_type' => 'post',
        'posts_per_page' => 12,
        'orderby' => 'date',
        'order' => 'DESC'
      );

      $articles_query = new WP_Query($args);

      if ($articles_query->have_posts()) :
        while ($articles_query->have_posts()) : $articles_query->the_post();
      ?>
        <article class="article-card">
          <?php if (has_post_thumbnail()) : ?>
            <div class="article-thumbnail">
              <a href="<?php the_permalink(); ?>">
                <?php the_post_thumbnail('medium'); ?>
              </a>
            </div>
          <?php endif; ?>

          <div class="article-content">
            <div class="article-meta">
              <span class="article-date"><?php echo get_the_date(); ?></span>
              <span class="article-reading-time"><?php echo sudoku_reading_time(); ?> min read</span>
            </div>

            <h2 class="article-title">
              <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
            </h2>

            <div class="article-excerpt">
              <?php the_excerpt(); ?>
            </div>

            <a href="<?php the_permalink(); ?>" class="read-more">Read Full Article →</a>
          </div>
        </article>
      <?php
        endwhile;
        wp_reset_postdata();
      else :
      ?>
        <p class="no-articles">No articles found. Check back soon!</p>
      <?php endif; ?>
    </div>

    <?php
    // Pagination
    if ($articles_query->max_num_pages > 1) :
    ?>
      <div class="pagination">
        <?php
        echo paginate_links(array(
          'total' => $articles_query->max_num_pages,
          'prev_text' => '← Previous',
          'next_text' => 'Next →',
        ));
        ?>
      </div>
    <?php endif; ?>
  </div>
</main>

<?php get_footer(); ?>
