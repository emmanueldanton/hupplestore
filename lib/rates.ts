/**
 * Taux de change appliqués, avec leur date de valeur.
 *
 * EF-18 exige d'afficher le taux utilisé et sa date. Un taux sans date est un
 * piège : il dérive silencieusement et fausse le résultat sans que personne le
 * voie. Sur ce compte, la dépense publicitaire est en dollars et le revenu en
 * francs CFA : une dérive de dix pour cent du dollar déplace le résultat de
 * plusieurs dizaines de milliers de francs.
 */

/**
 * Le franc CFA est arrimé à l'euro par une parité fixe garantie par traité.
 * Ce n'est pas un taux de marché : il ne bouge pas, il n'a donc pas de date de
 * péremption.
 */
export const XOF_PER_EUR = 655.957;

/** Au delà, un taux saisi à la main mérite d'être revu. */
export const RATE_STALE_DAYS = 60;

export interface AppliedRate {
  from: string;
  to: string;
  rate: number;
  /** Date de valeur, ou null pour une parité fixe qui n'en a pas. */
  asOf: string | null;
  /** true si le taux date de plus de RATE_STALE_DAYS. */
  stale: boolean;
  /** Ce qui a fourni le taux : parité de traité, ou saisie manuelle. */
  source: "parite-fixe" | "configuration";
}

function daysSince(iso: string): number | null {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

/**
 * Taux applicable pour convertir `currency` en francs CFA.
 * Renvoie null si aucune conversion n'est possible, plutôt que d'en inventer
 * une : un taux imaginé produirait un résultat faux mais crédible.
 */
export function resolveRate(currency: string): AppliedRate | null {
  const code = currency.toUpperCase();

  if (code === "XOF" || code === "XAF") {
    return {
      from: code,
      to: "XOF",
      rate: 1,
      asOf: null,
      stale: false,
      source: "parite-fixe",
    };
  }

  if (code === "EUR") {
    return {
      from: "EUR",
      to: "XOF",
      rate: XOF_PER_EUR,
      asOf: null,
      stale: false,
      source: "parite-fixe",
    };
  }

  const raw = process.env[`RATE_${code}_XOF`];
  const rate = Number(raw);
  if (!raw || !Number.isFinite(rate) || rate <= 0) return null;

  const asOf = process.env[`RATE_${code}_XOF_DATE`] ?? null;
  const age = asOf ? daysSince(asOf) : null;

  return {
    from: code,
    to: "XOF",
    rate,
    asOf,
    // Un taux sans date est traité comme périmé : on ne peut pas affirmer
    // qu'il est à jour, donc on ne l'affirme pas.
    stale: age === null || age > RATE_STALE_DAYS,
    source: "configuration",
  };
}

/** « 1 USD = 568,67 F », pour l'affichage. */
export function formatRate(rate: AppliedRate): string {
  return `1 ${rate.from} = ${rate.rate.toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} F`;
}
