<?php
// Optional: Set a webhook secret for additional security
$secret = 'bhstscrtxhw';

// Get the signature and payload from GitHub
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');

// If a secret is set, validate the request
if ($signature) {
    list($algo, $hash) = explode('=', $signature, 2);
    $payloadHash = hash_hmac($algo, $payload, $secret);
    if (!hash_equals($payloadHash, $hash)) {
        http_response_code(403);
        exit('Invalid signature');
    }
}

// Change directory to your theme folder and pull the latest code
$output = shell_exec('git --git-dir=/home/ezfjslmy/repositories/ethanede.com.git --work-tree=/home/ezfjslmy/public_html/wp-content/themes/ethanede checkout -f HEAD 2>&1');
echo "<pre>$output</pre>";
?>
