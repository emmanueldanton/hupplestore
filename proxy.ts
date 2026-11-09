import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  expectedCredentials,
  safeEqual,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/auth";
import { PERIOD_COOKIE, resolvePeriodFromParams } from "@/lib/period";

const UN_AN = 60 * 60 * 24 * 365;

/**
 * Retient la période quand l'écran est ouvert avec « ?period=… ».
 *
 * Le sélecteur change de période sans recharger la page : c'est ici, et non
 * dans la page en cours de rendu, qu'un cookie peut être écrit. Seule une
 * période valide est retenue, `resolvePeriodFromParams` retombant sur le
 * réglage par défaut si la plage est incohérente.
 */
function retenirPeriode(request: NextRequest, response: NextResponse) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/" || !searchParams.has("period")) return response;
  const periode = resolvePeriodFromParams(Object.fromEntries(searchParams.entries()));
  if (searchParams.get("period") !== periode.key) return response;
  response.cookies.set(PERIOD_COOKIE, periode.query, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UN_AN,
  });
  return response;
}

/**
 * Chemins servis sans authentification. Liste fermée et explicite : un motif
 * générique laisserait passer une future route par inadvertance.
 */
const PUBLIC_ASSETS = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
]);

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

  // Ressources d'installation. Le navigateur récupère le manifeste et les
  // icônes hors session, parfois sans cookies : les rediriger vers la page de
  // connexion ferait silencieusement échouer l'installation de l'application.
  // Aucune ne divulgue de donnée, ce sont des images et un fichier descriptif.
  if (PUBLIC_ASSETS.has(pathname)) return NextResponse.next();

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
    return retenirPeriode(request, NextResponse.next());
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(expected))) {
    return retenirPeriode(request, NextResponse.next());
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/login";
  destination.search = "";
  return NextResponse.redirect(destination);
}

export const config = {
  // Tout sauf les ressources statiques, dont le blocage casserait l'affichage
  // de la page de connexion elle-même.
  // Les icônes générées par convention (`icon`, `apple-icon`) portent une URL
  // à hachage : on les exclut ici, le contrôle fin se faisant plus haut.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\?|apple-icon\\?).*)",
  ],
};
