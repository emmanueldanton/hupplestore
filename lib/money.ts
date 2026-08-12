/**
 * Conversion et formatage monétaire.
 *
 * Le franc CFA (XOF) est arrimé à l'euro par une parité fixe, garantie par le
 * Trésor français. Ce n'est pas un taux de marché : il ne bouge pas, donc la
 * conversion XOF <-> EUR est exacte et ne nécessite aucune API externe.
 */
export { XOF_PER_EUR } from "./rates";
import { resolveRate, XOF_PER_EUR } from "./rates";

/**
 * Taux de repli pour les devises non arrimées (USD, GBP...). Le taux et sa
 * date de valeur vivent dans `rates.ts`, qui est la seule source : EF-18 exige
 * d'afficher la date, et deux endroits différents finiraient par diverger.
 */
export function getFallbackRateToXof(currency: string): number | null {
  return resolveRate(currency)?.rate ?? null;
}

export class UnsupportedCurrencyError extends Error {
  constructor(public readonly currency: string) {
    const code = currency.toUpperCase();
    // L'emplacement de la configuration diffère selon l'environnement : en
    // production, renvoyer vers .env.local enverrait chercher un fichier qui
    // n'existe pas sur le serveur.
    const ou =
      process.env.NODE_ENV === "production"
        ? "dans les variables d'environnement Vercel, puis redéploie"
        : "dans .env.local, puis relance le serveur";
    super(
      `Ton compte publicitaire est en ${code}, et aucun taux de conversion vers le franc CFA n'est défini. Ajoute la variable RATE_${code}_XOF ${ou}. Sans elle, la dépense est écartée plutôt que mélangée à des montants en XOF, ce qui fausserait le ROAS.`,
    );
    this.name = "UnsupportedCurrencyError";
  }
}

/** Convertit un montant vers le XOF. Lève si la devise est inconnue. */
export function toXof(amount: number, currency: string): number {
  const code = currency.toUpperCase();
  if (code === "XOF" || code === "XAF") return amount;
  if (code === "EUR") return amount * XOF_PER_EUR;

  const rate = getFallbackRateToXof(code);
  if (rate === null) throw new UnsupportedCurrencyError(code);
  return amount * rate;
}

export function xofToEur(amountXof: number): number {
  return amountXof / XOF_PER_EUR;
}

/**
 * Découpe un montant pour l'affichage à deux tons : partie principale en gras,
 * suffixe en gris clair. Reprend le traitement typographique de la référence.
 */
export interface SplitAmount {
  main: string;
  suffix: string;
}

const nbsp = " "; // espace fine insécable, séparateur de milliers français

export function formatXofParts(amountXof: number): SplitAmount {
  const rounded = Math.round(amountXof);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);
  return { main: `${sign}${digits}`, suffix: `${nbsp}F` };
}

export function formatXof(amountXof: number): string {
  const { main, suffix } = formatXofParts(amountXof);
  return `${main}${suffix}`;
}

export function formatEur(amountXof: number): string {
  const eur = xofToEur(amountXof);
  const abs = Math.abs(eur);
  // Sous 100 €, deux décimales restent informatives ; au-delà, elles parasitent.
  const decimals = abs < 100 ? 2 : 0;
  return `${eur.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${nbsp}€`;
}

/** Formate un ROAS : « 2,4× ». null quand il n'est pas calculable. */
export function formatRoas(roas: number | null): string {
  if (roas === null) return "n/d";
  return `${roas.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×`;
}

export function formatPercent(ratio: number | null, withSign = true): string {
  if (ratio === null) return "n/d";
  const pct = ratio * 100;
  const sign = withSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${nbsp}%`;
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("fr-FR").replace(/\s/g, nbsp);
}

/** Variation relative entre deux valeurs, pour les badges ↗ / ↘. */
export function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    return {
      ratio: null,
      direction: current > 0 ? ("up" as const) : ("flat" as const),
    };
  }
  const ratio = (current - previous) / Math.abs(previous);
  const direction = ratio > 0.0001 ? "up" : ratio < -0.0001 ? "down" : "flat";
  return { ratio, direction: direction as "up" | "down" | "flat" };
}
