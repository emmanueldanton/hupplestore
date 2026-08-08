import { brandIcon } from "@/lib/brand-icon";

/**
 * Variante « maskable » : Android rogne l'icône selon la forme du lanceur,
 * cercle, carré arrondi ou losange. La marge garantit que le monogramme reste
 * entier quelle que soit la découpe.
 */
export function GET() {
  // Le logo occupe une part réduite de la tuile, pour survivre au rognage.
  return brandIcon(512, 1.05);
}
