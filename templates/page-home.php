<?php
/**
 * Template Name: Custom Home Page
 * Template Post Type: page
 * Description: Template for Ethan Ede's custom homepage with 20 animated, overlapping squares (3x larger)
 */
get_header();
?>

<!-- Include Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">


<!-- Background Animation Container -->
<div class="background-animation">
  <svg class="animated-squares" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice"></svg>
</div>

<main id="home">

<!-- Color controls UI -->
  <?php get_template_part('partials/color-controls'); ?>

  <!-- Sticky Navigation with Integrated CTA -->
  <nav class="site-nav">
    <div class="container">
      <div class="nav-content">
        <h3 class="nav-title">Ethan Ede</h3>
        <ul class="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#skills">Skills & Experience</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div class="persistent-cta">
        <a href="/contact" class="cta-button">Let’s Work Together <i class="fa fa-arrow-right"></i></a>
      </div>
    </div>
  </nav>

  <!-- Hero Section without the SVG -->
  <section class="hero">
    <div class="container">
      <h5>Hello.</h5>
      <h4>My name is Ethan Ede.</h4>
      <h1>
        I build marketing websites <br>that
        <span class=rotating-word-break><br></span>
        <span class="rotating-word"></span>
    </h1>    
    <p>20+ years blending tech and creativity, now powered by AI</p>
      <a href="/contact" class="hero-button cta-button">Let's work together <i class="fa fa-arrow-right"></i></a>
    </div>  
  </section>  
  
  <!-- Things I Do Section -->
  <section class="what-i-do">
    <div class="container">
      <h2>What I Do</h2>
      <p class="supporting-text">I combine creative vision with marketing insight and technical expertise to build digital experiences that engage users and convert.</p>
      <div class="grid">
        <div class="item">
          <h4>Strategy + Vision</h4>
          <p>I transform challenges into clear, actionable roadmaps that align business goals with emerging opportunities.</p>
        </div>
        <div class="item">
          <h4>Design + Experience</h4>
          <p>I create engaging digital experiences where intuitive design meets seamless functionality.</p>
        </div>
        <div class="item">
          <h4>Development + Engineering</h4>
          <p>I build robust, scalable solutions using modern technologies that power innovative ideas.</p>
        </div>
        <div class="item">
          <h4>Marketing + Analytics</h4>
          <p>I craft data-driven campaigns that connect brands with their audiences and fuel growth.</p>
        </div>
      </div>
    </div>
  </section>

<!-- Clients Section -->
<section class="clients">
  <div class="container">
    <h2>Clients I've Worked With</h2>
    <p class="supporting-text">I have collaborated with industry-leading companies to bring creative digital solutions to life.</p>
  </div>
  <div class="logo-banner">
  <div class="logo-track">
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_lightspeedSystems.svg" alt="Lightspeed Systems">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_experian.svg" alt="Experian">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_staples.svg" alt="Staples">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_d-link.svg" alt="D-Link">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_laClippers.svg" alt="Los Angeles Clippers">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_liveops.svg" alt="Liveops">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_bosch.svg" alt="Bosch">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_actOn.svg" alt="Act-On">
      </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_bestBuy.svg" alt="Best Buy">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_rehau.svg" alt="Rehau">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_toshiba.svg" alt="Toshiba">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_quiksilver.svg" alt="Quiksilver">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_portlandJapaneseGarden.svg" alt="Portland Japanese Garden">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_nba.svg" alt="NBA">
    </div>
    <div class="logo-container">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo_kong.svg" alt="Kong, Inc.">
    </div>
  </div>
</div>
</section>


  <!-- Portfolio Section -->
  <section class="portfolio">
    <div class="container">
      <h2>Skills & Experience</h2>
      <p class="supporting-text">Not just a list of projects, this is a curated collection of articles that reveal how I apply practical expertise to real-world challenges, from website management to digital strategy.</p>
      <div class="portfolio-grid">
        <?php 
        // Sample Portfolio Items with Picsum Placeholder Images
        $portfolio_items = [
          [
            "image" => get_template_directory_uri() . "/assets/img/image_websiteManagement.png",
            "title" => "Website Management",
            "description" => "Your website should be fast, provide a smooth experience, and be reliably engineered. Every digital journey is elegant, well-designed, and a joy to drive.",
            "tags" => ["Development", "UX Design", "Strategy"],
            "link" => "#"
          ],
          [
            "image" => get_template_directory_uri() . "/assets/img/image_websiteDevelopment.png",
            "title" => "Website Development",
            "description" => "A complete redesign that improved usability and accessibility.",
            "tags" => ["UX Design", "Analytics", "Reporting"],
            "link" => "#"
          ],
          [
            "image" => get_template_directory_uri() . "/assets/img/image_seoCRO.png",
            "title" => "SEO and CRO",
            "description" => "An analytics dashboard that helps businesses make data-driven decisions.",
            "tags" => ["Analytics", "Strategy", "Development"],
            "link" => "#"
          ],
          [
            "image" => get_template_directory_uri() . "/assets/img/image_analyticsReporting.png",
            "title" => "Analytics & Reporting",
            "description" => "The ocean of data is vast, to find the treasure often takes a deep dive to gain insights and create actionable reporting.",
            "tags" => ["Development", "Strategy", "E-Commerce"],
            "link" => "#"
          ],
          [
            "image" => get_template_directory_uri() . "/assets/img/image_uxUiDesign.png",
            "title" => "UX/UI Design",
            "description" => "A marketing campaign that drove significant engagement through A/B testing.",
            "tags" => ["Marketing", "Analytics", "A/B Testing"],
            "link" => "#"
          ],
          [
            "image" => get_template_directory_uri() . "/assets/img/image_strategyVision.png",
            "title" => "Strategy and Vision",
            "description" => "A reporting dashboard providing in-depth insights into user behavior.",
            "tags" => ["Reporting", "Data Analysis", "Strategy"],
            "link" => "#"
          ],
        ];

        // Loop through and display portfolio items
        foreach ($portfolio_items as $item): ?>
            <!-- Wrap the entire card in an anchor to make it clickable -->
            <a class="portfolio-link" href="<?php echo $item['link']; ?>">
              <div class="portfolio-item">
                <!-- NEW: Overlay with a search icon -->
                <div class="portfolio-overlay">
                </div>
          
                <div class="portfolio-tags">
                  <?php foreach ($item['tags'] as $tag): ?>
                    <span class="tag"><?php echo $tag; ?></span>
                  <?php endforeach; ?>
                </div>
                <img src="<?php echo $item['image']; ?>" alt="<?php echo $item['title']; ?>">
                <div class="portfolio-copy">
                  <h3><?php echo $item['title']; ?></h3>
                  <p><?php echo $item['description']; ?></p>
                </div>
                <div class="portfolio-arrow">
                  <i class="fas fa-arrow-right"></i>
                </div>
              </div>
            </a>
          <?php endforeach; ?>
      </div>
    </div>
</section>

  <!-- AI Tools Section -->
  <section class="ai-tools">
    <div class="container">
      <h2>AI Tools & Technologies</h2>
      <p class="supporting-text">I leverage cutting-edge AI to amplify creativity, efficiency, and impact in digital solutions.</p>
      <div class="grid">
        <div class="item">
          <h4>ChatGPT</h4>
          <p>Automating content creation and ideation—generated SEO-optimized posts for [Company Z], cutting time by 30%.</p>
        </div>
        <div class="item">
          <h4>Grok</h4>
          <p>Analyzing data and user feedback—prioritized features for [Company V] with actionable insights.</p>
        </div>
        <div class="item">
          <h4>Stable Diffusion</h4>
          <p>Prototyping visuals—designed unique assets for [Project W], streamlining workflows.</p>
        </div>
        <div class="item">
          <h4>Midjourney</h4>
          <p>Enhancing creative output—crafted concept art for [Project X], reducing design time by 50%.</p>
        </div>
      </div>
    </div>
  </section>
  
</main>

<?php get_footer(); ?>
