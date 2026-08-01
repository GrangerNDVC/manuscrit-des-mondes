# Le Manuscrit des Mondes — État du projet
Dernière mise à jour : 1er août 2026

---

## ⚠️ Mode d'emploi de ce document

Ce fichier remplace tous les `TRANSMISSION*.md` comme source de vérité.
Contrairement à une transmission (un journal qui décrit *une session*),
celui-ci décrit **l'état actuel du projet**, point final.

**Règle : à chaque session, ce document est réécrit en entier**, pas
complété par-dessus. Ce qui est résolu disparaît des sections "en
attente" ; ce qui change de statut est mis à jour à sa place, pas
ajouté en bas. Le but est qu'une seule lecture de ce fichier suffise
toujours à savoir où on en est, sans avoir à recouper plusieurs
fichiers historiques.

Les anciens `TRANSMISSION*.md` et `LISEZ-MOI.md` peuvent rester dans le
projet pour l'archive, mais ne doivent plus être considérés comme
fiables sur l'état courant — certains contiennent déjà des informations
périmées (ex. liste d'assets manquants qui sont en fait déjà tous là).

En cas de doute entre ce document et un ancien fichier de transmission,
**ce document fait foi**. En cas de doute entre ce document et le code
réel, **le code fait foi** — ce document doit être corrigé en conséquence.

---

## 1. Le concept (fixe, ne change pas d'une session à l'autre)

**Type** : serious game éducatif HTML, déployable en ligne, pour élèves
de 12 ans apprenant à écrire. Ambiance manga / style Genshin Impact.
Visual novel inductif + mini-jeux applicatifs. Zéro compétence en
programmation requise de l'enseignante (Julie) — tout le code est écrit
par Claude.

**Aucune compétence en dev requise de Julie** : elle fournit le contenu
pédagogique, la direction artistique, les retours de test ; Claude
écrit et corrige tout le code.

### Histoire cadre
Un antagoniste (nom provisoire **l'Empereur Noir**, à retravailler)
emprisonne les auteurs et autrices classiques pour soustraire la
culture aux hommes et mieux les asservir. De l'esprit fusionné des 8
auteurs emprisonnés jaillit **l'Esprit de la Littérature** — un être de
lumière androgyne, sans mémoire — envoyé dans le monde des livres pour
retrouver les 8 clés nécessaires à leur libération. **Il faut les 8
clés réunies pour libérer les 8 auteurs simultanément** — pas un par
un.

Chaque monde-livre contient une clé, gardée par un **personnage
principal** qui devient l'allié de l'Esprit (Gavroche chez Hugo), avec
des personnages adjuvants et des personnages opposants (ex. Thénardier,
retourné par l'Empereur Noir).

**Le jeu est ouvert** : on peut entrer par n'importe quel monde, dans
n'importe quel ordre. Les 8 mondes sont structurés de façon identique.

### Voix / personnage joueur
L'Esprit de la Littérature : androgyne, translucide, lumineux, jamais
genré dans les dialogues (« l'Esprit » / « toi »). Défendable en
contexte catholique (anges asexués selon Saint Thomas d'Aquin). Halo de
couleur personnalisable, deux tailles (enfantine / élancée). Sprite
RPG Maker MZ dans les mini-jeux.

### Les 8 mondes
| Monde | Auteur·ice prisonnier·ère | Compagnon libéré |
|---|---|---|
| 1 | Victor Hugo | Gavroche |
| 2 | Alexandre Dumas | D'Artagnan |
| 3 | Jules Verne | Capitaine Nemo (pan-asiatique) |
| 4 | William Shakespeare | Puck (préado traits africains, fée) |
| 5 | Agatha Christie | Miss Marple |
| 6 | Mary Shelley | La Créature (ambigu) |
| 7 | Lewis Carroll | Alice |
| 8 | Antoine Galland | Shéhérazade |

### Structure pédagogique — 6 actes identiques dans chaque monde
1. Ponctuation
2. Ordre des mots / structure de la phrase
3. Propositions subordonnées
4. Cohérence du paragraphe
5. Sélection d'informations / pertinence
6. Construction d'une histoire

Dans chaque acte : **intro VN → QCM théorique (méchant) → exercice
formatif VN → [remédiation par mini-jeu si échec] → mini-jeu sommatif →
exercice de transfert différé VN → [remédiation si échec] → acte
suivant**.

### Principe pédagogique central : logique spiralaire
Le jeu répète toujours la même structure (mêmes 6 notions, même
enchaînement) à travers les 8 mondes, mais **sans jamais répéter le
cours en entier** à chaque monde — sinon c'est trop long et ennuyeux.
Chaque monde doit apporter **une spécificité propre** (mécanique de
mini-jeu différente, angle narratif différent) tout en ancrant
progressivement la même notion. Le mini-jeu sert à ancrer par la
répétition ludique ; le VN ne doit pas ré-expliquer la théorie en
entier à chaque fois.

**Conséquence pratique actée cette session** : le passage théorique de
l'intro du Monde 1 (Hugo) est identifié comme **trop long** — à
raccourcir. Les 5 autres mécaniques de mini-jeu (hors ponctuation) ont
été jugées **trop faciles**. Point précis à corriger sur la
ponctuation : le point d'exclamation crée une ambiguïté légitime avec
le point simple dans certains contextes — les exercices doivent
**tolérer les deux réponses** quand le cas est intrinsèquement
ambigu, plutôt que d'imposer une seule bonne réponse arbitraire.

---

## 2. Stack technique (fixe)

- **Langage** : HTML / CSS / JS pur, zéro framework, zéro build.
- **Portraits VN** : générés par Nanobana (Gemini), style Genshin
  Impact, fond bleu `#0000FF` détouré automatiquement au chargement par
  `chromaKeyFilter.js`.
- **Sprites mini-jeux** : RPG Maker MZ Character Generator, feuilles
  144×192 (grille 3×4 de cellules 48×48), mais seul le bloc [0][0]
  contient un personnage réel sur les feuilles fournies à ce jour (voir
  détail dans le code de `mg-ponctuation.js`).
- **Sauvegarde progression pédagogique** : Supabase (table
  `notions_progression`), via `authManager.js` + `syncManager.js` +
  `progressionMapper.js`. Sauvegarde de session/état de jeu : `localStorage`
  via `gameState.js`.
- **Chaîne de déploiement — BRANCHÉE ET FONCTIONNELLE** :
  GitHub → Netlify → Supabase. Confirmé par Julie cette session.
- **Éditeur** : VS Code, projet sur Drive/clé USB.

---

## 3. Architecture des fichiers (état réel du code, vérifié ce jour)

```
index.html              ← hub : menu, connexion, intro, carte des mondes
mondes/hugo.html         ← Monde 1, page autonome (VN + 6 mini-jeux)

js/core/
  gameState.js            commun à toutes les pages, source de vérité progression
  hubManager.js            gère UNIQUEMENT le hub (menu/login/intro/carte)
  sceneManager.js           gère UNIQUEMENT VN + mini-jeu d'un monde
  authManager.js            session Supabase (connexion élève)
  syncManager.js            envoi progression vers Supabase
  progressionMapper.js       calcule % + étoiles par notion pour Supabase
  devPanel.js                panneau de test (marque une étape "terminée" sans jouer)

js/vn/
  vnEngine.js               moteur d'affichage VN (scènes, QCM, 6 types d'exercices)
  vnParser.js                charge js/data/<world>_scenes.json
  chromaKeyFilter.js          détourage auto du fond bleu des portraits

js/minigames/
  mg-shared.js               overlays communs (instructions avant / résultat après)
  mg-ponctuation.js           "L'Assaut des Barricades" — v9, le plus abouti
  mg-ordre-mots.js            "La Course dans les Égouts"
  mg-subordonnees.js          "Les Cloches de Notre-Dame" (memory)
  mg-coherence-paragraphe.js  "Le Rangement de Quasimodo" (drag & drop)
  mg-selection-info.js        "Le Tri de Valjean"
  mg-construction-recit.js    "Le Récit de Gavroche"

js/data/
  hugo_scenes.json          ← TOUT le scénario/dialogues du Monde 1 (seul monde écrit à ce jour)

⚠️ main.js existe encore dans le dossier projet mais est OBSOLÈTE
   (remplacé par hubManager.js) — à ne jamais réintégrer, et à
   supprimer du dépôt GitHub s'il y est encore.
```

**Règle d'or du projet** : tous les chemins (`css/`, `js/`, `assets/`,
fetch JSON) sont **absolus depuis la racine** (`/css/main.css`, jamais
`css/main.css`). Un chemin relatif casse selon la profondeur de la page
qui l'utilise. Le site doit tourner sur un vrai serveur HTTP (Live
Server ou Netlify), jamais en `file://`.

**Pour ajouter un monde** : dupliquer `mondes/hugo.html`, créer
`js/data/<worldId>_scenes.json`, écrire ses `mg-*.js`, l'ajouter dans
`WORLD_PAGES` (`hubManager.js`).

---

## 4. État d'avancement réel

### ✅ Fonctionne, confirmé par Julie
- Chaîne GitHub → Netlify → Supabase entièrement branchée.
- Navigation hub → carte → Monde 1 (Hugo).
- Le premier mini-jeu (ponctuation) fonctionne.
- Détourage chroma key des portraits.

### 🔧 Corrigé cette session, à re-déployer et re-tester
- **Bug de boucle infinie de fin d'acte** (`sceneManager.js`,
  `runActSequence`) : un échec au **transfert différé final** relançait
  tout l'acte depuis l'intro (retour à la rencontre Gavroche) au lieu
  de ne relancer que le transfert avec remédiation ciblée. Corrigé :
  même logique de boucle ciblée que l'exercice formatif. **Fichier livré,
  pas encore redéployé/re-testé par Julie.**

### ❓ Non vérifié / statut inconnu
- Test réel des 3 manches (facile/moyen/difficile) du mini-jeu
  ponctuation v11 — vérifié seulement en syntaxe, jamais joué en
  conditions réelles jusqu'au bout.
- Rendu des sprites "combat" (esprit-combat.png / gavroche-combat.png)
  utilisés provisoirement comme sprite jouable dans les mini-jeux à
  déplacement (ordre-des-mots, sélection-info) — pas encore validé
  visuellement.
- État des assets (Julie indique que les décors sont bien tous présents
  — donc la liste "manquants" de `LISEZ-MOI.md` est caduque ; statut des
  portraits de personnages non re-vérifié).

### 🚧 En attente, contenu requis de Julie
- **Transition narrative Gavroche → Thénardier** dans `hugo_scenes.json` :
  jugée trop soudaine. Bloqué faute de connaître le passage exact où
  Gavroche s'écarte et où Thénardier arrive — besoin du texte source ou
  d'une description de la scène voulue.

### 📋 Décidé mais pas encore fait
- Raccourcir le passage théorique de l'intro du Monde 1 (Hugo).
- Difficulté trop faible sur les 5 mini-jeux hors ponctuation (ordre des
  mots, subordonnées, cohérence paragraphe, sélection info, construction
  récit) — pas encore retravaillée.
- Tolérance multi-réponses pour les trous de ponctuation ambigus
  (point / point d'exclamation) : nécessite de faire évoluer le modèle
  de données `correct: "."` → `correct: [".", "!"]` (dans
  `hugo_scenes.json` ET `mg-ponctuation.js`), et la logique de
  validation associée (`vnEngine.js` pour les trous VN, `mg-ponctuation.js`
  pour le mini-jeu). Impact transversal — à faire consciemment, pas
  juste sur Hugo, car ça change un contrat de données partagé.

---

## 5. Dette technique connue (hors urgence)

1. Pas de filet de sécurité après N échecs répétés à un mini-jeu (risque
   de frustration prolongée, différent du bug de boucle qui, lui, est
   corrigé).
2. Tour Finale non implémentée (juste calculée dans l'état : `towerUnlocked`).
3. Pas de mode "rejouer un monde terminé".
4. Navigation ciblée par notion (`enterWorld(worldId, targetActIndex)`)
   existe en paramètre théorique mais aucune UI ne s'en sert.
5. `devPanel.js` ne joue pas réellement les 4 phases d'un acte — ne peut
   pas servir à valider un parcours réel, seulement à peupler Supabase
   pour tester la sync.

---

## 6. Seul monde écrit à ce jour

**Monde 1 (Hugo)** uniquement. Les 7 autres mondes (Dumas, Verne,
Shakespeare, Christie, Shelley, Carroll, Galland) n'ont ni page HTML, ni
fichier de scènes JSON, ni mini-jeux — seuls leurs IDs et hotspots sur
la carte existent déjà dans `gameState.js` / `hubManager.js`.

**Décision actée** : ne démarrer le Monde 2 qu'une fois le Monde 1
entièrement validé de bout en bout par Julie (et idéalement testé avec
des élèves), pour repartir sur un modèle éprouvé plutôt que de propager
un défaut connu sur 7 mondes.

---

## 7. Prochaines étapes, par priorité

1. Julie redéploie `sceneManager.js` corrigé, teste le Monde 1 de bout
   en bout (y compris en échouant volontairement au transfert final,
   pour confirmer que la boucle ne revient plus à l'intro).
2. Traiter la tolérance point / point d'exclamation sur la ponctuation
   (changement de modèle de données transversal).
3. Raccourcir l'intro théorique + réévaluer la difficulté des 5
   mini-jeux jugés trop faciles.
4. Fournir le passage Gavroche → Thénardier pour écrire la transition.
5. Une fois tout ça validé : démarrer le Monde 2 (Dumas) en dupliquant
   le modèle Hugo.
