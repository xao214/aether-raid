
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("aether-raid-v2").then((c) => c.addAll([
    "./", "./index.html", "./css/style.css", "./js/audio.js", "./js/game.js", "./js/main.js", "./manifest.json"
  ])));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
