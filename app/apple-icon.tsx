import { brandIcon } from "@/lib/brand-icon";

/**
 * iOS ne lit pas le manifeste pour l'icône d'écran d'accueil : il utilise
 * `apple-touch-icon`, sans arrondir ni masquer. On la rend donc pleine, le
 * système appliquant lui-même son propre arrondi.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandIcon(180);
}
