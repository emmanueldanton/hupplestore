import type { AdSpendRecord } from "./types";
import { toXof } from "./money";

const DEFAULT_API_VERSION = "v23.0";

interface MetaInsightRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  account_currency?: string;
  date_start?: string;
  date_stop?: string;
}

interface MetaInsightsResponse {
  data?: MetaInsightRow[];
  paging?: { next?: string; cursors?: { after?: string } };
  error?: { message: string; type: string; code: number };
}

export class MetaError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "MetaError";
  }
}

export interface MetaCampaign {
  id: string;
  name: string;
}

/**
 * Ce que Meta déclare avoir produit.
 *
 * C'est le chiffre que la plateforme met en avant, et il est systématiquement
 * flatteur pour une raison mécanique : la valeur de conversion est le montant
 * de la commande, avant frais de paiement et frais de plateforme. Meta ne les
 * connaît pas et ne peut pas les déduire.
 */
export interface MetaClaim {
  /** Nombre d'achats attribués par Meta. */
  purchases: number;
  /** Valeur de ces achats, dans la devise du compte, brute. */
  valueRaw: number;
  /** La même valeur convertie en francs CFA. */
  valueXof: number;
  /** ROAS tel que Meta l'affiche dans son gestionnaire. */
  roas: number | null;
}

interface ActionRow {
  action_type?: string;
  value?: string;
}

/** Somme des lignes d'action portant l'un des types demandés. */
function pickAction(rows: ActionRow[] | undefined, types: string[]): number {
  if (!rows) return 0;
  for (const type of types) {
    const found = rows.find((r) => r.action_type === type);
    if (found) return Number(found.value ?? 0) || 0;
  }
  return 0;
}

/**
 * Lit les conversions déclarées par Meta sur la période.
 *
 * Plusieurs types d'action décrivent le même achat, `purchase`,
 * `omni_purchase`, `offsite_conversion.fb_pixel_purchase`. Les additionner
 * compterait chaque vente jusqu'à six fois : on retient le premier type
 * disponible, par ordre de préférence.
 */
export async function fetchMetaClaim(
  from: string,
  to: string,
  options: { accessToken: string; adAccountId: string; apiVersion?: string },
): Promise<MetaClaim | null> {
  const version = options.apiVersion || DEFAULT_API_VERSION;
  const accountId = options.adAccountId.startsWith("act_")
    ? options.adAccountId
    : `act_${options.adAccountId}`;

  const url = new URL(
    `https://graph.facebook.com/${version}/${accountId}/insights`,
  );
  url.searchParams.set("level", "account");
  url.searchParams.set(
    "fields",
    "spend,actions,action_values,purchase_roas,account_currency",
  );
  url.searchParams.set("time_range", JSON.stringify({ since: from, until: to }));
  url.searchParams.set("access_token", options.accessToken);

  const response = await fetch(url, { next: { revalidate: 60, tags: ["meta"] } });
  const payload = (await response.json()) as {
    data?: {
      actions?: ActionRow[];
      action_values?: ActionRow[];
      purchase_roas?: ActionRow[];
      account_currency?: string;
    }[];
    error?: unknown;
  };

  // Un échec ici ne doit pas priver l'utilisateur de son résultat : la
  // comparaison est un complément, pas le cœur du calcul.
  if (payload.error || !payload.data?.length) return null;

  const row = payload.data[0];
  const types = [
    "purchase",
    "omni_purchase",
    "offsite_conversion.fb_pixel_purchase",
  ];

  const purchases = pickAction(row.actions, types);
  const valueRaw = pickAction(row.action_values, types);
  if (purchases === 0 && valueRaw === 0) return null;

  const currency = row.account_currency ?? "XOF";
  const roasRow = row.purchase_roas?.[0]?.value;

  return {
    purchases,
    valueRaw,
    valueXof: toXof(valueRaw, currency),
    roas: roasRow ? Number(roasRow) || null : null,
  };
}

export interface MetaInsightsResult {
  records: AdSpendRecord[];
  accountCurrency: string | null;
  /**
   * Campagnes actuellement actives, diffusion ou non.
   *
   * L'endpoint Insights ne renvoie une ligne que si la campagne a servi au
   * moins une impression. Une campagne lancée il y a une heure est donc
   * totalement absente des performances, ce qui donne l'impression que
   * l'application ne la voit pas. On récupère la structure séparément pour
   * qu'elle apparaisse, à zéro, plutôt que de disparaître.
   */
  activeCampaigns: MetaCampaign[];
}

interface CampaignRow {
  id?: string;
  name?: string;
  effective_status?: string;
}

/** Campagnes en cours de diffusion selon la structure du compte. */
async function fetchActiveCampaigns(
  accountId: string,
  version: string,
  accessToken: string,
): Promise<MetaCampaign[]> {
  const url = new URL(
    `https://graph.facebook.com/${version}/${accountId}/campaigns`,
  );
  url.searchParams.set("fields", "id,name,effective_status");
  url.searchParams.set("limit", "200");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    next: { revalidate: 60, tags: ["meta"] },
  });
  const payload = (await response.json()) as {
    data?: CampaignRow[];
    error?: { message: string };
  };

  // Un échec ici ne doit pas priver l'utilisateur de ses performances : la
  // structure n'est qu'un complément.
  if (payload.error || !payload.data) return [];

  return payload.data
    .filter((c) => c.effective_status === "ACTIVE" && c.id && c.name)
    .map((c) => ({ id: c.id!, name: c.name! }));
}

/**
 * Récupère la dépense publicitaire jour par jour et campagne par campagne.
 *
 * `time_increment=1` impose un découpage quotidien : sans lui, Meta agrège
 * toute la période en une ligne, ce qui rendrait la jointure par jour
 * impossible. `level=campaign` fixe la granularité à la campagne.
 *
 * Attention : Meta agrège selon le fuseau horaire du compte publicitaire, là où
 * Chariow horodate en UTC. Sur une fenêtre courte, un décalage d'un jour peut
 * apparaître aux bornes ; c'est pourquoi l'UI recommande d'analyser sur 7 jours
 * minimum.
 */
export async function fetchAdSpend(
  from: string,
  to: string,
  options: {
    accessToken: string;
    adAccountId: string;
    apiVersion?: string;
  },
): Promise<MetaInsightsResult> {
  const version = options.apiVersion || DEFAULT_API_VERSION;
  const accountId = options.adAccountId.startsWith("act_")
    ? options.adAccountId
    : `act_${options.adAccountId}`;

  const url = new URL(
    `https://graph.facebook.com/${version}/${accountId}/insights`,
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set(
    "fields",
    "campaign_id,campaign_name,spend,impressions,clicks,account_currency",
  );
  url.searchParams.set("time_range", JSON.stringify({ since: from, until: to }));
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", options.accessToken);

  const records: AdSpendRecord[] = [];
  let accountCurrency: string | null = null;
  let next: string | null = url.toString();
  let pages = 0;

  while (next && pages < 50) {
    const response: Response = await fetch(next, {
      next: { revalidate: 60, tags: ["meta"] },
    });

    const payload = (await response.json()) as MetaInsightsResponse;

    if (payload.error) {
      // Le cas de loin le plus fréquent : jeton expiré ou permission retirée.
      const hint =
        payload.error.code === 190
          ? " Régénère un jeton System User dans business.facebook.com avec la permission ads_read."
          : "";
      throw new MetaError(`Meta : ${payload.error.message}${hint}`, payload.error.code);
    }
    if (!response.ok) {
      throw new MetaError(
        `Meta a répondu ${response.status} ${response.statusText}.`,
        response.status,
      );
    }

    for (const row of payload.data ?? []) {
      const currency = row.account_currency ?? "XOF";
      accountCurrency ??= currency;

      const spendRaw = Number(row.spend ?? 0);
      if (!Number.isFinite(spendRaw)) continue;

      records.push({
        date: row.date_start ?? from,
        campaignId: row.campaign_id ?? "inconnu",
        campaignName: row.campaign_name ?? "Campagne sans nom",
        spendRaw,
        spendXof: toXof(spendRaw, currency),
        currency,
        impressions: Number(row.impressions ?? 0) || 0,
        clicks: Number(row.clicks ?? 0) || 0,
      });
    }

    next = payload.paging?.next ?? null;
    pages += 1;
  }

  const activeCampaigns = await fetchActiveCampaigns(
    accountId,
    version,
    options.accessToken,
  );

  return { records, accountCurrency, activeCampaigns };
}
