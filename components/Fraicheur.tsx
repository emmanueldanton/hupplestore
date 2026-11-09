"use client";

import { useEffect, useState } from "react";
import { useChargement } from "./Chargement";

/**
 * « À jour il y a 3 min » sous le logo.
 *
 * Sans repère de temps, un chiffre inchangé ne dit pas s'il vient d'être
 * vérifié ou s'il date d'hier soir. `genereA` est l'heure du rendu serveur ;
 * le compteur avance seul, et l'indication passe à « Mise à jour… » pendant
 * un rechargement, automatique ou demandé.
 */
export function Fraicheur({ genereA }: { genereA: string }) {
  const { enCours } = useChargement();
  const [maintenant, setMaintenant] = useState<number | null>(null);

  useEffect(() => {
    const tic = () => setMaintenant(Date.now());
    tic();
    const minuteur = setInterval(tic, 30_000);
    return () => clearInterval(minuteur);
  }, []);

  const heure = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(genereA));

  const minutes = maintenant === null ? 0 : Math.max(0, Math.floor((maintenant - Date.parse(genereA)) / 60_000));
  const ecart = minutes === 0 ? "à l'instant" : minutes < 60 ? `il y a ${minutes} min` : `à ${heure}`;

  return (
    <p
      aria-live="polite"
      title={`Chiffres rendus à ${heure}. Ventes et dépenses sont relues au plus toutes les 15 minutes, et l'écran se recharge seul toutes les 2 minutes.`}
      className="flex items-center gap-1.5 text-[0.7rem] font-medium text-white/60"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${enCours ? "animate-pulse bg-[#ffc21a]" : "bg-[#3ddc97]"}`}
      />
      {enCours ? "Mise à jour…" : `À jour ${ecart}`}
    </p>
  );
}
