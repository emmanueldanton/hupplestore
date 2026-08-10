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
