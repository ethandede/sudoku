<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 */
?>
<footer class="site-footer">
  <div class="container">
    <nav class="footer-nav">
      <ul class="footer-links">
        <li><a href="<?php echo home_url('/about'); ?>">About</a></li>
        <li><a href="<?php echo home_url('/articles'); ?>">Articles</a></li>
        <li><a href="<?php echo home_url('/links'); ?>">Links</a></li>
        <li><a href="<?php echo home_url('/contact'); ?>">Contact</a></li>
        <li><a href="<?php echo home_url('/privacy-policy'); ?>">Privacy Policy</a></li>
      </ul>
    </nav>
    <p class="copyright">&copy; <?php echo date('Y'); ?> Sudoku Online. All rights reserved.</p>
  </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
