import { Amount } from "./Amount";
import { AppNav } from "./AppNav";
import { BrandMark } from "./BrandMark";
import { LogoutButton } from "./LogoutButton";
import { PeriodSelector } from "./PeriodSelector";
import { RefreshButton } from "./RefreshButton";
import { TrendBadge } from "./TrendBadge";
import { computeDelta, formatRoas } from "@/lib/money";
import { type PeriodKey } from "@/lib/period";
import type { ProfitabilityReport } from "@/lib/types";

/**
 * Bandeau de tête.
 *
 * Il portait un titre, un paragraphe de trois lignes et un panneau de verre
 * séparé, soit près de trois cents pixels avant le premier chiffre utile. Ne
 * restent que le verdict en un mot, la marge et le ROAS : ce qui se lit d'un
 * coup d'œil en ouvrant l'application.
 *
 * Le chiffre mis en avant est la **marge**, pas le chiffre d'affaires. Un
 * tableau de bord de rentabilité montre ce qui reste, pas ce qui entre.
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
  // « tu gagnes de l'argent » sur une marge de 0 F serait un mensonge poli.
  const hasData = report.kpis.sales > 0 || report.kpis.spendXof > 0;
  const isProfitable = hasData && report.kpis.marginXof >= 0;

  const verdict = !hasData
    ? "Rien à analyser"
    : isProfitable
      ? "Tu gagnes de l'argent"
      : "Tu perds de l'argent";

  return (
    <header className="hero-gradient overflow-hidden rounded-[var(--radius-hero)] px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark size={32} />
          {/* Sur téléphone, la navigation vit dans la barre du bas. */}
          <div className="hidden lg:block">
            <AppNav active="rentabilite" period={period} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector
            active={period}
            windowDays={report.attributionWindowDays}
            basePath="/"
          />
          <RefreshButton />
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[0.75rem] font-medium text-white/60">{verdict}</p>
          <div className="mt-1">
            <Amount xof={report.kpis.marginXof} size="hero" onDark signed />
          </div>
          <div className="mt-2">
            <TrendBadge
              ratio={marginDelta.ratio}
              direction={marginDelta.direction}
              onDark
            />
          </div>
        </div>

        <div className="text-right">
          <p className="text-[0.75rem] font-medium text-white/60">ROAS</p>
          <p className="numeral mt-1 text-[2rem] leading-none text-white">
            {formatRoas(roas)}
          </p>
          {hasData && !isProfitable && roas !== null && (
            <span className="mt-2 inline-block rounded-full bg-alert px-2 py-0.5 text-[0.68rem] font-bold text-white">
              sous l&apos;équilibre
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
