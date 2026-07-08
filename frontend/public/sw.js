/* eslint-disable no-restricted-globals */
// Self-destructing service worker.
//
// A previous version of this worker cached index.html cache-first with a
// fixed cache name, which served stale HTML pointing at deleted JS bundles
// after every deploy (blank page + "Unexpected token '<'"). This replacement
// removes all caches, unregisters itself, and reloads open tabs so existing
// visitors recover on their next visit.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
