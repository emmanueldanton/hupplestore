# Tableau de bord de rentabilité HUPPLE STORE

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
est comptée, mais aucun revenu ne lui est attribué. C'est volontaire : mieux
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
frais du prestataire de paiement (Moneroo)   8 %
frais de service Chariow                     7 %
                                            ────
total prélevé                               15 %
```

Concrètement, une vente à 4 999 F rapporte **4 249 F**. Raisonner sur le brut
surestimerait la rentabilité d'environ 15 %.

**L'API REST ne renvoie pas ce montant.** Elle expose `amount`, mais ni
`settlement`, ni `payment.fee` : seul le connecteur MCP de Chariow les fournit,
et il n'est pas utilisable depuis un serveur. Le net est donc calculé en
appliquant le taux ci-dessus, ajustable via `CHARIOW_NET_RATE`, et le tableau de
bord signale explicitement qu'il s'agit d'un calcul et non d'un constat.

Si tu changes de plan tarifaire, vérifie le taux sur un relevé réel et ajuste la
variable : c'est le seul chiffre du système qui ne peut pas se valider tout seul.

### Le filtrage par période

**L'API Chariow ignore `start_date` et `end_date`.** Vérifié en production :
une fenêtre d'une semaine, d'un mois, ou aucune fenêtre du tout renvoient
toutes les mêmes 522 ventes.

Le filtrage est donc fait dans l'application, après réception. Les paramètres
restent envoyés au cas où Chariow les implémenterait un jour, mais la justesse
des chiffres n'en dépend pas.

Sans ce filtrage local, chaque période afficherait le même chiffre d'affaires,
comparé à des dépenses publicitaires, elles, correctement bornées. Le ROAS
affiché serait faux dans des proportions considérables : sur cette boutique,
6,25 au lieu de 1,03.

### Le périmètre

Sont retenues les ventes `completed` **et `settled`**, avec un montant supérieur
à zéro.

Le statut `settled` est celui d'une vente dont le versement a été effectué :
c'est donc l'état normal des ventes anciennes. Sur cette boutique, 237 ventes
sont `settled` contre 9 `completed`. Filtrer sur le seul statut `completed`, ce
qui semble pourtant naturel, écarterait la quasi-totalité du chiffre d'affaires.

Sont exclues : les ventes échouées ou abandonnées, et les ventes à 0 F issues des
codes de test (`ZEROO`, `GRATUIT`).

### L'attribution

Chariow n'attache aucune campagne à ses ventes. La jointure se fait donc sur le
couple **(jour, produit)** : le revenu d'un produit un jour donné est réparti
entre les campagnes qui le poussaient ce jour-là, **au prorata de leur dépense**.

Ce n'est pas de l'attribution individuelle et ça ne prétend pas l'être. C'est
une répartition proportionnelle : juste en moyenne sur une période longue,
grossière au jour le jour.

Le revenu d'un produit qu'aucune campagne ne poussait tombe dans **« Revenu non
attribué »**, affiché en clair.

### L'incertitude

Une campagne à 41 clics et zéro vente affiche un ROAS de 0. Cela ressemble à un
verdict, mais n'en est pas un : si son taux de conversion réel valait 1 %, la
probabilité d'observer zéro vente sur 41 clics serait encore de 66 %.

Le tableau de bord traite donc les conversions comme un tirage binomial et
raisonne sur la loi a posteriori du taux de conversion, avec un a priori de
Jeffreys `Beta(0,5 ; 0,5)`.

Le point de bascule est le **taux de conversion d'équilibre** :

```
seuil = coût par clic / net moyen par vente
```

En dessous, la campagne perd de l'argent. La question devient alors « quelle est
la probabilité que le taux réel dépasse ce seuil ? », à laquelle les données
peuvent répondre, là où « cette campagne est-elle bonne ? » n'a pas de réponse
chiffrable.

Trois verdicts en découlent : **Rentable** au-delà de 95 % de probabilité,
**Perdante** en dessous de 5 %, **Indéterminé** entre les deux. Ce dernier
n'est pas un mauvais résultat, c'est une absence de résultat : la colonne
indique alors combien de clics supplémentaires seraient nécessaires pour
trancher.

Conséquence pratique à ces volumes : **l'unité de décision est le thème, pas la
campagne.** Prises isolément, la plupart des campagnes n'ont pas assez de
trafic pour prouver quoi que ce soit.

### La robustesse du classement

Rien ne garantit qu'un achat suive son clic le jour même. Plutôt que de trancher
arbitrairement, le calcul est rejoué à quatre fenêtres d'attribution (jour même,
1, 3 et 7 jours) et les verdicts sont comparés.

Une campagne dont le verdict ne bouge pas est **stable** : la conclusion tient
quelle que soit l'hypothèse. Une campagne dont le verdict change reflète
l'hypothèse autant que les données, et ne doit fonder aucune décision de budget.

Sur cette boutique, plusieurs campagnes passent de 0,97 à 1,56 de ROAS selon la
fenêtre retenue.

### Les limites, à connaître avant de décider

- **Fuseaux horaires** : Meta agrège selon le fuseau du compte publicitaire,
  Chariow horodate en UTC. Un décalage d'un jour peut apparaître aux bornes.
- **Délai d'achat** : un clic du lundi peut devenir un achat du jeudi. La
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
que son empreinte SHA-256. Conséquence utile : **changer le mot de passe
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
lib/attribution.ts  Jointure (jour × produit) : le cœur, testé isolément
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
