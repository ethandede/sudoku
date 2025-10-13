<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TFNKPH6DNY"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-TFNKPH6DNY');
</script>

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9345046210950956"
     crossorigin="anonymous"></script>

<header class="site-header">
  <div class="container">
    <nav class="main-navigation" role="navigation">
      <div class="nav-brand">
        <a href="<?php echo home_url('/'); ?>" class="site-logo">Sudoku</a>
      </div>
      <button class="mobile-menu-toggle" aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-menu">
        <ul class="nav-primary">
          <li class="menu-item has-dropdown">
            <a href="<?php echo home_url('/'); ?>" class="dropdown-toggle">Play Sudoku <span class="arrow">▼</span></a>
            <ul class="dropdown-menu">
              <li><a href="<?php echo home_url('/?difficulty=quick'); ?>">Quick</a></li>
              <li><a href="<?php echo home_url('/?difficulty=easy'); ?>">Easy</a></li>
              <li><a href="<?php echo home_url('/?difficulty=not-easy'); ?>">Not Easy</a></li>
              <li><a href="<?php echo home_url('/?difficulty=hard'); ?>">Hard</a></li>
              <li><a href="<?php echo home_url('/?difficulty=expert'); ?>">Expert</a></li>
              <li><a href="<?php echo home_url('/?difficulty=mental'); ?>">Mental</a></li>
            </ul>
          </li>
          <li class="menu-item">
            <a href="<?php echo home_url('/links'); ?>">Links</a>
          </li>
          <li class="menu-item">
            <a href="<?php echo home_url('/articles'); ?>">Articles</a>
          </li>
          <li class="menu-item">
            <a href="<?php echo home_url('/about'); ?>">About</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</header>
