import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PERIOD_COOKIE, resolvePeriodFromParams } from "@/lib/period";

/**
 * Chemins vers lesquels on accepte de rediriger.
 *
 * Liste fermée, et non une redirection libre : sans elle, cette route servirait
 * de tremplin vers n'importe quelle adresse. L'application n'a plus qu'un
 * écran, la liste en porte donc un seul.
 */
const CHEMINS = new Set(["/"]);

const UN_AN = 60 * 60 * 24 * 365;

/**
 * Change la période et la retient.
 *
 * Les liens du sélecteur passent par ici plutôt que d'aller directement à la
 * page : c'est le seul endroit où l'on peut écrire un cookie, une page en
 * cours de rendu n'en ayant pas le droit.
 *
 * Le cookie répond à un défaut précis : une application installée se rouvre
 * sur son `start_url`, donc sur « / » sans paramètre. Le choix de période
 * était perdu à chaque lancement.
 *
 * La redirection conserve les paramètres dans l'URL finale : l'adresse reste
 * lisible et partageable, le cookie n'est qu'une mémoire de repli.
 */
export function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const brut = request.nextUrl.searchParams.get("next") ?? "/";
  const destination = CHEMINS.has(brut) ? brut : "/";

  // resolvePeriodFromParams valide les bornes et retombe sur le préréglage par
  // défaut si la plage est incohérente : on ne mémorise jamais une saisie
  // invalide.
  const periode = resolvePeriodFromParams(params);

  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = periode.query;

  const response = NextResponse.redirect(url);
  response.cookies.set(PERIOD_COOKIE, periode.query, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UN_AN,
  });

  return response;
}
