"use client";

import { useState } from "react";
import { Amount } from "./Amount";
import { formatPercent, formatRoas, formatXof } from "@/lib/money";
import {
  judgePrice,
  VIABILITY_ADVICE,
  VIABILITY_LABELS,
  type UnitEconomics,
} from "@/lib/threshold";

/**
 * Confronte une idée de produit à l'économie réelle de la boutique.
 *
 * Pensé pour être utilisé pendant la recherche, sur téléphone : on tape le
 * prix envisagé, on obtient immédiatement le verdict. C'est le calcul que la
 * veille ne fait jamais, et son absence a coûté quatre lancements.
 */
const PRESETS = [1900, 2900, 3900, 4999, 6900, 9900];

const styles: Record<string, string> = {
  viable: "border-positive/30 bg-positive-soft",
  limite: "border-alert/30 bg-alert-soft",
  sous_le_plancher: "border-negative/30 bg-negative-soft",
  incalculable: "border-hairline bg-surface-sunken",
};

const textStyles: Record<string, string> = {
  viable: "text-positive",
  limite: "text-alert",
  sous_le_plancher: "text-negative",
  incalculable: "text-ink-muted",
};

export function OpportunityCalculator({
  economics,
}: {
  economics: UnitEconomics;
}) {
  const [price, setPrice] = useState(4999);
  const verdict = judgePrice(price, economics);

  return (
    <div>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8rem] font-medium text-ink-soft">
          Prix de vente envisagé, en francs CFA
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
          className="numeral w-full rounded-xl border border-hairline bg-surface-sunken px-4 py-3 text-[1.3rem] text-ink outline-none focus:border-ink/30 focus:bg-surface"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrice(p)}
            className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ${
              p === price
                ? "bg-ink text-white"
                : "bg-surface-sunken text-ink-soft hover:bg-black/5"
            }`}
          >
            {formatXof(p)}
          </button>
        ))}
      </div>

      <div
        className={`mt-5 rounded-[var(--radius-card)] border p-5 ${styles[verdict.viability]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-[1.05rem] font-bold ${textStyles[verdict.viability]}`}
          >
            {VIABILITY_LABELS[verdict.viability]}
          </span>
          <span className="tabular text-[0.85rem] font-semibold text-ink-soft">
            ROAS attendu {formatRoas(verdict.expectedRoas)}
          </span>
        </div>

        <p className="mt-2.5 text-[0.82rem] leading-relaxed text-ink-soft">
          {VIABILITY_ADVICE[verdict.viability]}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-black/5 pt-4">
          <Ligne label="Net par vente">
            <Amount xof={verdict.netPerSaleXof} size="sm" />
          </Ligne>
          <Ligne label="Conversion requise">
            <span className="tabular text-[0.95rem] font-semibold text-ink">
              {formatPercent(verdict.requiredCvr, false)}
            </span>
          </Ligne>
          <Ligne label="Ta conversion actuelle">
            <span className="tabular text-[0.95rem] font-semibold text-ink">
              {formatPercent(economics.cvr, false)}
            </span>
          </Ligne>
          <Ligne label="Ventes pour 100 000 F de pub">
            <span className="tabular text-[0.95rem] font-semibold text-ink">
              {verdict.netPerSaleXof > 0
                ? Math.ceil(100000 / verdict.netPerSaleXof)
                : "n/d"}
            </span>
          </Ligne>
        </dl>
      </div>
    </div>
  );
}

function Ligne({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[0.68rem] font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
