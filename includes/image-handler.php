<?php
/**
 * Image Handler for Article Importer
 *
 * Supports:
 * - Downloading images from URLs
 * - Setting featured images
 * - Adding image credits/attribution
 * - Support for Unsplash, Pexels, Pixabay (free stock photos)
 */

// Download image from URL and add to WordPress media library
function download_and_attach_image($image_url, $post_id, $image_title = '', $image_credit = '') {
    // Ensure we have required functions
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    // Download image to temp file
    $tmp = download_url($image_url);

    if (is_wp_error($tmp)) {
        return $tmp;
    }

    // Get file info
    $file_array = array(
        'name' => basename($image_url),
        'tmp_name' => $tmp
    );

    // If no title, use filename
    if (empty($image_title)) {
        $image_title = pathinfo($image_url, PATHINFO_FILENAME);
    }

    // Upload to media library
    $attachment_id = media_handle_sideload($file_array, $post_id, $image_title);

    // Clean up temp file
    if (file_exists($tmp)) {
        @unlink($tmp);
    }

    if (is_wp_error($attachment_id)) {
        return $attachment_id;
    }

    // Add image credit as alt text and caption if provided
    if (!empty($image_credit)) {
        $attachment_data = array(
            'ID' => $attachment_id,
            'post_excerpt' => $image_credit, // Caption
        );
        wp_update_post($attachment_data);

        // Set alt text
        update_post_meta($attachment_id, '_wp_attachment_image_alt', $image_credit);
    }

    return $attachment_id;
}

// Parse image markdown syntax with credits
function parse_image_markdown($markdown_line) {
    // Format: ![Alt Text](image-url.jpg "Credit: Source Name")
    // Or: ![Alt Text](image-url.jpg)

    $pattern = '/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)/';

    if (preg_match($pattern, $markdown_line, $matches)) {
        return [
            'alt' => $matches[1] ?? '',
            'url' => $matches[2] ?? '',
            'credit' => $matches[3] ?? '',
        ];
    }

    return null;
}

// Get free stock photo from Unsplash (requires API key)
function get_unsplash_image($query, $orientation = 'landscape') {
    // Unsplash API (free tier: 50 requests/hour)
    // Sign up at: https://unsplash.com/developers
    $access_key = get_option('unsplash_api_key', ''); // Store in WordPress options

    if (empty($access_key)) {
        return new WP_Error('no_api_key', 'Unsplash API key not configured');
    }

    $api_url = sprintf(
        'https://api.unsplash.com/photos/random?query=%s&orientation=%s',
        urlencode($query),
        $orientation
    );

    $response = wp_remote_get($api_url, [
        'headers' => [
            'Authorization' => 'Client-ID ' . $access_key
        ]
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($body['urls']['regular'])) {
        return new WP_Error('no_image', 'No image found');
    }

    // Return image data with proper attribution
    return [
        'url' => $body['urls']['regular'],
        'credit' => sprintf(
            'Photo by %s on Unsplash',
            $body['user']['name']
        ),
        'photographer' => $body['user']['name'],
        'photographer_url' => $body['user']['links']['html'],
    ];
}

// Get free stock photo from Pexels (requires API key)
function get_pexels_image($query, $orientation = 'landscape') {
    // Pexels API (free, no rate limit listed)
    // Sign up at: https://www.pexels.com/api/
    $api_key = get_option('pexels_api_key', ''); // Store in WordPress options

    if (empty($api_key)) {
        return new WP_Error('no_api_key', 'Pexels API key not configured');
    }

    $api_url = sprintf(
        'https://api.pexels.com/v1/search?query=%s&orientation=%s&per_page=1',
        urlencode($query),
        $orientation
    );

    $response = wp_remote_get($api_url, [
        'headers' => [
            'Authorization' => $api_key
        ]
    ]);

    if (is_wp_error($response)) {
        return $response;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($body['photos'][0])) {
        return new WP_Error('no_image', 'No image found');
    }

    $photo = $body['photos'][0];

    return [
        'url' => $photo['src']['large'],
        'credit' => sprintf(
            'Photo by %s on Pexels',
            $photo['photographer']
        ),
        'photographer' => $photo['photographer'],
        'photographer_url' => $photo['photographer_url'],
    ];
}

// Extract images from markdown content
function extract_images_from_markdown($markdown) {
    $images = [];
    $lines = explode("\n", $markdown);

    foreach ($lines as $line) {
        if (strpos($line, '![') === 0) {
            $image_data = parse_image_markdown($line);
            if ($image_data) {
                $images[] = $image_data;
            }
        }
    }

    return $images;
}

// Process article images and set featured image
function process_article_images($post_id, $markdown_content, $auto_featured = true) {
    $images = extract_images_from_markdown($markdown_content);
    $attachment_ids = [];

    foreach ($images as $index => $image) {
        // Download and attach image
        $attachment_id = download_and_attach_image(
            $image['url'],
            $post_id,
            $image['alt'],
            $image['credit']
        );

        if (!is_wp_error($attachment_id)) {
            $attachment_ids[] = $attachment_id;

            // Set first image as featured image
            if ($auto_featured && $index === 0) {
                set_post_thumbnail($post_id, $attachment_id);
            }
        }
    }

    return $attachment_ids;
}

// Helper: Search for stock image by keyword
function find_stock_image($keyword, $source = 'pexels') {
    switch ($source) {
        case 'unsplash':
            return get_unsplash_image($keyword);
        case 'pexels':
            return get_pexels_image($keyword);
        default:
            return new WP_Error('invalid_source', 'Invalid image source');
    }
}

// Generate image markdown with proper attribution
function generate_image_markdown($image_data, $alt_text = '') {
    if (empty($alt_text)) {
        $alt_text = 'Sudoku puzzle image';
    }

    return sprintf(
        '![%s](%s "%s")',
        $alt_text,
        $image_data['url'],
        $image_data['credit']
    );
}
