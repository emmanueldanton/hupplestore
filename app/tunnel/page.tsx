import { LogoutButton } from "@/components/LogoutButton";
import { RefreshButton } from "@/components/RefreshButton";
import { Amount } from "@/components/Amount";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { BrandMark } from "@/components/BrandMark";
import { Notice } from "@/components/Notice";
import { PeriodSelector } from "@/components/PeriodSelector";
import { RecoveryList } from "@/components/RecoveryList";
import { SegmentTable } from "@/components/SegmentTable";
import { FAMILY_ADVICE, FAMILY_LABELS } from "@/lib/funnel";
import { formatPercent, formatXof } from "@/lib/money";
import { DEFAULT_PERIOD, formatRange, isPeriodKey, PERIODS } from "@/lib/period";
import { loadFunnel } from "@/lib/report";

export const metadata = {
  title: "Tunnel de paiement · HUPPLE STORE",
};

export default async function TunnelPage({ searchParams }: PageProps<"/tunnel">) {
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = isPeriodKey(raw) ? raw : DEFAULT_PERIOD;

  const { current, previous, fatal } = await loadFunnel(period);

  const rate = current.successRate;
  const previousRate = previous.successRate;
  const lostShare =
    current.attempts > 0 ? (current.failed + current.abandoned) / current.attempts : 0;

  return (
    <>
    <main className="has-tabbar mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-8">
      <header className="hero-gradient relative overflow-hidden rounded-[var(--radius-hero)] px-6 py-7 sm:px-9 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="hidden lg:block">
              <AppNav active="tunnel" period={period} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector active={period} windowDays={0} basePath="/tunnel" />
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[0.85rem] font-medium text-white/70">
              Tunnel de paiement ·{" "}
              {formatRange({ from: current.from, to: current.to })}
            </p>
            <h1 className="mt-2 text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-[2.6rem]">
              {current.attempts === 0
                ? "Aucune tentative d'achat."
                : `${formatPercent(rate, false)} des achats aboutissent.`}
            </h1>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-white/75">
              {current.attempts === 0
                ? "Rien à analyser sur cette période. Choisis une fenêtre plus large."
                : `Sur ${current.attempts} tentatives, ${current.failed} ont échoué et ${current.abandoned} ont été abandonnées, soit ${formatXof(current.lostGrossXof)} qui n'ont jamais été encaissés.`}
            </p>
          </div>

          <div className="glass w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <span className="text-[0.78rem] font-medium text-white/70">
                Récupérable, échecs techniques
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.7rem] font-bold text-ink">
                {current.recoverable.count} vente
                {current.recoverable.count > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-4">
              <Amount xof={current.recoverable.netXof} size="hero" onDark showEur />
            </div>
            <p className="mt-5 border-t border-white/20 pt-4 text-[0.72rem] leading-relaxed text-white/60">
              Plafond théorique, pas une prévision. Ces clients voulaient payer,
              mais rien ne garantit qu&apos;ils réessaieront.
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

      {/* ── Composition des tentatives ─────────────────────────────────── */}
      <section className="card mt-5 p-6 sm:p-7">
        <div className="mb-5">
          <h2 className="text-[0.95rem] font-semibold text-ink">
            Où passent tes acheteurs
          </h2>
          <p className="mt-1 text-[0.78rem] text-ink-muted">
            {current.attempts} tentative{current.attempts > 1 ? "s" : ""} sur{" "}
            {PERIODS[period].label.toLowerCase()}
            {previousRate !== null && rate !== null && (
              <>
                {" "}
                · taux de réussite {formatPercent(rate, false)} contre{" "}
                {formatPercent(previousRate, false)} la période précédente
              </>
            )}
          </p>
        </div>

        {current.attempts > 0 && (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
              <Segment
                value={current.paid}
                total={current.attempts}
                className="bg-positive"
              />
              <Segment
                value={current.failed}
                total={current.attempts}
                className="bg-negative"
              />
              <Segment
                value={current.abandoned}
                total={current.attempts}
                className="bg-ink/25"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Tally label="Payées" value={current.paid} swatch="bg-positive" />
              <Tally label="Échouées" value={current.failed} swatch="bg-negative" />
              <Tally
                label="Abandonnées"
                value={current.abandoned}
                swatch="bg-ink/25"
              />
              <Tally
                label="Perdu"
                value={null}
                amount={current.lostGrossXof}
                swatch="bg-transparent"
              />
            </div>

            {lostShare > 0.4 && (
              <p className="mt-5 rounded-[var(--radius-card)] border border-negative/25 bg-negative-soft p-4 text-[0.82rem] leading-relaxed text-[#7a2418]">
                <strong>
                  {formatPercent(lostShare, false)} des tentatives n&apos;aboutissent
                  pas.
                </strong>{" "}
                À ce niveau, améliorer le tunnel rapporte davantage que
                n&apos;importe quelle optimisation publicitaire, et coûte moins
                cher.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Motifs d'échec ─────────────────────────────────────────────── */}
      {current.failed > 0 && (
        <section className="card mt-4 p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Pourquoi les paiements échouent
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              Tous les échecs ne se valent pas. Un client sans solde ne se
              relance pas ; un client dont l&apos;opérateur était en panne, si.
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {current.families.map((row) => (
              <li
                key={row.family}
                className="rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[0.88rem] font-semibold text-ink">
                    {FAMILY_LABELS[row.family]}
                  </span>
                  <span className="text-[0.78rem] text-ink-soft">
                    {row.count} échec{row.count > 1 ? "s" : ""} ·{" "}
                    {formatPercent(row.share, false)} ·{" "}
                    {formatXof(row.amountXof)}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full ${
                      row.family === "technique" ? "bg-negative" : "bg-ink/40"
                    }`}
                    style={{ width: `${row.share * 100}%` }}
                  />
                </div>
                <p className="mt-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
                  {FAMILY_ADVICE[row.family]}
                </p>
              </li>
            ))}
          </ul>

          <details className="mt-5">
            <summary className="cursor-pointer text-[0.78rem] font-medium text-ink-soft">
              Voir le détail par code d&apos;erreur
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {current.causes.map((cause) => (
                <li
                  key={cause.code}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-hairline pb-2 text-[0.78rem] last:border-0"
                >
                  <span className="text-ink-soft">{cause.label}</span>
                  <span className="tabular text-ink-muted">
                    {cause.count} · {formatXof(cause.amountXof)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* ── Segments ───────────────────────────────────────────────────── */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Réussite par produit
            </h2>
            <p className="mt-1 text-[0.78rem] text-ink-muted">
              Un produit qui échoue plus que les autres signale un problème de
              prix ou de promesse, pas de paiement.
            </p>
          </div>
          <SegmentTable
            rows={current.byProduct}
            emptyLabel="Aucune tentative sur cette période."
          />
        </div>

        <div className="card p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-[0.95rem] font-semibold text-ink">
              Réussite par devise de paiement
            </h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
              La devise révèle le pays et l&apos;opérateur. Un taux faible ici
              est un problème d&apos;infrastructure, pas de ciblage.
            </p>
          </div>
          <SegmentTable
            rows={current.byCurrency}
            emptyLabel="Aucune tentative sur cette période."
          />
        </div>
      </section>

      {/* ── Relances ───────────────────────────────────────────────────── */}
      <section className="card mt-4 p-6 sm:p-7">
        <div className="mb-5">
          <h2 className="text-[0.95rem] font-semibold text-ink">
            À relancer maintenant
          </h2>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">
            Acheteurs dont le paiement a échoué pour une raison rattrapable, et
            dont on a les coordonnées. Les numéros ouvrent WhatsApp.
          </p>
        </div>
        <RecoveryList contacts={current.contacts} />
      </section>

      <footer className="mt-6 mb-2">
        <Notice tone="info" title="Comment lire ces chiffres">
          <ul className="mt-1 flex list-disc flex-col gap-1.5 pl-4">
            <li>
              Le taux de réussite exclut les ventes à 0 F issues des codes de
              test, qui aboutissent toujours et le gonfleraient.
            </li>
            <li>
              Le montant récupérable ne retient que les échecs{" "}
              <strong>techniques</strong>, valorisés en net. C&apos;est un
              plafond, pas une prévision.
            </li>
            <li>
              Un abandon n&apos;est pas un échec de paiement : le client a quitté
              avant de payer. Le remède est dans la page, pas dans la passerelle.
            </li>
          </ul>
        </Notice>
      </footer>
    </main>

    <BottomNav active="tunnel" period={period} />
    </>
  );
}

function Segment({
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
  amount,
  swatch,
}: {
  label: string;
  value: number | null;
  amount?: number;
  swatch: string;
}) {
  return (
    <div>
      <span className="flex items-center gap-2 text-[0.72rem] font-medium tracking-wide text-ink-muted uppercase">
        {swatch !== "bg-transparent" && (
          <span className={`h-2.5 w-2.5 rounded-sm ${swatch}`} />
        )}
        {label}
      </span>
      <span className="mt-1.5 block">
        {value !== null ? (
          <span className="numeral text-[1.5rem] text-ink">{value}</span>
        ) : (
          <Amount xof={amount ?? 0} size="lg" />
        )}
      </span>
    </div>
  );
}
