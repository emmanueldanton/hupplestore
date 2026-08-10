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
      // Courbe de tendance : dit la progression, là où des barres ne disent
      // qu'une quantité. C'est ce que cet onglet mesure.
      <>
        <path d="M4 15.2l4.4-4.6 3.3 3 6.3-6.4" />
        <path d="M14.4 7.2H18v3.6" />
        <path d="M4 19.6h16" />
      </>
    ),
  },
  {
    key: "tunnel",
    label: "Tunnel",
    path: "/tunnel",
    icon: (
      <>
        <path d="M4.8 5.6h14.4" />
        <path d="M7 8.6l3.7 4.3v5l2.6 1.4v-6.4L17 8.6" />
      </>
    ),
  },
  {
    key: "relances",
    label: "Relances",
    path: "/relances",
    icon: (
      // Avion : l'onglet sert à envoyer un message, pas à en recevoir. Une
      // cloche de notification disait l'inverse de sa fonction.
      <>
        <path d="M20 4.4L3.9 10.6c-.6.2-.6 1 0 1.2l6 2.2 2.2 6c.2.6 1 .6 1.2 0L20 4.4z" />
        <path d="M20 4.4l-10.1 9.6" />
      </>
    ),
  },
  {
    key: "veille",
    label: "Veille",
    path: "/veille",
    icon: (
      <>
        <circle cx="10.8" cy="10.8" r="5.9" />
        <path d="M15.2 15.2l4.3 4.4" />
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
