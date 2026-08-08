import { getNetRate } from "./chariow";
import type { PurchaseAttempt } from "./types";

/**
 * Analyse du tunnel de paiement.
 *
 * Sur cette boutique, 47 % seulement des tentatives d'achat aboutissent. Ce
 * n'est pas une fatalité : la moitié des échecs sont techniques, c'est-à-dire
 * des clients qui voulaient payer, avaient l'argent, et que l'infrastructure a
 * perdus en route.
 *
 * Distinguer ces échecs des autres est tout l'objet de ce module. Un client
 * sans solde ne se relance pas ; un client dont l'opérateur était en panne, si.
 */

/** Famille d'échec, qui détermine s'il y a quelque chose à faire. */
export type FailureFamily =
  | "technique"
  | "hesitation"
  | "solvabilite"
  | "saisie"
  | "inconnu";

interface CauseDefinition {
  family: FailureFamily;
  label: string;
}

/**
 * Codes renvoyés par Moneroo, observés en production sur cette boutique.
 * Un code inconnu retombe sur « inconnu » plutôt que d'être rangé au hasard :
 * mieux vaut une catégorie honnête qu'une classification inventée.
 */
const CAUSES: Record<string, CauseDefinition> = {
  TELCO_UNAVAILABLE: {
    family: "technique",
    label: "Opérateur mobile indisponible",
  },
  PAYMENT_TIMEOUT: { family: "technique", label: "Délai de paiement expiré" },
  GENERAL_ERROR: { family: "technique", label: "Erreur générale" },
  GATEWAY_INTERNAL_ERROR: {
    family: "technique",
    label: "Erreur interne de la passerelle",
  },
  CUSTOMER_DO_NOT_AUTHORIZE_PAYMENT: {
    family: "hesitation",
    label: "Paiement non validé par le client",
  },
  INSUFFICIENT_BALANCE: { family: "solvabilite", label: "Solde insuffisant" },
  PAYER_NOT_FOUND: { family: "saisie", label: "Numéro payeur introuvable" },
};

export const FAMILY_LABELS: Record<FailureFamily, string> = {
  technique: "Panne technique",
  hesitation: "Validation non faite",
  solvabilite: "Solde insuffisant",
  saisie: "Erreur de saisie",
  inconnu: "Motif non renseigné",
};

export const FAMILY_ADVICE: Record<FailureFamily, string> = {
  technique:
    "Ces clients voulaient payer et l'infrastructure a échoué. Ce sont les relances les plus légitimes et les plus susceptibles d'aboutir.",
  hesitation:
    "Le paiement a été lancé puis non validé. Une relance courte peut suffire, mais une partie de ces personnes a simplement renoncé.",
  solvabilite:
    "Le compte était à découvert au moment de l'achat. Relancer immédiatement ne sert à rien ; un rappel quelques jours plus tard, peut-être.",
  saisie: "Numéro de paiement erroné. Un simple message suffit à corriger.",
  inconnu:
    "Chariow n'a pas renvoyé de motif. Impossible de savoir s'il y a quelque chose à récupérer.",
};

export function classify(code: string | null): CauseDefinition {
  if (!code) return { family: "inconnu", label: "Motif non renseigné" };
  return (
    CAUSES[code] ?? { family: "inconnu", label: code.replaceAll("_", " ") }
  );
}

const PAID = new Set(["completed", "settled"]);

export interface CauseRow {
  code: string;
  label: string;
  family: FailureFamily;
  count: number;
  amountXof: number;
}

export interface FamilyRow {
  family: FailureFamily;
  count: number;
  amountXof: number;
  share: number;
}

export interface SegmentRow {
  key: string;
  label: string;
  attempts: number;
  paid: number;
  failed: number;
  abandoned: number;
  successRate: number | null;
  lostXof: number;
}

export interface RecoveryContact {
  id: string;
  date: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  countryName: string | null;
  productName: string;
  amountXof: number;
  cause: string;
  family: FailureFamily;
}

export interface FunnelReport {
  from: string;
  to: string;
  attempts: number;
  paid: number;
  failed: number;
  abandoned: number;
  pending: number;
  /** Part des tentatives qui aboutissent à un paiement. */
  successRate: number | null;
  /** Chiffre d'affaires perdu, tous motifs confondus, en brut. */
  lostGrossXof: number;
  families: FamilyRow[];
  causes: CauseRow[];
  byProduct: SegmentRow[];
  byCurrency: SegmentRow[];
  /**
   * Estimation prudente : uniquement les échecs techniques, valorisés en net.
   * Un plafond théorique, pas une prévision : rien ne garantit qu'un client
   * relancé réessaie.
   */
  recoverable: { count: number; grossXof: number; netXof: number };
  contacts: RecoveryContact[];
}

function emptySegment(key: string, label: string): SegmentRow {
  return {
    key,
    label,
    attempts: 0,
    paid: 0,
    failed: 0,
    abandoned: 0,
    successRate: null,
    lostXof: 0,
  };
}

function finalizeSegments(map: Map<string, SegmentRow>): SegmentRow[] {
  return (
    [...map.values()]
      // Un segment peut retomber à zéro tentative si toutes les siennes étaient
      // des ventes de test à 0 F. L'afficher ferait apparaître une ligne vide
      // que rien n'explique.
      .filter((row) => row.attempts > 0)
      .map((row) => ({ ...row, successRate: row.paid / row.attempts }))
      .sort((a, b) => b.attempts - a.attempts)
  );
}

export function buildFunnel(params: {
  from: string;
  to: string;
  attempts: PurchaseAttempt[];
  netRate?: number;
}): FunnelReport {
  const { from, to, attempts } = params;
  const netRate = params.netRate ?? getNetRate();

  let paid = 0;
  let failed = 0;
  let abandoned = 0;
  let pending = 0;
  let lostGrossXof = 0;

  const causes = new Map<string, CauseRow>();
  const familyTotals = new Map<FailureFamily, { count: number; amount: number }>();
  const byProduct = new Map<string, SegmentRow>();
  const byCurrency = new Map<string, SegmentRow>();
  const contacts: RecoveryContact[] = [];

  const touch = (
    map: Map<string, SegmentRow>,
    key: string,
    label: string,
  ): SegmentRow => {
    let row = map.get(key);
    if (!row) {
      row = emptySegment(key, label);
      map.set(key, row);
    }
    return row;
  };

  for (const attempt of attempts) {
    const product = touch(byProduct, attempt.productId, attempt.productName);
    const currencyKey = attempt.paymentCurrency ?? "inconnue";
    const currency = touch(byCurrency, currencyKey, currencyKey);

    product.attempts += 1;
    currency.attempts += 1;

    if (PAID.has(attempt.status)) {
      // Les ventes à 0 F sont des codes de test : elles ne disent rien de la
      // capacité à encaisser, et gonfleraient artificiellement le taux de
      // réussite.
      if (attempt.amountXof <= 0) {
        product.attempts -= 1;
        currency.attempts -= 1;
        continue;
      }
      paid += 1;
      product.paid += 1;
      currency.paid += 1;
      continue;
    }

    if (attempt.status === "abandoned") {
      abandoned += 1;
      product.abandoned += 1;
      currency.abandoned += 1;
      lostGrossXof += attempt.amountXof;
      product.lostXof += attempt.amountXof;
      currency.lostXof += attempt.amountXof;
      continue;
    }

    if (attempt.status !== "failed") {
      pending += 1;
      continue;
    }

    failed += 1;
    product.failed += 1;
    currency.failed += 1;
    lostGrossXof += attempt.amountXof;
    product.lostXof += attempt.amountXof;
    currency.lostXof += attempt.amountXof;

    const { family, label } = classify(attempt.failureCode);
    const code = attempt.failureCode ?? "NON_RENSEIGNE";

    const cause = causes.get(code) ?? {
      code,
      label,
      family,
      count: 0,
      amountXof: 0,
    };
    cause.count += 1;
    cause.amountXof += attempt.amountXof;
    causes.set(code, cause);

    const totals = familyTotals.get(family) ?? { count: 0, amount: 0 };
    totals.count += 1;
    totals.amount += attempt.amountXof;
    familyTotals.set(family, totals);

    // Seules les familles où une relance a du sens, et seulement si on sait
    // joindre la personne.
    if (
      (family === "technique" || family === "saisie" || family === "hesitation") &&
      attempt.customer
    ) {
      contacts.push({
        id: attempt.id,
        date: attempt.date,
        name: attempt.customer.name,
        email: attempt.customer.email,
        phone: attempt.customer.phone,
        countryName: attempt.customer.countryName,
        productName: attempt.productName,
        amountXof: attempt.amountXof,
        cause: label,
        family,
      });
    }
  }

  const totalFailed = failed || 1;
  const families: FamilyRow[] = [...familyTotals.entries()]
    .map(([family, totals]) => ({
      family,
      count: totals.count,
      amountXof: totals.amount,
      share: totals.count / totalFailed,
    }))
    .sort((a, b) => b.count - a.count);

  const technical = familyTotals.get("technique") ?? { count: 0, amount: 0 };

  const totalAttempts = paid + failed + abandoned + pending;

  return {
    from,
    to,
    attempts: totalAttempts,
    paid,
    failed,
    abandoned,
    pending,
    successRate: totalAttempts > 0 ? paid / totalAttempts : null,
    lostGrossXof,
    families,
    causes: [...causes.values()].sort((a, b) => b.count - a.count),
    byProduct: finalizeSegments(byProduct),
    byCurrency: finalizeSegments(byCurrency),
    recoverable: {
      count: technical.count,
      grossXof: technical.amount,
      netXof: technical.amount * netRate,
    },
    contacts: contacts.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
