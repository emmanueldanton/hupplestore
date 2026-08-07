import { Amount } from "./Amount";
import { formatRoas } from "@/lib/money";
import type { ProductPerformance } from "@/lib/types";

/**
 * Répartition par produit : quel guide finance réellement l'activité.
 *
 * La barre de proportion se lit d'un coup d'œil, là où une colonne de
 * pourcentages demanderait un effort de comparaison.
 */
export function ProductTable({ products }: { products: ProductPerformance[] }) {
  if (products.length === 0) {
    return (
      <p className="text-[0.88rem] text-ink-muted">
        Aucune vente sur cette période.
      </p>
    );
  }

  const maxNet = Math.max(...products.map((p) => p.netXof), 1);

  return (
    <ul className="flex flex-col gap-5">
      {products.map((product) => (
        <li key={product.productId}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[0.88rem] font-semibold text-ink">
                {product.productName}
              </p>
              <p className="mt-1 text-[0.72rem] text-ink-muted">
                {product.sales} vente{product.sales > 1 ? "s" : ""}
                {product.spendXof > 0 && (
                  <> · ROAS {formatRoas(product.roas)}</>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Amount xof={product.netXof} size="sm" />
            </div>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${(product.netXof / maxNet) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
