import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandMark } from "@/components/BrandMark";
import { Explain } from "@/components/Explain";
import { LogoutButton } from "@/components/LogoutButton";
import { Notice } from "@/components/Notice";
import { OpportunityCalculator } from "@/components/OpportunityCalculator";
import { PeriodSelector } from "@/components/PeriodSelector";
import { RefreshButton } from "@/components/RefreshButton";
import { formatPercent, formatRoas, formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadDashboard } from "@/lib/report";
import { judgePrice, unitEconomicsFromReport } from "@/lib/threshold";

export const metadata = {
  title: "Veille · HUPPLE STORE",
};

const ECHELLE = [1900, 2900, 3900, 4999, 6900, 9900, 14900];

const RECHERCHE =
  "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CI&q=prise%20de%20parole&search_type=keyword_unordered&media_type=all";

export default async function VeillePage({ searchParams }: PageProps<"/veille">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const { current, fatal } = await loadDashboard(period);
  const eco = unitEconomicsFromReport(current);

  return (
    <>
      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 py-4 sm:px-6 sm:py-6">
        <header className="hero-gradient overflow-hidden rounded-[var(--radius-hero)] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark size={32} />
              <div className="hidden lg:block">
                <AppNav active="veille" period={period} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector active={period} windowDays={0} basePath="/veille" />
              <RefreshButton />
              <LogoutButton />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[0.75rem] font-medium text-white/60">
                Prix plancher
              </p>
              <p className="numeral mt-1 text-[2.6rem] leading-none text-white">
                {eco.floorXof === null ? "n/d" : formatXof(eco.floorXof)}
              </p>
              <p className="mt-2 text-[0.78rem] text-white/60">
                {eco.cpcXof === null
                  ? "Coût par clic indisponible"
                  : `${formatXof(eco.cpcXof)} le clic · ${formatPercent(eco.cvr, false)} de conversion`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[0.75rem] font-medium text-white/60">
                Confortable
              </p>
              <p className="numeral mt-1 text-[2rem] leading-none text-white">
                {eco.comfortXof === null ? "n/d" : formatXof(eco.comfortXof)}
              </p>
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

        {/* ── Calculateur ────────────────────────────────────────────────── */}
        <section className="card mt-4 p-5 sm:p-6">
          <h2 className="text-[0.9rem] font-semibold text-ink">Tester un prix</h2>
          <div className="mt-4">
            <OpportunityCalculator economics={eco} />
          </div>

          <Explain title="D'où vient le plancher">
            <p>
              Prix plancher = coût par clic divisé par (taux de conversion ×
              taux de reversement). En dessous, aucun produit ne peut être
              rentable, quelle que soit sa qualité.
            </p>
            <p>
              La conversion ne retient que les {eco.attributedSales} ventes
              qu&apos;une campagne peut revendiquer, sur {eco.totalSales}.
              Compter les ventes organiques la porterait à{" "}
              {formatPercent(eco.blendedCvr, false)} et abaisserait
              artificiellement le seuil.
            </p>
          </Explain>
        </section>

        {/* ── Échelle ────────────────────────────────────────────────────── */}
        <section className="card mt-3 p-5 sm:p-6">
          <h2 className="text-[0.9rem] font-semibold text-ink">
            Échelle des prix
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
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
                  className="flex items-center justify-between gap-3 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="numeral text-[0.9rem] text-ink">
                    {formatXof(prix)}
                  </span>
                  <span className="tabular text-[0.72rem] text-ink-muted">
                    {formatPercent(v.requiredCvr, false)} requis
                  </span>
                  <span className={`tabular w-14 text-right text-[0.88rem] font-bold ${couleur}`}>
                    {formatRoas(v.expectedRoas)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Recherche ──────────────────────────────────────────────────── */}
        <section className="card mt-3 p-5 sm:p-6">
          <h2 className="text-[0.9rem] font-semibold text-ink">Où chercher</h2>

          <a
            href={RECHERCHE}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[0.82rem] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Bibliothèque publicitaire Meta
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M13 5h6v6" />
              <path d="M19 5l-8.5 8.5" />
              <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
            </svg>
          </a>

          <dl className="mt-5 flex flex-col gap-3">
            <Repere terme="Marchés">
              Côte d&apos;Ivoire, RDC, Cameroun, Guinée
            </Repere>
            <Repere terme="Signal">
              Diffusion de plus de 30 jours, la publicité est rentable
            </Repere>
            <Repere terme="Concurrents">
              OverMarket 570 j · Savoir Hub 216 j · Équipe Bien Être 209 j
            </Repere>
          </dl>

          <Explain title="Pourquoi ce n'est pas automatisé">
            <p>
              L&apos;API Ad Library de Meta ne renvoie, hors Union européenne,
              que les publicités politiques : elle ne voit rien de tes marchés.
            </p>
            <p>
              La bibliothèque web les couvre, mais l&apos;interroger depuis un
              serveur relèverait du moissonnage, contraire aux conditions de
              Meta et cassé à la première refonte de leur interface.
            </p>
            <p>
              Le calculateur ne conserve rien d&apos;une visite à l&apos;autre :
              enregistrer tes trouvailles demanderait une base de données.
            </p>
          </Explain>
        </section>
      </main>

      <BottomNav active="veille" period={period} />
    </>
  );
}

function Repere({
  terme,
  children,
}: {
  terme: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <dt className="w-24 shrink-0 text-[0.7rem] font-medium tracking-wide text-ink-muted uppercase">
        {terme}
      </dt>
      <dd className="flex-1 text-[0.8rem] text-ink-soft">{children}</dd>
    </div>
  );
}
