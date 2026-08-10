import { AppHeader, HeaderStats } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Explain } from "@/components/Explain";
import { Notice } from "@/components/Notice";
import { OpportunityCalculator } from "@/components/OpportunityCalculator";
import { formatPercent, formatRoas, formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadDashboard, loadFunnel } from "@/lib/report";
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

  const [{ current, fatal }, funnel] = await Promise.all([
    loadDashboard(period),
    loadFunnel(period),
  ]);
  const eco = unitEconomicsFromReport(current);

  // Déduit des ventes réelles, et non d'une liste écrite en dur qu'il faudrait
  // redéployer pour corriger. Le marché se déplace ; le code ne devrait pas
  // avoir à suivre.
  const marches = funnel.current.byCountry
    .filter((pays) => pays.paid > 0 && pays.key !== "Inconnu")
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 4)
    .map((pays) => `${pays.label} (${pays.paid})`)
    .join(" · ");

  return (
    <>
      <AppHeader active="veille" period={period} basePath="/veille">
        <HeaderStats
          label="Prix plancher"
          value={
            <span className="numeral text-[2.5rem] leading-none text-white">
              {eco.floorXof === null ? "n/d" : formatXof(eco.floorXof)}
            </span>
          }
          hint={
            <span className="text-[0.78rem] text-white/55">
              {eco.cpcXof === null
                ? "Coût par clic indisponible"
                : `${formatXof(eco.cpcXof)} le clic · ${formatPercent(eco.cvr, false)} de conversion`}
            </span>
          }
          asideLabel="Confortable"
          aside={
            <span className="numeral text-[1.9rem] leading-none text-white">
              {eco.comfortXof === null ? "n/d" : formatXof(eco.comfortXof)}
            </span>
          }
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

        {/* ── Calculateur ────────────────────────────────────────────────── */}
        <section className={`card p-5 sm:p-6 ${fatal ? "mt-3" : ""}`}>
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
            <Repere terme="Tes marchés">
              {marches.length > 0
                ? marches
                : "Pas encore assez de ventes pour identifier un marché"}
            </Repere>
            <Repere terme="Signal">
              Diffusion de plus de 30 jours, la publicité est rentable
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
