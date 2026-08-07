import { formatEur, formatXofParts } from "@/lib/money";

type Size = "hero" | "xl" | "lg" | "md" | "sm";

const sizeClass: Record<Size, string> = {
  hero: "text-[2.75rem] leading-[1.05] sm:text-[3.5rem]",
  xl: "text-[2rem] leading-none sm:text-[2.35rem]",
  lg: "text-[1.6rem] leading-none",
  md: "text-[1.15rem] leading-none",
  sm: "text-[0.95rem] leading-none",
};

const suffixClass: Record<Size, string> = {
  hero: "text-[1.6rem] sm:text-[2rem]",
  xl: "text-[1.25rem]",
  lg: "text-[1rem]",
  md: "text-[0.8rem]",
  sm: "text-[0.72rem]",
};

/**
 * Montant à deux tons : le chiffre porte le poids, l'unité s'efface en gris.
 * C'est le traitement typographique signature de la référence, et il rend les
 * grands nombres nettement plus lisibles d'un coup d'œil.
 */
export function Amount({
  xof,
  size = "md",
  onDark = false,
  showEur = false,
  signed = false,
}: {
  xof: number;
  size?: Size;
  onDark?: boolean;
  /** Affiche l'équivalent en euros sous le montant. */
  showEur?: boolean;
  /** Force le signe + sur les valeurs positives (marges, écarts). */
  signed?: boolean;
}) {
  const { main, suffix } = formatXofParts(xof);
  const prefix = signed && xof > 0 ? "+" : "";

  return (
    <span className="inline-flex flex-col">
      <span className={`numeral ${sizeClass[size]} ${onDark ? "text-white" : "text-ink"}`}>
        {prefix}
        {main}
        <span
          className={`${suffixClass[size]} font-semibold ${
            onDark ? "text-white/55" : "text-ink-muted"
          }`}
        >
          {suffix}
        </span>
      </span>
      {showEur && (
        <span
          className={`tabular mt-1.5 text-[0.78rem] font-medium ${
            onDark ? "text-white/60" : "text-ink-muted"
          }`}
        >
          ≈ {formatEur(xof)}
        </span>
      )}
    </span>
  );
}
