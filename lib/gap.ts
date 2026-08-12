import { getNetRate } from "./chariow";
import type { MetaClaim } from "./meta";

/**
 * Écart entre ce que la plateforme publicitaire annonce et ce qui est
 * réellement encaissé.
 *
 * C'est la démonstration centrale du produit. Meta affiche une valeur de
 * conversion égale au montant des commandes, avant frais de paiement et frais
 * de plateforme de vente. Il ne les connaît pas et ne peut pas les déduire :
 * son ROAS est donc mécaniquement supérieur au vrai, d'un facteur égal au taux
 * de prélèvement.
 *
 * La comparaison porte sur le même périmètre de ventes, celles que Meta
 * revendique. Comparer son ROAS au nôtre mélangerait deux différences, les
 * frais et la méthode d'attribution, et ne prouverait rien de net.
 */
export interface PlatformGap {
  /** ROAS affiché dans le gestionnaire de publicités. */
  claimedRoas: number;
  /** Le même, une fois les prélèvements déduits. */
  realRoas: number;
  /** Écart relatif, 0.15 pour une surestimation de quinze pour cent. */
  overstatement: number;
  /** Montant que Meta compte et que tu n'encaisses pas, en XOF. */
  missingXof: number;
  purchases: number;
  claimedValueXof: number;
  netValueXof: number;
}

export function computeGap(
  claim: MetaClaim | null,
  spendXof: number,
  netRate = getNetRate(),
): PlatformGap | null {
  if (!claim || spendXof <= 0 || claim.valueXof <= 0) return null;

  const claimedValueXof = claim.valueXof;
  const netValueXof = claimedValueXof * netRate;

  // Le ROAS annoncé est recalculé plutôt que repris tel quel : le champ de
  // Meta porte parfois une fenêtre d'attribution différente de la nôtre, et
  // deux dénominateurs distincts rendraient la comparaison fausse.
  const claimedRoas = claimedValueXof / spendXof;
  const realRoas = netValueXof / spendXof;

  return {
    claimedRoas,
    realRoas,
    overstatement: claimedRoas > 0 ? claimedRoas / realRoas - 1 : 0,
    missingXof: claimedValueXof - netValueXof,
    purchases: claim.purchases,
    claimedValueXof,
    netValueXof,
  };
}
