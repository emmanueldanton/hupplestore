"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PERIODS, type Period, type PeriodKey } from "@/lib/period";
import { Rouage, useChargement } from "./Chargement";

/**
 * Contrôle segmenté de période, avec plage libre.
 *
 * Un choix mène à « /?period=… » sans quitter la page : l'ancien écran reste
 * affiché, voilé, avec la barre de chargement, jusqu'à l'arrivée des nouveaux
 * chiffres. Passer par la route `/periode` provoquait un rechargement complet,
 * et l'écran restait figé plusieurs secondes sans rien dire.
 *
 * La mémoire du choix (cookie) est écrite par `proxy.ts` quand l'adresse
 * porte une période : une application installée se rouvre sur son
 * `start_url`, et repartait sinon sur la période par défaut.
 *
 * Le segment touché passe aussitôt en sélectionné, avec un cercle qui tourne,
 * pour que le clic se voie avant même la réponse du serveur.
 *
 * Les liens et le formulaire restent de vrais liens et un vrai formulaire GET
 * vers `/periode` : sans JavaScript, ils fonctionnent comme avant.
 */
export function PeriodSelector({
  period,
  basePath = "/",
}: {
  period: Period;
  /** Ecran de retour apres le choix. Un seul ecran aujourd'hui. */
  basePath?: "/";
}) {
  const router = useRouter();
  const { enCours, lancer } = useChargement();
  // Choix en cours de chargement : affiché sélectionné sans attendre le serveur.
  const [vise, setVise] = useState<string | null>(null);
  const cle = enCours && vise ? vise : period.key;

  const lien = (key: PeriodKey) =>
    `/periode?period=${key}&next=${encodeURIComponent(basePath)}`;

  const aller = (key: string, query: string) => {
    setVise(key);
    lancer(() => router.push(`${basePath}?${query}`, { scroll: false }));
  };

  const perso = cle === "custom";

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
          const actif = key === cle;
          return (
            <a
              key={key}
              href={lien(key)}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                if (key !== period.key) aller(key, `period=${key}`);
              }}
              aria-current={actif ? "page" : undefined}
              className={`flex-1 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-center text-[0.76rem] font-semibold transition-colors lg:flex-none lg:px-3.5 ${
                actif ? "bg-white text-ink shadow-sm" : "text-white/65 hover:text-white"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">
                {actif && enCours && <Rouage className="h-3 w-3" />}
                <span className="sm:hidden">{PERIODS[key].short}</span>
                <span className="hidden sm:inline">{PERIODS[key].label}</span>
              </span>
            </a>
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
            onSubmit={(event) => {
              event.preventDefault();
              const donnees = new FormData(event.currentTarget);
              const from = String(donnees.get("from") ?? "");
              const to = String(donnees.get("to") ?? "");
              event.currentTarget.closest("details")?.removeAttribute("open");
              aller("custom", `period=custom&from=${from}&to=${to}`);
            }}
            className="absolute inset-x-0 top-full z-30 mt-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-lg lg:inset-x-auto lg:right-0 lg:w-[19rem]"
          >
            <input type="hidden" name="period" value="custom" />
            <input type="hidden" name="next" value={basePath} />

            {/* Une colonne par défaut, deux dès 380 pixels. Côte à côte sur un
                écran de 360, les champs de date natifs écrasaient leur libellé
                et le bouton ne recevait plus que la moitié de sa largeur. */}
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
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
              disabled={enCours}
              className="mt-3 w-full rounded-lg bg-ink px-3 py-2.5 text-[0.82rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {enCours ? "Chargement…" : "Appliquer"}
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
