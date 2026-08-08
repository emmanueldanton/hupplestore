import { describe, expect, it } from "vitest";
import {
  betaCdf,
  betaQuantile,
  conversionInterval,
  logGamma,
  probabilityAbove,
} from "./stats";

describe("logGamma", () => {
  it("retrouve les factorielles connues", () => {
    // gamma(n) = (n-1)!
    expect(Math.exp(logGamma(1))).toBeCloseTo(1, 6);
    expect(Math.exp(logGamma(5))).toBeCloseTo(24, 4);
    expect(Math.exp(logGamma(7))).toBeCloseTo(720, 2);
  });
});

describe("betaCdf", () => {
  it("se réduit à l'identité pour la loi uniforme Beta(1, 1)", () => {
    for (const x of [0.1, 0.25, 0.5, 0.8]) {
      expect(betaCdf(x, 1, 1)).toBeCloseTo(x, 8);
    }
  });

  it("vaut x² pour Beta(2, 1)", () => {
    expect(betaCdf(0.5, 2, 1)).toBeCloseTo(0.25, 8);
    expect(betaCdf(0.3, 2, 1)).toBeCloseTo(0.09, 8);
  });

  it("vaut 1 moins (1-x)² pour Beta(1, 2)", () => {
    expect(betaCdf(0.5, 1, 2)).toBeCloseTo(0.75, 8);
  });

  it("est symétrique en 0,5 pour Beta(a, a)", () => {
    expect(betaCdf(0.5, 0.5, 0.5)).toBeCloseTo(0.5, 8);
    expect(betaCdf(0.5, 3, 3)).toBeCloseTo(0.5, 8);
  });

  it("reste bornée entre 0 et 1", () => {
    expect(betaCdf(-1, 2, 3)).toBe(0);
    expect(betaCdf(2, 2, 3)).toBe(1);
  });
});

describe("betaQuantile", () => {
  it("inverse la fonction de répartition", () => {
    for (const p of [0.05, 0.5, 0.95]) {
      const x = betaQuantile(p, 3, 7);
      expect(betaCdf(x, 3, 7)).toBeCloseTo(p, 5);
    }
  });

  it("place la médiane de Beta(1, 1) en 0,5", () => {
    expect(betaQuantile(0.5, 1, 1)).toBeCloseTo(0.5, 6);
  });
});

describe("conversionInterval", () => {
  it("reste très large quand il n'y a presque pas de trafic", () => {
    // Le cas CBO-COUPLE-CGG : 41 clics, aucune vente. Le taux réel peut
    // encore atteindre plusieurs pour cent.
    const { low, high } = conversionInterval(0, 41);
    expect(low).toBeCloseTo(0, 3);
    expect(high).toBeGreaterThan(0.04);
  });

  it("se resserre à mesure que le trafic augmente", () => {
    const petit = conversionInterval(1, 100);
    const grand = conversionInterval(100, 10000);
    expect(grand.high - grand.low).toBeLessThan(petit.high - petit.low);
  });

  it("encadre le taux observé", () => {
    const { low, high } = conversionInterval(50, 1000);
    expect(low).toBeLessThan(0.05);
    expect(high).toBeGreaterThan(0.05);
  });

  it("renvoie l'ignorance totale sans aucun clic", () => {
    expect(conversionInterval(0, 0)).toEqual({ low: 0, high: 1 });
  });
});

describe("probabilityAbove", () => {
  it("ne conclut pas à l'échec sur un faible volume", () => {
    // 41 clics sans vente, seuil de rentabilité à 1 % : il reste une chance
    // sérieuse que la campagne soit rentable. Couper serait prématuré.
    const p = probabilityAbove(0.01, 0, 41);
    expect(p).toBeGreaterThan(0.2);
  });

  it("conclut à l'échec quand le volume devient suffisant", () => {
    // Même taux nul, mais sur 3 000 clics : le doute n'est plus permis.
    const p = probabilityAbove(0.01, 0, 3000);
    expect(p).toBeLessThan(0.01);
  });

  it("conclut à la réussite quand le taux dépasse nettement le seuil", () => {
    const p = probabilityAbove(0.01, 60, 1000);
    expect(p).toBeGreaterThan(0.99);
  });

  it("hésite quand le taux observé est exactement au seuil", () => {
    const p = probabilityAbove(0.01, 10, 1000);
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.7);
  });

  it("décroît quand le seuil monte", () => {
    const bas = probabilityAbove(0.005, 20, 1000);
    const haut = probabilityAbove(0.05, 20, 1000);
    expect(bas).toBeGreaterThan(haut);
  });

  it("avoue son ignorance sans aucun clic", () => {
    expect(probabilityAbove(0.01, 0, 0)).toBe(0.5);
  });
});
