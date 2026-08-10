import type { CampaignConfidence } from "./decision";

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

/**
 * Une tentative d'achat, aboutie ou non.
 *
 * Là où `SaleRecord` ne retient que l'argent encaissé, ce type conserve les
 * échecs et les abandons : c'est la matière du tunnel de paiement.
 */
export interface PurchaseAttempt {
  id: string;
  /** Jour de création de la tentative, en UTC. */
  date: string;
  createdAt: string;
  /** completed, settled, failed, abandoned, awaiting_payment. */
  status: string;
  productId: string;
  productName: string;
  /** Montant de la commande en XOF, même si le paiement a échoué. */
  amountXof: number;
  /** Devise réellement débitée : révèle le pays et l'opérateur. */
  paymentCurrency: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  /** Coordonnées, quand elles existent : c'est ce qui rend la relance possible. */
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    countryName: string | null;
    countryCode: string | null;
  } | null;
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
  /**
   * false pour une campagne active qui n'a encore servi aucune impression sur
   * la période. Sans cette distinction, elle serait indiscernable d'une
   * campagne à l'arrêt, alors qu'elle vient peut-être d'être lancée.
   */
  hasDelivery: boolean;
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
  /**
   * Qualification statistique du résultat. Sans elle, un ROAS de 0 sur 41 clics
   * se lit comme un échec avéré alors qu'il ne prouve rien.
   */
  confidence: CampaignConfidence;
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
  /** Nombre de jours pendant lesquels une dépense peut revendiquer une vente. */
  attributionWindowDays: number;
  /** Net moyen par vente sur la période, base de tous les seuils d'équilibre. */
  netPerSaleXof: number;
}

/** Comparaison d'un même rapport à plusieurs fenêtres d'attribution. */
export interface SensitivityRow {
  campaignId: string;
  campaignName: string;
  spendXof: number;
  /** ROAS obtenu pour chaque fenêtre testée, indexé par nombre de jours. */
  roasByWindow: Record<number, number | null>;
  verdictByWindow: Record<number, string>;
  /**
   * true si le verdict ne change pas d'une fenêtre à l'autre. Une campagne
   * instable ne doit pas servir de base à une décision.
   */
  stable: boolean;
}

/** Comparaison avec la période précédente de même durée. */
export interface Delta {
  /** Variation relative (0.12 = +12 %). null si la base était nulle. */
  ratio: number | null;
  direction: "up" | "down" | "flat";
}
