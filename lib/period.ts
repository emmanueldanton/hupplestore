/**
 * Périodes d'analyse. Tout est calculé en UTC pour rester aligné sur les
 * horodatages Chariow.
 */

/**
 * `short` sert aux écrans étroits : sur un téléphone, cinq libellés en toutes
 * lettres ne tiennent pas sur une ligne.
 */
export const PERIODS = {
  "7d": { label: "7 jours", short: "7 j", days: 7 },
  "30d": { label: "30 jours", short: "30 j", days: 30 },
  "90d": { label: "90 jours", short: "90 j", days: 90 },
  "365d": { label: "12 mois", short: "12 m", days: 365 },
} as const;

export type PeriodKey = keyof typeof PERIODS;

export const DEFAULT_PERIOD: PeriodKey = "30d";

/** Nom du cookie retenant le dernier choix. */
export const PERIOD_COOKIE = "hupple_periode";

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return typeof value === "string" && value in PERIODS;
}

export interface Range {
  from: string;
  to: string;
}

/**
 * Période résolue, telle que la consomment les rapports et les liens.
 *
 * Elle porte à la fois les bornes calculées et la chaîne de requête qui l'a
 * produite : les liens de navigation recopient cette chaîne, ce qui fait
 * suivre le choix d'un onglet à l'autre sans que chaque page ait à savoir
 * s'il s'agit d'un préréglage ou d'une plage libre.
 */
export interface Period {
  key: PeriodKey | "custom";
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  /** « period=90d » ou « period=custom&from=…&to=… ». */
  query: string;
  label: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shift(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDay(date);
}

/** Nombre de jours entre deux bornes incluses. */
export function daysBetween(from: string, to: string): number {
  const ms =
    new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/** Période glissante se terminant aujourd'hui. */
export function presetPeriod(key: PeriodKey, now = new Date()): Period {
  const { days } = PERIODS[key];

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = toDay(end);
  const from = shift(to, -(days - 1));

  return {
    key,
    from,
    to,
    previousTo: shift(from, -1),
    previousFrom: shift(from, -days),
    query: `period=${key}`,
    label: PERIODS[key].label,
  };
}

/**
 * Plage libre. La période de comparaison prend la même durée, juste avant :
 * comparer un mois à une semaine ne dirait rien.
 */
export function customPeriod(from: string, to: string): Period {
  const duree = Math.max(1, daysBetween(from, to));

  return {
    key: "custom",
    from,
    to,
    previousTo: shift(from, -1),
    previousFrom: shift(from, -duree),
    query: `period=custom&from=${from}&to=${to}`,
    label: formatRange({ from, to }),
  };
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lit la période depuis l'URL, puis à défaut depuis le cookie.
 *
 * Le cookie existe pour une raison précise : une application installée se
 * rouvre sur son `start_url`, donc sur « / » sans paramètre. Sans mémoire, le
 * choix de période était perdu à chaque lancement.
 *
 * Une plage libre incohérente, bornes inversées ou dates illisibles, retombe
 * sur le préréglage par défaut plutôt que de produire un rapport vide et
 * inexplicable.
 */
export function resolvePeriodFromParams(
  params: RawParams,
  cookie?: string,
  now = new Date(),
): Period {
  const direct = readSelection(params, now);
  if (direct) return direct;

  if (cookie) {
    const memorisee = readSelection(
      Object.fromEntries(new URLSearchParams(cookie).entries()),
      now,
    );
    if (memorisee) return memorisee;
  }

  return presetPeriod(DEFAULT_PERIOD, now);
}

function readSelection(params: RawParams, now: Date): Period | null {
  const key = first(params.period);

  if (key === "custom") {
    const from = first(params.from);
    const to = first(params.to);
    if (!from || !to || !ISO_DAY.test(from) || !ISO_DAY.test(to)) return null;
    if (from > to) return null;
    // Plus de deux ans : la comparaison n'a plus de sens et l'appel devient
    // inutilement lourd.
    if (daysBetween(from, to) > 760) return null;
    return customPeriod(from, to);
  }

  return isPeriodKey(key) ? presetPeriod(key, now) : null;
}

/** « 9 juil. au 7 août 2026 », pour l'en-tête. */
export function formatRange(range: Range): string {
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  const court = new Intl.DateTimeFormat("fr-FR", {
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
  return `${court.format(from)} au ${long.format(to)}`;
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
