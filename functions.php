<?php

function disable_cache_headers() {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
}
add_action('send_headers', 'disable_cache_headers');

// Enqueue theme assets
function sudoku_enqueue_assets() {
    $manifest_path = get_template_directory() . '/assets/css/rev-manifest.json';
    $style_file = 'style.css';

    if (file_exists($manifest_path)) {
        $manifest = json_decode(file_get_contents($manifest_path), true);
        if (isset($manifest[$style_file])) {
            $style_file = $manifest[$style_file];
        }
    }

    wp_enqueue_style(
        'sudoku-style',
        get_template_directory_uri() . '/assets/css/' . $style_file,
        [],
        null,
        'all'
    );
}
add_action('wp_enqueue_scripts', 'sudoku_enqueue_assets');

// Register menus
function sudoku_register_menus(): void {
    register_nav_menus([
        'main_navigation' => __('Main Navigation', 'sudoku'),
    ]);
}
add_action('init', 'sudoku_register_menus');

function register_navwalker() {
    require_once get_template_directory() . '/includes/class-wp-bootstrap-navwalker.php';
}
add_action('after_setup_theme', 'register_navwalker');

function enqueue_custom_scripts() {
    wp_enqueue_script('sudoku', get_template_directory_uri() . '/assets/js/sudoku.js', array(), '1.2', true);
}
add_action('wp_enqueue_scripts', 'enqueue_custom_scripts');

// Calculate reading time for articles
function sudoku_reading_time() {
    $content = get_post_field('post_content', get_the_ID());
    $word_count = str_word_count(strip_tags($content));
    $reading_time = ceil($word_count / 200); // Average reading speed: 200 words per minute
    return $reading_time;
}

// Add featured image support
add_theme_support('post-thumbnails');

// Set excerpt length
function sudoku_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'sudoku_excerpt_length');