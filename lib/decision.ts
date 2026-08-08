import { conversionInterval, probabilityAbove } from "./stats";

/**
 * Traduit une performance observée en décision, ou en refus de décider.
 *
 * Le point de bascule est le taux de conversion d'équilibre :
 *
 *   seuil = coût par clic / net moyen par vente
 *
 * En dessous, la campagne perd de l'argent ; au-dessus, elle en gagne. Toute la
 * question devient alors : quelle est la probabilité que le taux réel dépasse
 * ce seuil ? C'est une question à laquelle les données peuvent répondre, là où
 * « cette campagne est-elle bonne ? » n'en est pas une.
 */

export type Verdict = "rentable" | "perdante" | "indetermine" | "sans_donnees";

/** Seuil de certitude exigé avant de trancher, dans un sens ou dans l'autre. */
export const CONFIDENCE_THRESHOLD = 0.95;

export interface CampaignConfidence {
  /** Taux de conversion d'équilibre : en dessous, la campagne perd. */
  breakEvenCvr: number | null;
  /** Taux observé, conversions sur clics. */
  cvr: number | null;
  cvrLow: number;
  cvrHigh: number;
  /** Bornes du ROAS déduites de l'intervalle sur le taux de conversion. */
  roasLow: number | null;
  roasHigh: number | null;
  /** Probabilité que la campagne soit réellement rentable. */
  probabilityProfitable: number | null;
  verdict: Verdict;
  /**
   * Clics supplémentaires nécessaires avant de pouvoir conclure, au rythme
   * de conversion actuel. null si le verdict est déjà rendu, ou hors d'atteinte.
   */
  clicksNeededToConclude: number | null;
}

export interface Observation {
  clicks: number;
  /** Ventes attribuées. Fractionnaire quand plusieurs campagnes se partagent une vente. */
  conversions: number;
  spendXof: number;
  /** Net moyen par vente, pour convertir un taux de conversion en revenu. */
  netPerSaleXof: number;
}

/** Aucune inférence possible : trafic nul, dépense nulle, ou campagne non mappée. */
export const UNKNOWN_CONFIDENCE: CampaignConfidence = {
  breakEvenCvr: null,
  cvr: null,
  cvrLow: 0,
  cvrHigh: 1,
  roasLow: null,
  roasHigh: null,
  probabilityProfitable: null,
  verdict: "sans_donnees",
  clicksNeededToConclude: null,
};

function verdictFrom(probability: number): Verdict {
  if (probability >= CONFIDENCE_THRESHOLD) return "rentable";
  if (probability <= 1 - CONFIDENCE_THRESHOLD) return "perdante";
  return "indetermine";
}

/**
 * Estime combien de clics supplémentaires seraient nécessaires pour trancher,
 * en supposant que le taux de conversion reste celui observé.
 *
 * Le seuil d'équilibre ne bouge pas avec le volume : il vaut le coût par clic
 * divisé par le net moyen, deux grandeurs qui ne dépendent pas du nombre de
 * clics. On peut donc projeter à seuil constant.
 */
function clicksToConclude(
  breakEvenCvr: number,
  conversions: number,
  clicks: number,
): number | null {
  // Moyenne a posteriori plutôt que taux brut : sans elle, une campagne à zéro
  // conversion resterait à zéro et ne conclurait jamais.
  const projectedCvr = (0.5 + conversions) / (1 + clicks);

  let n = Math.max(clicks, 1);
  for (let step = 0; step < 200; step += 1) {
    n = Math.ceil(n * 1.15) + 25;
    if (n > 500_000) return null;

    const probability = probabilityAbove(breakEvenCvr, projectedCvr * n, n);
    if (
      probability >= CONFIDENCE_THRESHOLD ||
      probability <= 1 - CONFIDENCE_THRESHOLD
    ) {
      return Math.round(n - clicks);
    }
  }
  return null;
}

export function assess(observation: Observation): CampaignConfidence {
  const { clicks, conversions, spendXof, netPerSaleXof } = observation;

  // Sans clic, sans dépense ou sans panier de référence, aucune inférence n'a
  // de sens. Mieux vaut l'annoncer que de produire un chiffre décoratif.
  if (clicks <= 0 || spendXof <= 0 || netPerSaleXof <= 0) {
    return UNKNOWN_CONFIDENCE;
  }

  const breakEvenCvr = spendXof / (clicks * netPerSaleXof);
  const cvr = conversions / clicks;
  const { low, high } = conversionInterval(conversions, clicks);

  const toRoas = (rate: number) => (rate * clicks * netPerSaleXof) / spendXof;

  // Un seuil d'équilibre au-delà de 100 % signifie qu'aucun taux de conversion
  // atteignable ne rendrait la campagne rentable : le clic coûte plus cher que
  // ce que rapporte une vente.
  const probabilityProfitable =
    breakEvenCvr >= 1 ? 0 : probabilityAbove(breakEvenCvr, conversions, clicks);

  return {
    breakEvenCvr,
    cvr,
    cvrLow: low,
    cvrHigh: high,
    roasLow: toRoas(low),
    roasHigh: toRoas(high),
    probabilityProfitable,
    verdict: verdictFrom(probabilityProfitable),
    clicksNeededToConclude:
      verdictFrom(probabilityProfitable) === "indetermine"
        ? clicksToConclude(breakEvenCvr, conversions, clicks)
        : null,
  };
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  rentable: "Rentable",
  perdante: "Perdante",
  indetermine: "Indéterminé",
  sans_donnees: "Sans données",
};
