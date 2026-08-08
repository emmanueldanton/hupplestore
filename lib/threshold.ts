import { getNetRate } from "./chariow";
import type { ProfitabilityReport } from "./types";

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
  /** Ventes attribuées rapportées aux clics publicitaires. */
  cvr: number | null;
  /**
   * Même rapport, mais toutes ventes confondues. Conservé pour information :
   * c'est la performance de l'activité, pas celle de la publicité.
   */
  blendedCvr: number | null;
  /** Part du prix réellement reversée, après prélèvements. */
  netRate: number;
  /** Prix en dessous duquel la rentabilité est arithmétiquement impossible. */
  floorXof: number | null;
  /** Prix procurant un ROAS de 2, marge de sécurité usuelle. */
  comfortXof: number | null;
  clicks: number;
  /** Ventes qu'une campagne peut revendiquer. */
  attributedSales: number;
  /** Toutes les ventes de la période, attribuées ou non. */
  totalSales: number;
}

export interface EconomicsInput {
  spendXof: number;
  clicks: number;
  /**
   * Ventes rattachées à une campagne.
   *
   * C'est le seul dénominateur honnête. Compter les ventes organiques au
   * crédit de la publicité gonfle la conversion et abaisse d'autant le prix
   * plancher : sur cette boutique, 91 ventes sur 239 ne sont attribuées à
   * aucune campagne, et les inclure faisait passer le plancher de 5 700 F à
   * 3 500 F. Un produit à 4 000 F apparaissait alors viable alors qu'un clic
   * payant ne se serait jamais remboursé sur lui.
   */
  attributedSales: number;
  totalSales: number;
}

export function computeUnitEconomics(
  input: EconomicsInput,
  netRate = getNetRate(),
): UnitEconomics {
  const { clicks, attributedSales, totalSales, spendXof } = input;

  const blendedCvr = clicks > 0 ? totalSales / clicks : null;

  if (clicks <= 0 || attributedSales <= 0 || spendXof <= 0) {
    return {
      cpcXof: null,
      cvr: null,
      blendedCvr,
      netRate,
      floorXof: null,
      comfortXof: null,
      clicks,
      attributedSales,
      totalSales,
    };
  }

  const cpcXof = spendXof / clicks;
  const cvr = attributedSales / clicks;
  const floorXof = cpcXof / (cvr * netRate);

  return {
    cpcXof,
    cvr,
    blendedCvr,
    netRate,
    floorXof,
    comfortXof: floorXof * 2,
    clicks,
    attributedSales,
    totalSales,
  };
}

/**
 * Dérive l'économie unitaire d'un rapport de rentabilité.
 *
 * Les ventes attribuées sont le total moins celles qu'aucune campagne ne
 * revendiquait ce jour-là.
 */
export function unitEconomicsFromReport(
  report: ProfitabilityReport,
  netRate = getNetRate(),
): UnitEconomics {
  return computeUnitEconomics(
    {
      spendXof: report.kpis.spendXof,
      clicks: report.kpis.clicks,
      attributedSales: Math.max(0, report.kpis.sales - report.unattributed.sales),
      totalSales: report.kpis.sales,
    },
    netRate,
  );
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
