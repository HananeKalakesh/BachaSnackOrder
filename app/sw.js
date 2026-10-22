/* Keeps a copy of the app on the iPad so it opens without internet.
   Online, the newest files are used (and saved); offline, the saved copy. Orders themselves are not handled here:
   the app keeps unsent changes in its own outbox (core.js). */
var CACHE = 'elbash-app-v18';
var FILES = ['./', 'index.html', 'kitchen.html', 'manage.html', 'core.js', 'recipes.js', 'hub.js', 'marketing.js', 'cashier.js', 'printer.js', 'income.js', 'website.js', 'costs.js', 'overview.js', 'favicon-32.png', 'manifest.webmanifest', 'kitchen.webmanifest', 'manage.webmanifest',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', '../assets/elbash/noar-green.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES) }).then(function () { return self.skipWaiting() }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) }));
  }).then(function () { return self.clients.claim() }));
});

// The newest copy when the internet answers within 4 seconds, otherwise the saved one
function fresh(req) {
  return caches.open(CACHE).then(function (c) {
    var keep = function () { return c.match(req, {ignoreSearch: true}) };
    var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res });
    var wait = new Promise(function (ok) { setTimeout(ok, 4000) });
    return Promise.race([net, wait]).then(function (res) { return res || keep().then(function (m) { return m || net }) })
      .catch(function () { return keep().then(function (m) { return m || Response.error() }) });
  });
}
// Fonts never change: the saved copy first
function saved(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res });
    });
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin === location.origin) return e.respondWith(fresh(e.request));
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(saved(e.request));
});
