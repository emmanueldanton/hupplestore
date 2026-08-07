/**
 * Modèle de données du tableau de bord de rentabilité.
 *
 * Convention monétaire : tous les montants internes sont en XOF (F CFA), en
 * nombre décimal. La conversion vers EUR est faite uniquement à l'affichage,
 * via la parité fixe (voir lib/money.ts).
 */

/** Une vente Chariow normalisée, ramenée à ce qui sert au calcul de rentabilité. */
export interface SaleRecord {
  id: string;
  /** Jour de finalisation de la vente, en UTC, format YYYY-MM-DD. */
  date: string;
  productId: string;
  productName: string;
  /** Montant payé par le client, avant prélèvements. */
  grossXof: number;
  /** Montant réellement reversé (après frais de paiement + frais de service). */
  netXof: number;
  /**
   * true si `settlement.amount` était absent et que le net a été recalculé.
   * Affiché dans l'UI : on ne présente jamais une estimation comme un fait.
   */
  netIsEstimated: boolean;
  country: string | null;
}

/** Une ligne de dépense publicitaire Meta, pour un jour et une campagne. */
export interface AdSpendRecord {
  date: string;
  campaignId: string;
  campaignName: string;
  /** Dépense convertie en XOF. */
  spendXof: number;
  /** Dépense brute telle que renvoyée par Meta, dans la devise du compte. */
  spendRaw: number;
  currency: string;
  impressions: number;
  clicks: number;
}

/** Performance agrégée d'une campagne sur la période. */
export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  /** Produits rattachés via config/campaign-map.json. Vide = non mappée. */
  productIds: string[];
  isMapped: boolean;
  spendXof: number;
  impressions: number;
  clicks: number;
  sales: number;
  grossXof: number;
  netXof: number;
  /** net / dépense. null si aucune dépense (division impossible). */
  roas: number | null;
  /** net − dépense. Le seul chiffre qui dit si tu gagnes de l'argent. */
  marginXof: number;
  /** dépense / ventes. null si aucune vente. */
  cpaXof: number | null;
  /** Net moyen par vente : au-delà, chaque acquisition te coûte de l'argent. */
  breakEvenCpaXof: number | null;
}

/** Performance agrégée d'un produit sur la période. */
export interface ProductPerformance {
  productId: string;
  productName: string;
  sales: number;
  grossXof: number;
  netXof: number;
  /** Dépense pub allouée à ce produit via les campagnes qui le poussent. */
  spendXof: number;
  marginXof: number;
  roas: number | null;
}

/** Un point de la série temporelle (un jour). */
export interface DailyPoint {
  date: string;
  spendXof: number;
  netXof: number;
  grossXof: number;
  sales: number;
}

/** Indicateurs de tête. */
export interface Kpis {
  spendXof: number;
  grossXof: number;
  netXof: number;
  marginXof: number;
  roas: number | null;
  sales: number;
  /** Panier net moyen. */
  averageNetXof: number | null;
  impressions: number;
  clicks: number;
}

/**
 * Revenu qu'aucune campagne ne peut revendiquer : ventes de produits sans
 * campagne active ce jour-là (organique, réseaux, bouche-à-oreille).
 * Toujours affiché : un tableau de bord qui l'enfouit ment par omission.
 */
export interface Unattributed {
  sales: number;
  netXof: number;
  grossXof: number;
}

export interface ProfitabilityReport {
  from: string;
  to: string;
  kpis: Kpis;
  daily: DailyPoint[];
  campaigns: CampaignPerformance[];
  products: ProductPerformance[];
  unattributed: Unattributed;
  /** Campagnes présentes chez Meta mais absentes de campaign-map.json. */
  unmappedCampaignNames: string[];
  /** true si au moins une vente a un net recalculé plutôt que constaté. */
  hasEstimatedNet: boolean;
  /** Devise du compte publicitaire Meta, pour information. */
  adAccountCurrency: string | null;
}

/** Comparaison avec la période précédente de même durée. */
export interface Delta {
  /** Variation relative (0.12 = +12 %). null si la base était nulle. */
  ratio: number | null;
  direction: "up" | "down" | "flat";
}
