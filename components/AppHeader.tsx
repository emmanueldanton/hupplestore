import { AppNav } from "./AppNav";
import { BrandMark } from "./BrandMark";
import { LogoutButton } from "./LogoutButton";
import { PeriodSelector } from "./PeriodSelector";
import { RefreshButton } from "./RefreshButton";
import type { Period } from "@/lib/period";

/**
 * Bandeau commun aux quatre écrans.
 *
 * Auparavant recopié dans chaque page, avec les dérives que cela suppose : une
 * page avait perdu son chemin de retour, une autre son bouton d'actualisation.
 * Un seul endroit désormais.
 *
 * Il occupe toute la largeur et remonte sous la barre d'état, la couleur allant
 * jusqu'au bord de l'écran. En carte flottante, avec ses marges et ses coins
 * arrondis de tous côtés, il avait l'allure d'une page web posée dans un
 * navigateur.
 *
 * `children` reçoit les chiffres propres à l'écran : chaque page décide de ce
 * qu'elle met en avant, la structure reste commune.
 */
export function AppHeader({
  active,
  period,
  basePath,
  children,
}: {
  active: "rentabilite" | "tunnel" | "relances" | "veille";
  period: Period;
  basePath: "/" | "/tunnel" | "/relances" | "/veille";
  children?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            {/* Sur téléphone, la navigation vit dans la barre du bas. */}
            <div className="hidden lg:block">
              <AppNav active={active} query={period.query} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <PeriodSelector period={period} basePath={basePath} />
            </div>
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>

        {/* Sur téléphone, le sélecteur prend sa propre ligne : coincé entre le
            logo et deux boutons, il devenait illisible. */}
        <div className="mt-3 lg:hidden">
          <PeriodSelector period={period} basePath={basePath} />
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

/**
 * Chiffre principal d'un écran, avec un indicateur secondaire à droite.
 * Même composition partout, pour que l'œil sache où regarder d'un onglet
 * à l'autre.
 */
export function HeaderStats({
  label,
  value,
  hint,
  asideLabel,
  aside,
  asideBadge,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  asideLabel?: string;
  aside?: React.ReactNode;
  asideBadge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <p className="text-[0.74rem] font-medium tracking-wide text-white/55">
          {label}
        </p>
        <div className="mt-1.5">{value}</div>
        {hint && <div className="mt-2">{hint}</div>}
      </div>

      {aside && (
        <div className="text-right">
          {asideLabel && (
            <p className="text-[0.74rem] font-medium tracking-wide text-white/55">
              {asideLabel}
            </p>
          )}
          <div className="mt-1.5">{aside}</div>
          {asideBadge && <div className="mt-2">{asideBadge}</div>}
        </div>
      )}
    </div>
  );
}
