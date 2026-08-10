import type { PurchaseAttempt, SaleRecord } from "./types";

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

interface ChariowCustomer {
  name?: string | null;
  email?: string | null;
  phone?: {
    number?: number | string | null;
    country?: {
      name?: string | null;
      code?: string | null;
      dial_code?: string | null;
    } | null;
  } | null;
}

interface ChariowSale {
  id: string;
  status: string;
  amount: ChariowAmount | null;
  original_amount: ChariowAmount | null;
  customer?: ChariowCustomer | null;
  // `settlement` et `context` sont absents de la réponse REST : seul le
  // connecteur MCP les renvoie. Déclarés optionnels pour refléter la réalité
  // du contrat, et non la documentation.
  settlement?: {
    amount: ChariowAmount | null;
    service_fee: ChariowAmount | null;
  } | null;
  payment?: {
    fee?: ChariowAmount | null;
    amount?: ChariowAmount | null;
    failure_error?: {
      code?: string | null;
      customer_message?: string | null;
    } | null;
  } | null;
  product: { id: string; name: string } | null;
  context?: { country: { name: string } | null } | null;
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
 * Part du montant de vente réellement reversée, une fois les prélèvements
 * déduits. 0,85 correspond au barème constaté sur le plan Starter :
 *
 *   frais du prestataire de paiement (Moneroo)  8 %
 *   frais de service Chariow                    7 %
 *   ────────────────────────────────────────────────
 *   total prélevé                              15 %
 *
 * Vérifié sur une vente réelle : 4 999 × 0,85 = 4 249,15, valeur identique au
 * `settlement.amount` relevé sur cette même vente.
 *
 * Ce taux dépend du plan tarifaire : le passage à un plan supérieur le change.
 * D'où la variable d'environnement, plutôt qu'une constante enfouie.
 */
export const DEFAULT_NET_RATE = 0.85;

export function getNetRate(): number {
  const raw = process.env.CHARIOW_NET_RATE;
  if (!raw) return DEFAULT_NET_RATE;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : DEFAULT_NET_RATE;
}

/**
 * Calcule le montant réellement encaissé.
 *
 * L'endpoint REST `/v1/sales` ne renvoie **ni** `settlement`, **ni**
 * `payment.fee` : contrairement au connecteur MCP de Chariow, qui expose une
 * sérialisation plus riche mais n'est pas utilisable depuis un serveur.
 *
 * Le net est donc dérivé du taux ci-dessus, et systématiquement marqué comme
 * calculé. Le cas `settlement` est conservé : si Chariow enrichit un jour sa
 * réponse REST, le montant constaté prendra automatiquement le dessus.
 */
export function resolveNetAmount(
  sale: ChariowSale,
  netRate: number = DEFAULT_NET_RATE,
): {
  netXof: number;
  estimated: boolean;
} {
  const settled = sale.settlement?.amount?.value;
  if (typeof settled === "number") {
    return { netXof: settled, estimated: false };
  }

  const gross = sale.amount?.value ?? 0;

  // Repli historique : si les deux lignes de frais sont présentes, elles valent
  // mieux qu'un taux moyen.
  const paymentFee = sale.payment?.fee?.value;
  const serviceFee = sale.settlement?.service_fee?.value;
  if (typeof paymentFee === "number" && typeof serviceFee === "number") {
    return { netXof: gross - paymentFee - serviceFee, estimated: true };
  }

  return { netXof: gross * netRate, estimated: true };
}

/** Extrait le jour UTC (YYYY-MM-DD) d'un horodatage ISO. */
function toUtcDay(iso: string): string {
  return iso.slice(0, 10);
}

function normalize(sale: ChariowSale, netRate: number): SaleRecord | null {
  const gross = sale.amount?.value ?? 0;

  // Périmètre : ventes finalisées et réellement payées. Les ventes à 0 F
  // proviennent des codes de test (ZEROO, GRATUIT) et fausseraient tout.
  if (sale.status !== "completed" && sale.status !== "settled") return null;
  if (gross <= 0) return null;

  const timestamp = sale.completed_at ?? sale.created_at;
  if (!timestamp) return null;

  const { netXof, estimated } = resolveNetAmount(sale, netRate);

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
 * Récupère les ventes de la période, en suivant la pagination cursor.
 *
 * ATTENTION : l'API Chariow **ignore silencieusement** `start_date` et
 * `end_date`. Vérifié en production, trois fenêtres différentes (une semaine,
 * un mois, aucune) renvoient toutes les 522 mêmes ventes.
 *
 * Le filtrage est donc fait ici, après réception. Les paramètres restent
 * envoyés au cas où Chariow les implémenterait un jour : ils seraient alors une
 * optimisation, jamais une condition de justesse.
 *
 * Conséquence : chaque appel rapatrie tout l'historique. Acceptable à ce volume
 * (six pages), à revoir au-delà de quelques milliers de ventes.
 *
 * Le garde-fou à 50 pages évite qu'une pagination cassée ne boucle
 * indéfiniment sur un serveur de production.
 */
async function fetchRawSales(
  from: string,
  to: string,
  apiKey: string,
): Promise<ChariowSale[]> {
  const all: ChariowSale[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    const url = new URL(`${API_BASE}/sales`);
    // Volontairement PAS de filtre `status` côté requête.
    //
    // Une vente payée passe de `completed` à `settled` une fois le versement
    // effectué. Filtrer sur `status=completed` dans l'URL écarte donc toutes
    // les ventes anciennes : sur cette boutique, 237 ventes `settled` contre 9
    // `completed`. Le tri se fait dans normalize(), qui accepte les deux.
    url.searchParams.set("start_date", from);
    url.searchParams.set("end_date", to);
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Une minute, et non quinze. Un quart d'heure de latence faisait passer
      // une campagne qui vient de démarrer pour une campagne absente.
      next: { revalidate: 60, tags: ["chariow"] },
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

    for (const sale of payload.data ?? []) all.push(sale);

    const hasMore =
      payload.pagination?.has_more ?? payload.pagination?.has_more_pages ?? false;
    cursor = hasMore ? (payload.pagination?.next_cursor ?? null) : null;
    pages += 1;
  } while (cursor && pages < 50);

  return all;
}

/** Ventes réellement encaissées de la période. */
export async function fetchSales(
  from: string,
  to: string,
  apiKey: string,
): Promise<SaleRecord[]> {
  const netRate = getNetRate();
  const sales: SaleRecord[] = [];

  for (const sale of await fetchRawSales(from, to, apiKey)) {
    const record = normalize(sale, netRate);
    // Comparaison lexicographique sur des dates ISO : correcte, et sans
    // conversion en objet Date qui réintroduirait un fuseau horaire.
    if (record && record.date >= from && record.date <= to) sales.push(record);
  }
  return sales;
}

/**
 * Toutes les tentatives d'achat de la période, abouties ou non.
 *
 * La date retenue est celle de **création**, et non de finalisation : une
 * tentative échouée n'a jamais de `completed_at`. Se fier à ce champ ferait
 * disparaître du tunnel précisément ce qu'il sert à mesurer.
 */
export async function fetchAttempts(
  from: string,
  to: string,
  apiKey: string,
): Promise<PurchaseAttempt[]> {
  const attempts: PurchaseAttempt[] = [];

  for (const sale of await fetchRawSales(from, to, apiKey)) {
    const timestamp = sale.created_at ?? sale.completed_at;
    if (!timestamp) continue;

    const date = toUtcDay(timestamp);
    if (date < from || date > to) continue;

    const phone = sale.customer?.phone;
    const hasContact = Boolean(sale.customer?.email || phone?.number);

    attempts.push({
      id: sale.id,
      date,
      createdAt: timestamp,
      status: sale.status,
      productId: sale.product?.id ?? "inconnu",
      productName: sale.product?.name ?? "Produit inconnu",
      amountXof: sale.amount?.value ?? 0,
      paymentCurrency: sale.payment?.amount?.currency ?? null,
      failureCode: sale.payment?.failure_error?.code ?? null,
      failureMessage: sale.payment?.failure_error?.customer_message ?? null,
      customer: hasContact
        ? {
            name: sale.customer?.name ?? null,
            email: sale.customer?.email ?? null,
            phone: phone?.number ? String(phone.number) : null,
            countryName: phone?.country?.name ?? null,
            countryCode: phone?.country?.code ?? null,
          }
        : null,
    });
  }

  return attempts;
}
