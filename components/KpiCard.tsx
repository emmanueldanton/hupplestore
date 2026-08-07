import { Amount } from "./Amount";
import { TrendBadge } from "./TrendBadge";
import { computeDelta } from "@/lib/money";

/**
 * Carte d'indicateur : libellé, icône discrète en haut à droite, grand nombre,
 * variation en bas. Mise en page reprise de la grille de dépenses de la
 * référence.
 */
export function KpiCard({
  label,
  icon,
  value,
  previous,
  higherIsBetter = true,
  showEur = true,
  signed = false,
  accent = false,
}: {
  label: string;
  icon: string;
  value: number;
  previous: number;
  higherIsBetter?: boolean;
  showEur?: boolean;
  signed?: boolean;
  /** Colore le fond selon le signe — réservé à la marge. */
  accent?: boolean;
}) {
  const delta = computeDelta(value, previous);
  const isLoss = accent && value < 0;

  return (
    <div
      className={`card flex flex-col justify-between gap-4 p-5 ${
        isLoss ? "border-negative/25 bg-negative-soft" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.82rem] font-medium text-ink-soft">{label}</span>
        <span aria-hidden="true" className="text-[0.9rem] opacity-40">
          {icon}
        </span>
      </div>

      <Amount xof={value} size="xl" showEur={showEur} signed={signed} />

      <TrendBadge
        ratio={delta.ratio}
        direction={delta.direction}
        higherIsBetter={higherIsBetter}
      />
    </div>
  );
}
