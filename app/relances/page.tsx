import { Amount } from "@/components/Amount";
import { AppHeader, HeaderStats } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Explain } from "@/components/Explain";
import { Notice } from "@/components/Notice";
import { RecoveryList } from "@/components/RecoveryList";
import { FAMILY_LABELS } from "@/lib/funnel";
import { cookies } from "next/headers";
import { PERIOD_COOKIE, resolvePeriodFromParams } from "@/lib/period";
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
  const memoire = (await cookies()).get(PERIOD_COOKIE)?.value;
  const period = resolvePeriodFromParams(params, memoire);

  const { current, fatal } = await loadFunnel(period);

  const parFamille = new Map<string, number>();
  for (const contact of current.contacts) {
    parFamille.set(contact.family, (parFamille.get(contact.family) ?? 0) + 1);
  }

  return (
    <>
      <AppHeader active="relances" period={period} basePath="/relances">
        <HeaderStats
          label="À recontacter"
          value={
            <span className="numeral text-[2.5rem] leading-none text-white">
              {current.contacts.length}
            </span>
          }
          hint={
            parFamille.size > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...parFamille.entries()].map(([family, count]) => (
                  <span
                    key={family}
                    className="rounded-[var(--radius-pill)] bg-white/12 px-2.5 py-1 text-[0.7rem] font-medium text-white/85"
                  >
                    {count} · {FAMILY_LABELS[family as keyof typeof FAMILY_LABELS]}
                  </span>
                ))}
              </div>
            ) : null
          }
          asideLabel="En jeu, net"
          aside={<Amount xof={current.recoverable.netXof} size="xl" onDark />}
        />
      </AppHeader>

      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        {fatal && (
          <div>
            <Notice tone="error" title="Impossible de charger les données">
              {fatal}
            </Notice>
          </div>
        )}

        <section className={`card p-5 sm:p-6 ${fatal ? "mt-3" : ""}`}>
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

      <BottomNav active="relances" query={period.query} />
    </>
  );
}
