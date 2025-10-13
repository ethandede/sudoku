<?php
/**
 * Create Required Pages (Privacy Policy & Contact)
 *
 * Run this to create essential pages needed for AdSense approval
 * http://sudoku.local/wp-content/themes/sudoku/create-required-pages.php?key=sudoku2025
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
$secret_key = 'sudoku2025';
$provided_key = isset($_GET['key']) ? $_GET['key'] : '';

if ($provided_key !== $secret_key && !current_user_can('manage_options')) {
    die('Access denied. Invalid key or insufficient permissions.');
}

// Pages to create
$pages = [
    [
        'title' => 'Privacy Policy',
        'slug' => 'privacy-policy',
        'file' => 'privacy-policy-content.html'
    ],
    [
        'title' => 'Contact',
        'slug' => 'contact',
        'file' => 'contact-page-content.html'
    ]
];

echo '<style>
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background: #f5f5f5;
}
h2, h3 { color: #45748C; }
a { color: #45748C; }
.success {
    background: #f1f8f4;
    border-left: 4px solid #4CAF50;
    padding: 15px;
    margin: 15px 0;
}
.info {
    background: #e3f2fd;
    border-left: 4px solid #45748C;
    padding: 15px;
    margin: 15px 0;
}
ul { line-height: 1.8; }
</style>';

echo '<h2>📄 Creating Required Pages for AdSense</h2>';

$results = [];

foreach ($pages as $page_info) {
    // Load content
    $content = file_get_contents(__DIR__ . '/' . $page_info['file']);

    if (!$content) {
        echo '<div class="error">❌ Could not load ' . $page_info['file'] . '</div>';
        continue;
    }

    // Check if page exists
    $existing = get_page_by_path($page_info['slug']);

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
            'post_title'    => $page_info['title'],
            'post_content'  => $content,
            'post_status'   => 'publish',
            'post_type'     => 'page',
            'post_author'   => 1,
            'post_name'     => $page_info['slug'],
        ];

        $page_id = wp_insert_post($page_data);
        $action = 'created';
    }

    if (is_wp_error($page_id)) {
        echo '<div class="error">❌ Error with ' . $page_info['title'] . ': ' . $page_id->get_error_message() . '</div>';
    } else {
        echo '<div class="success">';
        echo '<strong>✅ ' . $page_info['title'] . '</strong> - ' . $action . '<br>';
        echo '<a href="' . get_permalink($page_id) . '" target="_blank">View Page →</a> | ';
        echo '<a href="' . admin_url('post.php?post=' . $page_id . '&action=edit') . '">Edit in WordPress →</a>';
        echo '</div>';

        $results[] = [
            'title' => $page_info['title'],
            'action' => $action,
            'url' => get_permalink($page_id)
        ];
    }
}

// Flush rewrite rules
flush_rewrite_rules();

echo '<hr>';
echo '<h3>🎯 Next Steps for AdSense Approval</h3>';

echo '<div class="info">';
echo '<p><strong>Pages Created:</strong></p>';
echo '<ul>';
foreach ($results as $result) {
    echo '<li>' . $result['title'] . ' - <a href="' . $result['url'] . '" target="_blank">View</a></li>';
}
echo '</ul>';
echo '</div>';

echo '<div class="info">';
echo '<h4>Important: Update Contact Page</h4>';
echo '<p>The Contact page currently has a placeholder for the contact form. You need to:</p>';
echo '<ol>';
echo '<li>Install a contact form plugin (Contact Form 7, WPForms, or Gravity Forms)</li>';
echo '<li>Replace the placeholder section with your actual contact form shortcode</li>';
echo '<li>OR add your email address in the placeholder section</li>';
echo '</ol>';
echo '</div>';

echo '<div class="info">';
echo '<h4>Add to Footer Navigation</h4>';
echo '<p>Consider adding these pages to your footer menu for easy access:</p>';
echo '<ul>';
echo '<li>Privacy Policy</li>';
echo '<li>Contact</li>';
echo '<li>About</li>';
echo '<li>Articles</li>';
echo '</ul>';
echo '<p>Go to <strong>Appearance → Menus</strong> in WordPress to create a footer menu.</p>';
echo '</div>';

echo '<div class="info">';
echo '<h4>Before Applying to AdSense:</h4>';
echo '<ul>';
echo '<li>✅ Privacy Policy page created</li>';
echo '<li>✅ Contact page created</li>';
echo '<li>⚠️ Need 10-15 more articles (currently have 3)</li>';
echo '<li>⚠️ Install contact form plugin</li>';
echo '<li>⚠️ Let site age 30-60 days with regular traffic</li>';
echo '<li>⚠️ Build some organic traffic before applying</li>';
echo '</ul>';
echo '</div>';

echo '<hr>';
echo '<p><small>You can safely delete this script after running it once.</small></p>';
?>
