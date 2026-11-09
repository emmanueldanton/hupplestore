"use client";

import { createContext, useContext, useTransition } from "react";

/**
 * État de chargement partagé par toute l'application.
 *
 * Chaque geste qui recharge les chiffres (changer de période, actualiser,
 * l'actualisation automatique) passe par `lancer`. React garde l'écran
 * précédent affiché pendant la transition : sans signal visible, la page
 * semblait figée, voire plantée, pendant les quelques secondes où Chariow
 * renvoie tout l'historique. Ici, tant que la transition court, une barre
 * défile en haut de l'écran et les chiffres se voilent.
 */
interface Chargement {
  enCours: boolean;
  lancer: (geste: () => void | Promise<void>) => void;
}

const Contexte = createContext<Chargement>({ enCours: false, lancer: (geste) => void geste() });

export function ChargementProvider({ children }: { children: React.ReactNode }) {
  const [enCours, demarrer] = useTransition();
  const lancer = (geste: () => void | Promise<void>) => demarrer(async () => { await geste(); });

  return (
    <Contexte.Provider value={{ enCours, lancer }}>
      <BarreChargement visible={enCours} />
      {children}
    </Contexte.Provider>
  );
}

export function useChargement() {
  return useContext(Contexte);
}

/** Barre fine en haut de l'écran, sous la barre d'état du téléphone. */
function BarreChargement({ visible }: { visible: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label="Mise à jour des chiffres"
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 z-50 h-[3px] overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="barre-chargement h-full w-1/3 rounded-full bg-[var(--brand-accent)]" />
    </div>
  );
}

/**
 * Voile posé sur le contenu pendant un rechargement : les anciens chiffres
 * restent lisibles mais passent en retrait, avec un message, pour qu'on ne les
 * prenne pas pour les nouveaux.
 */
export function VoileChargement({
  children,
  message = true,
}: {
  children: React.ReactNode;
  /** false pour le bandeau : un seul message à l'écran suffit. */
  message?: boolean;
}) {
  const { enCours } = useChargement();
  return (
    <div aria-busy={enCours} className="relative">
      <div className={`transition-opacity duration-200 ${enCours ? "opacity-45" : "opacity-100"}`}>
        {children}
      </div>
      {enCours && message && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
          <span className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-[0.78rem] font-semibold text-white shadow-lg">
            <Rouage className="h-3.5 w-3.5" />
            Mise à jour des chiffres…
          </span>
        </div>
      )}
    </div>
  );
}

/** Petit cercle qui tourne, partagé par les boutons. */
export function Rouage({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
