import { Amount } from "./Amount";
import { FAMILY_LABELS, type RecoveryContact } from "@/lib/funnel";
import { formatDayLabel } from "@/lib/period";

/**
 * Liste nominative des acheteurs à relancer.
 *
 * C'est la seule partie du tableau de bord qui appelle une action immédiate,
 * et la seule qui affiche des données personnelles. Elle est donc limitée aux
 * échecs sur lesquels une relance a un sens, et bornée dans le temps : au delà
 * de quelques semaines, recontacter quelqu'un pour un paiement manqué devient
 * intrusif plutôt qu'utile.
 */
const MAX_AGE_DAYS = 45;
const MAX_SHOWN = 40;

const familyStyles: Record<string, string> = {
  technique: "bg-negative-soft text-negative",
  saisie: "bg-[#fdf6e7] text-[#6b5316]",
  hesitation: "bg-surface-sunken text-ink-soft",
};

export function RecoveryList({ contacts }: { contacts: RecoveryContact[] }) {
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() - MAX_AGE_DAYS);
  const cutoff = limit.toISOString().slice(0, 10);

  const recent = contacts.filter((c) => c.date >= cutoff).slice(0, MAX_SHOWN);

  if (recent.length === 0) {
    return (
      <p className="text-[0.88rem] leading-relaxed text-ink-muted">
        Aucun paiement échoué joignable sur les {MAX_AGE_DAYS} derniers jours.
        C&apos;est une bonne nouvelle : rien à rattraper.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {recent.map((contact) => (
          <li
            key={contact.id}
            className="rounded-[var(--radius-card)] border border-hairline bg-surface-sunken p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <p className="text-[0.88rem] font-semibold text-ink">
                  {contact.name ?? "Client sans nom"}
                </p>
                <p className="mt-0.5 text-[0.72rem] text-ink-muted">
                  {formatDayLabel(contact.date)}
                  {contact.countryName && <> · {contact.countryName}</>}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold whitespace-nowrap ${
                  familyStyles[contact.family] ?? "bg-surface-sunken text-ink-soft"
                }`}
              >
                {FAMILY_LABELS[contact.family]}
              </span>
            </div>

            <p className="mt-2.5 text-[0.78rem] leading-snug text-ink-soft">
              {contact.productName}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Amount xof={contact.amountXof} size="sm" />
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[0.78rem] font-medium text-ink underline decoration-ink-muted underline-offset-2 hover:decoration-ink"
                >
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.78rem] font-medium text-ink underline decoration-ink-muted underline-offset-2 hover:decoration-ink"
                >
                  +{contact.phone}
                </a>
              )}
            </div>

            <p className="mt-2 text-[0.7rem] text-ink-muted">{contact.cause}</p>
          </li>
        ))}
      </ul>

      {contacts.length > recent.length && (
        <p className="mt-4 text-[0.75rem] text-ink-muted">
          {contacts.length - recent.length} autre
          {contacts.length - recent.length > 1 ? "s" : ""} échec
          {contacts.length - recent.length > 1 ? "s" : ""} joignable
          {contacts.length - recent.length > 1 ? "s" : ""} sur la période, mais
          antérieur{contacts.length - recent.length > 1 ? "s" : ""} à{" "}
          {MAX_AGE_DAYS} jours. Relancer aussi tard se retourne généralement
          contre la marque.
        </p>
      )}
    </>
  );
}
