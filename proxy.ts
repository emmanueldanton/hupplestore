import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protection par mot de passe de l'ensemble du tableau de bord.
 *
 * En Next.js 16, `middleware.ts` a été renommé en `proxy.ts` : ce fichier est
 * l'équivalent de l'ancien middleware.
 *
 * On utilise l'authentification HTTP Basic : aucun écran de connexion à
 * maintenir, aucune session à stocker, et le navigateur retient les
 * identifiants. Suffisant pour un tableau de bord à un seul utilisateur.
 */

/** Comparaison à durée constante, pour ne pas révéler le mot de passe octet par octet. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Accès restreint.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HUPPLE STORE", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    // En local, on laisse passer pour ne pas gêner le développement.
    // En production, on refuse : un tableau de bord financier ouvert au public
    // serait une fuite, et un défaut de configuration ne doit jamais se
    // traduire par un accès libre.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "DASHBOARD_PASSWORD n'est pas défini. Ajoute-le dans les variables d'environnement avant d'exposer ce site.",
        { status: 500 },
      );
    }
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  // Format « utilisateur:mot de passe » — l'utilisateur est ignoré.
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (!safeEqual(password, expected)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Tout sauf les ressources statiques, qui n'ont rien de confidentiel et dont
  // le blocage casserait l'affichage de la page d'erreur elle-même.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
