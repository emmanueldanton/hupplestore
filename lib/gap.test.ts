import { describe, expect, it } from "vitest";
import { computeGap } from "./gap";
import type { MetaClaim } from "./meta";

/** Relevé réel du compte sur trente jours, converti en francs CFA. */
const REEL: MetaClaim = {
  purchases: 34,
  valueRaw: 265.99,
  valueXof: 265.99 * 568.67,
  roas: 1.336432,
};

const DEPENSE_XOF = 199.03 * 568.67;

describe("computeGap", () => {
  it("retrouve le ROAS affiché par Meta", () => {
    const gap = computeGap(REEL, DEPENSE_XOF, 0.85);
    expect(gap!.claimedRoas).toBeCloseTo(1.336, 2);
  });

  it("établit le ROAS réel une fois les prélèvements déduits", () => {
    const gap = computeGap(REEL, DEPENSE_XOF, 0.85);
    expect(gap!.realRoas).toBeCloseTo(1.136, 2);
  });

  it("chiffre la surestimation", () => {
    // Elle vaut exactement l'inverse du taux de reversement : Meta compte le
    // brut, le vendeur encaisse le net. 1 / 0,85 - 1 = 17,6 %.
    const gap = computeGap(REEL, DEPENSE_XOF, 0.85);
    expect(gap!.overstatement).toBeCloseTo(0.176, 2);
  });

  it("chiffre le montant que Meta compte et qui n'est jamais encaissé", () => {
    const gap = computeGap(REEL, DEPENSE_XOF, 0.85);
    // 265,99 dollars annoncés, 15 % prélevés, soit environ 22 700 F CFA.
    expect(gap!.missingXof).toBeGreaterThan(20000);
    expect(gap!.missingXof).toBeLessThan(25000);
    expect(gap!.claimedValueXof - gap!.netValueXof).toBeCloseTo(
      gap!.missingXof,
      6,
    );
  });

  it("compare sur le même périmètre de ventes", () => {
    // Seuls les frais séparent les deux ROAS. Utiliser deux ensembles de
    // ventes différents mêlerait l'effet des frais à celui de l'attribution,
    // et ne prouverait rien.
    const gap = computeGap(REEL, DEPENSE_XOF, 0.85);
    expect(gap!.realRoas / gap!.claimedRoas).toBeCloseTo(0.85, 6);
  });

  it("suit le taux de reversement configuré", () => {
    const doux = computeGap(REEL, DEPENSE_XOF, 0.95);
    const dur = computeGap(REEL, DEPENSE_XOF, 0.7);
    expect(doux!.overstatement).toBeLessThan(dur!.overstatement);
  });

  it("renonce sans déclaration de la plateforme", () => {
    expect(computeGap(null, DEPENSE_XOF, 0.85)).toBeNull();
  });

  it("renonce sans dépense, plutôt que de diviser par zéro", () => {
    expect(computeGap(REEL, 0, 0.85)).toBeNull();
  });

  it("renonce quand la plateforme ne déclare aucune valeur", () => {
    expect(
      computeGap({ ...REEL, valueXof: 0, valueRaw: 0 }, DEPENSE_XOF, 0.85),
    ).toBeNull();
  });
});
