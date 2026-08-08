import { LogoutButton } from "@/components/LogoutButton";
import { RefreshButton } from "@/components/RefreshButton";
import { Amount } from "@/components/Amount";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandMark } from "@/components/BrandMark";
import { Notice } from "@/components/Notice";
import { PeriodSelector } from "@/components/PeriodSelector";
import { RecoveryList } from "@/components/RecoveryList";
import { FAMILY_LABELS } from "@/lib/funnel";
import { formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadFunnel } from "@/lib/report";

export const metadata = {
  title: "Relances · HUPPLE STORE",
};

/**
 * Écran d'action.
 *
 * Les deux autres onglets expliquent ; celui-ci demande de faire quelque
 * chose. Il ne porte donc aucune analyse : seulement la liste des acheteurs à
 * recontacter et le montant en jeu.
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
      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-8">
        <header className="hero-gradient relative overflow-hidden rounded-[var(--radius-hero)] px-6 py-7 sm:px-9 sm:py-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark />
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

          <div className="mt-8">
            <p className="text-[0.85rem] font-medium text-white/70">
              Argent laissé sur la table
            </p>
            <h1 className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-[2.6rem]">
              {current.contacts.length === 0
                ? "Personne à relancer."
                : `${current.contacts.length} acheteur${current.contacts.length > 1 ? "s" : ""} à recontacter.`}
            </h1>
            <p className="mt-3 max-w-xl text-[0.9rem] leading-relaxed text-white/75">
              {current.contacts.length === 0
                ? "Aucun paiement échoué rattrapable sur cette période."
                : `Leur paiement a échoué pour une raison rattrapable, et tu as leurs coordonnées. Sur les seuls échecs techniques, ${formatXof(current.recoverable.netXof)} nets sont en jeu.`}
            </p>

            {parFamille.size > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {[...parFamille.entries()].map(([family, count]) => (
                  <span
                    key={family}
                    className="rounded-[var(--radius-pill)] bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-sm"
                  >
                    {count} · {FAMILY_LABELS[family as keyof typeof FAMILY_LABELS]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {fatal && (
          <div className="mt-5">
            <Notice tone="error" title="Impossible de charger les données">
              {fatal}
            </Notice>
          </div>
        )}

        <section className="card mt-5 p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Liste de relance
            </h2>
            <span className="text-[0.75rem] text-ink-muted">
              45 derniers jours
            </span>
          </div>
          <RecoveryList contacts={current.contacts} />
        </section>

        <section className="card mt-4 p-6 sm:p-7">
          <h2 className="text-[0.95rem] font-semibold text-ink">
            Quoi leur écrire
          </h2>
          <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-soft">
            Le message qui fonctionne reconnaît la panne au lieu de la passer
            sous silence. Ces personnes ont essayé de payer et ont vu un échec :
            leur renvoyer une relance commerciale ordinaire les braquerait.
          </p>
          <blockquote className="mt-4 rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4 text-[0.85rem] leading-relaxed text-ink-soft">
            Bonjour [prénom], votre paiement pour « [produit] » n&apos;a pas
            abouti à cause d&apos;un incident technique chez l&apos;opérateur,
            pas de votre fait. Le lien reste valide si vous souhaitez réessayer :
            [lien]. Désolé pour le dérangement.
          </blockquote>
          <p className="mt-4 text-[0.78rem] leading-relaxed text-ink-muted">
            Un seul message, sans relance ultérieure. Insister sur un paiement
            manqué se retourne contre la marque bien plus vite que sur une
            promotion ordinaire.
          </p>
        </section>

        <div className="mt-6 mb-2">
          <Notice tone="info" title="Ce que cette liste n'est pas">
            Une liste de prospects. Ce sont des personnes qui ont tenté
            d&apos;acheter et que la technique a arrêtées. Les échecs pour solde
            insuffisant en sont volontairement exclus : les relancer
            immédiatement ne sert à rien.
          </Notice>
        </div>

        <div className="mt-6 lg:hidden">
          <Amount xof={current.recoverable.netXof} size="md" showEur />
          <p className="mt-1 text-[0.72rem] text-ink-muted">
            estimation nette, échecs techniques uniquement
          </p>
        </div>
      </main>

      <BottomNav active="relances" period={period} />
    </>
  );
}
