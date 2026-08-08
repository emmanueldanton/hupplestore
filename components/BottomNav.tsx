import Link from "next/link";
import type { PeriodKey } from "@/lib/period";

/**
 * Barre d'onglets fixe, affichée uniquement sur téléphone.
 *
 * C'est l'élément qui distingue le plus nettement une application d'un site
 * consulté sur mobile : la navigation reste sous le pouce, au lieu d'imposer
 * un retour en haut de page à chaque changement d'écran.
 *
 * Les icônes sont dessinées au trait, épaisseur uniforme, extrémités et angles
 * arrondis. Un aplat à cette taille devient une tache : le contour garde la
 * forme lisible, et la couleur suffit à marquer l'onglet actif.
 */
export type Tab = "rentabilite" | "tunnel" | "relances" | "veille";

const TABS: {
  key: Tab;
  label: string;
  path: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "rentabilite",
    label: "Rentabilité",
    path: "/",
    icon: (
      <>
        {/* Barres tracées à la plume : des traits épais aux bouts ronds,
            posés sur une ligne de base, plutôt que des rectangles pleins. */}
        <path d="M4 19.5h16" />
        <path d="M7.6 19.5v-4.2" strokeWidth={2.4} />
        <path d="M12 19.5v-7.6" strokeWidth={2.4} />
        <path d="M16.4 19.5v-11" strokeWidth={2.4} />
      </>
    ),
  },
  {
    key: "tunnel",
    label: "Tunnel",
    path: "/tunnel",
    icon: (
      <>
        <path d="M4.6 5.4h14.8" />
        <path d="M6.6 8.2l4.1 4.7v5.4l2.6 1.5v-6.9l4.1-4.7" />
      </>
    ),
  },
  {
    key: "relances",
    label: "Relances",
    path: "/relances",
    icon: (
      <>
        {/* Bulle de message, non pas cloche : cet onglet sert à écrire aux
            acheteurs, pas à recevoir des notifications. */}
        <path d="M12 4.4c-4.3 0-7.7 2.8-7.7 6.3 0 1.9 1 3.6 2.7 4.8v2.6c0 .5.5.8.9.5l2.3-1.5c.6.1 1.2.2 1.8.2 4.3 0 7.7-2.8 7.7-6.6S16.3 4.4 12 4.4z" />
        <path d="M9.3 10.7h.01" strokeWidth={2.2} />
        <path d="M14.7 10.7h.01" strokeWidth={2.2} />
      </>
    ),
  },
  {
    key: "veille",
    label: "Veille",
    path: "/veille",
    icon: (
      <>
        <circle cx="11" cy="10.8" r="6.1" />
        <path d="M15.5 15.4l4 4.2" />
      </>
    ),
  },
];

export function BottomNav({
  active,
  period,
}: {
  active: Tab;
  period: PeriodKey;
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={`${tab.path}?period=${period}`}
                aria-current={isActive ? "page" : undefined}
                className="flex h-[68px] flex-col items-center justify-center gap-1"
              >
                {/* Pastille colorée sous l'onglet actif : à cette taille, un
                    simple changement de teinte se repère mal du coin de l'œil. */}
                <span
                  className={`grid h-8 w-14 place-items-center rounded-[var(--radius-pill)] transition-colors ${
                    isActive ? "bg-[var(--brand-accent)]/12" : "bg-transparent"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-[21px] w-[21px] transition-colors ${
                      isActive ? "text-[var(--brand-accent)]" : "text-ink-muted"
                    }`}
                  >
                    {tab.icon}
                  </svg>
                </span>
                <span
                  className={`text-[0.66rem] font-semibold transition-colors ${
                    isActive ? "text-[var(--brand-accent)]" : "text-ink-muted"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
