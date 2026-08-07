# Tableau de bord de rentabilité — HUPPLE STORE

Confronte les **dépenses Facebook Ads** au **net réellement encaissé** sur la
boutique Chariow, pour répondre à une seule question : est-ce que la publicité
rapporte plus qu'elle ne coûte ?

---

## Mise en route

### 1. Clé API Chariow

`app.chariow.com` → **Settings** → **API Keys** → **Create API Key**.

La clé complète n'est affichée qu'une seule fois : copie-la immédiatement dans
`.env.local`, ligne `CHARIOW_API_KEY`.

### 2. Jeton Meta

Dans `business.facebook.com` → **Paramètres d'entreprise** :

1. **Utilisateurs système** → créer un utilisateur système (rôle Administrateur).
2. **Ajouter des ressources** → ton compte publicitaire, accès complet.
3. **Générer un nouveau jeton** → application liée, permission **`ads_read`**.

Un jeton System User n'expire pas, contrairement au jeton utilisateur classique
qui meurt au bout de 60 jours et laisserait le tableau de bord muet.

Reporte le jeton dans `META_ACCESS_TOKEN` et l'identifiant du compte
publicitaire (`act_…`, visible dans l'URL du gestionnaire de publicités) dans
`META_AD_ACCOUNT_ID`.

### 3. Associer les campagnes aux produits

Ouvre `config/campaign-map.json` et renseigne le bloc `mapping` : à gauche le
**nom exact** de la campagne dans le gestionnaire de publicités, à droite
l'identifiant du produit qu'elle pousse.

```json
"mapping": {
  "Pack Orateur - Acquisition": "prd_umqgm8su",
  "Multi-produits - Dév. personnel": ["prd_0m2vfj", "prd_4qpa9s"]
}
```

Les identifiants de tes huit produits sont listés dans le bloc
`_produits_disponibles` du même fichier.

Une campagne absente de cette table apparaît en **« Non mappée »** : sa dépense
est comptée, mais aucun revenu ne lui est attribué. C'est volontaire — mieux
vaut un trou visible qu'un ROAS flatteur et faux.

### 4. Lancer

```bash
npm install
npm run dev
```

---

## Comment les chiffres sont calculés

### Le revenu

Le montant retenu est le **net réellement reversé**, pas le prix affiché. Deux
prélèvements s'appliquent successivement :

```
net = montant payé − frais du prestataire de paiement − frais de service Chariow
```

Concrètement, une vente à 4 999 F rapporte **4 249 F**. Raisonner sur le brut
surestimerait la rentabilité d'environ 15 %.

Sont exclues : les ventes non finalisées et les ventes à 0 F issues des codes de
test (`ZEROO`, `GRATUIT`).

### L'attribution

Chariow n'attache aucune campagne à ses ventes. La jointure se fait donc sur le
couple **(jour, produit)** : le revenu d'un produit un jour donné est réparti
entre les campagnes qui le poussaient ce jour-là, **au prorata de leur dépense**.

Ce n'est pas de l'attribution individuelle et ça ne prétend pas l'être. C'est
une répartition proportionnelle : juste en moyenne sur une période longue,
grossière au jour le jour.

Le revenu d'un produit qu'aucune campagne ne poussait tombe dans **« Revenu non
attribué »**, affiché en clair.

### Les limites, à connaître avant de décider

- **Fuseaux horaires** — Meta agrège selon le fuseau du compte publicitaire,
  Chariow horodate en UTC. Un décalage d'un jour peut apparaître aux bornes.
- **Délai d'achat** — un clic du lundi peut devenir un achat du jeudi. La
  jointure par jour l'ignore.

Conséquence pratique : **ne juge jamais une campagne sur moins de 7 jours.**

---

## Commandes

| Commande            | Effet                                        |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Serveur de développement                      |
| `npm run build`     | Build de production                           |
| `npm test`          | Tests du calcul de rentabilité et des devises |
| `npm run typecheck` | Vérification TypeScript                       |
| `npm run lint`      | ESLint                                        |

---

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub, puis l'importer dans Vercel.
2. Reporter les variables d'environnement du fichier `.env.example`.
3. **Définir `DASHBOARD_EMAIL` et `DASHBOARD_PASSWORD`.** Sans eux, le site
   refuse de démarrer en production plutôt que d'exposer publiquement ton
   chiffre d'affaires.

## Accès

Page de connexion à `/login` : adresse e-mail, mot de passe, et une case
« rester connecté » qui prolonge la session à 30 jours. Le formulaire porte les
attributs `autocomplete` attendus, donc le gestionnaire de mots de passe du
navigateur propose d'enregistrer les identifiants.

Le mot de passe ne quitte jamais le serveur : le cookie de session ne contient
que son empreinte SHA-256. Conséquence utile — **changer le mot de passe
déconnecte immédiatement toutes les sessions ouvertes**, sans rien à purger.

Le contrôle est fait dans `proxy.ts`, en amont du rendu : une route ajoutée plus
tard est protégée d'office, sans intervention.

---

## Architecture

```
app/page.tsx        Écran unique, rendu côté serveur
proxy.ts            Protection par mot de passe (ex-middleware, renommé en Next 16)
lib/chariow.ts      Client API Chariow + normalisation des ventes
lib/meta.ts         Client Marketing API + conversion des devises
lib/attribution.ts  Jointure (jour × produit) — le cœur, testé isolément
lib/money.ts        Parité XOF/EUR et formatage
lib/report.ts       Orchestration, tolérance aux pannes partielles
components/         Interface
config/             Table de correspondance campagne → produit
```

Aucune base de données : les deux API sont interrogées en direct, avec un cache
de 15 minutes. À ce volume, une base n'apporterait qu'une synchronisation de
plus à maintenir.

Si une source tombe, l'autre reste affichée avec un bandeau explicite. Un
tableau de bord financier ne doit jamais laisser croire à un mauvais mois ce qui
n'est qu'une panne technique.
