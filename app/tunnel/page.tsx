import { Amount } from "@/components/Amount";
import { AppHeader, HeaderStats } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Explain } from "@/components/Explain";
import { Notice } from "@/components/Notice";
import { SegmentTable } from "@/components/SegmentTable";
import { FAMILY_ADVICE, FAMILY_LABELS } from "@/lib/funnel";
import { formatPercent, formatXof } from "@/lib/money";
import { cookies } from "next/headers";
import { PERIOD_COOKIE, resolvePeriodFromParams } from "@/lib/period";
import { loadFunnel } from "@/lib/report";

export const metadata = {
  title: "Tunnel · HUPPLE STORE",
};

export default async function TunnelPage({ searchParams }: PageProps<"/tunnel">) {
  const params = await searchParams;
  const memoire = (await cookies()).get(PERIOD_COOKIE)?.value;
  const period = resolvePeriodFromParams(params, memoire);

  const { current, fatal } = await loadFunnel(period);

  const rate = current.successRate;
  const perdu = current.failed + current.abandoned;

  return (
    <>
      <AppHeader active="tunnel" period={period} basePath="/tunnel">
        <HeaderStats
          label="Taux de réussite des achats"
          value={
            <span className="numeral text-[2.5rem] leading-none text-white">
              {current.attempts === 0 ? "n/d" : formatPercent(rate, false)}
            </span>
          }
          hint={
            <span className="text-[0.78rem] text-white/55">
              {current.attempts} tentatives · {perdu} sans suite
            </span>
          }
          asideLabel="Jamais encaissé"
          aside={<Amount xof={current.lostGrossXof} size="xl" onDark />}
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

        {/* ── Composition ────────────────────────────────────────────────── */}
        <section className={`card p-5 sm:p-6 ${fatal ? "mt-3" : ""}`}>
          <h2 className="text-[0.9rem] font-semibold text-ink">
            Où passent tes acheteurs
          </h2>

          {current.attempts > 0 && (
            <>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <Part value={current.paid} total={current.attempts} className="bg-positive" />
                <Part value={current.failed} total={current.attempts} className="bg-negative" />
                <Part value={current.abandoned} total={current.attempts} className="bg-ink/25" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Tally label="Payées" value={current.paid} swatch="bg-positive" />
                <Tally label="Échouées" value={current.failed} swatch="bg-negative" />
                <Tally label="Abandons" value={current.abandoned} swatch="bg-ink/25" />
              </div>
            </>
          )}
        </section>

        {/* ── Motifs d'échec ─────────────────────────────────────────────── */}
        {current.failed > 0 && (
          <section className="card mt-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[0.9rem] font-semibold text-ink">
                Motifs d&apos;échec
              </h2>
              <span className="text-[0.75rem] font-semibold text-positive">
                {formatXof(current.recoverable.netXof)} récupérables
              </span>
            </div>

            <ul className="mt-4 flex flex-col gap-3.5">
              {current.families.map((row) => (
                <li key={row.family}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.85rem] font-medium text-ink">
                      {FAMILY_LABELS[row.family]}
                    </span>
                    <span className="tabular shrink-0 text-[0.78rem] text-ink-muted">
                      {row.count} · {formatXof(row.amountXof)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={`h-full rounded-full ${
                        row.family === "technique" ? "bg-negative" : "bg-ink/30"
                      }`}
                      style={{ width: `${row.share * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <Explain title="Que faire de chaque motif">
              {current.families.map((row) => (
                <p key={row.family}>
                  <strong className="text-ink-soft">
                    {FAMILY_LABELS[row.family]}.
                  </strong>{" "}
                  {FAMILY_ADVICE[row.family]}
                </p>
              ))}
              <p>
                Le montant récupérable ne retient que les échecs techniques,
                valorisés en net. C&apos;est un plafond, pas une prévision.
              </p>
            </Explain>
          </section>
        )}

        {/* ── Segments ───────────────────────────────────────────────────── */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <h2 className="text-[0.9rem] font-semibold text-ink">Par produit</h2>
            <div className="mt-4">
              <SegmentTable rows={current.byProduct} emptyLabel="Aucune tentative." />
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-[0.9rem] font-semibold text-ink">Par devise</h2>
            <div className="mt-4">
              <SegmentTable rows={current.byCurrency} emptyLabel="Aucune tentative." />
            </div>
            <Explain title="Pourquoi la devise compte">
              <p>
                Elle révèle le pays et l&apos;opérateur de paiement. Un taux
                faible ici signale un problème d&apos;infrastructure, pas de
                ciblage : la campagne n&apos;y est pour rien.
              </p>
            </Explain>
          </div>
        </section>

        <div className="mt-3">
          <Explain>
            <p>
              Le taux de réussite exclut les ventes à 0 F issues des codes de
              test, qui aboutissent toujours et le gonfleraient.
            </p>
            <p>
              Un abandon n&apos;est pas un échec de paiement : le client a quitté
              avant de payer. Le remède est dans la page, pas dans la passerelle.
            </p>
          </Explain>
        </div>
      </main>

      <BottomNav active="tunnel" query={period.query} />
    </>
  );
}

function Part({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className: string;
}) {
  if (value <= 0) return null;
  return <div className={className} style={{ width: `${(value / total) * 100}%` }} />;
}

function Tally({
  label,
  value,
  swatch,
}: {
  label: string;
  value: number;
  swatch: string;
}) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[0.68rem] font-medium text-ink-muted">
        <span className={`h-2 w-2 shrink-0 rounded-sm ${swatch}`} />
        {label}
      </span>
      <span className="numeral mt-1 block text-[1.35rem] text-ink">{value}</span>
    </div>
  );
}
