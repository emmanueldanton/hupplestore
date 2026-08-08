import { Amount } from "./Amount";
import { VerdictBadge } from "./VerdictBadge";
import { formatInt, formatRoas, formatXof } from "@/lib/money";
import type { CampaignPerformance } from "@/lib/types";

/**
 * Tableau des campagnes, trié par marge décroissante : ce qui rapporte en haut,
 * ce qui coûte en bas. Le tri par ROAS serait trompeur : une campagne à ROAS
 * 5× sur 2 000 F de dépense pèse moins qu'une campagne à 1,4× sur 200 000 F.
 *
 * La colonne ROAS affiche une fourchette, pas un point. Sur de faibles volumes
 * cette fourchette est si large qu'elle rend visible ce qu'un chiffre unique
 * cachait : on ne sait pas.
 */
export function CampaignTable({
  campaigns,
}: {
  campaigns: CampaignPerformance[];
}) {
  if (campaigns.length === 0) {
    return (
      <p className="text-[0.88rem] text-ink-muted">
        Aucune campagne n&apos;a enregistré de dépense sur cette période.
      </p>
    );
  }

  return (
    <div className="scroll-x -mx-1 px-1">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline">
            <Th>Campagne</Th>
            <Th align="right">Dépense</Th>
            <Th align="right">Net attribué</Th>
            <Th align="right">Marge</Th>
            <Th align="right">ROAS</Th>
            <Th align="right">Verdict</Th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const isLoss = campaign.marginXof < 0;
            const { confidence } = campaign;

            return (
              <tr
                key={campaign.campaignId}
                className="border-b border-hairline last:border-0"
              >
                <td className="py-4 pr-4">
                  <div className="text-[0.9rem] font-semibold text-ink">
                    {campaign.campaignName}
                  </div>
                  <div className="mt-1 text-[0.72rem] text-ink-muted">
                    {campaign.isMapped ? (
                      <>
                        {formatInt(campaign.clicks)} clic
                        {campaign.clicks > 1 ? "s" : ""} ·{" "}
                        {campaign.sales.toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        vente{campaign.sales > 1 ? "s" : ""}
                        {confidence.breakEvenCvr !== null && (
                          <>
                            {" "}
                            · seuil{" "}
                            {(confidence.breakEvenCvr * 100).toLocaleString(
                              "fr-FR",
                              { maximumFractionDigits: 2 },
                            )}
                            {" %"} de conversion
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-negative">
                        Non mappée, aucun revenu ne lui est attribué
                      </span>
                    )}
                  </div>
                </td>

                <Td align="right">
                  <Amount xof={campaign.spendXof} size="sm" />
                </Td>

                <Td align="right">
                  <Amount xof={campaign.netXof} size="sm" />
                </Td>

                <Td align="right">
                  <span
                    className={`numeral text-[0.95rem] ${
                      isLoss ? "text-negative" : "text-positive"
                    }`}
                  >
                    {campaign.marginXof > 0 ? "+" : ""}
                    {formatXof(campaign.marginXof)}
                  </span>
                </Td>

                <Td align="right">
                  <div className="tabular text-[0.95rem] font-bold text-ink">
                    {formatRoas(campaign.roas)}
                  </div>
                  {confidence.roasLow !== null && confidence.roasHigh !== null && (
                    <div className="mt-0.5 text-[0.68rem] whitespace-nowrap text-ink-muted">
                      entre {formatRoas(confidence.roasLow)} et{" "}
                      {formatRoas(confidence.roasHigh)}
                    </div>
                  )}
                </Td>

                <Td align="right">
                  <VerdictBadge
                    verdict={confidence.verdict}
                    probability={confidence.probabilityProfitable}
                  />
                  {confidence.clicksNeededToConclude !== null && (
                    <div className="mt-1 text-[0.68rem] whitespace-nowrap text-ink-muted">
                      ~{formatInt(confidence.clicksNeededToConclude)} clics de
                      plus pour trancher
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`pb-3 text-[0.72rem] font-semibold tracking-wide text-ink-muted uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={`py-4 ${align === "right" ? "pl-4 text-right" : "pr-4"}`}>
      {children}
    </td>
  );
}
