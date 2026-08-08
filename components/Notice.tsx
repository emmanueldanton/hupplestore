/**
 * Bandeau d'information. Sert à dire ce que le tableau de bord ne sait pas :
 * source indisponible, campagne non mappée, montant estimé.
 *
 * Ces messages ne sont pas décoratifs. Un chiffre dont on ignore la fiabilité
 * est plus dangereux qu'une absence de chiffre.
 */
export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "error";
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    info: "border-hairline bg-surface-sunken text-ink-soft",
    warning: "border-alert/30 bg-alert-soft text-[#8a3d10]",
    error: "border-negative/30 bg-negative-soft text-[#7a2418]",
  }[tone];

  const icon = { info: "ℹ", warning: "▲", error: "✕" }[tone];

  return (
    <div className={`rounded-[var(--radius-card)] border p-4 ${styles}`}>
      <div className="flex gap-3">
        <span aria-hidden="true" className="text-[0.8rem] leading-5 opacity-70">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[0.85rem] leading-relaxed font-semibold">{title}</p>
          {children && (
            <div className="mt-1 text-[0.82rem] leading-relaxed opacity-85">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
