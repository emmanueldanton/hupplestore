"use client";

import { useMemo, useState } from "react";
import type { DailyPoint } from "@/lib/types";
import { formatRoas, formatXof } from "@/lib/money";
import { formatDayLabel } from "@/lib/period";

interface Slot {
  label: string;
  fullLabel: string;
  spendXof: number;
  netXof: number;
  sales: number;
}

/**
 * Regroupe les jours par semaine au-delà d'un trimestre : au-delà d'environ
 * 90 barres, chacune devient trop fine pour être lue ou survolée.
 */
function toSlots(daily: DailyPoint[]): Slot[] {
  const groupSize = daily.length > 92 ? 7 : 1;

  if (groupSize === 1) {
    return daily.map((point) => ({
      label: formatDayLabel(point.date),
      fullLabel: formatDayLabel(point.date),
      spendXof: point.spendXof,
      netXof: point.netXof,
      sales: point.sales,
    }));
  }

  const slots: Slot[] = [];
  for (let i = 0; i < daily.length; i += groupSize) {
    const chunk = daily.slice(i, i + groupSize);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    slots.push({
      label: formatDayLabel(first.date),
      fullLabel: `${formatDayLabel(first.date)} au ${formatDayLabel(last.date)}`,
      spendXof: chunk.reduce((sum, p) => sum + p.spendXof, 0),
      netXof: chunk.reduce((sum, p) => sum + p.netXof, 0),
      sales: chunk.reduce((sum, p) => sum + p.sales, 0),
    });
  }
  return slots;
}

export function SpendRevenueChart({ daily }: { daily: DailyPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const slots = useMemo(() => toSlots(daily), [daily]);

  const max = Math.max(...slots.map((s) => Math.max(s.spendXof, s.netXof)), 1);

  // Étiquettes d'axe espacées : au plus six, sinon elles se chevauchent.
  const labelEvery = Math.max(1, Math.ceil(slots.length / 6));
  const active = hovered === null ? null : slots[hovered];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Legend swatch="bg-ink" label="Net encaissé" />
        <Legend swatch="bg-ink/15" label="Dépense publicitaire" />
      </div>

      <div className="relative">
        {/* Lignes de repère, très discrètes : elles guident sans concurrencer. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[220px]">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 border-t border-hairline"
              style={{ top: `${fraction * 100}%` }}
            />
          ))}
        </div>

        {/* Infobulle sombre arrondie, ancrée au-dessus de la colonne survolée. */}
        {active && hovered !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-white shadow-lg"
            style={{
              left: `${((hovered + 0.5) / slots.length) * 100}%`,
              bottom: "40%",
            }}
          >
            <div className="numeral text-[1.05rem] whitespace-nowrap">
              {formatXof(active.netXof)}
            </div>
            <div className="mt-1 text-[0.7rem] whitespace-nowrap text-white/60">
              {active.fullLabel} · {active.sales} vente
              {active.sales > 1 ? "s" : ""}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] whitespace-nowrap">
              <span className="text-white/60">
                Dépense {formatXof(active.spendXof)}
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold">
                {formatRoas(
                  active.spendXof > 0 ? active.netXof / active.spendXof : null,
                )}
              </span>
            </div>
          </div>
        )}

        <div
          className="flex h-[220px] items-end gap-px"
          role="img"
          aria-label={`Évolution du net encaissé et de la dépense publicitaire sur ${slots.length} périodes. Le détail chiffré figure dans les tableaux ci-dessous.`}
          onMouseLeave={() => setHovered(null)}
        >
          {slots.map((slot, index) => {
            const isActive = hovered === index;
            return (
              <div
                key={`${slot.fullLabel}-${index}`}
                className="flex h-full flex-1 items-end justify-center gap-[2px]"
                onMouseEnter={() => setHovered(index)}
              >
                <Bar
                  heightPct={(slot.spendXof / max) * 100}
                  className={isActive ? "bg-ink/45" : "bg-ink/12"}
                />
                <Bar
                  heightPct={(slot.netXof / max) * 100}
                  className={isActive ? "bg-ink" : "bg-ink/70"}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-px">
        {slots.map((slot, index) => (
          <div
            key={`label-${index}`}
            className="flex-1 text-center text-[0.68rem] text-ink-muted"
          >
            {index % labelEvery === 0 ? slot.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({
  heightPct,
  className,
}: {
  heightPct: number;
  className: string;
}) {
  return (
    <div
      className={`w-full max-w-[9px] rounded-t-[3px] transition-colors ${className}`}
      // Un minimum visible garde lisible une valeur faible mais non nulle :
      // « presque rien » et « rien » ne doivent pas se ressembler.
      style={{ height: `${heightPct > 0 ? Math.max(heightPct, 1.2) : 0}%` }}
    />
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.78rem] text-ink-soft">
      <span className={`h-2.5 w-2.5 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
