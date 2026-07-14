# Le Manuscrit des Mondes — nouvelle architecture

## Ce qui a changé

- **Un fichier HTML par monde** : `index.html` est le hub (menu + carte),
  `mondes/hugo.html` est le Monde 1. Pour ajouter un monde, on copie
  `mondes/hugo.html`, on change le nom du monde, les scripts de mini-jeux
  chargés en bas de page, et on l'ajoute dans `WORLD_PAGES` au début de
  `js/core/hubManager.js`.
- **Tous les chemins sont absolus** (`/css/...`, `/js/...`, `/assets/...`),
  jamais relatifs. C'est ce qui réglait le bug de la carte qui ne menait
  nulle part : peu importe la profondeur de la page qui charge une
  ressource, le chemin reste correct.
- `sceneManager.js` ne gère plus que VN + mini-jeu (le contenu d'un
  monde). `hubManager.js` ne gère que menu/intro/carte. Ils ne se
  chargent jamais tous les deux sur la même page.

## ⚠️ Point de vigilance n°1 — comment ouvrir le projet

Les chemins absolus (`/css/main.css`) ne fonctionnent que si le site
est servi par un vrai serveur HTTP (Live Server dans VS Code, ou
Netlify une fois déployé). Si vous double-cliquez sur `index.html`
pour l'ouvrir directement dans le navigateur (`file://...`), les
chemins absolus ne résolvent plus correctement. Utilisez toujours
"Open with Live Server" en local.

## ⚠️ Point de vigilance n°2 — assets manquants

Le Monde 1 est câblé et fonctionnera de bout en bout niveau logique,
mais les images suivantes sont attendues par `js/data/hugo_scenes.json`
et ne sont pas encore présentes (elles s'afficheront comme des images
cassées, sans bloquer le jeu) :

```
/assets/backgrounds/decors_Hugo_Paris_Nuit.png
/assets/backgrounds/decors_Hugo_baricades.png
/assets/backgrounds/decors_Hugo_egouts.png
/assets/backgrounds/decors_Hugo_interieur_Notre_Dame.png
/assets/backgrounds/decors_Hugo_parvis_Notre_Dame.png
/assets/portraits/Casimodo_neutre.png
/assets/portraits/Casimodo_surpris.png
/assets/portraits/Esmeralda_sourire.png
/assets/portraits/Frolo_colère.png
/assets/portraits/Frolo_neutre.png
/assets/portraits/Frolo_vaincu.png
/assets/portraits/Jean_Valjean.png
/assets/portraits/Thenardier_neutre.png
/assets/portraits/Thenardier_vaincu.png
/assets/portraits/esprit-*.png (4 postures)
/assets/portraits/gavroche-*.png (6 postures)
```

Déposez-les simplement dans `assets/backgrounds/` et `assets/portraits/`
avec ces noms exacts.

## ⚠️ Point de vigilance n°3 — sprites Gavroche

`gavroche-marche.png` et `gavroche-combat.png` sont déjà en place dans
`assets/sprites/characters/` (bons noms). Les fichiers
`Gravroche-sheet-sprite-*.png` (avec la faute de frappe) que vous aviez
uploadés semblent être une version alternative/plus ancienne — à
supprimer ou ignorer pour éviter la confusion.

## Prochaine étape recommandée

1. Déployer cette structure telle quelle sur Netlify (remplace tout
   le contenu du dépôt GitHub).
2. Tester : Nouvelle partie → Passer l'intro → cliquer sur "hugo" sur
   la carte → vérifier que le premier acte (ponctuation) se lance.
3. Ajouter les images manquantes une fois la mécanique validée.
4. Pour le Monde 2 (Dumas) : dupliquer `mondes/hugo.html` en
   `mondes/dumas.html`, créer `js/data/dumas_scenes.json`, écrire les
   mini-jeux `mg-*-dumas.js`, et ajouter `dumas: "/mondes/dumas.html"`
   dans `WORLD_PAGES` (`js/core/hubManager.js`).
