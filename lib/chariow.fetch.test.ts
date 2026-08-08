import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSales } from "./chariow";

function saleJson(over: Record<string, unknown>) {
  return {
    id: "s",
    status: "settled",
    amount: { value: 4999, currency: "XOF" },
    original_amount: { value: 4999, currency: "XOF" },
    payment: { status: "success" },
    product: { id: "prd_a", name: "Produit A" },
    completed_at: "2026-05-15T10:00:00.000000Z",
    created_at: "2026-05-15T10:00:00.000000Z",
    ...over,
  };
}

function mockPages(pages: { data: unknown[]; more: boolean }[]) {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    const page = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: page.data,
        pagination: {
          has_more_pages: page.more,
          next_cursor: page.more ? `c${call}` : null,
        },
      }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchSales", () => {
  it("écarte les ventes hors période, que l'API renvoie malgré les filtres", async () => {
    // L'API Chariow ignore start_date et end_date : elle renvoie tout
    // l'historique quoi qu'on demande. Sans filtrage local, chaque période du
    // tableau de bord afficherait les mêmes totaux.
    mockPages([
      {
        data: [
          saleJson({ id: "avant", completed_at: "2026-01-10T00:00:00Z" }),
          saleJson({ id: "dedans", completed_at: "2026-05-15T00:00:00Z" }),
          saleJson({ id: "apres", completed_at: "2026-09-01T00:00:00Z" }),
        ],
        more: false,
      },
    ]);

    const sales = await fetchSales("2026-05-01", "2026-05-31", "cle");

    expect(sales.map((s) => s.id)).toEqual(["dedans"]);
  });

  it("inclut les deux bornes de la période", async () => {
    mockPages([
      {
        data: [
          saleJson({ id: "debut", completed_at: "2026-05-01T23:59:00Z" }),
          saleJson({ id: "fin", completed_at: "2026-05-31T00:01:00Z" }),
        ],
        more: false,
      },
    ]);

    const sales = await fetchSales("2026-05-01", "2026-05-31", "cle");
    expect(sales).toHaveLength(2);
  });

  it("retient les ventes déjà reversées, pas seulement les finalisées", async () => {
    // Une vente payée passe à `settled` après versement : l'ignorer reviendrait
    // à effacer la quasi-totalité de l'historique.
    mockPages([
      {
        data: [
          saleJson({ id: "reversee", status: "settled" }),
          saleJson({ id: "finalisee", status: "completed" }),
          saleJson({ id: "echouee", status: "failed" }),
          saleJson({ id: "abandonnee", status: "abandoned" }),
        ],
        more: false,
      },
    ]);

    const sales = await fetchSales("2026-05-01", "2026-05-31", "cle");
    expect(sales.map((s) => s.id).sort()).toEqual(["finalisee", "reversee"]);
  });

  it("exclut les ventes à zéro franc issues des codes de test", async () => {
    mockPages([
      {
        data: [
          saleJson({ id: "gratuite", amount: { value: 0, currency: "XOF" } }),
          saleJson({ id: "payante" }),
        ],
        more: false,
      },
    ]);

    const sales = await fetchSales("2026-05-01", "2026-05-31", "cle");
    expect(sales.map((s) => s.id)).toEqual(["payante"]);
  });

  it("suit la pagination jusqu'au bout", async () => {
    const fetchMock = mockPages([
      { data: [saleJson({ id: "p1" })], more: true },
      { data: [saleJson({ id: "p2" })], more: true },
      { data: [saleJson({ id: "p3" })], more: false },
    ]);

    const sales = await fetchSales("2026-05-01", "2026-05-31", "cle");
    expect(sales).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("signale une clé invalide au lieu d'afficher un mois vide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, statusText: "Unauthorized" }) as Response),
    );

    await expect(fetchSales("2026-05-01", "2026-05-31", "mauvaise")).rejects.toThrow(
      /Chariow/,
    );
  });
});
