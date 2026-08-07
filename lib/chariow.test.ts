import { describe, expect, it } from "vitest";
import { DEFAULT_NET_RATE, resolveNetAmount } from "./chariow";

/** Reproduit la forme des objets renvoyés par l'API Chariow. */
function saleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "SALE1",
    status: "completed",
    amount: { value: 4999, currency: "XOF" },
    original_amount: { value: 4999, currency: "XOF" },
    settlement: {
      amount: { value: 4249.15, currency: "XOF" },
      service_fee: { value: 349.93, currency: "XOF" },
    },
    payment: { fee: { value: 399.92, currency: "XOF" } },
    product: { id: "prd_a", name: "Produit A" },
    context: { country: { name: "Bénin" } },
    completed_at: "2026-08-07T19:45:44.000000Z",
    created_at: "2026-08-07T19:44:34.000000Z",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("resolveNetAmount", () => {
  it("privilégie le montant de reversement constaté", () => {
    const result = resolveNetAmount(saleFixture());
    expect(result.netXof).toBe(4249.15);
    expect(result.estimated).toBe(false);
  });

  it("déduit les deux prélèvements quand ils sont détaillés", () => {
    // Le piège : il y a DEUX frais, pas un. Ne déduire que les frais de
    // paiement surestimerait le revenu de 349,93 F par vente.
    const result = resolveNetAmount(
      saleFixture({
        settlement: {
          amount: { value: null },
          service_fee: { value: 349.93 },
        },
      }),
    );

    expect(result.netXof).toBeCloseTo(4249.15, 2);
    expect(result.estimated).toBe(true);
  });

  it("applique le taux quand l'API REST n'expose aucun détail de frais", () => {
    // Forme réelle de /v1/sales : ni settlement, ni payment.fee. Sans le taux,
    // le net retomberait sur le brut et surestimerait la rentabilité de 15 %.
    const restShape = saleFixture({
      settlement: undefined,
      payment: { status: "success" },
    });

    const result = resolveNetAmount(restShape, 0.85);
    expect(result.netXof).toBeCloseTo(4249.15, 2);
    expect(result.estimated).toBe(true);
  });

  it("ne confond jamais le net avec le brut", () => {
    const restShape = saleFixture({ settlement: undefined, payment: null });
    const result = resolveNetAmount(restShape, 0.85);
    expect(result.netXof).toBeLessThan(4999);
  });

  it("reproduit exactement le reversement observé en production", () => {
    // 4 999 − 399,92 − 349,93 = 4 249,15, valeur relevée sur une vente réelle.
    const gross = 4999;
    const paymentFee = 399.92;
    const serviceFee = 349.93;
    expect(gross - paymentFee - serviceFee).toBeCloseTo(4249.15, 2);
  });

  it("utilise le taux par défaut de 15 % de prélèvements", () => {
    const result = resolveNetAmount(
      saleFixture({ settlement: null, payment: null }),
      DEFAULT_NET_RATE,
    );
    expect(result.netXof).toBeCloseTo(4249.15, 2);
  });

  it("garde le barème constaté : 8 % de paiement + 7 % de service = 15 %", () => {
    // Si ce garde-fou casse, c'est que le plan tarifaire a changé, et tous les
    // ROAS affichés sont alors décalés.
    expect(DEFAULT_NET_RATE).toBe(0.85);
    expect(4999 * DEFAULT_NET_RATE).toBeCloseTo(4249.15, 2);
  });
});
