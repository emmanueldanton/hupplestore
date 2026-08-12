import { Amount } from "./Amount";
import { VerdictBadge } from "./VerdictBadge";
import { formatInt, formatPercent, formatRoas, formatXof } from "@/lib/money";
import type { CampaignPerformance } from "@/lib/types";

/**
 * Une campagne, réduite à son résultat.
 *
 * EF-17 : le détail n'est pas affiché tant qu'il n'est pas demandé. La ligne
 * fermée ne porte que le nom et le résultat, soit la seule information qui
 * appelle une décision. Fourchette de ROAS, seuil d'équilibre, coût par
 * acquisition et volumes attendent l'ouverture.
 *
 * Le repli est un élément HTML natif : il fonctionne sans JavaScript et les
 * lecteurs d'écran l'annoncent correctement.
 */
export function CampaignRow({
  campaign,
  unstable,
}: {
  campaign: CampaignPerformance;
  /** Verdict qui change selon le délai supposé entre le clic et l'achat. */
  unstable?: boolean;
}) {
  const { confidence } = campaign;
  const perte = campaign.marginXof < 0;

  return (
    <details className="group border-b border-hairline last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform group-open:rotate-90"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.88rem] font-medium text-ink">
            {campaign.campaignName}
          </span>
          {(!campaign.hasDelivery || unstable) && (
            <span className="mt-0.5 block text-[0.68rem] text-alert">
              {!campaign.hasDelivery
                ? "Aucune diffusion sur la période"
                : "Résultat fragile"}
            </span>
          )}
        </span>

        <span
          className={`numeral shrink-0 text-[0.95rem] ${
            perte ? "text-negative" : "text-positive"
          }`}
        >
          {campaign.marginXof > 0 ? "+" : ""}
          {formatXof(campaign.marginXof)}
        </span>
      </summary>

      <div className="pb-4 pl-6.5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Detail label="Dépense">
            <Amount xof={campaign.spendXof} size="sm" />
          </Detail>
          <Detail label="Net attribué">
            <Amount xof={campaign.netXof} size="sm" />
          </Detail>
          <Detail label="ROAS">
            <span className="tabular text-[0.9rem] font-semibold text-ink">
              {formatRoas(campaign.roas)}
            </span>
            {confidence.roasLow !== null && confidence.roasHigh !== null && (
              <span className="mt-0.5 block text-[0.66rem] text-ink-muted">
                entre {formatRoas(confidence.roasLow)} et{" "}
                {formatRoas(confidence.roasHigh)}
              </span>
            )}
          </Detail>
          <Detail label="Verdict">
            <VerdictBadge
              verdict={confidence.verdict}
              probability={confidence.probabilityProfitable}
            />
          </Detail>
        </dl>

        <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-muted">
          {formatInt(campaign.clicks)} clics ·{" "}
          {campaign.sales.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{" "}
          ventes
          {confidence.breakEvenCvr !== null && (
            <>
              {" "}
              · seuil d&apos;équilibre{" "}
              {formatPercent(confidence.breakEvenCvr, false)} de conversion
            </>
          )}
          {confidence.clicksNeededToConclude !== null && (
            <>
              {" "}
              · environ {formatInt(confidence.clicksNeededToConclude)} clics de
              plus pour trancher
            </>
          )}
        </p>
      </div>
    </details>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[0.66rem] font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
