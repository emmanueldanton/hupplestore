import { Amount } from "./Amount";
import { VerdictBadge } from "./VerdictBadge";
import { formatInt, formatRoas, formatXof } from "@/lib/money";
import type { CampaignPerformance } from "@/lib/types";

/**
 * Représentation d'une campagne sur petit écran.
 *
 * Le tableau à six colonnes est illisible sous 900 px : on ne verrait que la
 * colonne des noms, tous les chiffres restant hors champ derrière un
 * défilement horizontal. La carte porte les mêmes informations, empilées.
 *
 * L'ordre est délibéré : le verdict d'abord, puisque c'est la seule chose qui
 * appelle une décision, puis la marge, puis le détail.
 */
export function CampaignCard({ campaign }: { campaign: CampaignPerformance }) {
  const { confidence } = campaign;
  const isLoss = campaign.marginXof < 0;

  return (
    <li className="rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9rem] leading-snug font-semibold text-ink">
            {campaign.campaignName}
          </p>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-ink-muted">
            {campaign.isMapped ? (
              <>
                {formatInt(campaign.clicks)} clic
                {campaign.clicks > 1 ? "s" : ""} ·{" "}
                {campaign.sales.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}{" "}
                vente{campaign.sales > 1 ? "s" : ""}
              </>
            ) : (
              <span className="text-negative">
                Non mappée, aucun revenu ne lui est attribué
              </span>
            )}
          </p>
        </div>
        {/* Pastille seule ici : la probabilité en toutes lettres prenait la
            moitié de la largeur et coupait les noms de campagne en deux. Elle
            est reprise en pied de carte, où la place ne manque pas. */}
        <VerdictBadge verdict={confidence.verdict} />
      </div>

      {/* Deux colonnes sur téléphone, quatre dès la tablette : au delà de
          600 px, deux colonnes laisseraient la moitié de la carte vide. */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-4">
        <Stat label="Dépense">
          <Amount xof={campaign.spendXof} size="sm" />
        </Stat>

        <Stat label="Net attribué">
          <Amount xof={campaign.netXof} size="sm" />
        </Stat>

        <Stat label="Marge">
          <span
            className={`numeral text-[0.95rem] ${
              isLoss ? "text-negative" : "text-positive"
            }`}
          >
            {campaign.marginXof > 0 ? "+" : ""}
            {formatXof(campaign.marginXof)}
          </span>
        </Stat>

        <Stat label="ROAS">
          <span className="tabular text-[0.95rem] font-bold text-ink">
            {formatRoas(campaign.roas)}
          </span>
          {confidence.roasLow !== null && confidence.roasHigh !== null && (
            <span className="mt-0.5 block text-[0.68rem] text-ink-muted">
              entre {formatRoas(confidence.roasLow)} et{" "}
              {formatRoas(confidence.roasHigh)}
            </span>
          )}
        </Stat>
      </div>

      {confidence.breakEvenCvr !== null && (
        <p className="mt-3.5 border-t border-hairline pt-3 text-[0.7rem] leading-relaxed text-ink-muted">
          {typeof confidence.probabilityProfitable === "number" && (
            <>
              {Math.round(confidence.probabilityProfitable * 100)} % de chances
              d&apos;être rentable ·{" "}
            </>
          )}
          seuil d&apos;équilibre{" "}
          {(confidence.breakEvenCvr * 100).toLocaleString("fr-FR", {
            maximumFractionDigits: 2,
          })}
          {" %"} de conversion
          {confidence.clicksNeededToConclude !== null && (
            <>
              {" "}
              · environ {formatInt(confidence.clicksNeededToConclude)} clics de
              plus pour trancher
            </>
          )}
        </p>
      )}
    </li>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[0.68rem] font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </div>
  );
}
