# Transmission — Le Manuscrit des Mondes
Date : 15 juillet 2026 (session de refonte navigation/mini-jeux)

## 📦 Contexte de cette session

Le projet était bloqué : sur Netlify, "Nouvelle partie" ne répondait pas
du tout ; en local, le jeu s'ouvrait mais restait bloqué sur la carte
après avoir cliqué sur un monde. Cette session a diagnostiqué et corrigé
ces blocages, restructuré la navigation, et repris entièrement le premier
mini-jeu du Monde 1 dont la mécanique pédagogique ne fonctionnait pas.

**⚠️ Cette transmission décrit l'état du projet dans CE paquet de
livraison. Le dépôt GitHub de Julie contient en plus ses propres
`assets/` (décors, portraits), plus fournis que ceux inclus ici — voir
"Fusion avec le dépôt GitHub" plus bas avant de déployer.**

---

## 🏗️ Architecture — CHANGEMENT MAJEUR : un fichier HTML par monde

L'ancienne architecture était une seule page (`index.html`) avec tous
les écrans (menu/intro/carte/VN/mini-jeu) gérés en JS par un unique
`sceneManager.js`. C'est devenu :

```
manuscrit-des-mondes/
├── index.html              ← LE HUB : menu, intro, carte des mondes UNIQUEMENT
├── mondes/
│   └── hugo.html            ← Monde 1, page autonome (VN + mini-jeux)
│       (dumas.html, verne.html... à créer un par un, même modèle)
├── css/ (main.css, vn.css, minigames.css) — inchangés, partagés
├── js/
│   ├── core/
│   │   ├── gameState.js     ← inchangé, commun à toutes les pages (localStorage)
│   │   ├── hubManager.js    ← NOUVEAU, remplace main.js. Gère UNIQUEMENT
│   │   │                       menu/intro/carte. Ne charge que sur index.html.
│   │   └── sceneManager.js  ← ALLÉGÉ, gère UNIQUEMENT VN + mini-jeu (plus
│   │                           menu/carte). Ne charge que sur les pages /mondes/.
│   │                           Le nom "SceneManager" est conservé exprès :
│   │                           tous les mg-*.js l'appellent au chargement.
│   ├── vn/ (vnEngine.js inchangé, vnParser.js — chemin JSON corrigé)
│   ├── minigames/
│   │   ├── mg-shared.js     ← NOUVEAU (voir plus bas)
│   │   └── mg-*.js           ← les 6 mini-jeux du Monde 1, tous retouchés
│   └── data/hugo_scenes.json ← chemins d'assets corrigés (voir plus bas)
└── assets/
    ├── characters/           ← portraits VN (PAS "portraits", voir plus bas)
    ├── backgrounds/           (vide dans ce paquet — décors chez Julie)
    └── sprites/characters/    ← sprites de gameplay (différents des portraits VN)
```

**Règle d'or apprise cette session : TOUS les chemins (`css/`, `js/`,
`assets/`, fetch JSON) sont désormais ABSOLUS depuis la racine du site**
(`/css/main.css`, jamais `css/main.css`). Un chemin relatif casse selon
la profondeur de la page qui l'utilise (`/mondes/hugo.html` vs `/`) —
c'était la cause du blocage sur la carte. Chemin absolu = fonctionne
partout, à condition d'être servi par un vrai serveur HTTP (Live Server
ou Netlify), jamais en ouvrant le fichier directement (`file://`).

**Pour ajouter un monde** : dupliquer `mondes/hugo.html`, l'adapter,
créer `js/data/<worldId>_scenes.json`, écrire ses `mg-*.js`, puis
l'ajouter dans `WORLD_PAGES` en haut de `js/core/hubManager.js`.

---

## 🐛 Bugs diagnostiqués et corrigés cette session

1. **Netlify : "Nouvelle partie" ne répondait pas.**
   Cause probable : `main.js` faisait `GameState.load()` en toute
   première ligne de son handler `DOMContentLoaded`. Si UN SEUL script
   avait 404 sur Netlify (souvent : casse de nom de fichier/dossier
   différente entre disque local et dépôt GitHub — Netlify est
   sensible à la casse), cette ligne plantait et **aucun** des
   `addEventListener` suivants ne s'exécutait — d'où des boutons
   totalement morts. Non confirmé avec certitude faute d'accès au
   dépôt réel, mais la restructuration en plusieurs petits fichiers
   (au lieu d'un seul gros `main.js`) limite l'ampleur des dégâts si
   ça se reproduit, et chaque page a maintenant son propre `try/catch`
   au démarrage qui log clairement l'erreur en console au lieu de
   mourir silencieusement.

2. **Bloqué sur la carte après clic sur un monde (confirmé, corrigé).**
   `sceneManager.js` faisait `fetch("js/data/hugo_scenes.json")`
   (chemin relatif) → 404 → `loadAct` renvoie `null` → retour
   silencieux à la carte. Corrigé : chemin absolu `/js/data/...`.

3. **Sprite Gavroche affiché comme un gros carré plein, parfois un
   fragment visible (confirmé, corrigé).**
   `gavroche-marche.png` (le fichier réellement chargé par le code)
   s'est révélé, après analyse pixel par pixel, être rempli à 100%
   sur toute la feuille (pas de transparence réelle) — donc pas une
   vraie feuille de sprite. Un autre fichier mal nommé
   (`Gravroche-sheet-sprite-*.png`, avec la faute de frappe
   "Gravroche") contenait lui un vrai sprite détouré.
   → Julie a fourni des feuilles "combat" propres (`esprit-combat.png`,
   `gavroche-combat.png`), maintenant utilisées à la place. Voir
   "Décision narrative" ci-dessous pour savoir laquelle est où.

4. **Portrait de Thénardier affiché avec un entourage bleu vif.**
   Pas un bug de code : l'image elle-même avait un fond plein
   (RGB 6,58,255), pas de transparence. Détourée par chroma key +
   suppression de liseré bleu résiduel sur les bords. Fichier livré :
   `assets/characters/Thenardier_neutre.png`.

5. **Aucun portrait n'apparaissait dans le VN.**
   `hugo_scenes.json` référençait `/assets/portraits/...`, mais le
   dépôt GitHub de Julie utilise `/assets/characters/...`. Toutes les
   19 occurrences corrigées dans le JSON.

---

## 🎮 Refonte du mini-jeu de ponctuation ("Le Tri des Barricades")

**Pourquoi il a été entièrement repensé** (contrairement aux 5 autres
mini-jeux du Monde 1, qui ont une mécanique pédagogique saine) :
l'ancienne version demandait de ramasser un signe de ponctuation au
hasard parmi 4 objets flottants tout en esquivant 2 silhouettes de
Thénardier faciles à éviter. Gagner ou perdre dépendait du hasard de
placement à l'écran, pas de la compréhension de la notion. Verdict de
Julie après capture d'écran : "sans aucun intérêt péda".

**Nouvelle mécanique** : 3 phrases affichées l'une après l'autre,
choix du bon signe parmi 4 pour chacune, feedback pédagogique
IMMÉDIAT et explicite après chaque choix ("✓ Exact ! [pourquoi]" ou
"✗ Pas cette fois. [pourquoi]"). Il faut au moins 2/3 pour réussir.
Fichier : `js/minigames/mg-ponctuation.js`, variante enregistrée
inchangée (`"ponctuation"` / `"barricades_hugo"`) — aucune autre partie
du code n'a eu besoin de changer.

**Ce mini-jeu n'a plus de sprite joueur** (mécanique 100% au clic,
plus de déplacement) — la question Esprit/Gavroche ne s'applique donc
plus à lui.

---

## 🆕 mg-shared.js — overlay instructions + résultat (les 6 mini-jeux)

Bug transversal trouvé : `minigames.css` définissait déjà des classes
`.minigame-result` (overlay succès/échec) **jamais utilisées** par
aucun des 6 `mg-*.js`. Conséquence : à la fin d'un mini-jeu, l'écran
basculait silencieusement vers le VN sans jamais annoncer si c'était
gagné/perdu, ni pourquoi — d'où le retour au VN qui semblait être un
bug ("but incertain, gameplay pas expliqué").

`js/minigames/mg-shared.js` (nouveau) expose :
- `MinigameUI.showInstructions({ title, objective, html })` — overlay
  affiché AVANT le jeu, bouton "Commencer".
- `MinigameUI.showResult({ passed, message })` — overlay affiché
  APRÈS, réutilise `.minigame-result`, message explicite (donne la
  bonne réponse en cas d'échec), bouton "Continuer"/"Réessayer".

**Intégré dans les 6 mini-jeux.** Pour les 5 dont la mécanique n'a
PAS changé (ordre des mots, subordonnées, cohérence paragraphe,
sélection info, construction récit), seul l'ajout de ces deux appels
a été fait — mécanique de jeu intacte. `mondes/hugo.html` charge
`mg-shared.js` en premier, avant les 6 autres.

**Rappel important : le retour à la même question du VN après un
mini-jeu de remédiation est un comportement VOULU** (documenté dans
la transmission du 13 juin : échec → mini-jeu → retour au même texte
à trous). Ce n'est pas une boucle infinie, c'est le principe
pédagogique de la remédiation ciblée.

---

## 🎭 Décision narrative : quel sprite jouable dans quel mini-jeu ?

Dans la logique du jeu (`gameState.js`), Gavroche n'est officiellement
"compagnon débloqué" qu'à la **fin complète du Monde 1**
(`completeWorld()`). Il apparaît bien en scène dès l'Acte 1 (sous le
nom mystérieux "???"), mais n'est pas encore un compagnon jouable.

→ Décision : le sprite jouable dans les mini-jeux avec déplacement
(`mg-ordre-mots.js`, `mg-selection-info.js`) est désormais
**l'Esprit** (`esprit-combat.png`), pas Gavroche, pour toute la durée
du Monde 1. `gavroche-combat.png` (corrigé, propre) est en réserve,
prêt pour une future utilisation une fois Gavroche effectivement
libéré/jouable (fin de monde, ou Monde 2+).

**⚠️ Point non résolu** : les fichiers fournis (`esprit-combat.png`,
`gavroche-combat.png`) sont des feuilles **"combat"** (8 colonnes
remplies), pas des feuilles **"marche"** avec un vrai cycle de 3
frames par direction. Le code découpe toujours les cellules comme un
cycle de marche (colonnes 0-2 = animation, ligne = direction). Ça
s'affichera (fond transparent, bonne taille) mais l'animation ne sera
probablement pas un vrai cycle de marche fluide — plutôt une
alternance de poses de combat. **Pas encore testé en conditions
réelles** — à valider par Julie après déploiement.

---

## 🔀 Fusion avec le dépôt GitHub — À FAIRE PAR JULIE AVANT DE DÉPLOYER

Ce paquet contient des `assets/` volontairement incomplets (seul
`Thenardier_neutre.png` et 3 sprites de gameplay sont inclus). Le
dépôt GitHub de Julie a des `assets/` plus fournis.

**Ne pas écraser `assets/` en bloc.** Remplacer uniquement :
`index.html`, `css/`, `js/`, `mondes/` (+ supprimer l'ancien
`js/core/main.js`, devenu inutile). Garder le `assets/` du dépôt tel
quel, sauf pour les 4 fichiers listés ci-dessus qui doivent être
ajoutés/remplacés dedans.

Méthode recommandée (fiable, gère les suppressions, contrairement à
l'upload web qui laisse traîner les anciens fichiers) :
```bash
git clone <URL_DU_DEPOT>
cd manuscrit-des-mondes
find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'assets' -exec rm -rf {} +
# copier ici index.html, css/, js/, mondes/ de ce paquet
# copier dans assets/characters/ le nouveau Thenardier_neutre.png
# copier dans assets/sprites/characters/ les 3 fichiers de sprites
git add -A
git commit -m "Restructuration navigation + refonte mini-jeu ponctuation + assets corrigés"
git push
```

---

## ⚠️ Dette technique héritée (toujours vraie, non traitée cette session)

Ces points viennent de la transmission du 13 juin et restent
d'actualité :
1. Boucle infinie potentielle si échec répété au mini-jeu sommatif —
   pas de filet de sécurité après N échecs.
2. Tour Finale non implémentée (juste calculée en état).
3. Pas de mode "rejouer un monde terminé".
4. Navigation par notion (`enterWorld(worldId, targetActIndex)`)
   existe en paramètre mais rien dans l'UI ne l'utilise.
5. Supabase toujours pas intégré — sauvegarde en `localStorage`
   uniquement.

---

## 🎯 Prochaines étapes suggérées

1. Julie fusionne ce paquet avec son dépôt GitHub (voir plus haut).
2. Déployer sur Netlify, tester : Nouvelle partie → carte → Monde 1 →
   Acte 1 (ponctuation, nouvelle version) de bout en bout.
3. Valider en particulier :
   - Les overlays d'instructions/résultat s'affichent-ils bien sur
     les 6 mini-jeux ?
   - Le rendu des sprites "combat" dans ordre-des-mots/sélection-info
     est-il acceptable, ou faut-il de vraies feuilles "marche" ?
   - Les portraits (Thénardier + les autres une fois ajoutés)
     s'affichent-ils au bon endroit dans `assets/characters/` ?
4. Ajouter les décors et portraits manquants (liste dans
   `LISEZ-MOI.md`).
5. Une fois le Monde 1 validé de bout en bout par Julie et testé avec
   des élèves si possible : démarrer le Monde 2 (Dumas), **dans une
   nouvelle conversation** pour repartir avec un contexte propre —
   en dupliquant `mondes/hugo.html` comme modèle et en appliquant les
   mêmes principes (chemins absolus, overlays mg-shared, mécaniques
   de mini-jeu réellement liées à la notion enseignée).
