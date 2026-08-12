import { Amount } from "./Amount";
import { formatRate } from "@/lib/rates";
import { formatDayLabel } from "@/lib/period";
import type { ProfitabilityReport } from "@/lib/types";

/**
 * Le résultat net, et rien d'autre au-dessus de lui.
 *
 * EF-13 à EF-15 : un chiffre unique, coloré selon son signe, avec la dépense
 * et l'encaissé en dessous. La cible est qu'on sache en moins de dix secondes
 * si l'on gagne ou si l'on perd, et de combien.
 *
 * EF-19 : sans aucune ligne de revenu, le résultat n'est pas affiché. La marge
 * vaudrait alors l'opposé de la dépense, ce qui est exact et pourtant trompeur :
 * cela annonce une perte là où l'on ignore simplement les recettes.
 */
export function ResultHeadline({ report }: { report: ProfitabilityReport }) {
  const { spendXof, netXof, marginXof } = report.kpis;
  const positif = marginXof >= 0;

  if (!report.hasRevenue) {
    return (
      <div>
        <p className="text-[0.74rem] font-medium tracking-wide text-white/55">
          Résultat non calculable
        </p>
        <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-white/85">
          Aucune vente enregistrée sur cette période. Seule la dépense est
          connue.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Secondaire label="Dépense publicitaire" value={spendXof} />
        </div>
        <TauxApplique report={report} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-[0.74rem] font-medium tracking-wide text-white/55">
        {positif ? "Tu gagnes de l'argent" : "Tu perds de l'argent"}
      </p>

      {/*
       * Le vert et le rouge portent ici le sens, et non un simple accent : ce
       * sont les seules couleurs vives du bandeau. Le signe reste affiché pour
       * qui distingue mal les deux teintes.
       */}
      <div className="mt-1.5">
        <Amount
          xof={marginXof}
          size="hero"
          onDark
          signed
          tone={positif ? "text-[#5ce09a]" : "text-[#ff8a7a]"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <Secondaire label="Dépense publicitaire" value={spendXof} />
        <Secondaire label="Encaissé net" value={netXof} />
      </div>

      <TauxApplique report={report} />
    </div>
  );
}

function Secondaire({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[0.7rem] font-medium text-white/45">{label}</p>
      <div className="mt-0.5">
        <Amount xof={value} size="md" onDark />
      </div>
    </div>
  );
}

/**
 * EF-18 : le taux de conversion et sa date, quand la dépense est libellée dans
 * une autre devise que le revenu. Un taux sans date dérive silencieusement.
 */
function TauxApplique({ report }: { report: ProfitabilityReport }) {
  const taux = report.appliedRate;
  if (!taux || taux.rate === 1) return null;

  return (
    <p className="mt-4 text-[0.7rem] text-white/45">
      Dépense convertie : {formatRate(taux)}
      {taux.asOf ? (
        <>
          {" "}
          au {formatDayLabel(taux.asOf)}
          {taux.stale && (
            <span className="ml-1.5 rounded-full bg-alert px-1.5 py-0.5 text-[0.62rem] font-bold text-white">
              à revoir
            </span>
          )}
        </>
      ) : (
        <span className="ml-1.5 rounded-full bg-alert px-1.5 py-0.5 text-[0.62rem] font-bold text-white">
          sans date
        </span>
      )}
    </p>
  );
}
