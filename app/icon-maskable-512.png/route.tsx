import { brandIcon } from "@/lib/brand-icon";

/**
 * Variante « maskable » : Android rogne l'icône selon la forme du lanceur,
 * cercle, carré arrondi ou losange. La marge garantit que le monogramme reste
 * entier quelle que soit la découpe.
 */
export function GET() {
  return brandIcon(512, 56);
}
