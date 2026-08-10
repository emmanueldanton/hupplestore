import { describe, expect, it } from "vitest";
import { buildFunnel, classify } from "./funnel";
import type { PurchaseAttempt } from "./types";

function attempt(over: Partial<PurchaseAttempt> = {}): PurchaseAttempt {
  return {
    id: "a1",
    date: "2026-08-01",
    createdAt: "2026-08-01T10:00:00Z",
    status: "failed",
    productId: "prd_a",
    productName: "Produit A",
    amountXof: 4000,
    paymentCurrency: "XOF",
    failureCode: "TELCO_UNAVAILABLE",
    failureMessage: null,
    customer: {
      name: "Client Test",
      email: "client@example.com",
      phone: "22990000000",
      countryName: "Bénin",
      countryCode: "BJ",
    },
    ...over,
  };
}

const range = { from: "2026-08-01", to: "2026-08-31" };

describe("classify", () => {
  it("range les pannes d'infrastructure en technique", () => {
    expect(classify("TELCO_UNAVAILABLE").family).toBe("technique");
    expect(classify("PAYMENT_TIMEOUT").family).toBe("technique");
    expect(classify("GATEWAY_INTERNAL_ERROR").family).toBe("technique");
  });

  it("distingue le manque d'argent de la panne", () => {
    // Confondre les deux ferait relancer des gens sans solde et ignorer des
    // clients solvables perdus par l'opérateur.
    expect(classify("INSUFFICIENT_BALANCE").family).toBe("solvabilite");
  });

  it("range la non-validation en hésitation", () => {
    expect(classify("CUSTOMER_DO_NOT_AUTHORIZE_PAYMENT").family).toBe(
      "hesitation",
    );
  });

  it("avoue son ignorance sur un code inconnu", () => {
    expect(classify("CODE_JAMAIS_VU").family).toBe("inconnu");
    expect(classify(null).family).toBe("inconnu");
  });
});

describe("buildFunnel : comptage", () => {
  it("calcule le taux de réussite sur l'ensemble des tentatives", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", status: "settled" }),
        attempt({ id: "2", status: "completed" }),
        attempt({ id: "3", status: "failed" }),
        attempt({ id: "4", status: "abandoned" }),
      ],
    });

    expect(report.attempts).toBe(4);
    expect(report.paid).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.abandoned).toBe(1);
    expect(report.successRate).toBe(0.5);
  });

  it("exclut les ventes à zéro franc du taux de réussite", () => {
    // Les codes de test aboutissent toujours : les compter gonflerait le taux.
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", status: "settled", amountXof: 0 }),
        attempt({ id: "2", status: "settled", amountXof: 4000 }),
        attempt({ id: "3", status: "failed" }),
      ],
    });

    expect(report.attempts).toBe(2);
    expect(report.paid).toBe(1);
    expect(report.successRate).toBe(0.5);
  });

  it("additionne le chiffre d'affaires perdu, échecs et abandons", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", status: "failed", amountXof: 4000 }),
        attempt({ id: "2", status: "abandoned", amountXof: 3000 }),
        attempt({ id: "3", status: "settled", amountXof: 5000 }),
      ],
    });

    expect(report.lostGrossXof).toBe(7000);
  });
});

describe("buildFunnel : récupérable", () => {
  it("ne compte que les échecs techniques, valorisés en net", () => {
    const report = buildFunnel({
      ...range,
      netRate: 0.85,
      attempts: [
        attempt({ id: "1", failureCode: "TELCO_UNAVAILABLE", amountXof: 4000 }),
        attempt({ id: "2", failureCode: "PAYMENT_TIMEOUT", amountXof: 4000 }),
        // Ni le solde insuffisant ni l'hésitation ne comptent dans l'estimation
        // prudente : rien ne dit que ces personnes auraient payé.
        attempt({ id: "3", failureCode: "INSUFFICIENT_BALANCE", amountXof: 9000 }),
        attempt({
          id: "4",
          failureCode: "CUSTOMER_DO_NOT_AUTHORIZE_PAYMENT",
          amountXof: 9000,
        }),
      ],
    });

    expect(report.recoverable.count).toBe(2);
    expect(report.recoverable.grossXof).toBe(8000);
    expect(report.recoverable.netXof).toBe(6800);
  });

  it("ne gonfle jamais le récupérable avec les abandons", () => {
    const report = buildFunnel({
      ...range,
      attempts: [attempt({ status: "abandoned", amountXof: 50000 })],
    });
    expect(report.recoverable.count).toBe(0);
  });
});

describe("buildFunnel : liste de relance", () => {
  it("retient les échecs joignables et actionnables", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "tech", failureCode: "TELCO_UNAVAILABLE" }),
        attempt({ id: "saisie", failureCode: "PAYER_NOT_FOUND" }),
        attempt({ id: "hesite", failureCode: "CUSTOMER_DO_NOT_AUTHORIZE_PAYMENT" }),
        attempt({ id: "solde", failureCode: "INSUFFICIENT_BALANCE" }),
      ],
    });

    expect(report.contacts.map((c) => c.id).sort()).toEqual([
      "hesite",
      "saisie",
      "tech",
    ]);
  });

  it("écarte les tentatives sans coordonnées, qu'on ne peut pas relancer", () => {
    const report = buildFunnel({
      ...range,
      attempts: [attempt({ customer: null })],
    });
    expect(report.contacts).toHaveLength(0);
    // L'échec reste compté : il ne disparaît pas des statistiques.
    expect(report.failed).toBe(1);
  });

  it("présente les plus récents en premier", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "vieux", date: "2026-08-02" }),
        attempt({ id: "recent", date: "2026-08-20" }),
      ],
    });
    expect(report.contacts[0].id).toBe("recent");
  });
});

describe("buildFunnel : segments", () => {
  it("calcule un taux de réussite par produit", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", productId: "prd_a", status: "settled" }),
        attempt({ id: "2", productId: "prd_a", status: "failed" }),
        attempt({ id: "3", productId: "prd_b", status: "settled" }),
      ],
    });

    const a = report.byProduct.find((p) => p.key === "prd_a");
    const b = report.byProduct.find((p) => p.key === "prd_b");
    expect(a?.successRate).toBe(0.5);
    expect(b?.successRate).toBe(1);
  });

  it("n'affiche pas un segment vidé par les ventes de test", () => {
    // Une devise dont toutes les tentatives étaient des ventes à 0 F retombe à
    // zéro : la ligne ne doit pas apparaître.
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", paymentCurrency: "TEST", status: "settled", amountXof: 0 }),
        attempt({ id: "2", paymentCurrency: "XOF", status: "settled" }),
      ],
    });

    expect(report.byCurrency.map((c) => c.key)).toEqual(["XOF"]);
  });

  it("déduit les marchés du pays de l'acheteur", () => {
    // Remplace une liste de pays écrite en dur, qui exigeait un déploiement
    // pour suivre le déplacement du marché.
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({
          id: "1",
          status: "settled",
          customer: { name: null, email: "a@b.c", phone: null, countryName: "Cameroun", countryCode: "CM" },
        }),
        attempt({
          id: "2",
          status: "settled",
          customer: { name: null, email: "d@e.f", phone: null, countryName: "Cameroun", countryCode: "CM" },
        }),
        attempt({
          id: "3",
          status: "settled",
          customer: { name: null, email: "g@h.i", phone: null, countryName: "Guinée", countryCode: "GN" },
        }),
      ],
    });

    expect(report.byCountry[0].label).toBe("Cameroun");
    expect(report.byCountry[0].paid).toBe(2);
    expect(report.byCountry.find((p) => p.label === "Guinée")?.paid).toBe(1);
  });

  it("range sous Inconnu les acheteurs sans pays", () => {
    const report = buildFunnel({
      ...range,
      attempts: [attempt({ status: "settled", customer: null })],
    });
    expect(report.byCountry[0].label).toBe("Inconnu");
  });

  it("sépare par devise de paiement, ce qui révèle le rail défaillant", () => {
    const report = buildFunnel({
      ...range,
      attempts: [
        attempt({ id: "1", paymentCurrency: "CDF", status: "failed" }),
        attempt({ id: "2", paymentCurrency: "CDF", status: "failed" }),
        attempt({ id: "3", paymentCurrency: "XOF", status: "settled" }),
      ],
    });

    const cdf = report.byCurrency.find((c) => c.key === "CDF");
    expect(cdf?.successRate).toBe(0);
    expect(cdf?.attempts).toBe(2);
  });
});
