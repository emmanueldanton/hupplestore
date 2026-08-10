/**
 * Bandeau d'information.
 *
 * Sert à dire ce que le tableau de bord ne sait pas : source indisponible,
 * campagne non mappée, montant estimé. Ces messages ne sont pas décoratifs :
 * un chiffre dont on ignore la fiabilité est plus dangereux qu'une absence de
 * chiffre.
 *
 * Le fond crème teinté faisait daté, et surtout il criait plus fort que les
 * chiffres qu'il commentait. Le bandeau est désormais une carte neutre comme
 * les autres ; seul un point de couleur et le titre portent la nuance. La
 * couleur signale, elle n'inonde pas.
 */
const tones = {
  info: { dot: "bg-ink-muted", title: "text-ink" },
  warning: { dot: "bg-alert", title: "text-ink" },
  error: { dot: "bg-negative", title: "text-negative" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof tones;
  title: string;
  children?: React.ReactNode;
}) {
  const style = tones[tone];

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${style.dot}`}
        />
        <div className="min-w-0">
          <p className={`text-[0.85rem] leading-snug font-semibold ${style.title}`}>
            {title}
          </p>
          {children && (
            <div className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
