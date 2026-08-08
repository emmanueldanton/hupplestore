import { LogoutButton } from "@/components/LogoutButton";
import { Amount } from "@/components/Amount";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandMark } from "@/components/BrandMark";
import { Notice } from "@/components/Notice";
import { OpportunityCalculator } from "@/components/OpportunityCalculator";
import { PeriodSelector } from "@/components/PeriodSelector";
import { formatPercent, formatRoas, formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadDashboard } from "@/lib/report";
import { judgePrice, unitEconomicsFromReport } from "@/lib/threshold";

export const metadata = {
  title: "Veille · HUPPLE STORE",
};

/** Prix testés dans l'échelle, du plus bas au plus élevé. */
const ECHELLE = [1900, 2200, 2900, 3900, 4999, 6900, 9900, 14900];

/**
 * Onglet de veille.
 *
 * Il ne va chercher aucune donnée de marché, et c'est délibéré. L'API Ad
 * Library de Meta ne renvoie, hors Union européenne, que les publicités
 * politiques : elle est aveugle sur la Côte d'Ivoire, le Cameroun et la RDC.
 * Quant à la bibliothèque web, qui couvre bien ces pays, l'interroger depuis
 * un serveur relèverait du moissonnage.
 *
 * La recherche reste donc humaine. Ce que l'application apporte, c'est le
 * calcul que la recherche ne fait jamais : confronter une idée au coût réel
 * d'un clic sur cette boutique.
 */
export default async function VeillePage({ searchParams }: PageProps<"/veille">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const { current, fatal } = await loadDashboard(period);
  const eco = unitEconomicsFromReport(current);

  return (
    <>
      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-8">
        <header className="hero-gradient relative overflow-hidden rounded-[var(--radius-hero)] px-6 py-7 sm:px-9 sm:py-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="hidden lg:block">
                <AppNav active="veille" period={period} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector active={period} windowDays={0} basePath="/veille" />
              <LogoutButton />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[0.85rem] font-medium text-white/70">
                Avant de lancer quoi que ce soit
              </p>
              <h1 className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-[2.6rem]">
                {eco.floorXof === null
                  ? "Plancher incalculable."
                  : `Ne vends rien sous ${formatXof(eco.floorXof)}.`}
              </h1>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-white/75">
                {eco.floorXof === null
                  ? "Sans dépense publicitaire ni vente sur la période, le coût par clic ne peut pas être établi."
                  : `À ${formatXof(eco.cpcXof ?? 0)} le clic et ${formatPercent(eco.cvr, false)} de conversion publicitaire, tout produit vendu en dessous perd de l'argent, quelle que soit sa qualité.`}
              </p>

              {eco.cvr !== null && eco.blendedCvr !== null && (
                <p className="mt-3 text-[0.78rem] leading-relaxed text-white/55">
                  Ce taux ne retient que les {eco.attributedSales} ventes
                  qu&apos;une campagne peut revendiquer, sur {eco.totalSales} au
                  total. Compter les ventes organiques porterait la conversion à{" "}
                  {formatPercent(eco.blendedCvr, false)} et abaisserait
                  artificiellement le plancher : la publicité serait créditée de
                  ventes qu&apos;elle n&apos;a pas produites.
                </p>
              )}
            </div>

            <div className="glass w-full max-w-sm p-6">
              <span className="text-[0.78rem] font-medium text-white/70">
                Prix confortable, ROAS 2
              </span>
              <div className="mt-4">
                <Amount xof={eco.comfortXof ?? 0} size="hero" onDark showEur />
              </div>
              <p className="mt-5 border-t border-white/20 pt-4 text-[0.72rem] leading-relaxed text-white/60">
                Le double du plancher. C&apos;est la marge qui absorbe une
                hausse du coût par clic ou une créa moins performante.
              </p>
            </div>
          </div>
        </header>

        {fatal && (
          <div className="mt-5">
            <Notice tone="error" title="Impossible de charger les données">
              {fatal}
            </Notice>
          </div>
        )}

        {/* ── Calculateur ────────────────────────────────────────────────── */}
        <section className="card mt-5 p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Tester une idée
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              Tu trouves un produit prometteur pendant ta veille : saisis son
              prix, l&apos;application dit s&apos;il peut être rentable chez toi.
            </p>
          </div>
          <OpportunityCalculator economics={eco} />
        </section>

        {/* ── Échelle de prix ────────────────────────────────────────────── */}
        <section className="card mt-4 p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              L&apos;échelle des prix
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              Conversion exigée et ROAS attendu à chaque palier, au coût par
              clic actuel.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {ECHELLE.map((prix) => {
              const v = judgePrice(prix, eco);
              const couleur =
                v.viability === "viable"
                  ? "text-positive"
                  : v.viability === "limite"
                    ? "text-alert"
                    : "text-negative";
              return (
                <li
                  key={prix}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline pb-2.5 last:border-0"
                >
                  <span className="numeral text-[0.95rem] text-ink">
                    {formatXof(prix)}
                  </span>
                  <span className="tabular text-[0.75rem] text-ink-muted">
                    conversion requise {formatPercent(v.requiredCvr, false)}
                  </span>
                  <span className={`tabular text-[0.9rem] font-bold ${couleur}`}>
                    {formatRoas(v.expectedRoas)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Méthode de recherche ───────────────────────────────────────── */}
        <section className="card mt-4 p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Où chercher
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              La bibliothèque publicitaire de Meta, en version web, est gratuite
              et ne demande aucun compte.
            </p>
          </div>

          <a
            href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CI&q=prise%20de%20parole&search_type=keyword_unordered&media_type=all"
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-xl bg-ink px-4 py-3 text-[0.85rem] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Ouvrir la bibliothèque publicitaire
          </a>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-[0.78rem] font-semibold text-ink">
                Tes marchés, par volume
              </h3>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-soft">
                Côte d&apos;Ivoire, RDC, Cameroun, Guinée. Le Bénin ne pèse que
                1,7 % de tes ventes : ne cherche pas là.
              </p>
            </div>
            <div>
              <h3 className="text-[0.78rem] font-semibold text-ink">
                Le seul signal fiable
              </h3>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-soft">
                La date de début de diffusion. Au delà de 30 jours, la publicité
                est rentable, sinon elle serait coupée. Au delà de 200 jours,
                c&apos;est une machine à cash.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4">
            <h3 className="text-[0.78rem] font-semibold text-ink">
              Concurrents relevés dans ta niche
            </h3>
            <ul className="mt-2.5 flex flex-col gap-1.5 text-[0.78rem] text-ink-soft">
              <li>
                <strong>OverMarket</strong>, 570 jours de diffusion : parler avec
                assurance, ne plus bégayer
              </li>
              <li>
                <strong>Savoir Hub</strong>, 216 jours : formation complète sur
                l&apos;art oratoire
              </li>
              <li>
                <strong>Équipe Bien Être</strong>, 209 jours : peur de parler en
                public
              </li>
              <li>
                <strong>Librairie d&apos;Abidjan</strong>, 208 jours : les mots
                dans la tête, pas sur les lèvres
              </li>
            </ul>
            <p className="mt-3 text-[0.72rem] leading-relaxed text-ink-muted">
              Relevé en Côte d&apos;Ivoire le 8 août 2026. Ta niche est validée
              par la durée de ces campagnes, et elle est disputée.
            </p>
          </div>
        </section>

        <footer className="mt-6 mb-2 flex flex-col gap-3">
          <Notice tone="info" title="Pourquoi la recherche n'est pas automatisée">
            L&apos;API officielle de Meta ne renvoie, hors Union européenne, que
            les publicités politiques : elle ne voit rien de tes marchés. La
            bibliothèque web les couvre, mais l&apos;interroger depuis un serveur
            relèverait du moissonnage, contraire aux conditions de Meta et cassé
            à la première refonte de leur interface.
          </Notice>
          <Notice tone="warning" title="Ce qui manque encore">
            Enregistrer tes trouvailles demande une base de données, que
            l&apos;application n&apos;a pas. Pour l&apos;instant, le calculateur
            ne conserve rien d&apos;une visite à l&apos;autre.
          </Notice>
        </footer>
      </main>

      <BottomNav active="veille" period={period} />
    </>
  );
}
