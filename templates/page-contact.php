<?php
/**
 * Template Name: Contact Form
 */
get_header();
?>

<div class="contact-page">
  <div class="contact-form-container">
  <header class="contact-header">
      <h2>Get in Touch</h2>
      <p>Please fill out the form below and I'll get back to you as soon as possible.</p>
    </header>
    <?php echo do_shortcode('[contact-form-7 id="eb95201" title="Contact Form - Ethan Ede"]'); ?>
  </div>
</div>

<?php get_footer(); ?>