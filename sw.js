const CACHE_NAME = "lernapp-v4";

// Relative URLs werden gegen den Ablageort von sw.js aufgelöst.
// Dadurch funktioniert der Cache auch, wenn die App in einem
// Unterordner (z. B. GitHub Pages) liegt.
const urlsToCache = [
  "./",
  "./index.html",
  "./Code/home/frontend/style.css",
  "./app.js"
];

// Installieren (Dateien speichern)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Aktivieren (alte Caches löschen)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Netzwerk zuerst, Cache als Offline-Fallback.
// So kommen CSS-/JS-Änderungen sofort an, statt dauerhaft aus dem Cache zu kommen.
self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // "no-store" verhindert, dass der Browser trotz Netzwerk-first
    // noch eine alte JS-/HTML-Version aus dem HTTP-Cache liefert.
    fetch(request, { cache: "no-store" })
      .then(response => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
