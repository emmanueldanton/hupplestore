import { login } from "./actions";

export const metadata = {
  title: "Connexion · HUPPLE STORE",
};

const messages: Record<string, string> = {
  invalid: "Adresse e-mail ou mot de passe incorrect.",
  config:
    "Le tableau de bord n'est pas configuré : DASHBOARD_EMAIL et DASHBOARD_PASSWORD sont manquants.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = raw ? (messages[raw] ?? messages.invalid) : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1240px] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[430px]">
        {/* Même dégradé que le bandeau du tableau de bord : la page de
            connexion appartient visiblement au même produit. */}
        <div className="hero-gradient rounded-t-[var(--radius-hero)] px-8 pt-8 pb-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-[0.9rem] font-bold text-white">
              H
            </span>
            <span className="text-[0.95rem] font-semibold text-white">
              HUPPLE STORE
            </span>
          </div>
          <h1 className="mt-7 text-[1.75rem] leading-tight font-bold tracking-[-0.03em] text-white">
            Tableau de bord
          </h1>
          <p className="mt-2 text-[0.88rem] text-white/75">
            Rentabilité publicitaire : accès réservé.
          </p>
        </div>

        <div className="card -mt-5 rounded-t-[var(--radius-card)] p-7">
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-negative/25 bg-negative-soft px-4 py-3 text-[0.83rem] leading-relaxed text-[#7a2418]"
            >
              {error}
            </p>
          )}

          <form action={login} className="flex flex-col gap-4">
            <Field label="Adresse e-mail">
              <input
                type="email"
                name="email"
                required
                autoComplete="username"
                autoFocus
                placeholder="emmanuel.danton41@gmail.com"
                className="w-full rounded-xl border border-hairline bg-surface-sunken px-4 py-3 text-[0.9rem] text-ink outline-none placeholder:text-ink-muted/70 focus:border-ink/30 focus:bg-surface"
              />
            </Field>

            <Field label="Mot de passe">
              <input
                type="password"
                name="password"
                required
                // Ces deux attributs sont la raison d'être du formulaire :
                // ils déclenchent la proposition d'enregistrement du
                // gestionnaire de mots de passe du navigateur.
                autoComplete="current-password"
                placeholder="••••••••••"
                className="w-full rounded-xl border border-hairline bg-surface-sunken px-4 py-3 text-[0.9rem] text-ink outline-none placeholder:text-ink-muted/70 focus:border-ink/30 focus:bg-surface"
              />
            </Field>

            <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[0.83rem] text-ink-soft">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="h-4 w-4 accent-[var(--brand-accent)]"
              />
              Rester connecté sur cet appareil
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-ink px-4 py-3.5 text-[0.9rem] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se connecter
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[0.75rem] text-ink-muted">
          Cette page n&apos;est pas indexée et ne crée aucun compte.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.8rem] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
