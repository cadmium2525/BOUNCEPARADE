// オフライン対応：アプリ本体は先に保存、音声・フォントは使ったときに保存
const CACHE = 'bounceparade-v12';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/main.js', 'js/ui.js', 'js/game.js', 'js/player.js', 'js/physics.js', 'js/level.js', 'js/stages.js', 'js/entities.js',
  'js/bosses.js', 'js/render.js', 'js/art.js', 'js/fx.js', 'js/audio.js', 'js/balls.js', 'js/consts.js', 'js/save.js', 'js/sprites.js',
  'assets/atlas/balls_atlas.png', 'assets/atlas/balls_atlas.json', 'assets/data/game_rules.json', 'assets/data/enemies.json', 'assets/data/bosses.json',
  'audio/manifest.json', 'assets/sprites/manifest.json',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || Response.error())),
  );
});
