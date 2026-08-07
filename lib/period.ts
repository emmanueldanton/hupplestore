/**
 * Périodes d'analyse. Tout est calculé en UTC pour rester aligné sur les
 * horodatages Chariow.
 */

export const PERIODS = {
  "7d": { label: "7 jours", days: 7 },
  "30d": { label: "30 jours", days: 30 },
  "90d": { label: "90 jours", days: 90 },
  "365d": { label: "12 mois", days: 365 },
} as const;

export type PeriodKey = keyof typeof PERIODS;

export const DEFAULT_PERIOD: PeriodKey = "30d";

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return typeof value === "string" && value in PERIODS;
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface Range {
  from: string;
  to: string;
}

/**
 * Fenêtre courante et fenêtre précédente de même durée, pour les comparaisons.
 * `to` est aujourd'hui ; la période couvre `days` jours en incluant aujourd'hui.
 */
export function resolvePeriod(
  period: PeriodKey,
  now = new Date(),
): { current: Range; previous: Range; days: number } {
  const { days } = PERIODS[period];

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - (days - 1));

  return {
    current: { from: toDay(start), to: toDay(end) },
    previous: { from: toDay(previousStart), to: toDay(previousEnd) },
    days,
  };
}

/** « du 9 juil. au 7 août 2026 », pour l'en-tête. */
export function formatRange(range: Range): string {
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  const short = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const long = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${short.format(from)} au ${long.format(to)}`;
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
