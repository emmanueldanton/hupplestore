import { Amount } from "@/components/Amount";
import { AppHeader, HeaderStats } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CampaignTable } from "@/components/CampaignTable";
import { Explain } from "@/components/Explain";
import { KpiCard } from "@/components/KpiCard";
import { Notice } from "@/components/Notice";
import { ProductTable } from "@/components/ProductTable";
import { SpendRevenueChart } from "@/components/SpendRevenueChart";
import { TrendBadge } from "@/components/TrendBadge";
import { computeDelta, formatInt, formatRoas, formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, isPeriodKey } from "@/lib/period";
import { loadDashboard, SENSITIVITY_WINDOWS } from "@/lib/report";

export const metadata = {
  title: "Rentabilité · HUPPLE STORE",
};

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const rawWindow = Array.isArray(params.window) ? params.window[0] : params.window;
  const parsedWindow = Number(rawWindow);
  const windowDays = SENSITIVITY_WINDOWS.includes(
    parsedWindow as (typeof SENSITIVITY_WINDOWS)[number],
  )
    ? parsedWindow
    : 0;

  const { current, previous, sensitivity, warnings, fatal } = await loadDashboard(
    period,
    windowDays,
  );

  const marginDelta = computeDelta(
    current.kpis.marginXof,
    previous.kpis.marginXof,
  );
  const roas = current.kpis.roas;

  // Sans aucune vente ni dépense, il n'y a pas de verdict à rendre. Annoncer
  // « tu gagnes de l'argent » sur une marge de 0 F serait un mensonge poli.
  const hasData = current.kpis.sales > 0 || current.kpis.spendXof > 0;
  const isProfitable = hasData && current.kpis.marginXof >= 0;

  // Seules les campagnes qui tournent. Si Meta n'a pas su dire lesquelles, on
  // montre tout : mieux vaut une liste trop longue qu'un écran vide qui
  // laisserait croire qu'aucune campagne ne tourne.
  const actives = current.activeCampaignsKnown
    ? current.campaigns.filter((c) => c.isActive)
    : current.campaigns;

  // Les campagnes arrêtées ont tout de même consommé du budget sur la période.
  // Le masquer creuserait un écart inexpliqué avec la dépense totale affichée
  // plus haut.
  const depenseEnPause = current.campaigns
    .filter((c) => !c.isActive && c.spendXof > 0)
    .reduce((total, c) => total + c.spendXof, 0);

  const fragiles = new Set(
    sensitivity.filter((row) => !row.stable).map((row) => row.campaignId),
  );

  return (
    <>
      <AppHeader
        active="rentabilite"
        period={period}
        basePath="/"
        windowDays={windowDays}
      >
        <HeaderStats
          label={
            !hasData
              ? "Rien à analyser"
              : isProfitable
                ? "Tu gagnes de l'argent"
                : "Tu perds de l'argent"
          }
          value={
            <Amount xof={current.kpis.marginXof} size="hero" onDark signed />
          }
          hint={
            <TrendBadge
              ratio={marginDelta.ratio}
              direction={marginDelta.direction}
              onDark
            />
          }
          asideLabel="ROAS"
          aside={
            <span className="numeral text-[1.9rem] leading-none text-white">
              {formatRoas(roas)}
            </span>
          }
          asideBadge={
            hasData && !isProfitable && roas !== null ? (
              <span className="inline-block rounded-full bg-alert px-2 py-0.5 text-[0.66rem] font-bold text-white">
                sous l&apos;équilibre
              </span>
            ) : null
          }
        />
      </AppHeader>

      <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        {(fatal || warnings.length > 0) && (
          <div className="flex flex-col gap-3">
            {fatal && (
              <Notice tone="error" title="Impossible de charger les données">
                {fatal}
              </Notice>
            )}
            {warnings.length > 0 && (
              <Notice
                tone="warning"
                title={
                  warnings.length === 1
                    ? "1 point à savoir"
                    : `${warnings.length} points à savoir`
                }
              >
                <details>
                  <summary className="cursor-pointer list-none text-[0.78rem] font-medium underline decoration-dotted underline-offset-2">
                    Voir le détail
                  </summary>
                  <ul className="mt-2 flex list-disc flex-col gap-2 pl-4">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </details>
              </Notice>
            )}
          </div>
        )}

        {/* ── Indicateurs ────────────────────────────────────────────────── */}
        <section
          aria-label="Indicateurs clés"
          className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${
            fatal || warnings.length > 0 ? "mt-3" : ""
          }`}
        >
          <KpiCard
            label="Dépense pub"
            value={current.kpis.spendXof}
            previous={previous.kpis.spendXof}
            // Dépenser plus n'est pas une bonne nouvelle en soi : la couleur
            // suit le sens économique, pas la direction de la flèche.
            higherIsBetter={false}
          />
          <KpiCard
            label="CA brut"
            value={current.kpis.grossXof}
            previous={previous.kpis.grossXof}
          />
          <KpiCard
            label="Net encaissé"
            value={current.kpis.netXof}
            previous={previous.kpis.netXof}
          />
          <KpiCard
            label="Marge"
            value={current.kpis.marginXof}
            previous={previous.kpis.marginXof}
            signed
            accent
          />
        </section>

        {/* ── Évolution ──────────────────────────────────────────────────── */}
        <section className="card mt-3 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[0.9rem] font-semibold text-ink">Évolution</h2>
            <span className="text-[0.75rem] text-ink-muted">
              {formatInt(current.kpis.sales)} ventes ·{" "}
              {formatInt(current.kpis.clicks)} clics
            </span>
          </div>
          <SpendRevenueChart daily={current.daily} />
        </section>

        {/* ── Campagnes ──────────────────────────────────────────────────── */}
        <section className="card mt-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.9rem] font-semibold text-ink">
              Campagnes actives
            </h2>
            <span className="text-[0.75rem] text-ink-muted">
              {actives.length} en cours
            </span>
          </div>

          <div className="mt-4">
            <CampaignTable campaigns={actives} unstable={fragiles} />
          </div>

          {depenseEnPause > 0 && (
            <p className="mt-4 text-[0.75rem] text-ink-muted">
              Les campagnes arrêtées ne sont pas listées, mais elles ont
              consommé {formatXof(depenseEnPause)} sur la période, compris dans
              la dépense totale.
            </p>
          )}

          <Explain title="Comment lire une ligne">
            <p>
              <strong className="text-ink-soft">La fourchette de ROAS.</strong>{" "}
              Sur de faibles volumes, un chiffre unique donnerait une fausse
              impression de certitude. Le verdict n&apos;est rendu qu&apos;au
              delà de 95 % de probabilité, dans un sens comme dans l&apos;autre.
            </p>
            <p>
              <strong className="text-ink-soft">Résultat fragile.</strong> Rien
              ne garantit qu&apos;un achat suive son clic le jour même. Le calcul
              est rejoué en supposant 1, 3 puis 7 jours de délai. Quand le
              verdict change d&apos;une hypothèse à l&apos;autre, la campagne
              porte cette mention : son chiffre reflète alors l&apos;hypothèse
              autant que la réalité, et ne doit pas fonder une décision de
              budget.
            </p>
            <p>
              <strong className="text-ink-soft">Le tri.</strong> Par marge, et
              non par ROAS : un ROAS de 5× sur 2 000 F pèse moins qu&apos;un
              1,4× sur 200 000 F.
            </p>
          </Explain>
        </section>

        {/* ── Produits et non attribué ───────────────────────────────────── */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="card p-5 sm:p-6">
            <h2 className="text-[0.9rem] font-semibold text-ink">
              Ce qui rapporte
            </h2>
            <div className="mt-4">
              <ProductTable products={current.products} />
            </div>
          </div>

          <div className="card flex flex-col justify-between gap-4 p-5 sm:p-6">
            <h2 className="text-[0.9rem] font-semibold text-ink">Non attribué</h2>
            <div>
              <Amount xof={current.unattributed.netXof} size="xl" showEur />
              <p className="mt-1.5 text-[0.75rem] text-ink-muted">
                {current.unattributed.sales} ventes sur {current.kpis.sales}
                {current.kpis.netXof > 0 && (
                  <>
                    {" · "}
                    {Math.round(
                      (current.unattributed.netXof / current.kpis.netXof) * 100,
                    )}
                    {" %"} du net
                  </>
                )}
              </p>
            </div>
            <Explain title="D'où vient ce revenu">
              <p>
                De ventes survenues alors qu&apos;aucune campagne ne poussait ce
                produit ce jour-là : organique, réseaux, bouche-à-oreille.
              </p>
            </Explain>
          </div>
        </section>

        <div className="mt-3">
          <Explain>
            <p>
              Le revenu est le montant <strong>réellement reversé</strong>, après
              frais de paiement et de service. Les ventes à 0 F issues des codes
              de test sont exclues.
            </p>
            <p>
              L&apos;attribution répartit le revenu au prorata de la dépense sur
              le couple (jour, produit). Ce n&apos;est pas un suivi individuel
              des acheteurs : juste en moyenne, grossier au jour le jour.
            </p>
            <p>
              Meta agrège selon le fuseau du compte publicitaire, Chariow en UTC.
              <strong> Ne juge jamais une campagne sur moins de 7 jours.</strong>
            </p>
          </Explain>
        </div>
      </main>

      <BottomNav active="rentabilite" period={period} />
    </>
  );
}
