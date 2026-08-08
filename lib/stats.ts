/**
 * Outils statistiques pour qualifier l'incertitude des performances.
 *
 * Le problème : une campagne à 41 clics et zéro vente affiche un ROAS de 0, ce
 * qui ressemble à un verdict. Ce n'en est pas un. Si le taux de conversion réel
 * est de 1 %, la probabilité d'observer zéro vente sur 41 clics vaut encore
 * 66 %. Présenter ce 0 comme un fait invite à couper une campagne dont on ne
 * sait rien.
 *
 * On traite donc les conversions comme un tirage binomial et on raisonne sur la
 * loi a posteriori du taux de conversion, avec un a priori de Jeffreys
 * Beta(0,5 ; 0,5), non informatif et adapté aux petits effectifs et aux
 * comptages nuls.
 */

/** Logarithme de la fonction gamma, approximation de Lanczos. */
export function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let series = 1.000000000190015;
  for (const c of coefficients) {
    y += 1;
    series += c / y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

/** Fraction continue de Lentz, utilisée par la bêta incomplète. */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const tiny = 1e-30;
  const epsilon = 3e-12;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;

    let numerator = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    result *= d * c;

    numerator = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

/**
 * Fonction de répartition de la loi Beta(a, b) évaluée en x.
 * Autrement dit : probabilité que le taux de conversion soit inférieur à x.
 */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front =
    Math.exp(
      logGamma(a + b) -
        logGamma(a) -
        logGamma(b) +
        a * Math.log(x) +
        b * Math.log(1 - x),
    );

  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Quantile de la loi Beta(a, b), obtenu par dichotomie sur la répartition. */
export function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  let low = 0;
  let high = 1;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (betaCdf(mid, a, b) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Paramètres de la loi a posteriori du taux de conversion. */
function posterior(conversions: number, trials: number) {
  // A priori de Jeffreys : Beta(0,5 ; 0,5). Il ne présume rien et se comporte
  // correctement quand le nombre de conversions est nul, là où un a priori
  // uniforme serait déjà trop optimiste.
  return {
    alpha: 0.5 + Math.max(0, conversions),
    beta: 0.5 + Math.max(0, trials - conversions),
  };
}

export interface Interval {
  low: number;
  high: number;
}

/**
 * Intervalle de crédibilité sur le taux de conversion.
 * `level` vaut 0,95 par défaut, soit un intervalle central à 95 %.
 */
export function conversionInterval(
  conversions: number,
  trials: number,
  level = 0.95,
): Interval {
  if (trials <= 0) return { low: 0, high: 1 };
  const { alpha, beta } = posterior(conversions, trials);
  const tail = (1 - level) / 2;
  return {
    low: betaQuantile(tail, alpha, beta),
    high: betaQuantile(1 - tail, alpha, beta),
  };
}

/**
 * Probabilité que le taux de conversion réel dépasse un seuil donné.
 *
 * Appliqué au seuil de rentabilité, ce nombre répond directement à la question
 * qui compte : quelle est la probabilité que cette campagne soit rentable ?
 */
export function probabilityAbove(
  threshold: number,
  conversions: number,
  trials: number,
): number {
  if (trials <= 0) return 0.5;
  if (threshold <= 0) return 1;
  if (threshold >= 1) return 0;
  const { alpha, beta } = posterior(conversions, trials);
  return 1 - betaCdf(threshold, alpha, beta);
}
