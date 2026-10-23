const VERSION = "__SUDOKU_PWA_VERSION__";
const SHELL = __SUDOKU_PWA_SHELL__;
const SHELL_CACHE = `sudoku-shell-${VERSION}`;
const CONTENT_CACHE = `sudoku-content-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== CONTENT_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "skip-waiting") self.skipWaiting();
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function shellPath(pathname) {
  if (pathname === "/index.html") return "/";
  return pathname;
}

function inShell(url) {
  const path = shellPath(url.pathname);
  const requestUrl = `${url.pathname}${url.search}`;
  const mappedUrl = `${path}${url.search}`;
  if (SHELL.includes(requestUrl) || SHELL.includes(mappedUrl) || SHELL.includes(path) || SHELL.includes(url.pathname)) {
    return true;
  }
  return SHELL.some((entry) => entry.split("?")[0] === path || entry.split("?")[0] === url.pathname);
}

async function shellFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(request.url);
  const path = shellPath(url.pathname);
  const versioned = `${path}${url.search}`;
  const cached = (await cache.match(request)) || (await cache.match(versioned)) || (url.search ? null : await cache.match(path));
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("/offline.html")) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CONTENT_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const response = await refresh;
  if (response) return response;
  if (request.mode === "navigate") {
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match("/offline.html")) || Response.error();
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!sameOrigin(url)) return;
  if (url.pathname.startsWith("/api/")) return;

  const path = shellPath(url.pathname);
  const precached = inShell(url);
  if (request.mode === "navigate" && (path === "/" || url.pathname === "/index.html")) {
    event.respondWith(shellFirst(request));
    return;
  }
  if (precached) {
    event.respondWith(shellFirst(request));
    return;
  }
  if (request.mode === "navigate" || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/articles/") || url.pathname.startsWith("/techniques/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
