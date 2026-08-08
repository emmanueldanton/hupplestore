import { logout } from "@/app/login/actions";

/**
 * Déconnexion, réduite à son icône.
 *
 * Le libellé « Quitter » occupait une place que la barre d'en-tête n'a pas sur
 * téléphone, à côté du sélecteur de période. L'icône garde son sens sans le
 * texte, à condition de rester explicite pour les lecteurs d'écran : d'où le
 * `aria-label`, qui n'est pas décoratif ici mais porte toute l'information.
 */
export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[19px] w-[19px]"
        >
          <path d="M14.2 5.4H8.5c-1 0-1.8.8-1.8 1.8v9.6c0 1 .8 1.8 1.8 1.8h5.7" />
          <path d="M16.8 8.9L19.9 12l-3.1 3.1" />
          <path d="M19.6 12h-8.4" />
        </svg>
      </button>
    </form>
  );
}
