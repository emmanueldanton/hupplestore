import { getNetRate } from "./chariow";
import type { Kpis } from "./types";

/**
 * Économie unitaire de la boutique, et prix plancher qui en découle.
 *
 * Toute idée de produit se heurte d'abord à une contrainte arithmétique, avant
 * toute considération de marché : au coût par clic actuel, il existe un prix
 * en dessous duquel aucun produit ne peut être rentable, quelle que soit sa
 * qualité.
 *
 *   revenu net par clic = taux de conversion × taux de reversement × prix
 *   équilibre           quand ce revenu égale le coût par clic
 *   donc prix plancher  = coût par clic / (taux de conversion × reversement)
 *
 * Sur cette boutique, quatre des cinq produits lancés hors du thème principal
 * étaient sous ce plancher dès le premier jour.
 */

export interface UnitEconomics {
  /** Coût par clic constaté sur la période. */
  cpcXof: number | null;
  /** Ventes rapportées aux clics. */
  cvr: number | null;
  /** Part du prix réellement reversée, après prélèvements. */
  netRate: number;
  /** Prix en dessous duquel la rentabilité est arithmétiquement impossible. */
  floorXof: number | null;
  /** Prix procurant un ROAS de 2, marge de sécurité usuelle. */
  comfortXof: number | null;
  clicks: number;
  sales: number;
}

export function computeUnitEconomics(kpis: Kpis, netRate = getNetRate()): UnitEconomics {
  const { clicks, sales, spendXof } = kpis;

  if (clicks <= 0 || sales <= 0 || spendXof <= 0) {
    return {
      cpcXof: null,
      cvr: null,
      netRate,
      floorXof: null,
      comfortXof: null,
      clicks,
      sales,
    };
  }

  const cpcXof = spendXof / clicks;
  const cvr = sales / clicks;
  const floorXof = cpcXof / (cvr * netRate);

  return {
    cpcXof,
    cvr,
    netRate,
    floorXof,
    comfortXof: floorXof * 2,
    clicks,
    sales,
  };
}

export type Viability = "viable" | "limite" | "sous_le_plancher" | "incalculable";

export interface Verdict {
  /** Taux de conversion qu'il faudrait atteindre à ce prix. */
  requiredCvr: number | null;
  /** ROAS attendu si la conversion reste celle observée aujourd'hui. */
  expectedRoas: number | null;
  /** Marge nette par vente, après prélèvements. */
  netPerSaleXof: number;
  viability: Viability;
}

/**
 * Confronte un prix envisagé à l'économie réelle de la boutique.
 *
 * « Limite » couvre la zone entre l'équilibre et un ROAS de 1,3 : rentable sur
 * le papier, mais sans marge pour une hausse du coût par clic ou une créa
 * moins performante. C'est exactement là que se situe le produit phare
 * aujourd'hui, et c'est pourquoi la boutique perd de l'argent.
 */
export function judgePrice(priceXof: number, economics: UnitEconomics): Verdict {
  const netPerSaleXof = priceXof * economics.netRate;

  if (
    economics.cpcXof === null ||
    economics.cvr === null ||
    priceXof <= 0 ||
    netPerSaleXof <= 0
  ) {
    return {
      requiredCvr: null,
      expectedRoas: null,
      netPerSaleXof,
      viability: "incalculable",
    };
  }

  const requiredCvr = economics.cpcXof / netPerSaleXof;
  const expectedRoas = (economics.cvr * netPerSaleXof) / economics.cpcXof;

  const viability: Viability =
    expectedRoas >= 1.3 ? "viable" : expectedRoas >= 1 ? "limite" : "sous_le_plancher";

  return { requiredCvr, expectedRoas, netPerSaleXof, viability };
}

export const VIABILITY_LABELS: Record<Viability, string> = {
  viable: "Viable",
  limite: "Limite",
  sous_le_plancher: "Sous le plancher",
  incalculable: "Incalculable",
};

export const VIABILITY_ADVICE: Record<Viability, string> = {
  viable:
    "À ce prix, le produit dégage une marge même si la conversion reste au niveau actuel. Il mérite un test.",
  limite:
    "Rentable sur le papier, sans aucune marge de sécurité. Une hausse du coût par clic ou une créa moins performante suffit à basculer en perte.",
  sous_le_plancher:
    "Arithmétiquement perdant au coût par clic actuel, quelle que soit la qualité du produit. Écarte l'idée, ou monte le prix.",
  incalculable:
    "Pas assez de données publicitaires sur la période pour établir un coût par clic.",
};
