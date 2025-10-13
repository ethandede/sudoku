<?php
/**
 * Article Importer
 * Automatically imports markdown articles from /articles/ directory
 *
 * Usage:
 * - Via browser: http://sudoku.local/?import_articles=1&key=sudoku2025
 * - Via WP-CLI: wp eval-file includes/article-importer.php
 * - Via npm: npm run import-articles
 */

// Security: Require authentication or secret key
function verify_import_access() {
    // Check if running from WP-CLI
    if (defined('WP_CLI') && WP_CLI) {
        return true;
    }

    // Check for secret key in URL
    if (isset($_GET['import_articles']) && isset($_GET['key'])) {
        return $_GET['key'] === 'sudoku2025'; // Change this secret key!
    }

    // Check if admin is logged in
    if (is_admin() && current_user_can('publish_posts')) {
        return true;
    }

    return false;
}

// Simple markdown to HTML converter
function markdown_to_html($markdown) {
    // Headers
    $markdown = preg_replace('/^### (.+)$/m', '<h3>$1</h3>', $markdown);
    $markdown = preg_replace('/^## (.+)$/m', '<h2>$1</h2>', $markdown);
    $markdown = preg_replace('/^# (.+)$/m', '<h1>$1</h1>', $markdown);

    // Bold and Italic
    $markdown = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $markdown);
    $markdown = preg_replace('/\*(.+?)\*/s', '<em>$1</em>', $markdown);

    // Links
    $markdown = preg_replace('/\[(.+?)\]\((.+?)\)/', '<a href="$2">$1</a>', $markdown);

    // Code blocks
    $markdown = preg_replace('/```(.+?)```/s', '<pre><code>$1</code></pre>', $markdown);
    $markdown = preg_replace('/`(.+?)`/', '<code>$1</code>', $markdown);

    // Lists (simple unordered)
    $markdown = preg_replace('/^\- (.+)$/m', '<li>$1</li>', $markdown);
    $markdown = preg_replace('/(<li>.*<\/li>\n?)+/s', '<ul>$0</ul>', $markdown);

    // Lists (simple ordered)
    $markdown = preg_replace('/^\d+\. (.+)$/m', '<li>$1</li>', $markdown);

    // Blockquotes
    $markdown = preg_replace('/^> (.+)$/m', '<blockquote>$1</blockquote>', $markdown);

    // Paragraphs (wrap text not already in tags)
    $lines = explode("\n", $markdown);
    $html = '';
    $in_paragraph = false;

    foreach ($lines as $line) {
        $line = trim($line);

        // Skip empty lines
        if (empty($line)) {
            if ($in_paragraph) {
                $html .= "</p>\n";
                $in_paragraph = false;
            }
            continue;
        }

        // Check if line is already wrapped in a tag
        if (preg_match('/^<(h[1-6]|ul|ol|li|blockquote|pre|code)/', $line)) {
            if ($in_paragraph) {
                $html .= "</p>\n";
                $in_paragraph = false;
            }
            $html .= $line . "\n";
        } else {
            // Start or continue paragraph
            if (!$in_paragraph) {
                $html .= "<p>";
                $in_paragraph = true;
            } else {
                $html .= " ";
            }
            $html .= $line;
        }
    }

    if ($in_paragraph) {
        $html .= "</p>\n";
    }

    return $html;
}

// Parse article frontmatter (metadata at top of file)
function parse_frontmatter($content) {
    $metadata = [
        'title' => '',
        'excerpt' => '',
        'keywords' => '',
        'category' => 'Sudoku Guides',
        'tags' => [],
        'featured_image' => '',
        'status' => 'publish', // publish or draft
    ];

    // Extract metadata from **Meta Description:** format
    if (preg_match('/\*\*Meta Description:\*\* (.+)/i', $content, $matches)) {
        $metadata['excerpt'] = trim($matches[1]);
    }

    // Extract title from first # heading
    if (preg_match('/^# (.+)$/m', $content, $matches)) {
        $metadata['title'] = trim($matches[1]);
        // Remove title from content so it doesn't duplicate
        $content = preg_replace('/^# .+$/m', '', $content, 1);
    }

    // Extract keywords from bottom of article
    if (preg_match('/\*\*Keywords:\*\* (.+)/i', $content, $matches)) {
        $keywords = trim($matches[1]);
        $metadata['keywords'] = $keywords;
        $metadata['tags'] = array_map('trim', explode(',', $keywords));
    }

    // Remove metadata lines from content
    $content = preg_replace('/\*\*Meta Description:\*\* .+/i', '', $content);
    $content = preg_replace('/\*\*Keywords:\*\* .+/i', '', $content);
    $content = preg_replace('/---+/', '', $content); // Remove separators

    return [
        'metadata' => $metadata,
        'content' => trim($content),
    ];
}

// Import a single article
function import_article($file_path) {
    if (!file_exists($file_path)) {
        return ['success' => false, 'message' => 'File not found'];
    }

    $markdown = file_get_contents($file_path);
    $parsed = parse_frontmatter($markdown);
    $metadata = $parsed['metadata'];
    $content = $parsed['content'];

    // Convert markdown to HTML
    $html = markdown_to_html($content);

    // Check if article already exists (by title)
    $existing = get_page_by_title($metadata['title'], OBJECT, 'post');

    if ($existing) {
        // Update existing post
        $post_id = $existing->ID;
        $post_data = [
            'ID' => $post_id,
            'post_content' => $html,
            'post_excerpt' => $metadata['excerpt'],
            'post_status' => $metadata['status'],
        ];
        wp_update_post($post_data);
        $action = 'updated';
    } else {
        // Create new post
        $post_data = [
            'post_title' => $metadata['title'],
            'post_content' => $html,
            'post_excerpt' => $metadata['excerpt'],
            'post_status' => $metadata['status'],
            'post_type' => 'post',
            'post_author' => 1, // Admin user
        ];
        $post_id = wp_insert_post($post_data);
        $action = 'created';
    }

    if (is_wp_error($post_id)) {
        return ['success' => false, 'message' => $post_id->get_error_message()];
    }

    // Set category
    $category = get_category_by_slug(sanitize_title($metadata['category']));
    if (!$category) {
        $category_id = wp_create_category($metadata['category']);
    } else {
        $category_id = $category->term_id;
    }
    wp_set_post_categories($post_id, [$category_id]);

    // Set tags
    if (!empty($metadata['tags'])) {
        wp_set_post_tags($post_id, $metadata['tags'], false);
    }

    return [
        'success' => true,
        'message' => "Article '{$metadata['title']}' {$action}",
        'post_id' => $post_id,
        'action' => $action,
    ];
}

// Main import function
function import_all_articles() {
    if (!verify_import_access()) {
        die('Access denied. You must be logged in as admin or provide the correct key.');
    }

    $articles_dir = get_template_directory() . '/articles/';

    if (!is_dir($articles_dir)) {
        die('Articles directory not found: ' . $articles_dir);
    }

    $files = glob($articles_dir . '*.md');

    if (empty($files)) {
        die('No markdown files found in articles directory.');
    }

    $results = [];

    echo "<h1>Article Importer</h1>\n";
    echo "<p>Found " . count($files) . " article(s) to import...</p>\n";
    echo "<hr>\n";

    foreach ($files as $file) {
        $filename = basename($file);

        // Skip README files
        if (stripos($filename, 'readme') !== false) {
            echo "<p>⏭️  Skipping: {$filename}</p>\n";
            continue;
        }

        echo "<p>📝 Processing: {$filename}...</p>\n";

        $result = import_article($file);
        $results[] = $result;

        if ($result['success']) {
            echo "<p>✅ {$result['message']} (ID: {$result['post_id']})</p>\n";
        } else {
            echo "<p>❌ Failed: {$result['message']}</p>\n";
        }

        echo "<hr>\n";
        flush();
    }

    // Summary
    $created = count(array_filter($results, function($r) { return $r['success'] && $r['action'] === 'created'; }));
    $updated = count(array_filter($results, function($r) { return $r['success'] && $r['action'] === 'updated'; }));
    $failed = count(array_filter($results, function($r) { return !$r['success']; }));

    echo "<h2>Summary</h2>\n";
    echo "<ul>\n";
    echo "<li>Created: {$created}</li>\n";
    echo "<li>Updated: {$updated}</li>\n";
    echo "<li>Failed: {$failed}</li>\n";
    echo "</ul>\n";

    echo "<p><a href='" . home_url('/articles') . "'>View Articles</a></p>\n";
}

// Run if accessed directly
if (!defined('ABSPATH')) {
    // Load WordPress
    require_once('../../../../wp-load.php');
}

// Execute import
import_all_articles();
