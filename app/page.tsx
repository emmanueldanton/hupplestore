import { Amount } from "@/components/Amount";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CampaignTable } from "@/components/CampaignTable";
import { Explain } from "@/components/Explain";
import { Notice } from "@/components/Notice";
import { ProductTable } from "@/components/ProductTable";
import { ResultHeadline } from "@/components/ResultHeadline";
import { SpendRevenueChart } from "@/components/SpendRevenueChart";
import { formatInt, formatXof } from "@/lib/money";
import { cookies } from "next/headers";
import { PERIOD_COOKIE, resolvePeriodFromParams } from "@/lib/period";
import { loadDashboard, SENSITIVITY_WINDOWS } from "@/lib/report";

export const metadata = {
  title: "Rentabilité · HUPPLE STORE",
};

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const memoire = (await cookies()).get(PERIOD_COOKIE)?.value;
  const period = resolvePeriodFromParams(params, memoire);

  const rawWindow = Array.isArray(params.window) ? params.window[0] : params.window;
  const parsedWindow = Number(rawWindow);
  const windowDays = SENSITIVITY_WINDOWS.includes(
    parsedWindow as (typeof SENSITIVITY_WINDOWS)[number],
  )
    ? parsedWindow
    : 0;

  const { current, sensitivity, warnings, fatal } = await loadDashboard(
    period,
    windowDays,
  );

  // Seules les campagnes qui tournent. Si Meta n'a pas su dire lesquelles, on
  // montre tout : mieux vaut une liste trop longue qu'un écran vide laissant
  // croire qu'aucune campagne ne tourne.
  const actives = current.activeCampaignsKnown
    ? current.campaigns.filter((c) => c.isActive)
    : current.campaigns;

  // Les campagnes arrêtées ont tout de même consommé du budget. Le masquer
  // creuserait un écart inexpliqué avec la dépense totale.
  const depenseEnPause = current.campaigns
    .filter((c) => !c.isActive && c.spendXof > 0)
    .reduce((total, c) => total + c.spendXof, 0);

  const fragiles = new Set(
    sensitivity.filter((row) => !row.stable).map((row) => row.campaignId),
  );

  const deficitaires = actives.filter((c) => c.marginXof < 0).length;

  return (
    <>
      <AppHeader active="rentabilite" period={period} basePath="/">
        <ResultHeadline report={current} />
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

        {/* ── Campagnes ──────────────────────────────────────────────────── */}
        <section
          className={`card p-5 sm:p-6 ${fatal || warnings.length > 0 ? "mt-3" : ""}`}
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.9rem] font-semibold text-ink">Campagnes</h2>
            <span className="text-[0.74rem] text-ink-muted">
              {deficitaires > 0
                ? `${deficitaires} en perte sur ${actives.length}`
                : `${actives.length} en cours`}
            </span>
          </div>

          <CampaignTable campaigns={actives} unstable={fragiles} />

          {depenseEnPause > 0 && (
            <p className="mt-4 text-[0.72rem] text-ink-muted">
              Les campagnes arrêtées ne sont pas listées, mais elles ont consommé{" "}
              {formatXof(depenseEnPause)} sur la période, compris dans la dépense
              totale.
            </p>
          )}

          <Explain title="Comment lire une ligne">
            <p>
              <strong className="text-ink-soft">L&apos;ordre.</strong> La plus
              déficitaire en premier. C&apos;est ce qui appelle une décision,
              donc ce qui doit se voir sans faire défiler.
            </p>
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
              verdict change d&apos;une hypothèse à l&apos;autre, le chiffre
              reflète l&apos;hypothèse autant que la réalité.
            </p>
          </Explain>
        </section>

        {/* ── Évolution ──────────────────────────────────────────────────── */}
        <section className="card mt-3 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[0.9rem] font-semibold text-ink">Évolution</h2>
            <span className="text-[0.74rem] text-ink-muted">
              {formatInt(current.kpis.sales)} ventes ·{" "}
              {formatInt(current.kpis.clicks)} clics
            </span>
          </div>
          <SpendRevenueChart daily={current.daily} />
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
              <p className="mt-1.5 text-[0.74rem] text-ink-muted">
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

      <BottomNav active="rentabilite" query={period.query} />
    </>
  );
}
