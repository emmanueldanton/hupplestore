"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit les données sans intervention.
 *
 * Deux déclencheurs, choisis pour coller à l'usage réel d'une application
 * installée sur téléphone :
 *
 *   1. Au retour au premier plan. C'est le geste naturel : on rouvre
 *      l'application et on s'attend à voir l'état du moment, pas celui
 *      d'hier soir. Sans cela, une application PWA garde son dernier rendu
 *      indéfiniment, ce qui donne l'impression qu'elle est figée.
 *   2. Toutes les deux minutes tant que l'écran reste visible, pour qu'un
 *      tableau laissé ouvert reste vivant.
 *
 * Le minuteur est arrêté dès que l'onglet passe en arrière-plan : inutile
 * d'interroger Chariow et Meta pour une page que personne ne regarde.
 *
 * `router.refresh()` relance le rendu serveur en conservant l'état client et
 * la position de défilement, contrairement à un rechargement complet.
 */
const INTERVALLE_MS = 120_000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let minuteur: ReturnType<typeof setInterval> | null = null;

    const demarrer = () => {
      if (minuteur !== null) return;
      minuteur = setInterval(() => router.refresh(), INTERVALLE_MS);
    };

    const arreter = () => {
      if (minuteur === null) return;
      clearInterval(minuteur);
      minuteur = null;
    };

    const surVisibilite = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        demarrer();
      } else {
        arreter();
      }
    };

    if (document.visibilityState === "visible") demarrer();
    document.addEventListener("visibilitychange", surVisibilite);

    return () => {
      document.removeEventListener("visibilitychange", surVisibilite);
      arreter();
    };
  }, [router]);

  return null;
}
