# Popote — Brief de développement pour Claude Code

Tu es un développeur full-stack senior, spécialiste des PWA mobiles. Tu vas construire **Popote** (nom provisoire, à centraliser dans une constante `APP_NAME`), une application de recettes de cuisine sociale : chaque utilisateur a son carnet de recettes, il les partage avec ses copains, qui les ajoutent à leur carnet en un geste.

## 0. Façon de travailler

- Travaille **phase par phase** (section 9). À la fin de chaque phase : arrête-toi, résume ce qui est fait, liste ce que je dois tester à la main (avec les URL), signale les choix que tu as faits seul. N'entame pas la phase suivante sans mon feu vert.
- Avant d'utiliser une librairie ou une API, **vérifie sa version stable actuelle et sa documentation**. Ne te fie pas à ta mémoire pour les versions, les noms de paquets ou les options de configuration. Si une information est incertaine, dis-le plutôt que de la présenter comme sûre.
- Commits petits et explicites (Conventional Commits). Une branche par phase, PR vers `main`.
- Interface en **français** (tutoiement), code, noms de tables et commentaires en **anglais**. Tous les textes UI dans un fichier de messages unique, pour pouvoir traduire plus tard.
- Crée et maintiens un `CLAUDE.md` à la racine : stack, commandes, conventions, décisions prises.
- La maquette de référence est dans `/design/popote-v4.html` (fichier HTML autonome, à ouvrir dans un navigateur). Elle fait foi pour le rendu visuel des écrans : recette partagée, carnet, fiche recette, ajout IA.

## 1. Stack retenue

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript strict** | La page de recette partagée doit être rendue côté serveur pour les aperçus de lien (WhatsApp, iMessage, Messenger) : balises Open Graph et image générée. |
| Style | CSS Modules ou Tailwind, au choix, mais **piloté par les tokens CSS de la section 3** | Aucune valeur de couleur, rayon ou espacement en dur dans les composants. |
| BDD, auth, fichiers | **Supabase** (Postgres, Auth, Storage, Edge Functions), région UE | Auth sociale et lien magique inclus, Row Level Security, stockage des photos. |
| Hébergement | **Netlify** | Next.js est pris en charge via l'adaptateur OpenNext. Déploiement automatique depuis GitHub, aperçus de PR. |
| Code | **GitHub**, CI GitHub Actions | Lint, typecheck, tests unitaires et e2e sur chaque PR. |
| IA | **API Anthropic**, appelée uniquement côté serveur | Structuration des recettes, lecture de photos. Modèle dans une variable d'environnement (`ANTHROPIC_MODEL`). |
| Service worker | Serwist (ou équivalent maintenu, à vérifier) | Cache hors ligne et notifications push. |
| E-mails | SMTP transactionnel (Resend ou Brevo) branché sur Supabase Auth | Le SMTP par défaut de Supabase est limité et prévu pour les tests seulement. |

## 2. Produit et parcours clé

Public : adultes de 25 à 55 ans, cuisiniers du quotidien. L'usage est mobile, souvent en cuisine, avec les mains sales. La largeur de référence est **390 px**.

**Parcours d'acquisition prioritaire :**
1. Fred envoie un lien de recette à un ami.
2. L'ami ouvre `/r/[token]` dans son navigateur et lit **la recette complète, sans compte ni mur**.
3. Il touche « Ajouter à mon carnet », ce qui ouvre l'inscription express : prénom + e-mail (lien magique), ou Google, ou Apple.
4. Il personnalise rapidement son carnet : nom, couleur de couverture, avatar.
5. **La recette est ajoutée automatiquement**, sans qu'il ait à refaire l'action.
6. On lui propose d'installer la PWA, avec comme argument : « être prévenu quand un copain publie ».

L'action en attente (ajouter la recette X reçue de Y) doit survivre à la redirection d'authentification et à l'ouverture du lien magique dans un autre onglet. Stocke-la côté serveur, liée au token de partage, et pas seulement en local.

## 3. Design system (à implémenter en tokens CSS)

**Règles impératives**
- Aucun dégradé, nulle part. Aucune ombre portée. Couleurs en aplats.
- Pas d'emoji dans l'interface.
- **Tout texte posé sur un fond laiton est blanc.**
- Contraste WCAG AA minimum (4,5:1 pour le texte courant). Tous les couples ci-dessous sont conformes ; vérifie tout nouveau couple.
- Cibles tactiles de 48 px minimum. Focus clavier visible. `prefers-reduced-motion` respecté : toutes les animations sont coupées.

**Couleurs**
```
--tomate:#C7381F  --tomate-dark:#9C2A16  --tomate-soft:#FADDD5   (action principale, Plats)
--laiton:#8A6A22  --laiton-soft:#EFE4C8  --laiton-ink:#5E4712    (accent, minuteurs, notes perso, parts ; texte blanc sur laiton plein)
--sauge:#4C6B48   --sauge-soft:#DCE6D4   --sauge-ink:#2E5A35     (Entrées, coché, difficulté)
--prune:#74395A   --prune-soft:#EEDCE5                           (Desserts)
--abricot-soft:#FDE4D3 --abricot-ink:#8A3B10                     (temps, Brunch, chargement)
--ciel-soft:#DCE8F5  --bleu-nuit:#2F4B73                         (info, focus)
--fond:#F7F2EA  --fond-2:#EEE8DF  --surface:#FFFFFF  --trait:#E9E2D6
--encre:#2A1E19  --encre-2:#5B4A3F  --encre-3:#776250
--succes:#2E7347/#DCEBDF  --alerte:#8F5600, fond #FBE7C2, texte #5E3A00  --erreur:#A82A20/#F7DAD3
```
L'erreur est proche de la couleur principale : elle est **toujours** accompagnée d'une icône et d'un message.

**Typographie** (auto-hébergée via `next/font`, pour le hors ligne)
- Titres : **Bricolage Grotesque** 800, interlettrage serré (-0,02 à -0,03 em). Display 32/34, Titre 1 26/30.
- Interface et texte : **Figtree**. Titre 2 700 20/26, Titre 3 700 17/23, corps 16/24, petit 14/20, légende 500 12/16. Mode cuisine : étape en 28/38.

**Formes et espacements**
- Espacements en base 4 (4, 8, 12, 16, 20, 24, 32, 48). Marge d'écran de 20 px.
- Rayons : 8 (tags), 16 (champs, cartes), 24 (photos, grands blocs), pilule (boutons, catégories).

**Composants à créer** (en sur-mesure, pas de librairie de composants générique) :
- boutons : primaire tomate, secondaire bordé, laiton, texte, icône ;
- champs ;
- pastilles d'info teintées (temps abricot, difficulté sauge, parts laiton) ;
- catégories en puces avec picto (teintées au repos, pleine couleur quand active) ;
- tuiles d'ingrédient ;
- carte recette ;
- sceau « Dans mon carnet » ;
- badge ;
- sticker laiton incliné ;
- toast ;
- barre de navigation à 5 entrées : Carnet, Copains, **Ajouter** (bouton central surélevé), À la une, Profil.

Les icônes sont un sprite SVG maison, en trait arrondi de 1,8 px.

**Micro-interactions** :
- confettis en aplats (moins d'une seconde) quand on ajoute une recette ;
- rebond des quantités quand elles sont recalculées ;
- coche avec rebond sur les ingrédients ;
- marmite animée pendant le traitement IA. C'est la seule animation qui se lance sans action de l'utilisateur.

## 4. Modèle de données (proposition, à challenger)

Écris tout en **migrations Supabase versionnées** dans le repo.

- `profiles` : id (auth.users), first_name, avatar_url, notebook_name, notebook_color, created_at.
- `recipes` : id, author_id, title, description, servings, prep_minutes, cook_minutes, difficulty (1-3), photo_url, source_url, origin_label (ex. « Mamie Odette »), origin_year, variant_of (recipe_id, nullable), visibility (private / friends / link), created_at, updated_at.
- `recipe_ingredients` : recipe_id, position, quantity (numeric, nullable), unit, name, ingredient_key (pour le picto), aisle (rayon, pour la liste de courses), uncertain (bool).
- `recipe_steps` : recipe_id, position, text, timer_seconds (nullable).
- `categories` : id, user_id (null = catégorie par défaut), name, color_token, icon_key, position.
- `notebook_entries` : user_id, recipe_id, category_id, received_from (user_id, nullable), share_id, personal_note, quantity_overrides (jsonb, la « ma version » par ingrédient), added_at. **Le carnet référence la recette ; il ne la copie pas.**
- `shares` : id, token (non devinable), recipe_id, sender_id, message, created_at. Plus une table de destinataires, quand le partage vise des copains précis.
- `friendships` : user_a, user_b, status, created_at. Deux personnes deviennent copains automatiquement quand l'une ajoute une recette reçue de l'autre.
- `cooks` (« Je l'ai faite ! ») : user_id, recipe_id, photo_url, created_at.
- `activity` : actor_id, type, recipe_id, target_user_id, created_at. C'est la source du fil Copains.
- `badges` / `user_badges`, `challenges` / `challenge_entries`, `featured_recipes` (recette de la semaine), `shopping_items`.
- `ai_usage` : user_id, month, count. `ai_jobs` : id, user_id, mode, status, input_ref, result (jsonb), error, created_at.
- `push_subscriptions` : user_id, endpoint, keys, user_agent.

**Généalogie d'une recette** : elle se calcule à partir de `origin_label`, de l'auteur, puis de la chaîne des `notebook_entries.received_from`. Fais-en une fonction SQL ou une vue.

**Sécurité**
- RLS activée sur **toutes** les tables, avec des politiques explicites et testées.
- La page publique `/r/[token]` lit la recette côté serveur, en vérifiant le token, sans exposer d'autres données.
- La clé `service_role` et la clé Anthropic ne sortent jamais du serveur.

## 5. IA : ajout de recette assisté

Un seul point d'entrée, quatre modes :
- **Photo** : fiche manuscrite, page de livre ou plat. Redimensionne côté client (1600 px max, WebP) avant l'envoi.
- **Voix** : utilise l'API Web Speech si elle est disponible. Sinon, bascule sur un champ texte qui invite à utiliser le micro du clavier du téléphone. Une transcription serveur (fournisseur de reconnaissance vocale à choisir) est hors MVP ; prévois l'interface pour l'ajouter.
- **Lien** : récupère la page côté serveur. Lis d'abord les données structurées schema.org/Recipe (JSON-LD) si elles existent, sinon envoie le texte nettoyé au modèle. Conserve `source_url` et affiche la source.
- **En vrac** : texte libre.

**Côté serveur** (Edge Function Supabase ou route Next) :
- Le modèle renvoie un **JSON validé par un schéma** (zod) : titre, portions, temps, difficulté, catégorie, tags, ingrédients (quantité, unité, nom, ingredient_key, rayon) et étapes (texte, minuteur).
- Pour chaque champ, il indique un niveau de confiance et, si le champ est incertain, **2 ou 3 propositions**. À l'écran, ces propositions deviennent des boutons qui corrigent en un tap.
- En cas de réponse invalide, une seule nouvelle tentative, puis erreur.

**États à implémenter** :
- chargement (marmite animée et trois étapes de progression) ;
- résultat, avec les champs incertains surlignés en jaune ;
- erreur explicite avec conseils (photo floue, lien illisible). **Une erreur ne consomme pas de quota** ;
- quota mensuel atteint : 10 par mois par défaut, valeur configurable, remise à zéro le 1er du mois. Dans ce cas, la saisie manuelle reste toujours possible.

Le quota se vérifie et se décrémente **côté serveur uniquement**, de façon atomique, et seulement si l'ajout réussit.

**Pictos d'ingrédients** : sprite SVG en aplats. Pour le MVP, fais une trentaine d'ingrédients courants, plus un picto générique par famille (légume, fruit, laitage, viande, poisson, épice, féculent, autre). Le modèle choisit `ingredient_key` dans une liste fermée qu'on lui fournit.

## 6. Contraintes PWA

- Un manifest complet : nom, icônes (y compris maskable), `display: standalone`, couleurs de thème. Plus les balises Apple pour iOS.
- **Hors ligne** : le carnet et les fiches déjà ouvertes restent consultables. Les photos sont mises en cache avec une limite de taille.
- **Installation** :
  - Android : intercepte `beforeinstallprompt` pour afficher notre propre bouton.
  - iOS : guide illustré en deux étapes (bouton Partager, puis « Sur l'écran d'accueil »).
  - Bannière discrète pour les inscrits qui utilisent encore le navigateur. Une fois fermée, elle ne revient pas avant 14 jours.
- **Notifications push** (Web Push, clés VAPID) : copain qui publie, recette reçue, « X a fait ta recette ». Sur iOS, elles ne fonctionnent que dans l'app installée (iOS 16.4 et plus). Explique-le dans l'interface, au lieu d'afficher un bouton qui ne marcherait pas.
- **Mode cuisine** : plein écran, une étape à la fois, très gros texte, grands boutons, minuteurs intégrés.
  - Utilise l'API Screen Wake Lock pour garder l'écran allumé. D'après mes vérifications, elle ne fonctionne dans une PWA installée sur iOS que depuis iOS 18.4.
  - Gère son absence ou son refus sans erreur, avec un message discret.
  - Reprends le verrou quand l'app revient au premier plan (`visibilitychange`).

## 7. Qualité

- Tests unitaires (Vitest) :
  - recalcul des quantités selon les portions (arrondis : entiers pour ce qui se compte, multiples de 5 g au-delà de 50 g) ;
  - quota IA ;
  - parsing du JSON IA ;
  - généalogie.
- Tests e2e (Playwright, viewport 390 × 844) : le parcours d'acquisition complet de la section 2, et l'ajout IA avec un modèle simulé.
- Tests des politiques RLS : un utilisateur ne lit ni n'écrit les données d'un autre.
- Lighthouse mobile : viser 90 ou plus en Performance, Accessibilité et Bonnes pratiques, et une PWA installable.
- `.env.example` documenté. Aucun secret dans le repo.

## 8. Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
AI_MONTHLY_QUOTA=10
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_SITE_URL=
```

## 9. Phases

**Phase 0 : socle**
- Repo et scaffold Next.js TypeScript strict.
- Tokens CSS et typographies.
- Page `/design-system` qui affiche tous les composants.
- Supabase CLI et première migration.
- Déploiement Netlify avec aperçus de PR.
- CI GitHub Actions.
- `CLAUDE.md`.

**Phase 1 : compte et carnet**
- Authentification : lien magique et Google. Apple vient plus tard : il faut un compte Apple Developer, je le fournirai.
- Onboarding : prénom, nom du carnet, couleur, avatar.
- Accueil « Mon carnet » : couverture, catégories en puces (par défaut et perso), recherche, recettes ouvertes récemment, état vide.
- Création et édition manuelles d'une recette.
- Fiche recette : photo, infos teintées, portions ajustables, tuiles d'ingrédients à cocher avec la barre « Mise en place », note perso, « ma version » des quantités, étapes avec minuteurs.
- Mode cuisine.

**Phase 2 : partage et acquisition**
- Lien de partage avec message.
- Page publique `/r/[token]` (rendu serveur, sans compte).
- Image Open Graph générée.
- Partage natif via `navigator.share`.
- Action en attente qui survit à l'inscription.
- Copains créés automatiquement.
- Généalogie affichée sur la fiche.

**Phase 3 : ajout IA**
- Les 4 modes, tous les états de la section 5, le quota, les pictos d'ingrédients.

**Phase 4 : PWA**
- Manifest, service worker, hors ligne.
- Guides d'installation Android et iOS, bannière.
- Notifications push.

**Phase 5 : social**
- Fil Copains.
- « Je l'ai faite ! » avec photos.
- Variantes rattachées à l'originale.
- Badges et sceaux.
- À la une : recette de la semaine, recettes les plus partagées, défi du mois.
- Liste de courses regroupée par rayon.
- Frigo vide : l'IA propose des recettes du carnet de l'utilisateur et de ceux de ses copains.

Commence par la phase 0. Avant d'écrire du code, présente-moi en une page :
- l'arborescence du projet ;
- les versions exactes que tu comptes utiliser, vérifiées ;
- tes remarques sur le modèle de données.
