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
}): ProfitabilityReport {
  const { from, to, sales, spend } = params;
  const map = normalizeMap(params.campaignMap);

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

    // Campagnes qui poussaient ce produit ce jour-là, avec une dépense réelle.
    const dayCampaigns = spendByDay.get(sale.date);
    const claimants = dayCampaigns
      ? [...dayCampaigns.values()].filter(
          (record) =>
            record.spendXof > 0 &&
            (campaignInfo.get(record.campaignId)?.products ?? []).includes(
              sale.productId,
            ),
        )
      : [];

    if (claimants.length === 0) {
      unattributed.sales += 1;
      unattributed.grossXof += sale.grossXof;
      unattributed.netXof += sale.netXof;
      continue;
    }

    const totalSpend = claimants.reduce((sum, r) => sum + r.spendXof, 0);
    for (const claimant of claimants) {
      const share = claimant.spendXof / totalSpend;
      let bucket = perCampaign.get(claimant.campaignId);
      if (!bucket) {
        bucket = emptyBucket();
        perCampaign.set(claimant.campaignId, bucket);
      }
      addTo(bucket, sale, share);
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

  const campaigns: CampaignPerformance[] = [...campaignInfo.entries()].map(
    ([campaignId, info]) => {
      const totals = spendTotals.get(campaignId) ?? {
        spendXof: 0,
        impressions: 0,
        clicks: 0,
      };
      const revenue = perCampaign.get(campaignId) ?? emptyBucket();

      return {
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
  };
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
