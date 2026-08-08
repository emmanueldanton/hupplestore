/**
 * Service worker minimal.
 *
 * Il ne met en cache AUCUNE donnée métier. Un tableau de bord financier qui
 * afficherait des chiffres périmés sans le dire serait pire qu'un tableau de
 * bord indisponible : on prendrait des décisions sur des montants d'hier en
 * croyant lire ceux d'aujourd'hui.
 *
 * Son rôle se limite à deux choses : rendre l'application installable, ce que
 * Chrome conditionne à la présence d'un gestionnaire `fetch`, et afficher une
 * page d'attente honnête quand le réseau manque.
 */

const CACHE = "hupple-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Seules les navigations sont interceptées. Tout le reste, y compris les
  // appels de données, va directement au réseau sans passer par le cache.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE);
      const fallback = await cache.match(OFFLINE_URL);
      return (
        fallback ??
        new Response("Hors ligne.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
