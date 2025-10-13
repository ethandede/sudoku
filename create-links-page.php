<?php
/**
 * Create Links Page
 *
 * Run this to create the Links page with comprehensive Sudoku resources
 * http://sudoku.local/wp-content/themes/sudoku/create-links-page.php?key=sudoku2025
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
$secret_key = 'sudoku2025';
$provided_key = isset($_GET['key']) ? $_GET['key'] : '';

if ($provided_key !== $secret_key && !current_user_can('manage_options')) {
    die('Access denied. Invalid key or insufficient permissions.');
}

// Load content from HTML file
$content = file_get_contents(__DIR__ . '/links-page-content.html');

if (!$content) {
    die('Error: Could not load links-page-content.html');
}

// Check if page already exists
$existing = get_page_by_path('links');

if ($existing) {
    // Update existing page
    $result = wp_update_post([
        'ID' => $existing->ID,
        'post_content' => $content
    ]);

    $action = 'updated';
    $page_id = $existing->ID;
} else {
    // Create new page
    $page_data = [
        'post_title'    => 'Links',
        'post_content'  => $content,
        'post_status'   => 'publish',
        'post_type'     => 'page',
        'post_author'   => 1,
        'post_name'     => 'links',
    ];

    $page_id = wp_insert_post($page_data);
    $action = 'created';
}

if (is_wp_error($page_id)) {
    echo '<h2>❌ Error ' . $action . ' page</h2>';
    echo '<p>' . $page_id->get_error_message() . '</p>';
} else {
    echo '<h2>✅ Links page ' . $action . ' successfully!</h2>';
    echo '<p><strong>Page ID:</strong> ' . $page_id . '</p>';
    echo '<p><strong>Title:</strong> Links</p>';
    echo '<p><a href="' . get_permalink($page_id) . '" target="_blank">View Links Page →</a></p>';
    echo '<p><a href="' . admin_url('post.php?post=' . $page_id . '&action=edit') . '">Edit in WordPress →</a></p>';

    echo '<hr>';
    echo '<h3>Navigation Updated</h3>';
    echo '<p>The header navigation has been updated with:</p>';
    echo '<ul>';
    echo '<li><strong>Play Sudoku</strong> (dropdown with difficulty levels)</li>';
    echo '<li><strong>Links</strong> (the page you just created)</li>';
    echo '<li><strong>Articles</strong></li>';
    echo '<li><strong>About</strong></li>';
    echo '</ul>';
}

// Flush rewrite rules
flush_rewrite_rules();
?>

<style>
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 700px;
    margin: 50px auto;
    padding: 20px;
    background: #f5f5f5;
}
h2, h3 { color: #45748C; }
a { color: #45748C; }
ul { line-height: 1.8; }
</style>
