import { VERDICT_LABELS, type Verdict } from "@/lib/decision";

/**
 * Pastille de verdict.
 *
 * « Indéterminé » est volontairement neutre et non alarmant : ce n'est pas un
 * mauvais résultat, c'est une absence de résultat. Le colorer en rouge
 * pousserait à couper des campagnes dont on ne sait rien, ce qui est
 * exactement l'erreur que cette colonne existe pour empêcher.
 */
const styles: Record<Verdict, string> = {
  rentable: "bg-positive-soft text-positive",
  perdante: "bg-negative-soft text-negative",
  indetermine: "bg-surface-sunken text-ink-soft",
  sans_donnees: "bg-surface-sunken text-ink-muted",
};

export function VerdictBadge({
  verdict,
  probability,
}: {
  verdict: Verdict;
  probability?: number | null;
}) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[0.72rem] font-bold whitespace-nowrap ${styles[verdict]}`}
      >
        {VERDICT_LABELS[verdict]}
      </span>
      {typeof probability === "number" && verdict !== "sans_donnees" && (
        <span className="text-[0.68rem] whitespace-nowrap text-ink-muted">
          {Math.round(probability * 100)} % de chances d&apos;être rentable
        </span>
      )}
    </span>
  );
}
