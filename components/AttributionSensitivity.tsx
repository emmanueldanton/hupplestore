import Link from "next/link";
import { formatRoas } from "@/lib/money";
import { SENSITIVITY_WINDOWS } from "@/lib/report";
import type { SensitivityRow } from "@/lib/types";
import type { PeriodKey } from "@/lib/period";

/**
 * Robustesse du classement selon la fenêtre d'attribution.
 *
 * Rien ne dit qu'un achat suit son clic le jour même. Plutôt que de trancher
 * arbitrairement, on rejoue le calcul à plusieurs hypothèses et on regarde si
 * la conclusion bouge. Une campagne stable autorise une décision ; une campagne
 * instable dit seulement que l'hypothèse compte plus que les données.
 */
export function AttributionSensitivity({
  rows,
  activeWindow,
  period,
}: {
  rows: SensitivityRow[];
  activeWindow: number;
  period: PeriodKey;
}) {
  const withSpend = rows.filter((row) => row.spendXof > 0);

  if (withSpend.length === 0) {
    return (
      <p className="text-[0.88rem] text-ink-muted">
        Aucune dépense à éprouver sur cette période.
      </p>
    );
  }

  const unstable = withSpend.filter((row) => !row.stable).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="text-[0.75rem] text-ink-muted">Délai d&apos;achat :</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] bg-surface-sunken p-1">
          {SENSITIVITY_WINDOWS.map((days) => (
            <Link
              key={days}
              href={`/?period=${period}&window=${days}`}
              aria-current={days === activeWindow ? "page" : undefined}
              className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                days === activeWindow
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:bg-black/5"
              }`}
            >
              {days === 0 ? "jour même" : `${days} j`}
            </Link>
          ))}
        </span>
      </div>

      {/* Sur petit écran, une ligne par campagne avec ses quatre valeurs en
          regard, plutôt qu'un tableau qu'il faudrait faire défiler. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {withSpend.map((row) => (
          <li
            key={row.campaignId}
            className="rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[0.85rem] leading-snug font-semibold text-ink">
                {row.campaignName}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold whitespace-nowrap ${
                  row.stable
                    ? "bg-surface text-ink-soft"
                    : "bg-negative-soft text-negative"
                }`}
              >
                {row.stable ? "Stable" : "Instable"}
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-2">
              {SENSITIVITY_WINDOWS.map((days) => (
                <div key={days}>
                  <span className="block text-[0.65rem] text-ink-muted">
                    {days === 0 ? "J même" : `${days} j`}
                  </span>
                  <span className="tabular mt-0.5 block text-[0.85rem] font-semibold text-ink">
                    {formatRoas(row.roasByWindow[days] ?? null)}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="scroll-x -mx-1 hidden px-1 lg:block">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th
                scope="col"
                className="pb-3 text-[0.72rem] font-semibold tracking-wide text-ink-muted uppercase"
              >
                Campagne
              </th>
              {SENSITIVITY_WINDOWS.map((days) => (
                <th
                  key={days}
                  scope="col"
                  className="pb-3 pl-4 text-right text-[0.72rem] font-semibold tracking-wide text-ink-muted uppercase"
                >
                  {days === 0 ? "Jour même" : `${days} j`}
                </th>
              ))}
              <th
                scope="col"
                className="pb-3 pl-4 text-right text-[0.72rem] font-semibold tracking-wide text-ink-muted uppercase"
              >
                Conclusion
              </th>
            </tr>
          </thead>
          <tbody>
            {withSpend.map((row) => (
              <tr
                key={row.campaignId}
                className="border-b border-hairline last:border-0"
              >
                <td className="py-3.5 pr-4 text-[0.85rem] font-medium text-ink">
                  {row.campaignName}
                </td>
                {SENSITIVITY_WINDOWS.map((days) => (
                  <td
                    key={days}
                    className="tabular py-3.5 pl-4 text-right text-[0.85rem] text-ink-soft"
                  >
                    {formatRoas(row.roasByWindow[days] ?? null)}
                  </td>
                ))}
                <td className="py-3.5 pl-4 text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold whitespace-nowrap ${
                      row.stable
                        ? "bg-surface-sunken text-ink-soft"
                        : "bg-negative-soft text-negative"
                    }`}
                  >
                    {row.stable ? "Stable" : "Dépend de l'hypothèse"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[0.78rem] leading-relaxed text-ink-muted">
        {unstable === 0 ? (
          <>Tous les verdicts résistent au changement de délai.</>
        ) : (
          <>
            <strong className="text-negative">
              {unstable} campagne{unstable > 1 ? "s" : ""} change
              {unstable > 1 ? "nt" : ""} de verdict selon le délai retenu.
            </strong>{" "}
            Ne fonde aucune décision de budget sur ces lignes.
          </>
        )}
      </p>
    </div>
  );
}
