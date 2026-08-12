import { Explain } from "./Explain";
import { formatPercent, formatRoas, formatXof } from "@/lib/money";
import type { PlatformGap } from "@/lib/gap";

/**
 * L'écart entre ce que Meta annonce et ce qui est réellement encaissé.
 *
 * C'est la démonstration du produit, et elle tient en une ligne : la
 * plateforme compte le montant des commandes, le vendeur encaisse ce qui reste
 * après frais de paiement et de plateforme.
 *
 * Placée haut dans l'écran, avant le détail des campagnes : c'est ce qui
 * justifie de regarder ce tableau de bord plutôt que le gestionnaire de
 * publicités.
 */
export function PlatformGapCard({ gap }: { gap: PlatformGap }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.9rem] font-semibold text-ink">
          Ce que Meta t&apos;annonce
        </h2>
        <span className="text-[0.74rem] font-semibold text-alert">
          surestimé de {formatPercent(gap.overstatement, false)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[0.68rem] font-medium tracking-wide text-ink-muted uppercase">
            Annoncé par Meta
          </p>
          <p className="numeral mt-1 text-[1.6rem] leading-none text-ink-muted line-through decoration-alert decoration-2">
            {formatRoas(gap.claimedRoas)}
          </p>
          <p className="mt-1 text-[0.7rem] text-ink-muted">
            {formatXof(gap.claimedValueXof)} de ventes
          </p>
        </div>

        <div>
          <p className="text-[0.68rem] font-medium tracking-wide text-ink-muted uppercase">
            Réellement encaissé
          </p>
          <p className="numeral mt-1 text-[1.6rem] leading-none text-ink">
            {formatRoas(gap.realRoas)}
          </p>
          <p className="mt-1 text-[0.7rem] text-ink-muted">
            {formatXof(gap.netValueXof)} nets
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-[var(--radius-card)] bg-alert-soft p-3.5 text-[0.82rem] leading-relaxed text-[#8a3d10]">
        Sur les {gap.purchases} ventes que Meta revendique,{" "}
        <strong>{formatXof(gap.missingXof)}</strong> n&apos;arrivent jamais sur
        ton compte.
      </p>

      <Explain title="D'où vient cet écart">
        <p>
          Meta compte le montant des commandes. Il ne connaît ni les frais du
          prestataire de paiement, ni ceux de la plateforme de vente, et ne peut
          pas les déduire.
        </p>
        <p>
          La comparaison porte sur les mêmes ventes, celles que Meta revendique.
          Seuls les prélèvements les séparent : c&apos;est ce qui rend l&apos;écart
          incontestable, et non une question de méthode d&apos;attribution.
        </p>
      </Explain>
    </section>
  );
}
