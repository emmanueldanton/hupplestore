import { afterEach, describe, expect, it } from "vitest";
import { buildReport } from "./attribution";
import { resolveRate } from "./rates";
import type { AdSpendRecord, SaleRecord } from "./types";

/**
 * Exigences de la spécification SaaS portant sur l'affichage du résultat.
 * Chaque test porte l'identifiant de l'exigence qu'il vérifie, afin qu'une
 * régression désigne immédiatement la règle rompue.
 */

function sale(over: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    date: "2026-08-02",
    productId: "prd_a",
    productName: "Produit A",
    grossXof: 5000,
    netXof: 4250,
    netIsEstimated: false,
    country: "Bénin",
    ...over,
  };
}

function spend(over: Partial<AdSpendRecord> = {}): AdSpendRecord {
  return {
    date: "2026-08-02",
    campaignId: "c1",
    campaignName: "Campagne A",
    spendXof: 2000,
    spendRaw: 2000,
    currency: "XOF",
    impressions: 500,
    clicks: 50,
    ...over,
  };
}

const range = { from: "2026-08-01", to: "2026-08-31" };

describe("EF-13 : résultat net unique", () => {
  it("vaut l'encaissé net moins la dépense publicitaire", () => {
    const report = buildReport({
      ...range,
      sales: [sale({ netXof: 10000 })],
      spend: [spend({ spendXof: 4000 })],
      campaignMap: {},
    });

    expect(report.kpis.marginXof).toBe(6000);
    expect(report.kpis.marginXof).toBe(
      report.kpis.netXof - report.kpis.spendXof,
    );
  });
});

describe("EF-16 : campagnes triées par résultat croissant", () => {
  it("place la plus déficitaire en premier", () => {
    // Contre-intuitif et voulu : ce qui appelle une décision doit se voir en
    // premier, pas ce qui va bien.
    const report = buildReport({
      ...range,
      sales: [sale({ productId: "prd_a", netXof: 9000 })],
      spend: [
        spend({ campaignId: "gagne", campaignName: "Gagnante", spendXof: 1000 }),
        spend({ campaignId: "perd", campaignName: "Perdante", spendXof: 8000 }),
      ],
      campaignMap: { Gagnante: "prd_a" },
    });

    expect(report.campaigns[0].campaignName).toBe("Perdante");
    expect(report.campaigns[0].marginXof).toBeLessThan(
      report.campaigns[1].marginXof,
    );
  });

  it("ordonne toute la liste, pas seulement la tête", () => {
    const report = buildReport({
      ...range,
      sales: [],
      spend: [
        spend({ campaignId: "a", campaignName: "A", spendXof: 1000 }),
        spend({ campaignId: "b", campaignName: "B", spendXof: 5000 }),
        spend({ campaignId: "c", campaignName: "C", spendXof: 3000 }),
      ],
      campaignMap: {},
    });

    const marges = report.campaigns.map((c) => c.marginXof);
    expect(marges).toEqual([...marges].sort((x, y) => x - y));
  });
});

describe("EF-19 : absence de revenu", () => {
  it("signale qu'aucun revenu n'est connu", () => {
    const report = buildReport({
      ...range,
      sales: [],
      spend: [spend({ spendXof: 4000 })],
      campaignMap: {},
    });

    // La marge vaut mécaniquement l'opposé de la dépense. Ce chiffre est exact
    // et pourtant trompeur : il annonce une perte là où l'on ignore les
    // recettes. L'interface s'appuie sur ce drapeau pour ne pas l'afficher.
    expect(report.hasRevenue).toBe(false);
    expect(report.kpis.spendXof).toBe(4000);
  });

  it("reconnaît un revenu dès la première vente", () => {
    const report = buildReport({
      ...range,
      sales: [sale()],
      spend: [spend()],
      campaignMap: {},
    });

    expect(report.hasRevenue).toBe(true);
  });
});

describe("EF-18 : taux de conversion et date", () => {
  const initial = { ...process.env };

  afterEach(() => {
    process.env = { ...initial };
  });

  it("expose le taux appliqué à la dépense", () => {
    process.env.RATE_USD_XOF = "568.67";
    process.env.RATE_USD_XOF_DATE = new Date().toISOString().slice(0, 10);

    const report = buildReport({
      ...range,
      sales: [sale()],
      spend: [spend({ currency: "USD" })],
      campaignMap: {},
      adAccountCurrency: "USD",
    });

    expect(report.appliedRate?.rate).toBe(568.67);
    expect(report.appliedRate?.asOf).not.toBeNull();
    expect(report.appliedRate?.stale).toBe(false);
  });

  it("marque comme périmé un taux ancien", () => {
    process.env.RATE_USD_XOF = "568.67";
    process.env.RATE_USD_XOF_DATE = "2024-01-01";

    expect(resolveRate("USD")?.stale).toBe(true);
  });

  it("marque comme périmé un taux sans date", () => {
    // On ne peut pas affirmer qu'un taux sans date est à jour, donc on ne
    // l'affirme pas.
    process.env.RATE_USD_XOF = "568.67";
    delete process.env.RATE_USD_XOF_DATE;

    expect(resolveRate("USD")?.stale).toBe(true);
  });

  it("n'invente aucun taux pour une devise inconnue", () => {
    delete process.env.RATE_GBP_XOF;
    expect(resolveRate("GBP")).toBeNull();
  });

  it("traite la parité franc CFA contre euro comme fixe et sans date", () => {
    const taux = resolveRate("EUR");
    expect(taux?.rate).toBe(655.957);
    expect(taux?.asOf).toBeNull();
    expect(taux?.stale).toBe(false);
    expect(taux?.source).toBe("parite-fixe");
  });
});
