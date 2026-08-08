import { describe, expect, it } from "vitest";
import { computeUnitEconomics, judgePrice, type EconomicsInput } from "./threshold";

/**
 * Chiffres réels de la boutique sur douze mois.
 * 239 ventes au total, dont 91 qu'aucune campagne ne revendique.
 */
const REEL: EconomicsInput = {
  spendXof: 722899,
  clicks: 16378,
  attributedSales: 148,
  totalSales: 239,
};

describe("computeUnitEconomics", () => {
  it("retrouve le coût par clic constaté", () => {
    expect(computeUnitEconomics(REEL, 0.85).cpcXof).toBeCloseTo(44.1, 1);
  });

  it("ne crédite la publicité que des ventes qu'elle a produites", () => {
    const e = computeUnitEconomics(REEL, 0.85);
    // 148 / 16 378 et non 239 / 16 378.
    expect(e.cvr).toBeCloseTo(0.00904, 5);
    expect(e.blendedCvr).toBeCloseTo(0.01459, 5);
  });

  it("établit le prix plancher sur la conversion publicitaire", () => {
    // 44,1 / (0,00904 x 0,85) = environ 5 750 F.
    const e = computeUnitEconomics(REEL, 0.85);
    expect(e.floorXof).toBeGreaterThan(5500);
    expect(e.floorXof).toBeLessThan(6000);
  });

  it("ne se laisse pas abaisser par les ventes organiques", () => {
    // Le piège corrigé : compter les 239 ventes ramenait le plancher à
    // 3 500 F, et validait des produits qu'un clic payant ne rembourse pas.
    const honnete = computeUnitEconomics(REEL, 0.85);
    const gonfle = computeUnitEconomics(
      { ...REEL, attributedSales: REEL.totalSales },
      0.85,
    );

    expect(gonfle.floorXof).toBeLessThan(honnete.floorXof!);
    expect(honnete.floorXof! / gonfle.floorXof!).toBeGreaterThan(1.5);
  });

  it("place le confort au double du plancher", () => {
    const e = computeUnitEconomics(REEL, 0.85);
    expect(e.comfortXof).toBeCloseTo(e.floorXof! * 2, 6);
  });

  it("renonce plutôt que d'inventer un seuil sans dépense publicitaire", () => {
    const e = computeUnitEconomics({ ...REEL, spendXof: 0 }, 0.85);
    expect(e.floorXof).toBeNull();
    expect(e.cpcXof).toBeNull();
  });

  it("renonce quand aucune vente n'est attribuable, même s'il y en a eu", () => {
    // Cas réel possible : des ventes organiques, mais aucune campagne mappée.
    const e = computeUnitEconomics({ ...REEL, attributedSales: 0 }, 0.85);
    expect(e.floorXof).toBeNull();
    // La conversion globale reste consultable, à titre d'information.
    expect(e.blendedCvr).toBeCloseTo(0.01459, 5);
  });
});

describe("judgePrice", () => {
  const e = computeUnitEconomics(REEL, 0.85);

  it("condamne les prix très en dessous du plancher", () => {
    expect(judgePrice(1900, e).viability).toBe("sous_le_plancher");
    expect(judgePrice(2200, e).viability).toBe("sous_le_plancher");
  });

  it("condamne désormais le prix du produit phare", () => {
    // 3 900 F paraissait « limite » tant que les ventes organiques
    // gonflaient la conversion. Sur la seule performance publicitaire, ce
    // prix ne rembourse pas le clic, ce que confirme le ROAS réel de 0,93.
    const v = judgePrice(3900, e);
    expect(v.viability).toBe("sous_le_plancher");
    expect(v.expectedRoas).toBeLessThan(1);
  });

  it("valide un prix nettement au dessus du plancher", () => {
    const v = judgePrice(9900, e);
    expect(v.viability).toBe("viable");
    expect(v.expectedRoas).toBeGreaterThan(1.5);
  });

  it("calcule la conversion exigée à un prix donné", () => {
    // A 9 900 F, il faut convertir environ 0,52 %.
    const v = judgePrice(9900, e);
    expect(v.requiredCvr! * 100).toBeGreaterThan(0.45);
    expect(v.requiredCvr! * 100).toBeLessThan(0.6);
  });

  it("déduit les prélèvements du net par vente", () => {
    expect(judgePrice(10000, e).netPerSaleXof).toBe(8500);
  });

  it("bascule exactement au plancher", () => {
    expect(judgePrice(e.floorXof!, e).expectedRoas).toBeCloseTo(1, 6);
  });

  it("n'invente aucun verdict sans économie mesurable", () => {
    const vide = computeUnitEconomics({ ...REEL, clicks: 0 }, 0.85);
    expect(judgePrice(5000, vide).viability).toBe("incalculable");
  });
});
