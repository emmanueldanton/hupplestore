import { describe, expect, it } from "vitest";
import { assess } from "./decision";

/** Panier net moyen constaté sur la boutique. */
const NET = 2821;

describe("assess", () => {
  it("refuse de conclure sur un faible volume, même sans aucune vente", () => {
    // Le cas CBO-COUPLE-CGG : 4 783 F pour 41 clics et zéro vente.
    // L'application affichait un ROAS de 0, ce qui ressemblait à une preuve.
    const r = assess({
      clicks: 41,
      conversions: 0,
      spendXof: 4783,
      netPerSaleXof: NET,
    });

    expect(r.verdict).toBe("indetermine");
    expect(r.clicksNeededToConclude).toBeGreaterThan(0);
  });

  it("conclut à la perte quand le volume devient suffisant", () => {
    const r = assess({
      clicks: 4000,
      conversions: 0,
      spendXof: 400000,
      netPerSaleXof: NET,
    });

    expect(r.verdict).toBe("perdante");
    expect(r.probabilityProfitable).toBeLessThan(0.05);
    expect(r.clicksNeededToConclude).toBeNull();
  });

  it("conclut à la rentabilité quand la marge est nette et le volume suffisant", () => {
    const r = assess({
      clicks: 2000,
      conversions: 60,
      spendXof: 40000,
      netPerSaleXof: NET,
    });

    expect(r.verdict).toBe("rentable");
    expect(r.probabilityProfitable).toBeGreaterThan(0.95);
    expect(r.roasLow).toBeGreaterThan(1);
  });

  it("calcule le seuil de conversion d'équilibre", () => {
    // 100 000 F pour 1 000 clics, soit 100 F le clic. À 2 821 F de net par
    // vente, il faut convertir 3,5 % pour rentrer dans ses frais.
    const r = assess({
      clicks: 1000,
      conversions: 30,
      spendXof: 100000,
      netPerSaleXof: NET,
    });

    expect(r.breakEvenCvr).toBeCloseTo(100 / NET, 6);
  });

  it("encadre le ROAS, borne basse sous la borne haute", () => {
    const r = assess({
      clicks: 500,
      conversions: 8,
      spendXof: 30000,
      netPerSaleXof: NET,
    });

    expect(r.roasLow!).toBeLessThan(r.roasHigh!);
    expect(r.roasLow!).toBeGreaterThanOrEqual(0);
  });

  it("déclare la campagne perdue d'avance si le clic coûte plus qu'une vente", () => {
    // 3 000 F le clic pour un panier net de 2 821 F : même une conversion à
    // 100 % ne rembourserait pas la dépense.
    const r = assess({
      clicks: 100,
      conversions: 0,
      spendXof: 300000,
      netPerSaleXof: NET,
    });

    expect(r.breakEvenCvr).toBeGreaterThan(1);
    expect(r.probabilityProfitable).toBe(0);
    expect(r.verdict).toBe("perdante");
  });

  it("avoue l'absence de données plutôt que d'inventer un verdict", () => {
    expect(assess({ clicks: 0, conversions: 0, spendXof: 5000, netPerSaleXof: NET }).verdict).toBe(
      "sans_donnees",
    );
    expect(assess({ clicks: 100, conversions: 0, spendXof: 0, netPerSaleXof: NET }).verdict).toBe(
      "sans_donnees",
    );
    expect(assess({ clicks: 100, conversions: 2, spendXof: 5000, netPerSaleXof: 0 }).verdict).toBe(
      "sans_donnees",
    );
  });

  it("demande d'autant plus de clics que le résultat est proche du seuil", () => {
    // Une campagne pile à l'équilibre est la plus longue à départager.
    const auSeuil = assess({
      clicks: 300,
      conversions: 300 * (100 / NET),
      spendXof: 30000,
      netPerSaleXof: NET,
    });
    const loinDuSeuil = assess({
      clicks: 300,
      conversions: 300 * (100 / NET) * 2.5,
      spendXof: 30000,
      netPerSaleXof: NET,
    });

    expect(auSeuil.verdict).toBe("indetermine");
    expect(loinDuSeuil.verdict).toBe("rentable");
  });

  it("accepte des conversions fractionnaires issues de la répartition", () => {
    const r = assess({
      clicks: 400,
      conversions: 11.5,
      spendXof: 15070,
      netPerSaleXof: NET,
    });

    expect(r.probabilityProfitable).not.toBeNull();
    expect(Number.isFinite(r.roasHigh!)).toBe(true);
  });
});
