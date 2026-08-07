import { buildReport } from "./attribution";
import { fetchSales, getNetRate } from "./chariow";
import { fetchAdSpend } from "./meta";
import { loadCampaignMap, loadConfig, ConfigError } from "./config";
import { resolvePeriod, type PeriodKey } from "./period";
import type { AdSpendRecord, ProfitabilityReport, SaleRecord } from "./types";

export interface DashboardData {
  current: ProfitabilityReport;
  previous: ProfitabilityReport;
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

export async function loadDashboard(period: PeriodKey): Promise<DashboardData> {
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

  // Les deux périodes et les deux sources sont indépendantes : on les
  // interroge en parallèle et on tolère une défaillance partielle.
  const [salesNow, salesBefore, spendNow, spendBefore] = await Promise.allSettled([
    fetchSales(current.from, current.to, config.chariowApiKey),
    fetchSales(previous.from, previous.to, config.chariowApiKey),
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

  if (salesNow.status === "rejected") {
    return {
      current: emptyReport(current.from, current.to),
      previous: emptyReport(previous.from, previous.to),
      warnings,
      fatal: messageOf(salesNow.reason),
    };
  }

  if (spendNow.status === "rejected") {
    warnings.push(
      `Dépenses publicitaires indisponibles : ${messageOf(spendNow.reason)} Les revenus ci-dessous sont exacts, mais le ROAS ne peut pas être calculé.`,
    );
  }

  const salesCurrent: SaleRecord[] = salesNow.value;
  const salesPrevious: SaleRecord[] =
    salesBefore.status === "fulfilled" ? salesBefore.value : [];

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
  });

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
    }),
    warnings,
    fatal: null,
  };
}
