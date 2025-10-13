<?php
/**
 * Create Articles Page
 *
 * Run this once to create the Articles page with the correct template
 * http://sudoku.local/wp-content/themes/sudoku/create-articles-page.php?key=sudoku2025
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
$secret_key = 'sudoku2025';
$provided_key = isset($_GET['key']) ? $_GET['key'] : '';

if ($provided_key !== $secret_key && !current_user_can('manage_options')) {
    die('Access denied. Invalid key or insufficient permissions.');
}

// Check if page already exists
$existing = get_page_by_path('articles');

if ($existing) {
    echo '<h2>✅ Articles page already exists!</h2>';
    echo '<p><strong>Page ID:</strong> ' . $existing->ID . '</p>';
    echo '<p><strong>URL:</strong> <a href="' . get_permalink($existing->ID) . '">' . get_permalink($existing->ID) . '</a></p>';
    echo '<p><a href="' . admin_url('post.php?post=' . $existing->ID . '&action=edit') . '">Edit Page in WordPress</a></p>';
} else {
    // Create the page
    $page_data = [
        'post_title'    => 'Articles',
        'post_content'  => '<!-- Articles will be displayed here automatically by the template -->',
        'post_status'   => 'publish',
        'post_type'     => 'page',
        'post_author'   => 1,
        'post_name'     => 'articles', // slug
    ];

    $page_id = wp_insert_post($page_data);

    if (is_wp_error($page_id)) {
        echo '<h2>❌ Error creating page</h2>';
        echo '<p>' . $page_id->get_error_message() . '</p>';
    } else {
        // Set the page template
        update_post_meta($page_id, '_wp_page_template', 'templates/page-articles.php');

        echo '<h2>✅ Articles page created successfully!</h2>';
        echo '<p><strong>Page ID:</strong> ' . $page_id . '</p>';
        echo '<p><strong>URL:</strong> <a href="' . get_permalink($page_id) . '">' . get_permalink($page_id) . '</a></p>';
        echo '<p><a href="' . admin_url('post.php?post=' . $page_id . '&action=edit') . '">Edit Page in WordPress</a></p>';

        echo '<hr>';
        echo '<p><strong>Next step:</strong> Visit your <a href="' . get_permalink($page_id) . '">Articles page</a> to see all published articles!</p>';
    }
}

// Flush rewrite rules to ensure the URL works
flush_rewrite_rules();

echo '<hr>';
echo '<p><small>You can safely delete this file after running it once.</small></p>';
?>
