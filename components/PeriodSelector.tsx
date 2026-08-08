import Link from "next/link";
import { PERIODS, type PeriodKey } from "@/lib/period";

/**
 * Sélecteur de période sous forme de pilule. Ce sont de vrais liens : la page
 * reste entièrement rendue côté serveur, sans JavaScript client, et chaque
 * période a son URL partageable.
 */
export function PeriodSelector({
  active,
  windowDays,
}: {
  active: PeriodKey;
  windowDays: number;
}) {
  return (
    <nav
      aria-label="Période d'analyse"
      className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-black/25 p-1 backdrop-blur-sm"
    >
      {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={`/?period=${key}&window=${windowDays}`}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors ${
              isActive
                ? "bg-white text-ink"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {PERIODS[key].label}
          </Link>
        );
      })}
    </nav>
  );
}
