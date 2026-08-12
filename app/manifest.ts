import type { MetadataRoute } from "next";

/**
 * Manifeste d'application installable.
 *
 * `start_url` pointe sur la rentabilité : c'est l'écran qu'on veut voir en
 * ouvrant l'application depuis l'écran d'accueil. Si la session a expiré, le
 * garde d'accès redirige vers la connexion.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rentabilité HUPPLE STORE",
    short_name: "HUPPLE",
    description:
      "Dépenses publicitaires confrontées au net réellement encaissé.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#efeeea",
    theme_color: "#f4562a",
    lang: "fr",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Pas de raccourcis : l'application n'a qu'un écran, un raccourci vers
    // celui-ci ferait doublon avec l'icône elle-même.
  };
}
