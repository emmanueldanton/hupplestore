"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker, ce qui rend l'application installable.
 *
 * Silencieux par conception : un échec d'enregistrement ne doit jamais empêcher
 * le tableau de bord de fonctionner, l'installation n'étant qu'un confort.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En développement, le rechargement à chaud et un service worker font
    // mauvais ménage : on ne l'enregistre qu'en production.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
