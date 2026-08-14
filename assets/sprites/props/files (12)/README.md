# Godzilla : Protocole Titan — Tactile, tablette et sauvegarde en ligne

## 1. Tactile / tablette / smartphone (déjà actif, rien à configurer)
- Le tir fonctionne maintenant au doigt (`touchstart`), en plus du clic souris.
- Le viseur en croix (pensé pour une souris) se désactive automatiquement sur écran tactile ; le curseur redevient normal.
- En **portrait** sur téléphone ou petite tablette, un écran "tourne ton appareil 📱" s'affiche à la place du jeu (le format 1100×700 est pensé pour du paysage). Rien à coder : c'est une règle CSS, elle disparaît dès que l'appareil est tourné.
- La mise à l'échelle (déjà en place depuis la v2) écoute maintenant aussi les changements de barre d'adresse mobile (`visualViewport`), pour éviter qu'elle se recalcule mal quand le clavier ou la barre du navigateur apparaît/disparaît.

**Non testé** (toujours pas d'appareil réel disponible ici) : merci de vérifier sur un vrai téléphone et une vraie tablette, notamment la taille des cristaux au doigt (ils font ~116px de diamètre, ce qui est confortable, mais à confirmer en vrai) et le comportement de l'écran de rotation.

## 2. Sauvegarde en ligne (Firebase) — 5 minutes de configuration

### Pourquoi Firebase et pas Supabase
Les deux auraient fonctionné ; j'ai choisi Firebase parce que sa console guide davantage un non-développeur (pas de SQL à écrire), et que son SDK s'inclut par une simple balise `<script>` sans étape de compilation — exactement ce qu'il faut pour un projet en 3 fichiers comme celui-ci.

### Ce que ça sauvegarde
Uniquement la progression (chapitres débloqués + rang de maîtrise du mode Burning) — pas de note, pas de donnée personnelle. Chaque élève choisit lui-même un "code" (son prénom + un chiffre, par exemple) : pas besoin d'e-mail ni de mot de passe.

### Étapes
1. Va sur **console.firebase.google.com**, connecte-toi avec un compte Google, clique **Ajouter un projet**. Donne-lui un nom (ex. `godzilla-protocole-titan`), tu peux désactiver Google Analytics (pas nécessaire ici).
2. Dans le menu de gauche du projet : **Build → Firestore Database → Créer une base de données**. Choisis l'emplacement le plus proche de chez toi (ex. `eur3 (europe-west)`), puis démarre en **mode production** (pas "mode test" — on va coller nos propres règles à l'étape 4).
3. Toujours dans le projet : icône ⚙️ à côté de "Vue d'ensemble du projet" → **Paramètres du projet**. Descends jusqu'à "Vos applications", clique l'icône **`</>`** (Web), donne un surnom à l'appli (ex. `jeu-homophones`), **ne coche pas** "Configurer aussi Firebase Hosting". Firebase affiche un bloc `firebaseConfig = { apiKey: "...", ... }` : copie ces valeurs dans `game.js`, tout en haut, dans le bloc `FIREBASE_CONFIG` (cherche `COLLE_TA_CLE_API_ICI`).
4. Dans **Firestore Database → Règles**, remplace tout le contenu par :
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /progress/{playerCode} {
         allow read, write: if playerCode is string && playerCode.size() > 0 && playerCode.size() <= 24;
       }
     }
   }
   ```
   Clique **Publier**.

C'est tout — pas besoin d'activer l'authentification. Chaque élève entre son code une fois (⚙️ → champ "Code élève" → Valider) ; le jeu retient ce code sur l'appareil et synchronise automatiquement à chaque victoire.

### Ce que ces règles impliquent (sois-en consciente)
Sans authentification, n'importe qui connaissant le code exact d'un élève peut lire ou modifier SA progression (mais pas celle des autres, et pas la lister). Comme il n'y a aucune donnée sensible en jeu (juste "quels chapitres sont faits"), j'ai jugé ce compromis raisonnable pour la simplicité — encourage des codes pas totalement évidents (pas juste "1", "2", "3"). Si un jour tu veux du vrai compte par élève, on pourra ajouter l'authentification Firebase (un peu plus de configuration).

### Si tu ne configures rien
Le jeu fonctionne exactement comme avant (sauvegarde locale uniquement, par appareil) — aucune erreur, aucun blocage. Le panneau ⚙️ affiche juste "Sauvegarde en ligne non configurée".

## Testé automatiquement
`node --check` OK, structure des niveaux inchangée et valide, tous les nouveaux éléments (`cloud-status`, `player-code-input`, etc.) présents et stylés.

## Non testé
Toujours aucun accès à Firebase ni à un vrai navigateur depuis cet environnement — je n'ai pas pu vérifier la synchronisation en conditions réelles. Teste avec deux appareils différents (ou deux navigateurs) et le même code élève pour confirmer que la progression se retrouve bien des deux côtés.
