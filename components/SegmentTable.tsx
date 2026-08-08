import { Amount } from "./Amount";
import { formatPercent } from "@/lib/money";
import type { SegmentRow } from "@/lib/funnel";

/**
 * Taux de réussite par segment, produit ou devise de paiement.
 *
 * Les segments à moins de cinq tentatives sont signalés : un taux de 0 % sur
 * deux essais ne veut rien dire, et l'afficher comme les autres inviterait à
 * conclure trop vite. Même principe que pour les campagnes publicitaires.
 */
const MIN_ATTEMPTS = 5;

export function SegmentTable({
  rows,
  emptyLabel,
}: {
  rows: SegmentRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[0.88rem] text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => {
        const rate = row.successRate ?? 0;
        const thin = row.attempts < MIN_ATTEMPTS;

        return (
          <li key={row.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[0.85rem] font-semibold text-ink">
                  {row.label}
                </p>
                <p className="mt-1 text-[0.7rem] text-ink-muted">
                  {row.attempts} tentative{row.attempts > 1 ? "s" : ""} ·{" "}
                  {row.paid} payée{row.paid > 1 ? "s" : ""} · {row.failed} échec
                  {row.failed > 1 ? "s" : ""} · {row.abandoned} abandon
                  {row.abandoned > 1 ? "s" : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`numeral text-[1rem] ${
                    thin
                      ? "text-ink-muted"
                      : rate >= 0.6
                        ? "text-positive"
                        : rate >= 0.4
                          ? "text-ink"
                          : "text-negative"
                  }`}
                >
                  {formatPercent(row.successRate, false)}
                </span>
                {row.lostXof > 0 && (
                  <span className="mt-0.5 block text-[0.68rem] text-ink-muted">
                    <Amount xof={row.lostXof} size="sm" /> perdus
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full bg-positive"
                style={{ width: `${rate * 100}%` }}
              />
              <div
                className="h-full bg-negative/70"
                style={{
                  width: `${row.attempts > 0 ? (row.failed / row.attempts) * 100 : 0}%`,
                }}
              />
            </div>

            {thin && (
              <p className="mt-1.5 text-[0.68rem] text-ink-muted">
                Trop peu de tentatives pour en tirer une conclusion.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
