import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Sans cette borne, Turbopack remonte jusqu'à C:\Users\MANO en cherchant un
    // lockfile et prend le dossier utilisateur pour la racine du projet.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
