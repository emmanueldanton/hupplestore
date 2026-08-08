import { ImageResponse } from "next/og";

/**
 * Icône de l'application, générée plutôt que stockée.
 *
 * Elle reprend le monogramme et le dégradé du tableau de bord : l'icône sur
 * l'écran d'accueil doit être reconnaissable comme le même produit que la page
 * qu'elle ouvre.
 *
 * `padding` sert aux icônes dites « maskable » : Android peut rogner l'icône
 * en cercle ou en losange selon le lanceur, et découperait le monogramme s'il
 * touchait les bords. La zone sûre correspond à 80 % de la largeur.
 */
export function brandIcon(size: number, padding = 0) {
  const inner = size - padding * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4562a",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: padding > 0 ? inner * 0.22 : 0,
            backgroundImage:
              "linear-gradient(118deg, #ff8a3d 0%, #f4562a 46%, #d93a19 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: inner * 0.58,
              fontWeight: 700,
              color: "white",
              letterSpacing: -inner * 0.03,
            }}
          >
            H
          </div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
