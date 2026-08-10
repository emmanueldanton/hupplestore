import Link from "next/link";
import { PERIODS, type PeriodKey } from "@/lib/period";

/**
 * Contrôle segmenté de période.
 *
 * Les pilules étaient coincées entre le logo et deux boutons d'action, dans
 * une rangée trop étroite : quatre libellés compressés qui ressemblaient à des
 * boutons de page web. Il occupe désormais sa propre ligne et toute la
 * largeur sur téléphone, avec des segments de taille égale, comme un vrai
 * contrôle d'application.
 *
 * Ce sont de vrais liens : la page reste rendue côté serveur, sans JavaScript,
 * et chaque période a son URL partageable.
 *
 * `basePath` est obligatoire, et non facultatif avec « / » par défaut : un
 * défaut silencieux avait renvoyé l'utilisateur du Tunnel vers la Rentabilité
 * à chaque changement de période.
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
      className="flex w-full items-stretch gap-0.5 rounded-[var(--radius-pill)] bg-black/20 p-1 lg:w-auto"
    >
      {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={`${basePath}?period=${key}&window=${windowDays}`}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 rounded-[var(--radius-pill)] px-3 py-1.5 text-center text-[0.78rem] font-semibold transition-colors lg:flex-none ${
              isActive
                ? "bg-white text-ink shadow-sm"
                : "text-white/65 hover:text-white"
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
