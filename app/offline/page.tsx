import { BrandMark } from "@/components/BrandMark";

export const metadata = {
  title: "Hors ligne · HUPPLE STORE",
};

/**
 * Page servie par le service worker quand le réseau manque.
 *
 * Elle n'affiche aucun chiffre, volontairement. Montrer des montants mis en
 * cache sans pouvoir garantir leur fraîcheur reviendrait à laisser décider sur
 * des données périmées.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1240px] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[430px]">
        <div className="hero-gradient rounded-t-[var(--radius-hero)] px-8 pt-8 pb-10">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <span className="text-[0.95rem] font-semibold text-white">
              HUPPLE STORE
            </span>
          </div>
          <h1 className="mt-7 text-[1.75rem] leading-tight font-bold tracking-[-0.03em] text-white">
            Pas de connexion
          </h1>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-white/75">
            Impossible de joindre le serveur.
          </p>
        </div>

        <div className="card -mt-5 rounded-t-[var(--radius-card)] p-7">
          <p className="text-[0.85rem] leading-relaxed text-ink-soft">
            Aucun chiffre n&apos;est affiché ici, et c&apos;est délibéré : des
            montants mis en cache pourraient dater de plusieurs jours sans que
            rien ne le signale. Mieux vaut une page vide qu&apos;une décision
            prise sur des données périmées.
          </p>
          <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-soft">
            Reconnecte-toi au réseau, puis recharge.
          </p>
        </div>
      </div>
    </main>
  );
}
