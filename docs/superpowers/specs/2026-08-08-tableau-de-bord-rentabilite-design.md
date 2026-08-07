# Tableau de bord de rentabilité HUPPLE STORE — spécification

**Date** : 8 août 2026
**Auteur** : Emmanuel DANTON, avec Claude
**Statut** : validé, implémenté

---

## Problème

Emmanuel vend des produits digitaux (guides PDF, ~1 900 à 4 999 F CFA) sur
HUPPLE STORE, boutique Chariow hébergée au Bénin, et achète du trafic via
Facebook Ads. Aucun outil ne lui dit si la publicité rapporte plus qu'elle ne
coûte : les dépenses vivent chez Meta, les revenus chez Chariow, et les deux ne
se parlent pas.

## Contrainte structurante découverte

L'API Chariow **n'attache aucune campagne à ses ventes**. Le champ `campaign` de
chaque vente est systématiquement `null`, et aucun UTM n'est conservé au niveau
de la transaction — Chariow n'expose les `sources` / `mediums` / `referrers`
qu'au niveau des *visites*.

Une jointure « vente X ← campagne Y » est donc impossible à partir des données
disponibles. Toute la conception en découle.

## Décisions

| Sujet | Décision | Alternative écartée |
| --- | --- | --- |
| Attribution | Agrégée sur (jour, produit), répartition au prorata de la dépense | Conversions API + Pixel : attribution exacte, mais endpoint hébergé, Pixel à poser, et ROAS fourni par Meta, juge et partie |
| Source des dépenses | Marketing API, endpoint Insights | Export CSV manuel ; saisie manuelle |
| Forme | Application Next.js déployable sur Vercel | Script local ; Google Sheet |
| Définition du revenu | Net réellement reversé, ventes de test exclues | Brut ; brut et net côte à côte |
| Devises | XOF principal, EUR en second | XOF seul ; EUR seul |
| Stockage | Aucun — appels directs, cache 15 min | Base Supabase : une synchronisation de plus à maintenir, sans bénéfice au volume actuel |

## Règle de calcul du revenu

Deux prélèvements successifs s'appliquent, et non un seul :

```
net = montant payé − frais du prestataire de paiement − frais de service Chariow
```

Vérifié sur une vente réelle : `4 999 − 399,92 − 349,93 = 4 249,15`, valeur
identique au `settlement.amount` renvoyé par l'API. Ne déduire que les frais de
paiement surestimerait le revenu de ~8 %.

`settlement.amount` est utilisé dès qu'il est présent ; le calcul n'intervient
qu'en repli, et l'interface signale alors que le montant est estimé.

**Périmètre** : `status = completed` et `montant > 0`. Les ventes à 0 F
proviennent des codes de test (`ZEROO`, `GRATUIT`) et fausseraient les moyennes.

## Règle d'attribution

Pour un couple (jour, produit), le revenu est réparti entre les campagnes qui
poussaient ce produit ce jour-là, **au prorata de leur dépense**. Deux campagnes
à 3 000 F et 1 000 F reçoivent respectivement 75 % et 25 % du revenu du jour.

Le revenu d'un produit qu'aucune campagne ne poussait n'est attribué à personne :
il alimente le bloc **« Revenu non attribué »**, toujours visible.

Une campagne absente de `config/campaign-map.json` voit sa **dépense comptée**
mais aucun revenu attribué, et apparaît explicitement comme « non mappée ».
L'exclure gonflerait artificiellement le ROAS global.

### Ce que cette règle n'est pas

Ce n'est pas de l'attribution individuelle. C'est une répartition
proportionnelle : juste en moyenne sur une période longue, grossière au jour le
jour.

## Limites assumées

- **Fuseaux horaires** — Meta agrège selon le fuseau du compte publicitaire,
  Chariow horodate en UTC. Décalage possible d'un jour aux bornes de période.
- **Délai d'achat** — un clic du lundi peut devenir un achat du jeudi ; la
  jointure par jour l'ignore.

Conséquence portée dans l'interface : **ne jamais juger une campagne sur moins
de 7 jours.**

## Architecture

```
app/page.tsx        Écran unique, Server Component, période via searchParams
proxy.ts            Authentification HTTP Basic (ex-middleware, renommé en Next 16)
lib/chariow.ts      Client REST + pagination cursor + normalisation
lib/meta.ts         Client Insights + conversion de devise
lib/attribution.ts  Jointure (jour × produit) — cœur du système, testé isolément
lib/money.ts        Parité XOF/EUR (655,957, fixe) et formatage
lib/report.ts       Orchestration, tolérance aux pannes partielles
config/campaign-map.json
```

**Tolérance aux pannes** : les quatre appels (ventes et dépenses, période
courante et précédente) sont lancés en parallèle et évalués indépendamment. Une
panne côté Meta n'efface pas les revenus ; elle affiche un bandeau. Un tableau
de bord financier ne doit jamais laisser prendre une panne technique pour un
mauvais mois.

**Sécurité** : l'accès est protégé par mot de passe. En production, l'absence de
`DASHBOARD_PASSWORD` bloque le démarrage plutôt que d'ouvrir le chiffre
d'affaires au public.

## Interface

Langage visuel inspiré du « Banking Dashboard » de Nixtio : fond gris chaud,
bandeau en dégradé orange à grand rayon, cartes blanches très arrondies,
typographie grotesque serrée, grands nombres à deux tons, barres fines avec
groupe actif en noir et infobulle sombre.

Le chiffre mis en tête est la **marge**, pas le chiffre d'affaires : un tableau
de bord de rentabilité doit montrer ce qui reste, pas ce qui entre.

## Tests

33 tests couvrent les deux modules où une erreur coûte de l'argent :

- `lib/money.test.ts` — parité fixe, refus des devises sans taux, formatage,
  variations à base nulle ou négative.
- `lib/chariow.test.ts` — les deux prélèvements, le repli, la valeur observée en
  production.
- `lib/attribution.test.ts` — répartition proportionnelle, absence de double
  comptage, revenu non attribué, campagnes non mappées, seuil de rentabilité,
  comblement des jours vides.

## Suite envisageable (hors périmètre)

Brancher la Conversions API via un webhook Pulse Chariow pour obtenir une
attribution réelle par campagne. Le découpage actuel permet de l'ajouter sans
réécrire le calcul : `lib/attribution.ts` recevrait des ventes déjà porteuses
d'un identifiant de campagne.
