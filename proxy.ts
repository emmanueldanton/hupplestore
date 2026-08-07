import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  expectedCredentials,
  safeEqual,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/auth";

/**
 * Garde d'accès du tableau de bord.
 *
 * En Next.js 16, `middleware.ts` a été renommé en `proxy.ts` : ce fichier est
 * l'équivalent de l'ancien middleware.
 *
 * Toute requête sans cookie de session valide est renvoyée vers /login. La
 * vérification se fait ici plutôt que dans la page, pour qu'aucune route
 * ajoutée plus tard ne puisse être oubliée.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La page de connexion et son action doivent rester accessibles, sans quoi
  // la redirection tournerait en boucle.
  if (pathname.startsWith("/login")) return NextResponse.next();

  const expected = expectedCredentials();

  if (!expected) {
    // En production, un défaut de configuration ne doit jamais se traduire par
    // un accès libre à des données financières : on refuse de servir la page.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "DASHBOARD_EMAIL et DASHBOARD_PASSWORD ne sont pas définis. Renseigne-les dans les variables d'environnement avant d'exposer ce site.",
        { status: 500 },
      );
    }
    // En local, on laisse passer pour ne pas gêner le développement.
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(expected))) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/login";
  destination.search = "";
  return NextResponse.redirect(destination);
}

export const config = {
  // Tout sauf les ressources statiques, dont le blocage casserait l'affichage
  // de la page de connexion elle-même.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
