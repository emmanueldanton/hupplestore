import { buildReport } from "./attribution";
import { fetchSales, getNetRate } from "./chariow";
import { fetchAdSpend } from "./meta";
import { loadCampaignMap, loadConfig, ConfigError } from "./config";
import { resolvePeriod, type PeriodKey } from "./period";
import type {
  AdSpendRecord,
  ProfitabilityReport,
  SaleRecord,
  SensitivityRow,
} from "./types";

/**
 * Fenêtres d'attribution comparées systématiquement.
 *
 * Elles ne servent pas à choisir « la bonne » : aucune ne l'est. Elles servent
 * à savoir si la conclusion tient quelle que soit l'hypothèse. Une campagne
 * dont le verdict change entre 0 et 7 jours ne doit pas fonder une décision.
 */
export const SENSITIVITY_WINDOWS = [0, 1, 3, 7] as const;

export interface DashboardData {
  current: ProfitabilityReport;
  previous: ProfitabilityReport;
  /** Le même calcul répété à plusieurs fenêtres, pour éprouver sa robustesse. */
  sensitivity: SensitivityRow[];
  /**
   * Problèmes non bloquants. Une panne côté Meta ne doit pas masquer les
   * ventes : on affiche ce qu'on a, en disant clairement ce qui manque.
   */
  warnings: string[];
  /** Erreur bloquante : rien d'exploitable à afficher. */
  fatal: string | null;
}

function emptyReport(from: string, to: string): ProfitabilityReport {
  return buildReport({ from, to, sales: [], spend: [], campaignMap: {} });
}

/**
 * Rejoue le calcul à chaque fenêtre et compare les verdicts obtenus.
 * Une campagne est dite stable si son verdict ne bouge pas d'une fenêtre à
 * l'autre : elle seule autorise une décision.
 */
function buildSensitivity(params: {
  from: string;
  to: string;
  sales: SaleRecord[];
  spend: AdSpendRecord[];
  campaignMap: Parameters<typeof buildReport>[0]["campaignMap"];
}): SensitivityRow[] {
  const rows = new Map<string, SensitivityRow>();

  for (const windowDays of SENSITIVITY_WINDOWS) {
    const report = buildReport({ ...params, attributionWindowDays: windowDays });

    for (const campaign of report.campaigns) {
      let row = rows.get(campaign.campaignId);
      if (!row) {
        row = {
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          spendXof: campaign.spendXof,
          roasByWindow: {},
          verdictByWindow: {},
          stable: true,
        };
        rows.set(campaign.campaignId, row);
      }
      row.roasByWindow[windowDays] = campaign.roas;
      row.verdictByWindow[windowDays] = campaign.confidence.verdict;
    }
  }

  for (const row of rows.values()) {
    const verdicts = new Set(Object.values(row.verdictByWindow));
    row.stable = verdicts.size <= 1;
  }

  return [...rows.values()].sort((a, b) => b.spendXof - a.spendXof);
}

export async function loadDashboard(
  period: PeriodKey,
  attributionWindowDays = 0,
): Promise<DashboardData> {
  const { current, previous } = resolvePeriod(period);
  const warnings: string[] = [];

  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message =
      error instanceof ConfigError
        ? error.message
        : "Configuration illisible.";
    return {
      current: emptyReport(current.from, current.to),
      previous: emptyReport(previous.from, previous.to),
      sensitivity: [],
      warnings: [],
      fatal: message,
    };
  }

  const campaignMap = loadCampaignMap();
  if (Object.keys(campaignMap).length === 0) {
    warnings.push(
      "Aucune campagne n'est associée à un produit dans config/campaign-map.json : tout le chiffre d'affaires apparaîtra comme non attribué.",
    );
  }

  // Un seul appel Chariow couvrant les deux périodes, découpé ensuite.
  // L'API ignorant les filtres de date, elle renvoie de toute façon
  // l'historique complet : deux appels seraient deux fois le même transfert.
  const [salesAll, spendNow, spendBefore] = await Promise.allSettled([
    fetchSales(previous.from, current.to, config.chariowApiKey),
    fetchAdSpend(current.from, current.to, {
      accessToken: config.metaAccessToken,
      adAccountId: config.metaAdAccountId,
      apiVersion: config.metaApiVersion,
    }),
    fetchAdSpend(previous.from, previous.to, {
      accessToken: config.metaAccessToken,
      adAccountId: config.metaAdAccountId,
      apiVersion: config.metaApiVersion,
    }),
  ]);

  const messageOf = (reason: unknown) =>
    reason instanceof Error ? reason.message : String(reason);

  if (salesAll.status === "rejected") {
    return {
      current: emptyReport(current.from, current.to),
      previous: emptyReport(previous.from, previous.to),
      sensitivity: [],
      warnings,
      fatal: messageOf(salesAll.reason),
    };
  }

  if (spendNow.status === "rejected") {
    warnings.push(
      `Dépenses publicitaires indisponibles : ${messageOf(spendNow.reason)} Les revenus ci-dessous sont exacts, mais le ROAS ne peut pas être calculé.`,
    );
  }

  const salesCurrent: SaleRecord[] = salesAll.value.filter(
    (sale) => sale.date >= current.from,
  );
  const salesPrevious: SaleRecord[] = salesAll.value.filter(
    (sale) => sale.date < current.from,
  );

  const spendCurrent: AdSpendRecord[] =
    spendNow.status === "fulfilled" ? spendNow.value.records : [];
  const spendPrevious: AdSpendRecord[] =
    spendBefore.status === "fulfilled" ? spendBefore.value.records : [];

  const currency =
    spendNow.status === "fulfilled" ? spendNow.value.accountCurrency : null;

  const report = buildReport({
    from: current.from,
    to: current.to,
    sales: salesCurrent,
    spend: spendCurrent,
    campaignMap,
    adAccountCurrency: currency,
    attributionWindowDays,
  });

  const sensitivity = buildSensitivity({
    from: current.from,
    to: current.to,
    sales: salesCurrent,
    spend: spendCurrent,
    campaignMap,
  });

  const instables = sensitivity.filter((row) => !row.stable && row.spendXof > 0);
  if (instables.length > 0) {
    warnings.push(
      `Le verdict de ${instables.length} campagne(s) change selon la fenêtre d'attribution retenue : ${instables
        .slice(0, 4)
        .map((r) => r.campaignName)
        .join(", ")}. Leur résultat dépend d'une hypothèse, pas des données : ne fonde aucune décision dessus.`,
    );
  }

  if (report.unmappedCampaignNames.length > 0) {
    warnings.push(
      `Campagne(s) non associée(s) à un produit dans config/campaign-map.json : ${report.unmappedCampaignNames.join(", ")}. Leur dépense est comptée, mais aucun revenu ne leur est attribué.`,
    );
  }

  if (report.hasEstimatedNet) {
    const rate = Math.round((1 - getNetRate()) * 100);
    warnings.push(
      `L'API Chariow ne renvoie pas le montant reversé : le net est calculé en déduisant ${rate} % de prélèvements (frais de paiement + frais de service). Vérifie ce taux sur un relevé réel, et ajuste CHARIOW_NET_RATE s'il a changé : un plan tarifaire différent le modifie.`,
    );
  }

  return {
    current: report,
    previous: buildReport({
      from: previous.from,
      to: previous.to,
      sales: salesPrevious,
      spend: spendPrevious,
      campaignMap,
      adAccountCurrency: currency,
      attributionWindowDays,
    }),
    sensitivity,
    warnings,
    fatal: null,
  };
}
