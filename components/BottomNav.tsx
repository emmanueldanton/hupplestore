import Link from "next/link";
import type { PeriodKey } from "@/lib/period";

/**
 * Barre d'onglets fixe, affichée uniquement sur téléphone.
 *
 * C'est l'élément qui distingue le plus nettement une application d'un site
 * consulté sur mobile : la navigation reste sous le pouce, au lieu d'imposer
 * un retour en haut de page à chaque changement d'écran.
 *
 * Sur grand écran elle disparaît au profit des onglets de l'en-tête, la
 * distance à parcourir avec une souris n'ayant pas la même importance.
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
        <rect x="3" y="12" width="4" height="8" rx="1.2" />
        <rect x="10" y="7" width="4" height="13" rx="1.2" />
        <rect x="17" y="3" width="4" height="17" rx="1.2" />
      </>
    ),
  },
  {
    key: "tunnel",
    label: "Tunnel",
    path: "/tunnel",
    icon: (
      <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
    ),
  },
  {
    key: "relances",
    label: "Relances",
    path: "/relances",
    icon: (
      <path d="M12 3a6 6 0 0 0-6 6v3.6L4.4 16h15.2L18 12.6V9a6 6 0 0 0-6-6zm0 18a2.6 2.6 0 0 0 2.5-2h-5A2.6 2.6 0 0 0 12 21z" />
    ),
  },
  {
    key: "veille",
    label: "Veille",
    path: "/veille",
    icon: (
      <path d="M10.5 3a7.5 7.5 0 1 0 4.55 13.46l4.24 4.25 1.42-1.42-4.25-4.24A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" />
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
                className="flex h-[68px] flex-col items-center justify-center gap-1.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`h-[22px] w-[22px] transition-colors ${
                    isActive ? "fill-[var(--brand-accent)]" : "fill-ink-muted"
                  }`}
                >
                  {tab.icon}
                </svg>
                <span
                  className={`text-[0.68rem] font-semibold transition-colors ${
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
