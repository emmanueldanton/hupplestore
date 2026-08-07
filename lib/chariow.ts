import type { SaleRecord } from "./types";

const API_BASE = "https://api.chariow.com/v1";

/**
 * Sous-ensemble de la réponse Chariow réellement utilisé. La réponse complète
 * est bien plus large ; on ne type que ce dont dépend le calcul, pour que toute
 * évolution de leur API casse ici de façon lisible plutôt que silencieusement.
 */
interface ChariowAmount {
  value: number | null;
  currency?: string;
}

interface ChariowSale {
  id: string;
  status: string;
  amount: ChariowAmount | null;
  original_amount: ChariowAmount | null;
  settlement: {
    amount: ChariowAmount | null;
    service_fee: ChariowAmount | null;
  } | null;
  payment: { fee: ChariowAmount | null } | null;
  product: { id: string; name: string } | null;
  context: { country: { name: string } | null } | null;
  completed_at: string | null;
  created_at: string | null;
}

interface ChariowListResponse {
  data: ChariowSale[];
  pagination: {
    next_cursor: string | null;
    // La doc annonce `has_more`, l'API renvoie `has_more_pages`. On gère les deux.
    has_more?: boolean;
    has_more_pages?: boolean;
  };
}

export class ChariowError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ChariowError";
  }
}

/**
 * Calcule le montant réellement encaissé.
 *
 * Deux prélèvements successifs s'appliquent, et non un seul :
 *   net = montant payé − frais du prestataire de paiement − frais de service Chariow
 *
 * Vérifié sur une vente réelle : 4 999 − 399,92 − 349,93 = 4 249,15, ce qui
 * correspond exactement au `settlement.amount` renvoyé par l'API.
 *
 * On privilégie toujours `settlement.amount` quand il est présent : c'est le
 * montant constaté. Le calcul n'est qu'un repli, signalé comme tel.
 */
export function resolveNetAmount(sale: ChariowSale): {
  netXof: number;
  estimated: boolean;
} {
  const settled = sale.settlement?.amount?.value;
  if (typeof settled === "number") {
    return { netXof: settled, estimated: false };
  }

  const gross = sale.amount?.value ?? 0;
  const paymentFee = sale.payment?.fee?.value ?? 0;
  const serviceFee = sale.settlement?.service_fee?.value ?? 0;
  return { netXof: gross - paymentFee - serviceFee, estimated: true };
}

/** Extrait le jour UTC (YYYY-MM-DD) d'un horodatage ISO. */
function toUtcDay(iso: string): string {
  return iso.slice(0, 10);
}

function normalize(sale: ChariowSale): SaleRecord | null {
  const gross = sale.amount?.value ?? 0;

  // Périmètre : ventes finalisées et réellement payées. Les ventes à 0 F
  // proviennent des codes de test (ZEROO, GRATUIT) et fausseraient tout.
  if (sale.status !== "completed" && sale.status !== "settled") return null;
  if (gross <= 0) return null;

  const timestamp = sale.completed_at ?? sale.created_at;
  if (!timestamp) return null;

  const { netXof, estimated } = resolveNetAmount(sale);

  return {
    id: sale.id,
    date: toUtcDay(timestamp),
    productId: sale.product?.id ?? "inconnu",
    productName: sale.product?.name ?? "Produit inconnu",
    grossXof: gross,
    netXof,
    netIsEstimated: estimated,
    country: sale.context?.country?.name ?? null,
  };
}

/**
 * Récupère toutes les ventes de la période, en suivant la pagination cursor.
 *
 * `end_date` est inclusif côté Chariow. Le garde-fou à 50 pages évite qu'une
 * pagination cassée ne boucle indéfiniment sur un serveur de production.
 */
export async function fetchSales(
  from: string,
  to: string,
  apiKey: string,
): Promise<SaleRecord[]> {
  const sales: SaleRecord[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const url = new URL(`${API_BASE}/sales`);
    url.searchParams.set("status", "completed");
    url.searchParams.set("start_date", from);
    url.searchParams.set("end_date", to);
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 900, tags: ["chariow"] },
    });

    if (response.status === 401) {
      throw new ChariowError(
        "Clé API Chariow invalide ou révoquée. Régénère-la dans app.chariow.com → Settings → API Keys.",
        401,
      );
    }
    if (!response.ok) {
      throw new ChariowError(
        `Chariow a répondu ${response.status} ${response.statusText}.`,
        response.status,
      );
    }

    const payload = (await response.json()) as ChariowListResponse;

    for (const sale of payload.data ?? []) {
      const record = normalize(sale);
      if (record) sales.push(record);
    }

    const hasMore =
      payload.pagination?.has_more ?? payload.pagination?.has_more_pages ?? false;
    cursor = hasMore ? (payload.pagination?.next_cursor ?? null) : null;
    pages += 1;
  } while (cursor && pages < 50);

  return sales;
}
