<?php
/**
 * Update About Page Content
 *
 * Run this to update the About page with new content
 * http://sudoku.local/wp-content/themes/sudoku/update-about-page.php?key=sudoku2025
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
$secret_key = 'sudoku2025';
$provided_key = isset($_GET['key']) ? $_GET['key'] : '';

if ($provided_key !== $secret_key && !current_user_can('edit_pages')) {
    die('Access denied. Invalid key or insufficient permissions.');
}

// About page content
$content = <<<'HTML'
<h2>Our Passion for Sudoku</h2>

<p>Sudoku is more than just a puzzle—it's a journey of logic, patience, and pure mental satisfaction. Every time you place that final number and complete a grid, there's an undeniable rush of accomplishment. That feeling is what drives us, and it's why we've dedicated ourselves to celebrating this incredible game.</p>

<p>We believe Sudoku represents the perfect balance between challenge and accessibility. Whether you're a complete beginner picking up your first puzzle or an experienced solver tackling expert-level grids, Sudoku offers something special. It doesn't require mathematical genius or special knowledge—just clear thinking, careful observation, and determination. This democratic nature of the game is what makes it so beautiful.</p>

<h2>Why Sudoku Matters</h2>

<p>In our fast-paced, distraction-filled world, Sudoku offers something rare: a chance to slow down, focus deeply, and engage your mind in pure logical thinking. Each puzzle is a meditation, a mental workout, and a creative challenge rolled into one. We've seen firsthand how Sudoku sharpens problem-solving skills, improves concentration, and provides a deeply satisfying sense of progress and achievement.</p>

<p>What started as a personal love for the game has grown into a mission to share that passion with others. We've spent countless hours solving puzzles, studying techniques, and exploring what makes certain Sudoku grids so elegantly challenging. Every puzzle we create and every guide we write comes from genuine enthusiasm for helping others experience the joy we've found in this timeless game.</p>

<h2>Our Commitment</h2>

<p>This site exists because we believe everyone should have access to quality Sudoku resources—clear guides that actually teach techniques, thoughtfully designed puzzles, and a community that celebrates the art of logical deduction. We're not here to overwhelm you with flashy features or gimmicks. We're here to share the pure, simple pleasure of a well-crafted Sudoku puzzle.</p>

<p>Whether you're solving your first puzzle or your ten-thousandth, we're thrilled to be part of your Sudoku journey. Every grid you complete, every technique you master, and every "aha!" moment you experience—that's what this is all about. Welcome to our community of passionate solvers.</p>

<hr />

<p><strong>Ready to dive in?</strong> <a href="/articles">Explore our articles</a> to learn new techniques, or jump straight into a puzzle and experience the satisfaction for yourself.</p>
HTML;

// Find the About page
$about_page = get_page_by_path('about');

if (!$about_page) {
    echo '<h2>❌ About page not found</h2>';
    echo '<p>Please make sure you have created an "About" page in WordPress.</p>';
    echo '<p><a href="' . admin_url('post-new.php?post_type=page') . '">Create a new page</a></p>';
    exit;
}

// Update the page content
$result = wp_update_post([
    'ID' => $about_page->ID,
    'post_content' => $content
]);

if (is_wp_error($result)) {
    echo '<h2>❌ Error updating page</h2>';
    echo '<p>' . $result->get_error_message() . '</p>';
} else {
    echo '<h2>✅ About page updated successfully!</h2>';
    echo '<p><strong>Page ID:</strong> ' . $about_page->ID . '</p>';
    echo '<p><strong>Title:</strong> ' . $about_page->post_title . '</p>';
    echo '<p><a href="' . get_permalink($about_page->ID) . '" target="_blank">View About Page →</a></p>';
    echo '<p><a href="' . admin_url('post.php?post=' . $about_page->ID . '&action=edit') . '">Edit in WordPress →</a></p>';
}
?>

<style>
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 600px;
    margin: 50px auto;
    padding: 20px;
    background: #f5f5f5;
}
h2 { color: #45748C; }
a { color: #45748C; }
</style>
