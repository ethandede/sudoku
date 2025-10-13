<?php
/**
 * Simple Article Importer - WordPress Integration
 *
 * Usage via URL (with authentication):
 * http://sudoku.local/wp-content/themes/sudoku/import-articles.php?key=sudoku2025
 */

// Load WordPress
require_once('../../../wp-load.php');

// Load image handler
require_once(get_template_directory() . '/includes/image-handler.php');

// Security check
$secret_key = 'sudoku2025'; // Change this!
$provided_key = isset($_GET['key']) ? $_GET['key'] : '';

if ($provided_key !== $secret_key && !current_user_can('publish_posts')) {
    die('Access denied. Invalid key or insufficient permissions.');
}

// Simple markdown to HTML converter (with image support)
function convert_markdown_to_html($markdown, &$image_refs = []) {
    // Extract and temporarily replace images to process separately
    $image_placeholder = '___IMAGE_PLACEHOLDER_%d___';
    $image_count = 0;

    // Find all image markdown
    $markdown = preg_replace_callback(
        '/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)/',
        function($matches) use (&$image_refs, &$image_count, $image_placeholder) {
            $image_refs[] = [
                'alt' => $matches[1] ?? '',
                'url' => $matches[2] ?? '',
                'credit' => $matches[3] ?? '',
            ];
            $placeholder = sprintf($image_placeholder, $image_count);
            $image_count++;
            return $placeholder;
        },
        $markdown
    );

    // Headers
    $markdown = preg_replace('/^### (.+)$/m', '<h3>$1</h3>', $markdown);
    $markdown = preg_replace('/^## (.+)$/m', '<h2>$1</h2>', $markdown);
    $markdown = preg_replace('/^# (.+)$/m', '<h1>$1</h1>', $markdown);

    // Bold and Italic
    $markdown = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $markdown);
    $markdown = preg_replace('/\*(.+?)\*/s', '<em>$1</em>', $markdown);

    // Links (but not images which were already processed)
    $markdown = preg_replace('/\[(.+?)\]\((.+?)\)/', '<a href="$2">$1</a>', $markdown);

    // Code
    $markdown = preg_replace('/```(.+?)```/s', '<pre><code>$1</code></pre>', $markdown);
    $markdown = preg_replace('/`(.+?)`/', '<code>$1</code>', $markdown);

    // Lists
    $markdown = preg_replace('/^\- (.+)$/m', '<li>$1</li>', $markdown);
    $markdown = preg_replace('/^\d+\. (.+)$/m', '<li>$1</li>', $markdown);

    // Blockquotes
    $markdown = preg_replace('/^> (.+)$/m', '<blockquote>$1</blockquote>', $markdown);

    // Wrap paragraphs
    $lines = explode("\n\n", $markdown);
    $html = '';
    $in_external_resources = false;

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;

        // Detect "Additional Resources" section
        if (preg_match('/<h2>Additional Resources<\/h2>/', $line)) {
            $in_external_resources = true;
            $html .= '<div class="external-resources">' . "\n";
            $html .= $line . "\n";
            continue;
        }

        // Skip if already wrapped in a block element
        if (preg_match('/^<(h[1-6]|ul|ol|blockquote|pre)/', $line)) {
            $html .= $line . "\n";
        } else {
            $html .= '<p>' . $line . "</p>\n";
        }
    }

    // Close external resources div if it was opened
    if ($in_external_resources) {
        $html .= '</div>' . "\n";
    }

    return $html;
}

// Parse article metadata
function parse_article($content) {
    $data = [
        'title' => '',
        'excerpt' => '',
        'tags' => [],
        'content' => $content,
    ];

    // Extract title (first # heading)
    if (preg_match('/^# (.+)$/m', $content, $matches)) {
        $data['title'] = trim($matches[1]);
        $content = preg_replace('/^# .+$\n*/m', '', $content, 1);
    }

    // Extract meta description
    if (preg_match('/\*\*Meta Description:\*\* (.+)/i', $content, $matches)) {
        $data['excerpt'] = trim($matches[1]);
        $content = preg_replace('/\*\*Meta Description:\*\* .+\n*/i', '', $content);
    }

    // Extract keywords/tags
    if (preg_match('/\*\*Keywords:\*\* (.+)/i', $content, $matches)) {
        $keywords = trim($matches[1]);
        $data['tags'] = array_map('trim', explode(',', $keywords));
        $content = preg_replace('/\*\*Keywords:\*\* .+\n*/i', '', $content);
    }

    // Clean up separators
    $content = preg_replace('/^-+\n*/m', '', $content);

    $data['content'] = trim($content);

    return $data;
}

// Import single article
function import_single_article($file_path) {
    if (!file_exists($file_path)) {
        return ['error' => 'File not found: ' . $file_path];
    }

    $markdown = file_get_contents($file_path);
    $article = parse_article($markdown);

    if (empty($article['title'])) {
        return ['error' => 'No title found in article'];
    }

    // Check if article exists
    $existing = get_page_by_title($article['title'], OBJECT, 'post');

    // Convert markdown to HTML and extract image references
    $image_refs = [];
    $html = convert_markdown_to_html($article['content'], $image_refs);

    $post_data = [
        'post_title' => $article['title'],
        'post_content' => $html,
        'post_excerpt' => $article['excerpt'],
        'post_status' => 'publish',
        'post_type' => 'post',
        'post_author' => 1,
    ];

    if ($existing) {
        $post_data['ID'] = $existing->ID;
        $post_id = wp_update_post($post_data);
        $action = 'updated';
    } else {
        $post_id = wp_insert_post($post_data);
        $action = 'created';
    }

    if (is_wp_error($post_id)) {
        return ['error' => $post_id->get_error_message()];
    }

    // Process images if any
    $images_processed = 0;
    $featured_image_set = false;

    if (!empty($image_refs)) {
        foreach ($image_refs as $index => $image_data) {
            // Download and attach image
            $attachment_id = download_and_attach_image(
                $image_data['url'],
                $post_id,
                $image_data['alt'],
                $image_data['credit']
            );

            if (!is_wp_error($attachment_id)) {
                $images_processed++;

                // Set first image as featured image
                if (!$featured_image_set && $index === 0) {
                    set_post_thumbnail($post_id, $attachment_id);
                    $featured_image_set = true;
                }

                // Replace placeholder in content with actual image HTML
                $image_html = sprintf(
                    '<figure class="wp-block-image"><img src="%s" alt="%s" /><figcaption>%s</figcaption></figure>',
                    wp_get_attachment_url($attachment_id),
                    esc_attr($image_data['alt']),
                    esc_html($image_data['credit'])
                );

                $placeholder = sprintf('___IMAGE_PLACEHOLDER_%d___', $index);
                $html = str_replace($placeholder, $image_html, $html);
            }
        }

        // Update post content with images
        wp_update_post([
            'ID' => $post_id,
            'post_content' => $html
        ]);
    }

    // Set category
    $category = get_category_by_slug('sudoku-guides');
    if (!$category) {
        $result = wp_insert_term('Sudoku Guides', 'category', [
            'slug' => 'sudoku-guides'
        ]);
        $category_id = is_wp_error($result) ? 1 : $result['term_id'];
    } else {
        $category_id = $category->term_id;
    }
    wp_set_post_categories($post_id, [$category_id]);

    // Set tags
    if (!empty($article['tags'])) {
        wp_set_post_tags($post_id, $article['tags'], false);
    }

    return [
        'success' => true,
        'title' => $article['title'],
        'action' => $action,
        'post_id' => $post_id,
        'url' => get_permalink($post_id),
        'images' => $images_processed,
        'featured_image' => $featured_image_set,
    ];
}

// Main execution
?>
<!DOCTYPE html>
<html>
<head>
    <title>Article Importer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #45748C;
            padding-bottom: 10px;
        }
        .result {
            margin: 20px 0;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #45748C;
            background: #f9f9f9;
        }
        .success {
            border-left-color: #4CAF50;
            background: #f1f8f4;
        }
        .error {
            border-left-color: #f44336;
            background: #fef1f1;
        }
        .filename {
            font-weight: bold;
            color: #45748C;
        }
        .summary {
            margin-top: 30px;
            padding: 20px;
            background: #e3f2fd;
            border-radius: 4px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background: #45748C;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
        }
        .button:hover {
            background: #3a6279;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Sudoku Article Importer</h1>

        <?php
        $articles_dir = get_template_directory() . '/articles/';
        $files = glob($articles_dir . '*.md');

        // Remove README
        $files = array_filter($files, function($file) {
            return stripos(basename($file), 'readme') === false;
        });

        if (empty($files)) {
            echo '<p>No articles found in /articles/ directory.</p>';
            exit;
        }

        echo '<p>Found ' . count($files) . ' article(s) to import...</p>';
        echo '<hr>';

        $results = [];
        foreach ($files as $file) {
            $filename = basename($file);
            echo '<div class="result">';
            echo '<div class="filename">' . htmlspecialchars($filename) . '</div>';

            $result = import_single_article($file);

            if (isset($result['error'])) {
                echo '<div class="error">❌ Error: ' . htmlspecialchars($result['error']) . '</div>';
            } else {
                echo '<div class="success">✅ ' . htmlspecialchars($result['title']) . ' - ' . $result['action'] . '</div>';

                if (isset($result['images']) && $result['images'] > 0) {
                    echo '<div style="margin: 5px 0; color: #666; font-size: 14px;">';
                    echo '📷 ' . $result['images'] . ' image(s) imported';
                    if ($result['featured_image']) {
                        echo ' (featured image set)';
                    }
                    echo '</div>';
                }

                echo '<a href="' . esc_url($result['url']) . '" target="_blank">View Article →</a>';
            }

            echo '</div>';

            $results[] = $result;
            flush();
        }

        $created = count(array_filter($results, fn($r) => isset($r['action']) && $r['action'] === 'created'));
        $updated = count(array_filter($results, fn($r) => isset($r['action']) && $r['action'] === 'updated'));
        $failed = count(array_filter($results, fn($r) => isset($r['error'])));
        ?>

        <div class="summary">
            <h2>📊 Summary</h2>
            <ul>
                <li><strong>Created:</strong> <?php echo $created; ?></li>
                <li><strong>Updated:</strong> <?php echo $updated; ?></li>
                <li><strong>Failed:</strong> <?php echo $failed; ?></li>
            </ul>
        </div>

        <a href="<?php echo home_url('/articles'); ?>" class="button">View All Articles →</a>
    </div>
</body>
</html>
