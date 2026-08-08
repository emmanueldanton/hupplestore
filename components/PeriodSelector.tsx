import Link from "next/link";
import { PERIODS, type PeriodKey } from "@/lib/period";

/**
 * Sélecteur de période sous forme de pilule. Ce sont de vrais liens : la page
 * reste entièrement rendue côté serveur, sans JavaScript client, et chaque
 * période a son URL partageable.
 *
 * `basePath` est obligatoire, et non pas facultatif avec « / » par défaut :
 * un défaut silencieux avait renvoyé l'utilisateur du Tunnel vers la
 * Rentabilité à chaque changement de période. Le rendre explicite force
 * chaque page à déclarer où elle se trouve.
 */
export function PeriodSelector({
  active,
  windowDays,
  basePath,
}: {
  active: PeriodKey;
  windowDays: number;
  basePath: "/" | "/tunnel" | "/relances" | "/veille";
}) {
  return (
    <nav
      aria-label="Période d'analyse"
      className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-white/10 p-1 backdrop-blur-sm"
    >
      {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={`${basePath}?period=${key}&window=${windowDays}`}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors sm:px-3.5 ${
              isActive
                ? "bg-white text-ink"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="sm:hidden">{PERIODS[key].short}</span>
            <span className="hidden sm:inline">{PERIODS[key].label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
