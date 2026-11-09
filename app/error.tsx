"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * Écran affiché si le rendu de la page échoue.
 *
 * Les erreurs attendues (clé absente, Meta ou Chariow injoignable) sont déjà
 * gérées dans la page sous forme d'avertissements. Celui-ci couvre l'imprévu :
 * plutôt qu'une page blanche ou un message technique, il dit ce qui s'est
 * passé et propose de réessayer sans recharger toute l'application.
 */
export default function Erreur({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [nouvelEssai, setNouvelEssai] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <header className="app-header">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <BrandMark size={34} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-4 pt-6 pb-8">
        <section className="card p-6 text-center" role="alert">
          <h1 className="text-[1.05rem] font-semibold text-ink">Les chiffres n&apos;ont pas pu se charger</h1>
          <p className="mt-2 text-[0.84rem] leading-relaxed text-ink-soft">
            Chariow ou Meta n&apos;a pas répondu à temps, ou la connexion a coupé. Tes données ne sont pas
            perdues : réessaie dans un instant.
          </p>
          <button
            type="button"
            onClick={() => {
              setNouvelEssai(true);
              retry();
            }}
            disabled={nouvelEssai}
            className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-5 py-2.5 text-[0.84rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {nouvelEssai ? "Nouvel essai…" : "Réessayer"}
          </button>
          {error.digest && (
            <p className="mt-4 text-[0.68rem] text-ink-muted">Référence de l&apos;erreur : {error.digest}</p>
          )}
        </section>
      </main>
    </div>
  );
}
