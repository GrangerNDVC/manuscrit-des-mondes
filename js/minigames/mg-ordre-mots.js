/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v2)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase.

   ---- REFONTE COMPLÈTE (session du 2 août 2026) ----
   Remplace entièrement l'ancienne version ("La Course dans les
   Égouts", plateforme à défilement automatique + sauts) suite au
   retour de Julie : mécanique jugée illisible et peu cohérente
   avec l'histoire. Conçu cette fois EN AMONT avec elle avant
   codage. Nouveau principe :

   - Vue de dessus (façon Zelda), scène FIXE (pas de défilement) :
     une rive à gauche, une rive à droite, un canal vertical au
     centre (voir le décor `decors_egouts_traversee_hugo.jpg`).
   - Le joueur incarne l'Esprit (qui vole, donc jamais bloqué par
     l'eau) et pousse des caisses-mots façon Sokoban : une caisse
     poussée GLISSE jusqu'à ce qu'elle rencontre un obstacle (bord
     de l'écran ou une autre caisse) — un seul mouvement suffit,
     pas besoin de la pousser case par case.
   - Chaque caisse porte un morceau de la phrase ; sa taille
     (petite/moyenne/longue/très longue) correspond au nombre de
     mots qu'elle contient — calculé automatiquement à partir du
     texte, pas besoin de l'indiquer à la main dans la banque.
   - Une fois les caisses alignées dans le canal, dans l'ordre
     voulu, le joueur déclenche la traversée de Gavroche. Si
     l'ordre est bon, il passe. Sinon, le pont cède : Gavroche
     retourne au point de départ, mais LES CAISSES RESTENT À LEUR
     PLACE (retry libre, décidé avec Julie — pas de retour à zéro
     complet).
   - Les phrases de la banque intègrent volontairement une petite
     subtilité au-delà du simple "sujet-verbe-complément" (adapté
     cycle 4, pas juste cycle 3) : complément de lieu/manière en
     tête de phrase, pronom complément placé avant le verbe, ou
     adverbe collé juste après le verbe — trois pièges différents,
     mélangés dans la banque pour ne pas être mécaniquement
     devinables.

   ⚠️ SIMPLIFICATION ASSUMÉE (à signaler à Julie, pas discutée en
   détail) : pour rester robuste sans pouvoir tester en conditions
   réelles, les caisses ne se déplacent qu'HORIZONTALEMENT, et ne
   démarrent que sur la ligne du pont (même rangée que le canal),
   réparties sur les deux rives. Le joueur peut se déplacer
   librement dans les 4 directions (vol de l'Esprit), mais les
   caisses elles-mêmes n'ont pas besoin d'être manœuvrées
   verticalement. Si Julie veut une vraie liberté de placement 2D
   pour les caisses, c'est une évolution possible mais plus
   complexe (gérée dans une future session).

   ASSETS REQUIS (fournis par Julie cette session) :
     /assets/backgrounds/decors_egouts_traversee_hugo.jpg
     /assets/sprites/props/boite-petite.png   (1 mot)
     /assets/sprites/props/boite-moyenne.png  (2 mots)
     /assets/sprites/props/boite-longue.png   (3 mots)
     /assets/sprites/props/boite-tres-longue.png (4 mots)
     /assets/sprites/characters/esprit-face-1/2/3.png   (vue de face)
     /assets/sprites/characters/esprit-dos-1/2/3.png    (vue de dos)
     /assets/sprites/characters/esprit-marche-0..5.png  (déjà existant,
       vue de profil, réutilisé pour gauche/droite — mêmes fichiers
       que mg-ponctuation.js)
     /assets/sprites/characters/gavroche-marche-1/2/3.png (traversée)
   Frollo n'a pas de sprite dédié pour l'instant — pas de mécanique
   de menace/temps limite dans cette v1, juste l'ambiance dans le
   texte d'intro du VN (voir hugo_scenes.json, acte ordre_des_mots).

   Enregistré sous la même notion/variante qu'avant
   ("ordre_des_mots" / "egouts_hugo") : hugo_scenes.json et tout le
   reste du code n'ont besoin d'aucune modification.
   ============================================================ */

(function registerOrdreMotsHugoV2() {

  const CANVAS_W = 960;
  const CANVAS_H = 400;
  const CELL = 40;
  const COLS = CANVAS_W / CELL; // 24
  const ROWS = CANVAS_H / CELL; // 10

  const BANK_COLS = 8;
  const CANAL_COLS = 8;
  const CANAL_START_COL = BANK_COLS;               // 8
  const CANAL_END_COL = CANAL_START_COL + CANAL_COLS; // 16 (exclusif)
  const RIGHT_BANK_START_COL = CANAL_END_COL;       // 16

  const BRIDGE_ROW = 5; // rangée unique où vivent le canal et les caisses

  const BG_SRC = "/assets/backgrounds/decors_egouts_traversee_hugo.jpg";

  const CRATE_IMAGES_SRC = {
    1: "/assets/sprites/props/boite-petite.png",
    2: "/assets/sprites/props/boite-moyenne.png",
    3: "/assets/sprites/props/boite-longue.png",
    4: "/assets/sprites/props/boite-tres-longue.png"
  };

  /**
   * Banque de phrases. La taille de chaque caisse (1 à 4) est
   * calculée automatiquement à partir du nombre de mots du morceau
   * — pas besoin de l'indiquer ici. Chaque phrase contient EXACTEMENT
   * 4 morceaux (contrainte technique : garantit que le placement
   * initial, réparti 2 par rive, tient toujours dans les 8 colonnes
   * de chaque rive — voir le calcul dans le commentaire plus bas,
   * au niveau du placement). Si de nouvelles phrases sont ajoutées,
   * respecter ces deux règles :
   *   - 4 morceaux exactement ;
   *   - la somme des tailles de deux morceaux quelconques ne doit
   *     jamais dépasser 7 (marge d'1 case pour pouvoir pousser).
   */
  const PITCH_BANK = [
    { chunks: ["Dans les égouts", "Gavroche", "avançait", "sans un bruit"], hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["Sous les pavés", "l'Esprit", "guidait", "son ami"], hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["Frollo", "le", "suivait", "de près"], hint: "Le pronom complément (« le ») se place avant le verbe, jamais après." },
    { chunks: ["Gavroche", "la", "traversa", "en courant"], hint: "Le pronom complément (« la ») se place avant le verbe, jamais après." },
    { chunks: ["L'Esprit", "comprit", "vite", "le danger"], hint: "L'adverbe se colle juste après le verbe, avant le complément." },
    { chunks: ["Gavroche", "grimpa", "vite", "sur la caisse"], hint: "L'adverbe se colle juste après le verbe, avant le complément." },
    { chunks: ["Près du canal", "Frollo", "cherchait", "sa proie"], hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["L'Esprit", "les", "empila", "avec soin"], hint: "Le pronom complément (« les ») se place avant le verbe, jamais après." },
    { chunks: ["Sans faire de bruit", "Gavroche", "franchit", "le pont"], hint: "Le complément de manière se place en tête de phrase." }
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Le Pont de Gavroche",
      objective: "L'Esprit peut voler : déplace-le avec les flèches (ou les boutons tactiles) dans les égouts, il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser : elle glisse jusqu'à ce qu'elle rencontre un obstacle. Aligne les caisses dans le canal, dans le bon ordre pour reconstituer la phrase, puis clique sur « Faire traverser Gavroche ». Si l'ordre est bon, il passe sans problème. Sinon le pont cède — il retourne au départ, mais les caisses restent où tu les as laissées : tu peux réessayer librement."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      // --- Assets ---
      const bgImage = loadImg(BG_SRC);
      const crateImages = {
        1: loadImg(CRATE_IMAGES_SRC[1]),
        2: loadImg(CRATE_IMAGES_SRC[2]),
        3: loadImg(CRATE_IMAGES_SRC[3]),
        4: loadImg(CRATE_IMAGES_SRC[4])
      };
      const espritFace = [1, 2, 3].map(n => loadImg(`/assets/sprites/characters/esprit-face-${n}.png`));
      const espritDos = [1, 2, 3].map(n => loadImg(`/assets/sprites/characters/esprit-dos-${n}.png`));
      const espritSide = [0, 1, 2, 3, 4, 5].map(n => loadImg(`/assets/sprites/characters/esprit-marche-${n}.png`));
      const gavrocheSide = [1, 2, 3].map(n => loadImg(`/assets/sprites/characters/gavroche-marche-${n}.png`));

      // --- Choix de la phrase ---
      const pitch = PITCH_BANK[Math.floor(Math.random() * PITCH_BANK.length)];
      const pieces = pitch.chunks.map((text, i) => ({
        chunkIndex: i,
        text,
        size: Math.min(4, text.split(" ").length),
        row: BRIDGE_ROW
      }));

      // --- Placement initial mélangé, réparti rive gauche / rive droite ---
      const order = shuffle(pieces.map((_, i) => i));
      let leftCursor = 0;
      let rightCursor = RIGHT_BANK_START_COL;
      order.forEach((pieceIdx, k) => {
        const piece = pieces[pieceIdx];
        if (k % 2 === 0) {
          piece.colStart = leftCursor;
          leftCursor += piece.size + 1; // +1 case d'écart pour pouvoir pousser
        } else {
          piece.colStart = rightCursor;
          rightCursor += piece.size + 1;
        }
      });

      // --- Joueur (l'Esprit) ---
      const player = { col: 1, row: 1, facing: "down" };
      let movingTimer = 0;
      let animTimer = 0;
      let animFrame = 1; // frame du milieu = pose neutre

      // --- Gavroche (purement visuel : hors grille, anime seulement la traversée) ---
      const gavrocheStartX = CANAL_START_COL * CELL - 30;
      const gavrocheEndX = CANAL_END_COL * CELL + 30;
      const GAVROCHE_Y = BRIDGE_ROW * CELL + (CELL - 42) / 2;
      const gavroche = {
        x: gavrocheStartX,
        crossing: false,
        falling: false,
        fallTriggered: false,
        fallTimer: 0,
        correct: false
      };

      let resultGiven = false;
      let feedbackTimer = 0;
      let feedbackText = "";
      let feedbackColor = "#f4f1ea";

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — construis le pont dans le bon ordre</div>
        <div class="hud-item"><button id="mg-cross" class="touch-btn" style="width:auto;height:auto;border-radius:8px;padding:8px 16px;">🏃 Faire traverser Gavroche</button></div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls" style="display:grid; grid-template-columns:repeat(3,44px); grid-template-rows:repeat(2,44px); gap:4px; justify-content:center;">
          <div></div><button class="touch-btn" data-dir="up">▲</button><div></div>
          <button class="touch-btn" data-dir="left">◀</button><div></div><button class="touch-btn" data-dir="right">▶</button>
          <div></div><button class="touch-btn" data-dir="down">▼</button><div></div>
        </div>
      `);

      function crateAt(col, row) {
        return pieces.find(p => row === p.row && col >= p.colStart && col < p.colStart + p.size);
      }

      function tryMove(dx, dy) {
        if (gavroche.crossing) return;
        const targetCol = player.col + dx;
        const targetRow = player.row + dy;
        if (targetCol < 0 || targetCol >= COLS || targetRow < 0 || targetRow >= ROWS) return;

        if (dx !== 0) player.facing = dx > 0 ? "right" : "left";
        else if (dy !== 0) player.facing = dy > 0 ? "down" : "up";

        const blocking = crateAt(targetCol, targetRow);
        if (!blocking) {
          player.col = targetCol;
          player.row = targetRow;
          movingTimer = 20;
          return;
        }

        // Une caisse ne se pousse qu'horizontalement — cohérent avec
        // le fait qu'elle est toujours cantonnée à la rangée du pont.
        if (dy !== 0) return;

        const dir = dx > 0 ? 1 : -1;
        let slide = 0;
        let checkCol = dir > 0 ? blocking.colStart + blocking.size : blocking.colStart - 1;
        while (checkCol >= 0 && checkCol < COLS && !crateAt(checkCol, BRIDGE_ROW)) {
          slide++;
          checkCol += dir;
        }
        if (slide === 0) return; // bloquée tout de suite : rien ne bouge

        blocking.colStart += slide * dir;
        player.col = targetCol;
        movingTimer = 20;
      }

      function onKeyDown(e) {
        const map = {
          ArrowUp: [0, -1], z: [0, -1], Z: [0, -1], w: [0, -1], W: [0, -1],
          ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
          ArrowLeft: [-1, 0], q: [-1, 0], Q: [-1, 0], a: [-1, 0], A: [-1, 0],
          ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
        };
        const dir = map[e.key];
        if (dir) { tryMove(dir[0], dir[1]); e.preventDefault(); }
      }
      window.addEventListener("keydown", onKeyDown);

      uiContainer.querySelectorAll(".touch-btn[data-dir]").forEach(btn => {
        const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const d = deltas[btn.dataset.dir];
        btn.addEventListener("click", () => tryMove(d[0], d[1]));
      });

      function checkBridgeCorrect() {
        const inCanal = pieces
          .filter(p => p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL)
          .sort((a, b) => a.colStart - b.colStart);
        if (inCanal.length !== pieces.length) return false;
        for (let i = 0; i < inCanal.length; i++) {
          if (inCanal[i].chunkIndex !== i) return false;
          if (i > 0 && inCanal[i].colStart !== inCanal[i - 1].colStart + inCanal[i - 1].size) return false;
        }
        return true;
      }

      function showFeedback(text, color) {
        feedbackText = text;
        feedbackColor = color;
        feedbackTimer = 90;
      }

      function attemptCrossing() {
        if (gavroche.crossing || resultGiven) return;
        gavroche.correct = checkBridgeCorrect();
        gavroche.crossing = true;
        gavroche.falling = false;
        gavroche.fallTriggered = false;
        gavroche.x = gavrocheStartX;
      }

      document.getElementById("mg-cross").addEventListener("click", attemptCrossing);

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        cancelAnimationFrame(rafId);
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: `Gavroche traverse sain et sauf ! « ${pitch.chunks.join(" ")} » — ${pitch.hint}`
        });
        resolve({ passed: true, score: 1, total: 1 });
      }

      const CROSS_SPEED = 4;

      let rafId;
      function loop() {
        // --- Animation du joueur (uniquement pendant un court instant après un mouvement) ---
        if (movingTimer > 0) {
          movingTimer--;
          animTimer++;
          if (animTimer >= 8) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
        } else {
          animTimer = 0;
          animFrame = 1;
        }

        // --- Traversée de Gavroche ---
        if (gavroche.crossing) {
          if (!gavroche.falling) {
            gavroche.x += CROSS_SPEED;
            const progress = (gavroche.x - gavrocheStartX) / (gavrocheEndX - gavrocheStartX);
            if (!gavroche.correct && progress >= 0.5 && !gavroche.fallTriggered) {
              gavroche.falling = true;
              gavroche.fallTriggered = true;
              gavroche.fallTimer = 40;
            } else if (gavroche.correct && gavroche.x >= gavrocheEndX) {
              endGame();
              return;
            }
          } else {
            gavroche.fallTimer--;
            if (gavroche.fallTimer <= 0) {
              gavroche.crossing = false;
              gavroche.falling = false;
              gavroche.x = gavrocheStartX;
              showFeedback("✗ Le pont cède... Gavroche retourne au départ.", "#d9534f");
            }
          }
        }

        if (feedbackTimer > 0) feedbackTimer--;

        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      function drawSprite(images, index, x, y, w, h, fallback) {
        const img = images[index];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.fillStyle = fallback;
          ctx.fillRect(x, y, w, h);
        }
      }

      function render() {
        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // --- Caisses ---
        pieces.forEach(p => {
          const x = p.colStart * CELL;
          const y = p.row * CELL + CELL * 0.1;
          const w = p.size * CELL - 4;
          const h = CELL * 0.8;
          const img = crateImages[p.size];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x + 2, y, w, h);
          } else {
            ctx.fillStyle = "#7a5230";
            ctx.fillRect(x + 2, y, w, h);
          }

          ctx.font = "12px sans-serif";
          const textWidth = ctx.measureText(p.text).width;
          const plaqueW = Math.min(w - 6, textWidth + 12);
          ctx.fillStyle = "rgba(26,21,48,0.65)";
          ctx.fillRect(x + (w - plaqueW) / 2 + 2, y + h / 2 - 10, plaqueW, 20);
          ctx.fillStyle = "#f4f1ea";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.text, x + w / 2 + 2, y + h / 2);
        });

        // --- Joueur (l'Esprit) ---
        const PW = 34, PH = 46;
        const px = player.col * CELL + (CELL - PW) / 2;
        const py = player.row * CELL + (CELL - PH) / 2;
        if (player.facing === "down") {
          drawSprite(espritFace, animFrame, px, py, PW, PH, "#e8c468");
        } else if (player.facing === "up") {
          drawSprite(espritDos, animFrame, px, py, PW, PH, "#e8c468");
        } else {
          const img = espritSide[animFrame];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            if (player.facing === "left") {
              ctx.translate(px + PW, py);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0, PW, PH);
            } else {
              ctx.drawImage(img, px, py, PW, PH);
            }
            ctx.restore();
          } else {
            ctx.fillStyle = "#e8c468";
            ctx.fillRect(px, py, PW, PH);
          }
        }

        // --- Gavroche ---
        const GW = 30, GH = 42;
        ctx.save();
        if (gavroche.falling) {
          const shrink = Math.max(0, gavroche.fallTimer / 40);
          ctx.globalAlpha = shrink;
          drawSprite(gavrocheSide, 1, gavroche.x, GAVROCHE_Y + (1 - shrink) * 20, GW * shrink, GH * shrink, "#c0392b");
        } else {
          drawSprite(gavrocheSide, 1, gavroche.x, GAVROCHE_Y, GW, GH, "#c0392b");
        }
        ctx.restore();

        // --- Message de feedback ---
        if (feedbackTimer > 0) {
          ctx.fillStyle = "rgba(26,21,48,0.8)";
          ctx.fillRect(CANVAS_W / 2 - 220, 10, 440, 34);
          ctx.fillStyle = feedbackColor;
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(feedbackText, CANVAS_W / 2, 27);
        }
      }

      loop();
    });
  }

  SceneManager.registerMinigame("ordre_des_mots", "egouts_hugo", {
    title: "Le Pont de Gavroche",
    run
  });

})();
