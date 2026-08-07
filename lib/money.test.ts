import { describe, expect, it } from "vitest";
import {
  computeDelta,
  formatEur,
  formatRoas,
  formatXofParts,
  toXof,
  UnsupportedCurrencyError,
  xofToEur,
  XOF_PER_EUR,
} from "./money";

describe("conversion", () => {
  it("applique la parité fixe euro / franc CFA", () => {
    expect(toXof(1, "EUR")).toBeCloseTo(655.957);
    expect(xofToEur(655.957)).toBeCloseTo(1);
  });

  it("laisse le franc CFA inchangé", () => {
    expect(toXof(4999, "XOF")).toBe(4999);
    expect(toXof(4999, "xof")).toBe(4999);
  });

  it("refuse une devise sans taux plutôt que d'inventer un chiffre", () => {
    // Un taux inventé produirait un ROAS faux mais crédible — le pire des cas.
    expect(() => toXof(100, "USD")).toThrow(UnsupportedCurrencyError);
  });

  it("utilise le taux fourni par l'environnement quand il existe", () => {
    process.env.RATE_USD_XOF = "600";
    expect(toXof(10, "USD")).toBe(6000);
    delete process.env.RATE_USD_XOF;
  });

  it("boucle sans perte entre les deux devises", () => {
    const original = 123456;
    expect(toXof(xofToEur(original), "EUR")).toBeCloseTo(original, 6);
  });
});

describe("formatage", () => {
  it("sépare le nombre de son unité pour l'affichage à deux tons", () => {
    const { main, suffix } = formatXofParts(1234567);
    expect(main).toBe("1 234 567");
    expect(suffix).toContain("F");
  });

  it("conserve le signe des montants négatifs", () => {
    expect(formatXofParts(-4250).main).toBe("-4 250");
  });

  it("arrondit le franc CFA à l'unité", () => {
    expect(formatXofParts(4249.15).main).toBe("4 249");
  });

  it("affiche les centimes uniquement sur les petits montants en euros", () => {
    expect(formatEur(655.957)).toContain("1,00");
    expect(formatEur(655957)).not.toContain(",");
  });

  it("distingue un ROAS incalculable d'un ROAS nul", () => {
    expect(formatRoas(null)).toBe("—");
    expect(formatRoas(0)).toBe("0×");
    expect(formatRoas(4.25)).toBe("4,25×");
  });
});

describe("computeDelta", () => {
  it("mesure une progression", () => {
    expect(computeDelta(150, 100)).toMatchObject({ ratio: 0.5, direction: "up" });
  });

  it("mesure un recul", () => {
    expect(computeDelta(50, 100)).toMatchObject({ ratio: -0.5, direction: "down" });
  });

  it("ne divise pas par zéro", () => {
    expect(computeDelta(100, 0)).toMatchObject({ ratio: null, direction: "up" });
    expect(computeDelta(0, 0)).toMatchObject({ ratio: null, direction: "flat" });
  });

  it("gère une base négative sans inverser le sens", () => {
    // Passer de -1 000 à -500, c'est une amélioration.
    expect(computeDelta(-500, -1000).direction).toBe("up");
  });
});

describe("garde-fou de parité", () => {
  it("conserve la valeur officielle du franc CFA", () => {
    // Si cette constante change un jour, ce sera une décision politique
    // majeure, pas un ajustement de code : le test doit alerter.
    expect(XOF_PER_EUR).toBe(655.957);
  });
});
