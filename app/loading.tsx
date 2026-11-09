import { BrandMark } from "@/components/BrandMark";

/**
 * Écran d'attente du premier chargement.
 *
 * À l'ouverture de l'application, le serveur rapatrie tout l'historique
 * Chariow et les dépenses Meta avant de répondre : plusieurs secondes. Sans cet
 * écran, le téléphone restait blanc et l'application semblait plantée. Il
 * reprend la silhouette de la vraie page, pour que rien ne saute à l'arrivée
 * des chiffres.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="app-header">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <BrandMark size={34} />
              <p className="flex items-center gap-1.5 text-[0.7rem] font-medium text-white/60">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffc21a]" />
                Chargement des chiffres…
              </p>
            </div>
            <div className="flex gap-2">
              <div className="squelette-clair h-9 w-9 rounded-full" />
              <div className="squelette-clair h-9 w-9 rounded-full" />
            </div>
          </div>
          <div className="squelette-clair mt-3 h-9 w-full rounded-full lg:hidden" />
          <div className="mt-6 flex flex-col gap-3">
            <div className="squelette-clair h-3 w-32" />
            <div className="squelette-clair h-10 w-56" />
            <div className="flex gap-6">
              <div className="squelette-clair h-8 w-24" />
              <div className="squelette-clair h-8 w-24" />
              <div className="squelette-clair h-8 w-24" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-8 sm:px-6">
        <p className="mb-3 text-center text-[0.78rem] text-ink-muted">
          Lecture des ventes Chariow et des dépenses Meta, quelques secondes…
        </p>
        <section className="card p-5 sm:p-6">
          <div className="squelette mb-4 h-4 w-28" />
          {[0, 1, 2, 3].map((ligne) => (
            <div key={ligne} className="flex items-center gap-3 border-t border-hairline py-4">
              <div className="flex-1">
                <div className="squelette mb-2 h-2.5 w-24" />
                <div className="squelette h-3.5 w-48 max-w-full" />
              </div>
              <div className="squelette h-5 w-20" />
            </div>
          ))}
        </section>
        <section className="card mt-3 p-5 sm:p-6">
          <div className="squelette h-40 w-full" />
        </section>
      </main>
    </div>
  );
}
