import { formatPercent } from "@/lib/money";

/**
 * Micro-indicateur de variation, repris de la référence : petite flèche, valeur
 * colorée, libellé de contexte en gris.
 *
 * `higherIsBetter` existe parce que toutes les hausses ne sont pas de bonnes
 * nouvelles : une dépense publicitaire qui grimpe se colore en rouge, pas en
 * vert. La couleur suit le sens économique, pas le sens arithmétique.
 */
export function TrendBadge({
  ratio,
  direction,
  context = "vs période précédente",
  higherIsBetter = true,
  onDark = false,
}: {
  ratio: number | null;
  direction: "up" | "down" | "flat";
  context?: string;
  higherIsBetter?: boolean;
  onDark?: boolean;
}) {
  if (direction === "flat" || ratio === null) {
    return (
      <span
        className={`text-[0.72rem] font-medium ${onDark ? "text-white/55" : "text-ink-muted"}`}
      >
        stable {context}
      </span>
    );
  }

  const isGood = direction === "up" ? higherIsBetter : !higherIsBetter;
  const color = onDark
    ? "text-white"
    : isGood
      ? "text-positive"
      : "text-negative";

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className={`text-[0.72rem] font-semibold ${color}`}>
        <span aria-hidden="true">{direction === "up" ? "↗" : "↘"}</span>{" "}
        {formatPercent(Math.abs(ratio), false)}
      </span>
      <span
        className={`text-[0.72rem] ${onDark ? "text-white/55" : "text-ink-muted"}`}
      >
        {context}
      </span>
    </span>
  );
}
