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
  basePath = "/",
}: {
  period: Period;
  /** Ecran de retour apres le choix. Un seul ecran aujourd'hui. */
  basePath?: "/";
}) {
  const lien = (key: PeriodKey) =>
    `/periode?period=${key}&next=${encodeURIComponent(basePath)}`;

  const perso = period.key === "custom";

  return (
    <div className="w-full lg:w-auto">
      {/*
       * `relative` est porté par la barre entière, et non par le segment
       * « Perso ». Le panneau s'ancre ainsi sur toute la largeur du sélecteur :
       * ancré sur un segment de soixante pixels, il débordait de l'écran.
       */}
      <nav
        aria-label="Période d'analyse"
        className="relative flex w-full items-stretch gap-0.5 rounded-[var(--radius-pill)] bg-black/20 p-1 lg:w-auto"
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

        {/* `summary` doit rester enfant direct de `details` : imbriqué plus
            profond, le navigateur ne le reconnaît plus et masque le contenu. */}
        <details className="group flex-1 lg:flex-none">
          <summary
            className={`flex h-full cursor-pointer list-none items-center justify-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-[0.76rem] font-semibold transition-colors lg:px-3.5 ${
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
              className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <form
            method="get"
            action="/periode"
            className="absolute inset-x-0 top-full z-30 mt-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-lg lg:inset-x-auto lg:right-0 lg:w-[19rem]"
          >
            <input type="hidden" name="period" value="custom" />
            <input type="hidden" name="next" value={basePath} />

            {/* Deux colonnes : les champs de date natifs sont larges, empilés
                ils allongeaient un panneau déjà flottant. */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[0.7rem] font-medium text-ink-muted">Du</span>
                <input
                  type="date"
                  name="from"
                  required
                  defaultValue={period.from}
                  className="w-full min-w-0 rounded-lg border border-hairline bg-surface-sunken px-2.5 py-2 text-[0.8rem] text-ink outline-none focus:border-ink/30"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[0.7rem] font-medium text-ink-muted">Au</span>
                <input
                  type="date"
                  name="to"
                  required
                  defaultValue={period.to}
                  className="w-full min-w-0 rounded-lg border border-hairline bg-surface-sunken px-2.5 py-2 text-[0.8rem] text-ink outline-none focus:border-ink/30"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-3 w-full rounded-lg bg-ink px-3 py-2.5 text-[0.82rem] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Appliquer
            </button>
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
