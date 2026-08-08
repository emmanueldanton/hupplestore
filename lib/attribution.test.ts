import { describe, expect, it } from "vitest";
import { buildReport, fillDateRange } from "./attribution";
import type { AdSpendRecord, SaleRecord } from "./types";

function sale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    date: "2026-08-01",
    productId: "prd_a",
    productName: "Produit A",
    grossXof: 5000,
    netXof: 4250,
    netIsEstimated: false,
    country: "Bénin",
    ...overrides,
  };
}

function spend(overrides: Partial<AdSpendRecord> = {}): AdSpendRecord {
  return {
    date: "2026-08-01",
    campaignId: "c1",
    campaignName: "Campagne A",
    spendXof: 2000,
    spendRaw: 2000,
    currency: "XOF",
    impressions: 1000,
    clicks: 50,
    ...overrides,
  };
}

const range = { from: "2026-08-01", to: "2026-08-03" };

describe("buildReport : indicateurs de tête", () => {
  it("calcule marge et ROAS à partir du net, pas du brut", () => {
    const report = buildReport({
      ...range,
      sales: [sale(), sale({ id: "s2" })],
      spend: [spend()],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.kpis.grossXof).toBe(10000);
    expect(report.kpis.netXof).toBe(8500);
    expect(report.kpis.spendXof).toBe(2000);
    expect(report.kpis.marginXof).toBe(6500);
    expect(report.kpis.roas).toBeCloseTo(4.25);
  });

  it("laisse le ROAS indéterminé plutôt que de le mettre à zéro sans dépense", () => {
    const report = buildReport({
      ...range,
      sales: [sale()],
      spend: [],
      campaignMap: {},
    });

    // Un ROAS à 0 laisserait croire à un échec ; l'absence de dépense n'en est
    // pas un. On distingue « non calculable » de « mauvais ».
    expect(report.kpis.roas).toBeNull();
    expect(report.kpis.marginXof).toBe(4250);
  });
});

describe("buildReport : attribution", () => {
  it("attribue le revenu à la campagne qui poussait le produit ce jour-là", () => {
    const report = buildReport({
      ...range,
      sales: [sale()],
      spend: [spend()],
      campaignMap: { "Campagne A": "prd_a" },
    });

    const campaign = report.campaigns.find((c) => c.campaignId === "c1");
    expect(campaign?.netXof).toBe(4250);
    expect(campaign?.sales).toBe(1);
    expect(report.unattributed.sales).toBe(0);
  });

  it("répartit le revenu au prorata de la dépense entre campagnes concurrentes", () => {
    const report = buildReport({
      ...range,
      sales: [sale({ netXof: 4000, grossXof: 4000 })],
      spend: [
        spend({ campaignId: "c1", campaignName: "A", spendXof: 3000 }),
        spend({ campaignId: "c2", campaignName: "B", spendXof: 1000 }),
      ],
      campaignMap: { A: "prd_a", B: "prd_a" },
    });

    const a = report.campaigns.find((c) => c.campaignId === "c1");
    const b = report.campaigns.find((c) => c.campaignId === "c2");

    // 3 000 / 4 000 = 75 % pour A, 25 % pour B.
    expect(a?.netXof).toBe(3000);
    expect(b?.netXof).toBe(1000);
    expect(a!.sales + b!.sales).toBeCloseTo(1);
  });

  it("ne compte pas deux fois le revenu réparti entre campagnes", () => {
    const report = buildReport({
      ...range,
      sales: [sale({ netXof: 4000, grossXof: 4000 })],
      spend: [
        spend({ campaignId: "c1", campaignName: "A", spendXof: 3000 }),
        spend({ campaignId: "c2", campaignName: "B", spendXof: 1000 }),
      ],
      campaignMap: { A: "prd_a", B: "prd_a" },
    });

    const attributed = report.campaigns.reduce((sum, c) => sum + c.netXof, 0);
    expect(attributed).toBe(report.kpis.netXof);
  });

  it("classe en non attribué une vente sans campagne active ce jour-là", () => {
    const report = buildReport({
      ...range,
      // La campagne dépense le 1er, la vente arrive le 3.
      sales: [sale({ date: "2026-08-03" })],
      spend: [spend({ date: "2026-08-01" })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.unattributed.sales).toBe(1);
    expect(report.unattributed.netXof).toBe(4250);
    expect(report.campaigns[0].netXof).toBe(0);
  });

  it("n'attribue rien à une campagne dépensant sur un autre produit", () => {
    const report = buildReport({
      ...range,
      sales: [sale({ productId: "prd_b" })],
      spend: [spend()],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.campaigns[0].netXof).toBe(0);
    expect(report.unattributed.netXof).toBe(4250);
  });

  it("signale les campagnes absentes de la table de correspondance", () => {
    const report = buildReport({
      ...range,
      sales: [],
      spend: [spend({ campaignName: "Campagne inconnue" })],
      campaignMap: {},
    });

    expect(report.unmappedCampaignNames).toEqual(["Campagne inconnue"]);
    expect(report.campaigns[0].isMapped).toBe(false);
    // Sa dépense reste comptée : l'ignorer gonflerait artificiellement le ROAS.
    expect(report.kpis.spendXof).toBe(2000);
  });

  it("tolère la casse et les espaces dans les noms de campagne", () => {
    const report = buildReport({
      ...range,
      sales: [sale()],
      spend: [spend({ campaignName: "  CAMPAGNE a  " })],
      campaignMap: { "campagne A": "prd_a" },
    });

    expect(report.campaigns[0].netXof).toBe(4250);
  });

  it("additionne les lignes multiples d'une même campagne le même jour", () => {
    const report = buildReport({
      ...range,
      sales: [],
      spend: [spend({ spendXof: 1200 }), spend({ spendXof: 800 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.kpis.spendXof).toBe(2000);
    expect(report.campaigns[0].spendXof).toBe(2000);
  });
});

describe("buildReport : fenêtre d'attribution", () => {
  const params = {
    from: "2026-08-01",
    to: "2026-08-05",
    // Dépense le 1er, achat le 3 : deux jours d'écart.
    sales: [sale({ date: "2026-08-03" })],
    spend: [spend({ date: "2026-08-01" })],
    campaignMap: { "Campagne A": "prd_a" },
  };

  it("n'attribue rien au jour le jour quand l'achat est différé", () => {
    const report = buildReport({ ...params, attributionWindowDays: 0 });
    expect(report.unattributed.sales).toBe(1);
    expect(report.campaigns[0].netXof).toBe(0);
  });

  it("attribue la vente dès que la fenêtre couvre l'écart", () => {
    const report = buildReport({ ...params, attributionWindowDays: 3 });
    expect(report.unattributed.sales).toBe(0);
    expect(report.campaigns[0].netXof).toBe(4250);
  });

  it("s'arrête net au bord de la fenêtre", () => {
    // Un jour d'écart demandé pour deux jours réels : rien ne doit passer.
    const report = buildReport({ ...params, attributionWindowDays: 1 });
    expect(report.unattributed.sales).toBe(1);
  });

  it("cumule la dépense de la fenêtre pour pondérer les campagnes", () => {
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-05",
      sales: [sale({ date: "2026-08-03", netXof: 4000, grossXof: 4000 })],
      spend: [
        // A dépense sur deux jours, B sur un seul : A doit peser le double.
        spend({ campaignId: "c1", campaignName: "A", date: "2026-08-02", spendXof: 1000 }),
        spend({ campaignId: "c1", campaignName: "A", date: "2026-08-03", spendXof: 1000 }),
        spend({ campaignId: "c2", campaignName: "B", date: "2026-08-03", spendXof: 1000 }),
      ],
      campaignMap: { A: "prd_a", B: "prd_a" },
      attributionWindowDays: 2,
    });

    const a = report.campaigns.find((c) => c.campaignId === "c1");
    const b = report.campaigns.find((c) => c.campaignId === "c2");
    expect(a?.netXof).toBeCloseTo(2666.67, 1);
    expect(b?.netXof).toBeCloseTo(1333.33, 1);
  });

  it("ne compte jamais une vente plus d'une fois, quelle que soit la fenêtre", () => {
    for (const attributionWindowDays of [0, 1, 3, 7]) {
      const report = buildReport({ ...params, attributionWindowDays });
      const attribue = report.campaigns.reduce((sum, c) => sum + c.netXof, 0);
      expect(attribue + report.unattributed.netXof).toBeCloseTo(
        report.kpis.netXof,
        6,
      );
    }
  });
});

describe("buildReport : qualification statistique", () => {
  it("refuse de conclure sur une campagne à faible trafic", () => {
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-03",
      // La campagne ne vend rien, mais la boutique vend par ailleurs : il
      // existe donc un panier de référence, et un seuil calculable.
      sales: [sale({ productId: "prd_autre" })],
      spend: [spend({ clicks: 41, spendXof: 4783 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    // Zéro vente sur 41 clics ne prouve rien : le verdict doit rester ouvert.
    expect(report.campaigns[0].confidence.verdict).toBe("indetermine");
    expect(report.campaigns[0].confidence.clicksNeededToConclude).toBeGreaterThan(0);
  });

  it("annonce l'absence de référence plutôt qu'un faux seuil", () => {
    // Aucune vente nulle part : impossible de savoir ce que vaut une conversion.
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-03",
      sales: [],
      spend: [spend({ clicks: 41, spendXof: 4783 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.campaigns[0].confidence.verdict).toBe("sans_donnees");
  });

  it("ne contredit jamais la marge par la probabilité", () => {
    // Piège constaté sur données réelles : une campagne affichait +9 033 F de
    // marge et « 19 % de chances d'être rentable ». Le seuil d'équilibre était
    // calculé sur le panier moyen du produit, que cette campagne ne réalisait
    // pas. Marge positive et probabilité basse ne doivent jamais coexister.
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-03",
      sales: [
        // Ventes bien plus grosses que la moyenne du produit ailleurs.
        sale({ id: "a", grossXof: 12000, netXof: 10000 }),
        sale({ id: "b", grossXof: 12000, netXof: 10000 }),
        sale({ id: "c", grossXof: 12000, netXof: 10000 }),
        sale({ id: "d", productId: "prd_autre", netXof: 500 }),
      ],
      spend: [spend({ clicks: 1000, spendXof: 20000 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    const campaign = report.campaigns[0];
    expect(campaign.marginXof).toBeGreaterThan(0);
    expect(campaign.confidence.probabilityProfitable).toBeGreaterThan(0.5);
  });

  it("n'invente aucune probabilité pour une campagne non mappée", () => {
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-03",
      sales: [sale()],
      spend: [spend({ campaignName: "Inconnue", clicks: 13, spendXof: 751 })],
      campaignMap: {},
    });

    expect(report.campaigns[0].isMapped).toBe(false);
    expect(report.campaigns[0].confidence.verdict).toBe("sans_donnees");
    expect(report.campaigns[0].confidence.probabilityProfitable).toBeNull();
  });

  it("tranche quand le trafic devient suffisant", () => {
    const report = buildReport({
      from: "2026-08-01",
      to: "2026-08-03",
      sales: [sale()],
      spend: [spend({ clicks: 5000, spendXof: 400000 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    expect(report.campaigns[0].confidence.verdict).toBe("perdante");
  });
});

describe("buildReport : seuil de rentabilité", () => {
  it("fixe le seuil au net moyen par vente", () => {
    const report = buildReport({
      ...range,
      sales: [sale(), sale({ id: "s2" })],
      spend: [spend({ spendXof: 6000 })],
      campaignMap: { "Campagne A": "prd_a" },
    });

    const campaign = report.campaigns[0];
    // 8 500 de net pour 2 ventes -> 4 250 par vente.
    expect(campaign.breakEvenCpaXof).toBe(4250);
    // 6 000 dépensés pour 2 ventes -> 3 000 par acquisition, sous le seuil.
    expect(campaign.cpaXof).toBe(3000);
    expect(campaign.marginXof).toBe(2500);
  });
});

describe("buildReport : série temporelle", () => {
  it("comble les jours sans activité", () => {
    const report = buildReport({
      ...range,
      sales: [sale({ date: "2026-08-02" })],
      spend: [],
      campaignMap: {},
    });

    expect(report.daily).toHaveLength(3);
    expect(report.daily[0]).toMatchObject({ date: "2026-08-01", netXof: 0 });
    expect(report.daily[1]).toMatchObject({ date: "2026-08-02", netXof: 4250 });
  });
});

describe("fillDateRange", () => {
  it("inclut les deux bornes", () => {
    expect(fillDateRange("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("franchit un changement de mois", () => {
    expect(fillDateRange("2026-07-30", "2026-08-01")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
    ]);
  });
});
