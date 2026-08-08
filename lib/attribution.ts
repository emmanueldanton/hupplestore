import { assess, UNKNOWN_CONFIDENCE } from "./decision";
import type {
  AdSpendRecord,
  CampaignPerformance,
  DailyPoint,
  Kpis,
  ProductPerformance,
  ProfitabilityReport,
  SaleRecord,
  Unattributed,
} from "./types";

/**
 * Table de correspondance campagne -> produit(s).
 * La clé est le nom exact de la campagne dans Meta, ou son identifiant.
 */
export type CampaignMap = Record<string, string | string[]>;

function normalizeMap(map: CampaignMap): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, value] of Object.entries(map)) {
    out.set(key.trim().toLowerCase(), Array.isArray(value) ? value : [value]);
  }
  return out;
}

function lookupProducts(
  map: Map<string, string[]>,
  record: AdSpendRecord,
): string[] {
  return (
    map.get(record.campaignName.trim().toLowerCase()) ??
    map.get(record.campaignId.trim().toLowerCase()) ??
    []
  );
}

interface Bucket {
  sales: number;
  grossXof: number;
  netXof: number;
}

const emptyBucket = (): Bucket => ({ sales: 0, grossXof: 0, netXof: 0 });

function addTo(bucket: Bucket, sale: SaleRecord, share = 1) {
  bucket.sales += share;
  bucket.grossXof += sale.grossXof * share;
  bucket.netXof += sale.netXof * share;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/**
 * Construit le rapport de rentabilité en croisant ventes et dépenses.
 *
 * ── Règle d'attribution ────────────────────────────────────────────────────
 * Chariow n'attache aucune campagne à ses ventes : la jointure se fait donc sur
 * le couple (jour, produit).
 *
 * Pour un jour et un produit donnés, le chiffre d'affaires est réparti entre
 * les campagnes qui poussaient ce produit ce jour-là, **au prorata de leur
 * dépense**. Si deux campagnes ont dépensé 3 000 F et 1 000 F sur le même
 * produit le même jour, elles reçoivent respectivement 75 % et 25 % du revenu.
 *
 * Ce n'est pas de l'attribution réelle, et ça ne prétend pas l'être : c'est une
 * répartition proportionnelle, honnête et reproductible. Elle est juste en
 * moyenne sur une période longue, et grossière au jour le jour.
 *
 * Le revenu d'un produit qu'aucune campagne ne poussait ce jour-là n'est
 * attribué à personne : il tombe dans `unattributed` et reste visible.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function buildReport(params: {
  from: string;
  to: string;
  sales: SaleRecord[];
  spend: AdSpendRecord[];
  campaignMap: CampaignMap;
  adAccountCurrency?: string | null;
  /**
   * Nombre de jours pendant lesquels une dépense peut revendiquer une vente.
   * 0 signifie le jour même uniquement. Voir la note sur la sensibilité dans
   * la documentation : si le classement des campagnes change selon cette
   * valeur, aucune décision ne doit s'appuyer dessus.
   */
  attributionWindowDays?: number;
}): ProfitabilityReport {
  const { from, to, sales, spend } = params;
  const map = normalizeMap(params.campaignMap);
  const windowDays = Math.max(0, params.attributionWindowDays ?? 0);

  // ── Index des dépenses : jour -> campagne -> ligne agrégée ───────────────
  const spendByDay = new Map<string, Map<string, AdSpendRecord>>();
  const campaignInfo = new Map<
    string,
    { name: string; products: string[]; isMapped: boolean }
  >();

  for (const record of spend) {
    const products = lookupProducts(map, record);
    campaignInfo.set(record.campaignId, {
      name: record.campaignName,
      products,
      isMapped: products.length > 0,
    });

    let day = spendByDay.get(record.date);
    if (!day) {
      day = new Map();
      spendByDay.set(record.date, day);
    }

    const existing = day.get(record.campaignId);
    if (existing) {
      // Meta peut renvoyer plusieurs lignes pour une même campagne et un même
      // jour (ventilation interne) : on les additionne.
      existing.spendXof += record.spendXof;
      existing.spendRaw += record.spendRaw;
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
    } else {
      day.set(record.campaignId, { ...record });
    }
  }

  // ── Accumulateurs ───────────────────────────────────────────────────────
  const perCampaign = new Map<string, Bucket>();
  const perProduct = new Map<string, Bucket & { name: string }>();
  const perDay = new Map<string, DailyPoint>();
  const unattributed: Unattributed = { sales: 0, netXof: 0, grossXof: 0 };

  const touchDay = (date: string): DailyPoint => {
    let point = perDay.get(date);
    if (!point) {
      point = { date, spendXof: 0, netXof: 0, grossXof: 0, sales: 0 };
      perDay.set(date, point);
    }
    return point;
  };

  for (const [date, campaigns] of spendByDay) {
    const point = touchDay(date);
    for (const record of campaigns.values()) point.spendXof += record.spendXof;
  }

  // ── Répartition du revenu ───────────────────────────────────────────────
  for (const sale of sales) {
    const point = touchDay(sale.date);
    point.sales += 1;
    point.grossXof += sale.grossXof;
    point.netXof += sale.netXof;

    let product = perProduct.get(sale.productId);
    if (!product) {
      product = { ...emptyBucket(), name: sale.productName };
      perProduct.set(sale.productId, product);
    }
    addTo(product, sale);

    // Campagnes qui poussaient ce produit dans la fenêtre précédant la vente,
    // avec une dépense réelle. Le poids d'une campagne est la somme de sa
    // dépense sur toute la fenêtre.
    const weights = new Map<string, number>();
    for (let offset = 0; offset <= windowDays; offset += 1) {
      const day = shiftDay(sale.date, -offset);
      const dayCampaigns = spendByDay.get(day);
      if (!dayCampaigns) continue;

      for (const record of dayCampaigns.values()) {
        if (record.spendXof <= 0) continue;
        const products = campaignInfo.get(record.campaignId)?.products ?? [];
        if (!products.includes(sale.productId)) continue;
        weights.set(
          record.campaignId,
          (weights.get(record.campaignId) ?? 0) + record.spendXof,
        );
      }
    }

    if (weights.size === 0) {
      unattributed.sales += 1;
      unattributed.grossXof += sale.grossXof;
      unattributed.netXof += sale.netXof;
      continue;
    }

    const totalWeight = [...weights.values()].reduce((sum, w) => sum + w, 0);
    for (const [campaignId, weight] of weights) {
      let bucket = perCampaign.get(campaignId);
      if (!bucket) {
        bucket = emptyBucket();
        perCampaign.set(campaignId, bucket);
      }
      addTo(bucket, sale, weight / totalWeight);
    }
  }

  // ── Agrégats par campagne ───────────────────────────────────────────────
  const spendTotals = new Map<
    string,
    { spendXof: number; impressions: number; clicks: number }
  >();
  for (const campaigns of spendByDay.values()) {
    for (const record of campaigns.values()) {
      const totals = spendTotals.get(record.campaignId) ?? {
        spendXof: 0,
        impressions: 0,
        clicks: 0,
      };
      totals.spendXof += record.spendXof;
      totals.impressions += record.impressions;
      totals.clicks += record.clicks;
      spendTotals.set(record.campaignId, totals);
    }
  }

  // Panier net de référence, utilisé pour convertir un taux de conversion en
  // revenu. On privilégie le panier des produits que la campagne pousse
  // réellement : un bundle à 4 999 F et un guide à 1 900 F n'ont pas le même
  // seuil de rentabilité, et une moyenne globale les confondrait.
  const globalNetPerSale =
    sales.length > 0
      ? sales.reduce((sum, s) => sum + s.netXof, 0) / sales.length
      : 0;

  const netPerProduct = new Map<string, number>();
  for (const [productId, bucket] of perProduct) {
    if (bucket.sales > 0) {
      netPerProduct.set(productId, bucket.netXof / bucket.sales);
    }
  }

  /**
   * Panier de référence d'une campagne, par ordre de préférence :
   *
   *   1. son propre panier réalisé, dès qu'elle a assez de ventes ;
   *   2. le panier moyen des produits qu'elle pousse ;
   *   3. le panier moyen de la boutique.
   *
   * Le premier niveau n'est pas un raffinement, c'est une condition de
   * cohérence. Sans lui, une campagne peut afficher une marge positive et une
   * probabilité de rentabilité faible, parce que le seuil d'équilibre serait
   * calculé sur un panier que cette campagne ne réalise pas. Deux affirmations
   * contradictoires dans la même ligne détruisent la confiance dans l'outil.
   */
  const referenceNet = (productIds: string[], revenue: Bucket): number => {
    if (revenue.sales >= 3 && revenue.netXof > 0) {
      return revenue.netXof / revenue.sales;
    }

    const known = productIds
      .map((id) => netPerProduct.get(id))
      .filter((value): value is number => typeof value === "number");
    if (known.length === 0) return globalNetPerSale;
    return known.reduce((sum, v) => sum + v, 0) / known.length;
  };

  const campaigns: CampaignPerformance[] = [...campaignInfo.entries()].map(
    ([campaignId, info]) => {
      const totals = spendTotals.get(campaignId) ?? {
        spendXof: 0,
        impressions: 0,
        clicks: 0,
      };
      const revenue = perCampaign.get(campaignId) ?? emptyBucket();

      return {
        // Une campagne non mappée ne peut recevoir aucun revenu par
        // construction : lui attribuer une probabilité de rentabilité serait
        // un artefact du calcul, pas une information.
        confidence: info.isMapped
          ? assess({
              clicks: totals.clicks,
              conversions: revenue.sales,
              spendXof: totals.spendXof,
              netPerSaleXof: referenceNet(info.products, revenue),
            })
          : UNKNOWN_CONFIDENCE,
        campaignId,
        campaignName: info.name,
        productIds: info.products,
        isMapped: info.isMapped,
        spendXof: totals.spendXof,
        impressions: totals.impressions,
        clicks: totals.clicks,
        sales: revenue.sales,
        grossXof: revenue.grossXof,
        netXof: revenue.netXof,
        roas: ratio(revenue.netXof, totals.spendXof),
        marginXof: revenue.netXof - totals.spendXof,
        cpaXof: ratio(totals.spendXof, revenue.sales),
        breakEvenCpaXof: ratio(revenue.netXof, revenue.sales),
      };
    },
  );

  campaigns.sort((a, b) => b.marginXof - a.marginXof);

  // ── Agrégats par produit ────────────────────────────────────────────────
  const spendByProduct = new Map<string, number>();
  for (const campaign of campaigns) {
    if (campaign.productIds.length === 0) continue;
    // Une campagne poussant plusieurs produits voit sa dépense répartie
    // également entre eux : rien ne permet de faire mieux.
    const perProductSpend = campaign.spendXof / campaign.productIds.length;
    for (const productId of campaign.productIds) {
      spendByProduct.set(
        productId,
        (spendByProduct.get(productId) ?? 0) + perProductSpend,
      );
    }
  }

  const products: ProductPerformance[] = [...perProduct.entries()].map(
    ([productId, bucket]) => {
      const spendXof = spendByProduct.get(productId) ?? 0;
      return {
        productId,
        productName: bucket.name,
        sales: bucket.sales,
        grossXof: bucket.grossXof,
        netXof: bucket.netXof,
        spendXof,
        marginXof: bucket.netXof - spendXof,
        roas: ratio(bucket.netXof, spendXof),
      };
    },
  );

  products.sort((a, b) => b.netXof - a.netXof);

  // ── Série temporelle, jours vides compris ───────────────────────────────
  const daily = fillDateRange(from, to).map(
    (date) =>
      perDay.get(date) ?? {
        date,
        spendXof: 0,
        netXof: 0,
        grossXof: 0,
        sales: 0,
      },
  );

  // ── Indicateurs de tête ─────────────────────────────────────────────────
  const totalSpend = daily.reduce((sum, d) => sum + d.spendXof, 0);
  const totalNet = sales.reduce((sum, s) => sum + s.netXof, 0);
  const totalGross = sales.reduce((sum, s) => sum + s.grossXof, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);

  const kpis: Kpis = {
    spendXof: totalSpend,
    grossXof: totalGross,
    netXof: totalNet,
    marginXof: totalNet - totalSpend,
    roas: ratio(totalNet, totalSpend),
    sales: sales.length,
    averageNetXof: ratio(totalNet, sales.length),
    impressions: totalImpressions,
    clicks: totalClicks,
  };

  return {
    from,
    to,
    kpis,
    daily,
    campaigns,
    products,
    unattributed,
    unmappedCampaignNames: campaigns
      .filter((c) => !c.isMapped && c.spendXof > 0)
      .map((c) => c.campaignName),
    hasEstimatedNet: sales.some((s) => s.netIsEstimated),
    adAccountCurrency: params.adAccountCurrency ?? null,
    attributionWindowDays: windowDays,
    netPerSaleXof: globalNetPerSale,
  };
}

/** Décale une date ISO d'un nombre de jours, en UTC. */
export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Liste tous les jours entre deux dates incluses, en UTC. */
export function fillDateRange(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  while (cursor <= end && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
