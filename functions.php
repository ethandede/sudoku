<?php

function disable_cache_headers() {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
}
add_action('send_headers', 'disable_cache_headers');

// Add theme support
function ee_enqueue_assets() {
    $manifest_path = get_template_directory() . '/assets/css/rev-manifest.json';
    $style_file = 'style.css';

    if (file_exists($manifest_path)) {
        $manifest = json_decode(file_get_contents($manifest_path), true);
        if (isset($manifest[$style_file])) {
            $style_file = $manifest[$style_file];
        }
    }

    wp_enqueue_style(
        'ee-style',
        get_template_directory_uri() . '/assets/css/' . $style_file,
        [],
        null,
        'all'
    );
}
add_action('wp_enqueue_scripts', 'ee_enqueue_assets');

// Register menus
function ee_register_menus() {
    register_nav_menus([
        'main_navigation' => __('Main Navigation', 'ethanede'),
    ]);
}
add_action('init', 'ee_register_menus');

function register_navwalker() {
    require_once get_template_directory() . '/includes/class-wp-bootstrap-navwalker.php';
}
add_action('after_setup_theme', 'register_navwalker');

function enqueue_custom_scripts() {
    // External Scripts:
    wp_enqueue_script('gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.0/gsap.min.js', array(), '3.11.0', true);
    wp_enqueue_script('scroll-trigger', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.0/ScrollTrigger.min.js', array('gsap'), '3.11.0', true);
    
    // Custom JS Files (loaded on all pages):
    wp_enqueue_script('hero-animation', get_template_directory_uri() . '/assets/js/heroAnimation.js', array('gsap', 'scroll-trigger'), '1.0', true);
    wp_enqueue_script('portfolio-hover', get_template_directory_uri() . '/assets/js/portfolioHover.js', array('gsap', 'scroll-trigger'), '1.0', true);
    wp_enqueue_script('typed-init', get_template_directory_uri() . '/assets/js/typedInit.js', array('typed-js'), '1.0', true);
    wp_enqueue_script('persistent-cta', get_template_directory_uri() . '/assets/js/persistentCTA.js', array(), '1.0', true);
    wp_enqueue_script('change-theme', get_template_directory_uri() . '/assets/js/changeTheme.js', array(), '1.0', true);
    wp_enqueue_script('helpers', get_template_directory_uri() . '/assets/js/helpers.js', array(), '1.0', true);
    wp_enqueue_script('sudoku', get_template_directory_uri() . '/assets/js/sudoku.js', array(), '1.2', true);    // Load backgroundSquares.js only on the home page
    if (is_front_page() || is_home()) {
        wp_enqueue_script('background-squares', get_template_directory_uri() . '/assets/js/backgroundSquares.js', array('gsap', 'scroll-trigger'), '1.0', true);
        wp_enqueue_script('typed-js', 'https://cdn.jsdelivr.net/npm/typed.js@2.0.12', array(), '2.0.12', true);
        wp_enqueue_script('logo-scroll', get_template_directory_uri() . '/assets/js/logoScroll.js', array(), '1.0', true);
    }
}
add_action('wp_enqueue_scripts', 'enqueue_custom_scripts');