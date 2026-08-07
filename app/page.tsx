import { Hero } from "@/components/Hero";
import { KpiCard } from "@/components/KpiCard";
import { Notice } from "@/components/Notice";
import { Amount } from "@/components/Amount";
import { CampaignTable } from "@/components/CampaignTable";
import { ProductTable } from "@/components/ProductTable";
import { SpendRevenueChart } from "@/components/SpendRevenueChart";
import { loadDashboard } from "@/lib/report";
import { DEFAULT_PERIOD, isPeriodKey, PERIODS } from "@/lib/period";
import { formatInt } from "@/lib/money";

export const metadata = {
  title: "Rentabilité · HUPPLE STORE",
};

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const { current, previous, warnings, fatal } = await loadDashboard(period);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-8">
      <Hero report={current} previous={previous} period={period} />

      {(fatal || warnings.length > 0) && (
        <div className="mt-5 flex flex-col gap-3">
          {fatal && (
            <Notice tone="error" title="Impossible de charger les données">
              {fatal}
            </Notice>
          )}
          {warnings.map((warning, index) => (
            <Notice key={index} tone="warning" title="À savoir">
              {warning}
            </Notice>
          ))}
        </div>
      )}

      {/* ── Indicateurs de tête ────────────────────────────────────────── */}
      <section
        aria-label="Indicateurs clés"
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Dépense publicitaire"
          icon="◐"
          value={current.kpis.spendXof}
          previous={previous.kpis.spendXof}
          // Dépenser plus n'est pas une bonne nouvelle en soi : la couleur suit
          // le sens économique, pas la direction de la flèche.
          higherIsBetter={false}
        />
        <KpiCard
          label="Chiffre d'affaires brut"
          icon="◔"
          value={current.kpis.grossXof}
          previous={previous.kpis.grossXof}
        />
        <KpiCard
          label="Net encaissé"
          icon="◕"
          value={current.kpis.netXof}
          previous={previous.kpis.netXof}
        />
        <KpiCard
          label="Marge nette"
          icon="●"
          value={current.kpis.marginXof}
          previous={previous.kpis.marginXof}
          signed
          accent
        />
      </section>

      {/* ── Évolution ──────────────────────────────────────────────────── */}
      <section className="card mt-4 p-6 sm:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-ink">Évolution</h2>
            <p className="mt-1 text-[0.78rem] text-ink-muted">
              Sur {PERIODS[period].label.toLowerCase()} ·{" "}
              {formatInt(current.kpis.sales)} vente
              {current.kpis.sales > 1 ? "s" : ""} ·{" "}
              {formatInt(current.kpis.clicks)} clic
              {current.kpis.clicks > 1 ? "s" : ""}
            </p>
          </div>
          <Amount xof={current.kpis.netXof} size="lg" showEur />
        </div>

        <SpendRevenueChart daily={current.daily} />
      </section>

      {/* ── Campagnes ──────────────────────────────────────────────────── */}
      <section className="card mt-4 p-6 sm:p-7">
        <div className="mb-5">
          <h2 className="text-[0.95rem] font-semibold text-ink">
            Performance par campagne
          </h2>
          <p className="mt-1 text-[0.78rem] text-ink-muted">
            Triées par marge. Le seuil est le net moyen par vente : au-delà,
            chaque acquisition te coûte de l&apos;argent.
          </p>
        </div>
        <CampaignTable campaigns={current.campaigns} />
      </section>

      {/* ── Produits et revenu non attribué ────────────────────────────── */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Ce qui rapporte
            </h2>
            <p className="mt-1 text-[0.78rem] text-ink-muted">
              Net encaissé par produit sur la période.
            </p>
          </div>
          <ProductTable products={current.products} />
        </div>

        <div className="card flex flex-col justify-between gap-5 p-6 sm:p-7">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Revenu non attribué
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              Ventes survenues alors qu&apos;aucune campagne ne poussait ce
              produit ce jour-là : organique, réseaux, bouche-à-oreille.
            </p>
          </div>

          <div>
            <Amount xof={current.unattributed.netXof} size="xl" showEur />
            <p className="mt-2 text-[0.78rem] text-ink-muted">
              {current.unattributed.sales} vente
              {current.unattributed.sales > 1 ? "s" : ""} sur{" "}
              {current.kpis.sales}
              {current.kpis.netXof > 0 && (
                <>
                  {" "}
                  ·{" "}
                  {Math.round(
                    (current.unattributed.netXof / current.kpis.netXof) * 100,
                  )}
                  {" %"} du net
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Limites assumées ───────────────────────────────────────────── */}
      <footer className="mt-6 mb-2">
        <Notice tone="info" title="Comment lire ces chiffres">
          <ul className="mt-1 flex list-disc flex-col gap-1.5 pl-4">
            <li>
              Le revenu est le montant <strong>réellement reversé</strong>,
              après frais de paiement et frais de service. Les ventes à 0 F
              (codes de test) sont exclues.
            </li>
            <li>
              L&apos;attribution est une répartition au prorata de la dépense sur
              le couple (jour, produit), pas un suivi individuel des acheteurs.
              Elle est juste en moyenne, grossière au jour le jour.
            </li>
            <li>
              Meta agrège selon le fuseau du compte publicitaire, Chariow en UTC.
              <strong> Ne juge jamais une campagne sur moins de 7 jours.</strong>
            </li>
          </ul>
        </Notice>
      </footer>
    </main>
  );
}
