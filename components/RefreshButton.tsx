"use client";

import { refreshData } from "@/app/actions/refresh";
import { Rouage, useChargement } from "./Chargement";

/**
 * Bouton d'actualisation.
 *
 * Le libellé dit explicitement la durée du cache : sans cette précision,
 * un chiffre inchangé après un clic laisse croire à une panne, alors que
 * c'est le comportement normal quand rien n'a bougé côté Chariow ou Meta.
 *
 * Pendant le rechargement, l'icône devient un cercle qui tourne et le bouton
 * se bloque : un second clic relançait tout l'historique Chariow pour rien.
 */
export function RefreshButton() {
  const { enCours, lancer } = useChargement();

  return (
    <button
      type="button"
      onClick={() => lancer(() => refreshData())}
      disabled={enCours}
      aria-label={enCours ? "Actualisation en cours" : "Actualiser les données"}
      title="Actualiser les données. Sans clic, elles sont rechargées au plus toutes les 15 minutes."
      className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-wait disabled:bg-white/20 disabled:text-white"
    >
      {enCours ? (
        <Rouage className="h-[18px] w-[18px]" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[19px] w-[19px]"
        >
          <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
          <path d="M19.6 4.9v3.6h-3.6" />
        </svg>
      )}
    </button>
  );
}
