import { logout } from "@/app/login/actions";
import { Amount } from "./Amount";
import { AppNav } from "./AppNav";
import { TrendBadge } from "./TrendBadge";
import { PeriodSelector } from "./PeriodSelector";
import { computeDelta, formatRoas } from "@/lib/money";
import { formatRange, type PeriodKey } from "@/lib/period";
import type { ProfitabilityReport } from "@/lib/types";

/**
 * Bandeau de tête : dégradé saturé, nom de la boutique, sélecteur de période,
 * et le panneau de verre qui porte le chiffre décisif.
 *
 * Ce chiffre est la **marge**, pas le chiffre d'affaires. Un tableau de bord de
 * rentabilité doit mettre en tête ce qui reste, pas ce qui entre.
 */
export function Hero({
  report,
  previous,
  period,
}: {
  report: ProfitabilityReport;
  previous: ProfitabilityReport;
  period: PeriodKey;
}) {
  const marginDelta = computeDelta(
    report.kpis.marginXof,
    previous.kpis.marginXof,
  );
  const roas = report.kpis.roas;

  // Sans aucune vente ni dépense, il n'y a pas de verdict à rendre. Annoncer
  // « tu gagnes de l'argent » sur une marge de 0 F serait un mensonge poli,
  // et c'est exactement ce qu'affiche un tableau de bord mal configuré.
  const hasData = report.kpis.sales > 0 || report.kpis.spendXof > 0;
  const isProfitable = hasData && report.kpis.marginXof >= 0;

  const headline = !hasData
    ? "Rien à analyser."
    : isProfitable
      ? "Tu gagnes de l'argent."
      : "Tu perds de l'argent.";

  const summary = !hasData
    ? "Aucune vente ni dépense publicitaire enregistrée sur cette période. Vérifie la configuration, ou choisis une fenêtre plus large."
    : roas === null
      ? "Des ventes, mais aucune dépense publicitaire sur la période : le ROAS n'est pas calculable."
      : isProfitable
        ? `Sur cette période, chaque franc investi en publicité t'en rapporte ${formatRoas(roas)} en net encaissé.`
        : `Chaque franc investi ne t'en rapporte que ${formatRoas(roas)} en net encaissé. Il en faut plus de 1× pour être à l'équilibre.`;

  return (
    <header className="hero-gradient relative overflow-hidden rounded-[var(--radius-hero)] px-6 py-7 sm:px-9 sm:py-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-[0.9rem] font-bold text-white">
            H
          </span>
          <AppNav active="rentabilite" period={period} />
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector active={period} windowDays={report.attributionWindowDays} />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-[var(--radius-pill)] bg-black/25 px-3.5 py-2 text-[0.8rem] font-semibold text-white/70 transition-colors hover:bg-black/35 hover:text-white"
            >
              Quitter
            </button>
          </form>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[0.85rem] font-medium text-white/70">
            Rentabilité publicitaire · {formatRange({ from: report.from, to: report.to })}
          </p>
          <h1 className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-[2.6rem]">
            {headline}
          </h1>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-white/75">
            {summary}
          </p>
        </div>

        {/* Panneau de verre : l'équivalent de la carte bancaire de la référence. */}
        <div className="glass w-full max-w-sm p-6">
          <div className="flex items-center justify-between">
            <span className="text-[0.78rem] font-medium text-white/70">
              Marge nette
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${
                isProfitable
                  ? "bg-white/90 text-ink"
                  : "bg-black/35 text-white"
              }`}
            >
              ROAS {formatRoas(roas)}
            </span>
          </div>

          <div className="mt-4">
            <Amount
              xof={report.kpis.marginXof}
              size="hero"
              onDark
              showEur
              signed
            />
          </div>

          <div className="mt-5 border-t border-white/20 pt-4">
            <TrendBadge
              ratio={marginDelta.ratio}
              direction={marginDelta.direction}
              onDark
            />
          </div>
        </div>
      </div>
    </header>
  );
}
