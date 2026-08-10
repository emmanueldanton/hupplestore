import Link from "next/link";
import { PERIODS, type Period, type PeriodKey } from "@/lib/period";

/**
 * Contrôle segmenté de période, avec plage libre.
 *
 * Les liens passent par la route `/periode`, qui retient le choix dans un
 * cookie avant de rediriger. Sans cette mémoire, une application installée,
 * qui se rouvre toujours sur son `start_url`, repartait à chaque lancement sur
 * la période par défaut.
 *
 * L'adresse finale conserve les paramètres : elle reste lisible et
 * partageable, le cookie n'étant qu'un repli quand l'URL est muette.
 *
 * La plage libre est un formulaire GET natif : elle fonctionne sans
 * JavaScript et produit elle aussi une URL partageable.
 */
export function PeriodSelector({
  period,
  basePath,
}: {
  period: Period;
  basePath: "/" | "/tunnel" | "/relances" | "/veille";
}) {
  const lien = (key: PeriodKey) =>
    `/periode?period=${key}&next=${encodeURIComponent(basePath)}`;

  const perso = period.key === "custom";

  return (
    <div className="w-full lg:w-auto">
      <nav
        aria-label="Période d'analyse"
        className="flex w-full items-stretch gap-0.5 rounded-[var(--radius-pill)] bg-black/20 p-1 lg:w-auto"
      >
        {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
          const actif = key === period.key;
          return (
            <Link
              key={key}
              href={lien(key)}
              aria-current={actif ? "page" : undefined}
              className={`flex-1 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-center text-[0.76rem] font-semibold transition-colors lg:flex-none lg:px-3.5 ${
                actif ? "bg-white text-ink shadow-sm" : "text-white/65 hover:text-white"
              }`}
            >
              <span className="sm:hidden">{PERIODS[key].short}</span>
              <span className="hidden sm:inline">{PERIODS[key].label}</span>
            </Link>
          );
        })}

        <details className="group relative flex-1 lg:flex-none">
          <summary
            className={`flex cursor-pointer list-none items-center justify-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-[0.76rem] font-semibold transition-colors lg:px-3.5 ${
              perso ? "bg-white text-ink shadow-sm" : "text-white/65 hover:text-white"
            }`}
          >
            Perso
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <form
            method="get"
            action="/periode"
            className="absolute right-0 z-30 mt-2 w-[17rem] rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-lg"
          >
            <input type="hidden" name="period" value="custom" />
            <input type="hidden" name="next" value={basePath} />

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[0.7rem] font-medium text-ink-muted">Du</span>
                <input
                  type="date"
                  name="from"
                  required
                  defaultValue={period.from}
                  className="w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-[0.85rem] text-ink outline-none focus:border-ink/30"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.7rem] font-medium text-ink-muted">Au</span>
                <input
                  type="date"
                  name="to"
                  required
                  defaultValue={period.to}
                  className="w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-[0.85rem] text-ink outline-none focus:border-ink/30"
                />
              </label>
              <button
                type="submit"
                className="mt-1 w-full rounded-lg bg-ink px-3 py-2.5 text-[0.82rem] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Appliquer
              </button>
            </div>
          </form>
        </details>
      </nav>

      {perso && (
        <p className="mt-2 text-center text-[0.72rem] text-white/60 lg:text-right">
          {period.label}
        </p>
      )}
    </div>
  );
}
