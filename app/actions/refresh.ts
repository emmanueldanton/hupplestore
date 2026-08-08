"use server";

import { updateTag } from "next/cache";

/**
 * Force le rechargement des données Chariow et Meta.
 *
 * Les appels aux deux API sont mis en cache quinze minutes, sans quoi chaque
 * navigation entre onglets rapatrierait tout l'historique. Ce délai est
 * invisible et devient gênant dès qu'on veut vérifier une vente à l'instant
 * où elle tombe.
 *
 * `updateTag` plutôt que `revalidateTag` : le second marque la donnée comme
 * périmée et sert quand même l'ancienne version pendant que la nouvelle
 * charge en arrière-plan. Un bouton « Actualiser » qui réaffiche les mêmes
 * chiffres ne vaut rien. `updateTag` expire immédiatement, et le rendu suivant
 * attend les données fraîches.
 *
 * Aucune redirection n'est nécessaire : Next relance le rendu de la page
 * courante à l'issue de l'action.
 */
export async function refreshData() {
  updateTag("chariow");
  updateTag("meta");
}
