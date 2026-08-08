import { brandIcon } from "@/lib/brand-icon";

/**
 * Icône référencée par le manifeste. Servie par une route dédiée plutôt que
 * par la convention `icon.tsx`, dont l'URL générée porte un hachage instable
 * qu'on ne peut pas écrire en dur dans le manifeste.
 */
export function GET() {
  return brandIcon(192);
}
