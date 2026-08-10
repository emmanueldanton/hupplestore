import { Amount } from "@/components/Amount";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandMark } from "@/components/BrandMark";
import { Explain } from "@/components/Explain";
import { LogoutButton } from "@/components/LogoutButton";
import { Notice } from "@/components/Notice";
import { PeriodSelector } from "@/components/PeriodSelector";
import { RecoveryList } from "@/components/RecoveryList";
import { RefreshButton } from "@/components/RefreshButton";
import { FAMILY_LABELS } from "@/lib/funnel";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadFunnel } from "@/lib/report";

export const metadata = {
  title: "Relances · HUPPLE STORE",
};

/**
 * Écran d'action.
 *
 * Les autres onglets expliquent ; celui-ci demande de faire quelque chose. Il
 * ne porte donc aucune analyse : la liste, le montant en jeu, et un modèle de
 * message.
 */
export default async function RelancesPage({
  searchParams,
}: PageProps<"/relances">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const { current, fatal } = await loadFunnel(period);

  const parFamille = new Map<string, number>();
  for (const contact of current.contacts) {
    parFamille.set(contact.family, (parFamille.get(contact.family) ?? 0) + 1);
  }

  return (
    <>
      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 py-4 sm:px-6 sm:py-6">
        <header className="hero-gradient overflow-hidden rounded-[var(--radius-hero)] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark size={32} />
              <div className="hidden lg:block">
                <AppNav active="relances" period={period} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector active={period} windowDays={0} basePath="/relances" />
              <RefreshButton />
              <LogoutButton />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[0.75rem] font-medium text-white/60">
                À recontacter
              </p>
              <p className="numeral mt-1 text-[2.6rem] leading-none text-white">
                {current.contacts.length}
              </p>
              {parFamille.size > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...parFamille.entries()].map(([family, count]) => (
                    <span
                      key={family}
                      className="rounded-[var(--radius-pill)] bg-white/12 px-2.5 py-1 text-[0.7rem] font-medium text-white/85"
                    >
                      {count} · {FAMILY_LABELS[family as keyof typeof FAMILY_LABELS]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[0.75rem] font-medium text-white/60">
                En jeu, net
              </p>
              <div className="mt-1">
                <Amount xof={current.recoverable.netXof} size="xl" onDark />
              </div>
            </div>
          </div>
        </header>

        {fatal && (
          <div className="mt-4">
            <Notice tone="error" title="Impossible de charger les données">
              {fatal}
            </Notice>
          </div>
        )}

        <section className="card mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.9rem] font-semibold text-ink">Liste</h2>
            <span className="text-[0.72rem] text-ink-muted">45 derniers jours</span>
          </div>
          <div className="mt-4">
            <RecoveryList contacts={current.contacts} />
          </div>
        </section>

        <section className="card mt-3 p-5 sm:p-6">
          <h2 className="text-[0.9rem] font-semibold text-ink">
            Modèle de message
          </h2>
          <blockquote className="mt-4 rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4 text-[0.83rem] leading-relaxed text-ink-soft">
            Bonjour [prénom], votre paiement pour « [produit] » n&apos;a pas
            abouti à cause d&apos;un incident technique chez l&apos;opérateur,
            pas de votre fait. Le lien reste valide si vous souhaitez réessayer :
            [lien]. Désolé pour le dérangement.
          </blockquote>

          <Explain title="Pourquoi ce ton, et une seule fois">
            <p>
              Ces personnes ont essayé de payer et ont vu un échec. Une relance
              commerciale ordinaire les braquerait : le message qui fonctionne
              reconnaît la panne au lieu de la passer sous silence.
            </p>
            <p>
              Un seul envoi, sans rappel. Insister sur un paiement manqué se
              retourne contre la marque bien plus vite que sur une promotion.
            </p>
            <p>
              Les échecs pour solde insuffisant sont exclus de la liste : les
              relancer immédiatement ne sert à rien.
            </p>
          </Explain>
        </section>
      </main>

      <BottomNav active="relances" period={period} />
    </>
  );
}
