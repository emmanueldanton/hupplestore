"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChargement } from "./Chargement";

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
 * la position de défilement, contrairement à un rechargement complet. Il passe
 * par `lancer` pour que l'écran signale qu'il se met à jour.
 */
const INTERVALLE_MS = 120_000;

/**
 * Un retour au premier plan moins d'une minute après le dernier rendu ne
 * relance rien : à l'ouverture d'un onglet, le navigateur signale aussitôt
 * qu'il devient visible, et la page rechargeait des chiffres qu'elle venait de
 * recevoir.
 */
const DELAI_MINIMAL_MS = 60_000;

export function AutoRefresh() {
  const router = useRouter();
  const { lancer } = useChargement();

  useEffect(() => {
    let dernier = Date.now();
    const actualiser = () => {
      dernier = Date.now();
      lancer(() => router.refresh());
    };

    let minuteur: ReturnType<typeof setInterval> | null = null;

    const demarrer = () => {
      if (minuteur !== null) return;
      minuteur = setInterval(actualiser, INTERVALLE_MS);
    };

    const arreter = () => {
      if (minuteur === null) return;
      clearInterval(minuteur);
      minuteur = null;
    };

    const surVisibilite = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - dernier >= DELAI_MINIMAL_MS) actualiser();
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
    // `lancer` change à chaque rendu du fournisseur : le minuteur ne dépend que du routeur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return null;
}
