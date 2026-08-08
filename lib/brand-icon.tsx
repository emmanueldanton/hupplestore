import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "./logo-data";

/**
 * Icône de l'application, construite à partir du logo HUPPLE STORE.
 *
 * Le fichier source porte une large marge blanche, utile en impression mais
 * ruineuse sur un écran d'accueil : à taille réelle, le logo n'occuperait que
 * la moitié de la tuile. On agrandit donc l'image au delà du cadre pour
 * rogner cette marge.
 *
 * `safeRatio` fixe la part de la tuile réellement occupée. Les icônes dites
 * « maskable » en réservent moins : Android rogne l'icône en cercle ou en
 * losange selon le lanceur, et couperait le chariot s'il touchait les bords.
 */
export function brandIcon(size: number, safeRatio = 1.42) {
  const rendered = Math.round(size * safeRatio);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_DATA_URI}
          alt=""
          width={rendered}
          height={rendered}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
