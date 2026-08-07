/**
 * Authentification du tableau de bord.
 *
 * Un seul utilisateur, un seul mot de passe : inutile de sortir une base
 * d'utilisateurs ou une bibliothèque de sessions. Le jeton de session est
 * dérivé des identifiants eux-mêmes, ce qui donne une propriété utile —
 * changer le mot de passe invalide immédiatement toutes les sessions ouvertes,
 * sans rien à purger.
 */

export const SESSION_COOKIE = "hupple_session";

/** 30 jours : la case « rester connecté ». */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export interface Credentials {
  email: string;
  password: string;
}

/** Identifiants attendus, ou null si le tableau de bord n'est pas configuré. */
export function expectedCredentials(): Credentials | null {
  const email = process.env.DASHBOARD_EMAIL;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Jeton opaque déposé dans le cookie.
 *
 * Le mot de passe lui-même ne quitte jamais le serveur : le cookie ne contient
 * que son empreinte SHA-256, salée par un préfixe fixe. Web Crypto est utilisé
 * plutôt que le module `node:crypto` car ce code doit aussi tourner dans le
 * proxy, qui s'exécute sur un runtime allégé.
 */
export async function sessionToken({
  email,
  password,
}: Credentials): Promise<string> {
  const payload = new TextEncoder().encode(
    `hupple-store-dashboard:${email.toLowerCase()}:${password}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparaison à durée constante, pour ne rien révéler par le temps de réponse. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Vérifie un couple saisi dans le formulaire contre les identifiants attendus. */
export function matches(submitted: Credentials, expected: Credentials): boolean {
  // L'adresse est insensible à la casse, le mot de passe ne l'est pas.
  const emailOk = safeEqual(
    submitted.email.trim().toLowerCase(),
    expected.email.trim().toLowerCase(),
  );
  const passwordOk = safeEqual(submitted.password, expected.password);
  // Les deux comparaisons sont évaluées quoi qu'il arrive : un court-circuit
  // révélerait, par le temps de réponse, laquelle des deux a échoué.
  return emailOk && passwordOk;
}
