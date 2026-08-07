import { Amount } from "./Amount";
import { formatInt, formatRoas, formatXof } from "@/lib/money";
import type { CampaignPerformance } from "@/lib/types";

/**
 * Tableau des campagnes, trié par marge décroissante : ce qui rapporte en haut,
 * ce qui coûte en bas. Le tri par ROAS serait trompeur — une campagne à ROAS
 * 5× sur 2 000 F de dépense pèse moins qu'une campagne à 1,4× sur 200 000 F.
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
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline">
            <Th>Campagne</Th>
            <Th align="right">Dépense</Th>
            <Th align="right">Net encaissé</Th>
            <Th align="right">Marge</Th>
            <Th align="right">ROAS</Th>
            <Th align="right">Ventes</Th>
            <Th align="right">CPA / seuil</Th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const isLoss = campaign.marginXof < 0;
            const overBreakEven =
              campaign.cpaXof !== null &&
              campaign.breakEvenCpaXof !== null &&
              campaign.cpaXof > campaign.breakEvenCpaXof;

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
                        {formatInt(campaign.impressions)} impressions
                      </>
                    ) : (
                      <span className="text-negative">
                        Non mappée — aucun revenu ne lui est attribué
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
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${
                      campaign.roas === null
                        ? "bg-surface-sunken text-ink-muted"
                        : campaign.roas >= 1
                          ? "bg-positive-soft text-positive"
                          : "bg-negative-soft text-negative"
                    }`}
                  >
                    {formatRoas(campaign.roas)}
                  </span>
                </Td>

                <Td align="right">
                  <span className="tabular text-[0.9rem] text-ink">
                    {campaign.sales.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </Td>

                <Td align="right">
                  <div
                    className={`tabular text-[0.85rem] font-semibold ${
                      overBreakEven ? "text-negative" : "text-ink"
                    }`}
                  >
                    {campaign.cpaXof === null ? "—" : formatXof(campaign.cpaXof)}
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-ink-muted">
                    seuil{" "}
                    {campaign.breakEvenCpaXof === null
                      ? "—"
                      : formatXof(campaign.breakEvenCpaXof)}
                  </div>
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
    <td
      className={`py-4 ${align === "right" ? "pl-4 text-right" : "pr-4"}`}
    >
      {children}
    </td>
  );
}
