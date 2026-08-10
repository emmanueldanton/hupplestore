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
  value,
  previous,
  higherIsBetter = true,
  showEur = true,
  signed = false,
  accent = false,
}: {
  label: string;
  value: number;
  previous: number;
  higherIsBetter?: boolean;
  showEur?: boolean;
  signed?: boolean;
  /** Colore le fond selon le signe : réservé à la marge. */
  accent?: boolean;
}) {
  const delta = computeDelta(value, previous);
  const isLoss = accent && value < 0;

  return (
    <div
      className={`card flex flex-col justify-between gap-3 p-4 ${
        isLoss ? "border-negative/25 bg-negative-soft" : ""
      }`}
    >
      {/* Pas d'icône décorative : à cette taille elle n'apporte aucun sens et
          concurrence le chiffre, qui est la seule chose à regarder. */}
      <span className="text-[0.75rem] font-medium text-ink-soft">{label}</span>

      <Amount xof={value} size="lg" showEur={showEur} signed={signed} />

      {/* Libellé abrégé : en demi-largeur, « vs période précédente » se brisait
          sur trois lignes et noyait le pourcentage. */}
      <TrendBadge
        ratio={delta.ratio}
        direction={delta.direction}
        higherIsBetter={higherIsBetter}
        context="vs préc."
      />
    </div>
  );
}
