/**
 * Explication repliée.
 *
 * Les précautions de lecture comptent : elles disent ce que les chiffres ne
 * prouvent pas. Mais affichées en permanence, elles enterrent les chiffres
 * eux-mêmes. Sur téléphone, l'onglet Tunnel dépassait 5 600 pixels de haut,
 * dont la moitié en prose que l'on ne lit qu'une fois.
 *
 * Elles restent donc accessibles d'un geste, jamais imposées. C'est un
 * élément HTML natif : il fonctionne sans JavaScript, se replie tout seul, et
 * les lecteurs d'écran l'annoncent correctement.
 */
export function Explain({
  title = "Comment lire ces chiffres",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-4 border-t border-hairline pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.75rem] font-medium text-ink-muted transition-colors hover:text-ink-soft">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[15px] w-[15px] shrink-0 transition-transform group-open:rotate-90"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-[0.78rem] leading-relaxed text-ink-muted">
        {children}
      </div>
    </details>
  );
}
