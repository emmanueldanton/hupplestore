import { CampaignRow } from "./CampaignRow";
import type { CampaignPerformance } from "@/lib/types";

/**
 * Liste des campagnes, la plus déficitaire en premier.
 *
 * EF-16 impose ce tri, appliqué en amont dans le calcul. Il est
 * contre-intuitif, et c'est voulu : un tableau de bord de rentabilité sert à
 * repérer ce qui saigne, pas à se féliciter.
 *
 * La distinction entre affichage mobile et affichage bureau a disparu. Une
 * ligne repliée tient sur toute largeur, et le tableau à six colonnes qu'elle
 * remplace obligeait à maintenir deux rendus du même contenu.
 */
export function CampaignTable({
  campaigns,
  unstable,
}: {
  campaigns: CampaignPerformance[];
  /**
   * Campagnes dont le verdict change selon le délai supposé entre le clic et
   * l'achat. L'information vit sur la ligne concernée, là où la décision se
   * prend.
   */
  unstable?: Set<string>;
}) {
  if (campaigns.length === 0) {
    return (
      <p className="text-[0.85rem] text-ink-muted">
        Aucune campagne active sur cette période.
      </p>
    );
  }

  return (
    <div>
      {campaigns.map((campaign) => (
        <CampaignRow
          key={campaign.campaignId}
          campaign={campaign}
          unstable={unstable?.has(campaign.campaignId)}
        />
      ))}
    </div>
  );
}
