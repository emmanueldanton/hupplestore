import { describe, expect, it } from "vitest";
import { computeUnitEconomics, judgePrice } from "./threshold";
import type { Kpis } from "./types";

/** Chiffres réels de la boutique sur douze mois. */
const REEL: Kpis = {
  spendXof: 722899,
  grossXof: 793334,
  netXof: 674334,
  marginXof: -48565,
  roas: 0.93,
  sales: 239,
  averageNetXof: 2821,
  impressions: 0,
  clicks: 16378,
};

describe("computeUnitEconomics", () => {
  it("retrouve le coût par clic et la conversion constatés", () => {
    const e = computeUnitEconomics(REEL, 0.85);
    expect(e.cpcXof).toBeCloseTo(44.1, 1);
    expect(e.cvr).toBeCloseTo(0.0146, 4);
  });

  it("établit le prix plancher de la boutique", () => {
    // 44,1 / (0,0146 x 0,85) = environ 3 558 F.
    const e = computeUnitEconomics(REEL, 0.85);
    expect(e.floorXof).toBeGreaterThan(3400);
    expect(e.floorXof).toBeLessThan(3700);
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

  it("renonce également sans aucune vente", () => {
    expect(computeUnitEconomics({ ...REEL, sales: 0 }, 0.85).floorXof).toBeNull();
  });
});

describe("judgePrice", () => {
  const e = computeUnitEconomics(REEL, 0.85);

  it("condamne les prix sous le plancher", () => {
    // Les deux produits réellement lancés à ces prix ont fait 1 et 0 vente.
    expect(judgePrice(1900, e).viability).toBe("sous_le_plancher");
    expect(judgePrice(2200, e).viability).toBe("sous_le_plancher");
  });

  it("qualifie de limite le prix du produit phare", () => {
    // 3 900 F donne un ROAS de 1,10 : rentable, sans marge de sécurité.
    const v = judgePrice(3900, e);
    expect(v.viability).toBe("limite");
    expect(v.expectedRoas).toBeGreaterThan(1);
    expect(v.expectedRoas).toBeLessThan(1.3);
  });

  it("valide un prix confortable", () => {
    const v = judgePrice(6900, e);
    expect(v.viability).toBe("viable");
    expect(v.expectedRoas).toBeGreaterThan(1.8);
  });

  it("calcule la conversion exigée à un prix donné", () => {
    // A 4 999 F, il faut convertir environ 1 %.
    const v = judgePrice(4999, e);
    expect(v.requiredCvr! * 100).toBeGreaterThan(0.9);
    expect(v.requiredCvr! * 100).toBeLessThan(1.15);
  });

  it("déduit les prélèvements du net par vente", () => {
    expect(judgePrice(10000, e).netPerSaleXof).toBe(8500);
  });

  it("bascule exactement au plancher", () => {
    const v = judgePrice(e.floorXof!, e);
    expect(v.expectedRoas).toBeCloseTo(1, 6);
  });

  it("n'invente aucun verdict sans économie mesurable", () => {
    const vide = computeUnitEconomics({ ...REEL, clicks: 0 }, 0.85);
    expect(judgePrice(5000, vide).viability).toBe("incalculable");
  });
});
