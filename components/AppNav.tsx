import Link from "next/link";


/**
 * Navigation entre les deux domaines d'analyse.
 *
 * La période suit d'un onglet à l'autre : passer de la rentabilité au tunnel
 * ne doit pas réinitialiser silencieusement la fenêtre d'observation, sous
 * peine de comparer des chiffres qui ne portent pas sur la même durée.
 */
export function AppNav({
  active,
  query,
}: {
  active: "rentabilite" | "tunnel" | "relances" | "veille";
  /** Chaine de requete de la periode courante, recopiee telle quelle. */
  query: string;
}) {
  const tabs = [
    { key: "rentabilite" as const, label: "Rentabilité", href: `/?${query}` },
    { key: "tunnel" as const, label: "Tunnel", href: `/tunnel?${query}` },
    { key: "relances" as const, label: "Relances", href: `/relances?${query}` },
    { key: "veille" as const, label: "Veille", href: `/veille?${query}` },
  ];

  return (
    <nav
      aria-label="Sections"
      className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-white/10 p-1 backdrop-blur-sm"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors sm:px-3.5 ${
              isActive
                ? "bg-white text-ink"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
