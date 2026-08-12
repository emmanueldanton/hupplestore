import { BrandMark } from "./BrandMark";
import { LogoutButton } from "./LogoutButton";
import { PeriodSelector } from "./PeriodSelector";
import { RefreshButton } from "./RefreshButton";
import type { Period } from "@/lib/period";

/**
 * Bandeau de l'écran de résultat.
 *
 * Il ne porte plus de navigation : la spécification prévoit un écran unique.
 * Les onglets qui existaient couvraient des fonctions explicitement hors
 * périmètre, et leur présence contredisait la promesse du produit, qui répond
 * à une seule question.
 *
 * Il occupe toute la largeur et remonte sous la barre d'état, la couleur allant
 * jusqu'au bord de l'écran. En carte flottante, avec ses marges et ses coins
 * arrondis de tous côtés, il avait l'allure d'une page web posée dans un
 * navigateur.
 *
 * `children` reçoit le résultat lui-même.
 */
export function AppHeader({
  period,
  children,
}: {
  period: Period;
  children?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <BrandMark size={34} />

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <PeriodSelector period={period} basePath="/" />
            </div>
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>

        {/* Sur téléphone, le sélecteur prend sa propre ligne : coincé entre le
            logo et deux boutons, il devenait illisible. */}
        <div className="mt-3 lg:hidden">
          <PeriodSelector period={period} basePath="/" />
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
