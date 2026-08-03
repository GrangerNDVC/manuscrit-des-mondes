/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v3)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase.

   ---- CORRECTIONS (session du 3 août 2026) ----
   Trois problèmes remontés par Julie sur la v2, tous corrigés ici :

   1. L'ESPRIT VOLE, IL NE MARCHE PAS.
      L'animation de marche (cycle de 3 poses) n'avait aucun sens
      pour un être qui vole. `animFrame` est désormais FIGÉ sur la
      pose "pieds joints" (index du milieu de chaque feuille — face,
      dos, ET profil), quelle que soit la direction. À la place d'un
      cycle de marche, deux effets suggèrent le vol :
        - un léger flottement vertical continu (`flightPhase`,
          sinusoïde appliquée à la position Y de rendu) ;
        - un petit nuage de poussière lumineuse (`spawnDust()`) émis
          sous les pieds à chaque case franchie, qui monte et
          s'estompe (`particles`).

   2. CAISSES : DÉPLACEMENT FIN + VERTICAL.
      Avant : une caisse poussée GLISSAIT jusqu'au premier obstacle
      (mécanique façon Sokoban "glissant"), et ne pouvait être
      poussée qu'horizontalement — impossible d'intervertir deux
      caisses puisqu'elles ne peuvent jamais se croiser sur un seul
      axe. Corrigé :
        - une caisse poussée avance désormais D'UNE SEULE CASE à la
          fois, exactement comme le joueur (plus de glissement) ;
        - elle peut être poussée dans les 4 directions. Cela permet
          de sortir temporairement une caisse de la rangée du pont
          (vers le haut ou le bas, sur sa rive), de faire passer une
          autre caisse à cet endroit, puis de la redescendre — donc
          de réordonner les caisses.
        - Garde-fou logique : une caisse ne flotte pas. Elle ne peut
          jamais être poussée dans une case d'eau (le canal, en
          dehors de l'unique rangée du pont) — seul le joueur, qui
          vole, peut survoler l'eau librement.

   3. GAVROCHE : SENS, DISTANCE, ET CHUTE AVEC LES CAISSES.
      - Sprite retourné (`drawGavroche()`) pour qu'il coure bien vers
        la droite, dans le sens réel de la traversée (le fichier
        fourni semble orienté vers la gauche par défaut — à l'inverse
        de la convention utilisée pour l'Esprit).
      - Point de départ éloigné du bord du canevas et du canal
        (`GAVROCHE_START_X`), pour lui laisser une vraie course
        d'élan visible au lieu d'apparaître collé au bord.
      - Nouveau : si le pont est FAUX, les caisses qui le composaient
        au moment du déclenchement (`gavroche.bridgePieces`) coulent
        AVEC Gavroche — même fondu/chute qu'auparavant réservé à lui
        seul — puis réapparaissent réparties ailleurs sur les deux
        rives (`respawnPieces()`) une fois la chute terminée. Le
        joueur doit donc reconstruire le pont, pas seulement
        réessayer avec les caisses déjà alignées (fausses).

   Reste inchangé : banque de phrases, règle des 4 morceaux par
   phrase, notion/variante enregistrée ("ordre_des_mots" /
   "egouts_hugo") — aucune modification nécessaire ailleurs dans le
   code (hugo_scenes.json, sceneManager.js, etc.).
   ============================================================ */

(function registerOrdreMotsHugoV3() {

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

  const BRIDGE_ROW = 5; // rangée unique où le canal est franchissable

  const BG_SRC = "/assets/backgrounds/decors_egouts_traversee_hugo.jpg";

  const CRATE_IMAGES_SRC = {
    1: "/assets/sprites/props/boite-petite.png",
    2: "/assets/sprites/props/boite-moyenne.png",
    3: "/assets/sprites/props/boite-longue.png",
    4: "/assets/sprites/props/boite-tres-longue.png"
  };

  /**
   * Banque de phrases. La taille de chaque caisse (1 à 4) est
   * calculée automatiquement à partir du nombre de mots du morceau.
   * Contrainte technique inchangée : exactement 4 morceaux par
   * phrase, et la somme des tailles de deux morceaux quelconques ne
   * doit jamais dépasser 7 (marge pour le placement initial sur
   * chaque rive de 8 colonnes).
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
      objective: "L'Esprit vole : déplace-le avec les flèches (ou les boutons tactiles), il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser d'une case dans la direction où tu avances — y compris vers le haut ou le bas, pour la sortir du chemin d'une autre. Aligne les caisses dans le canal, dans le bon ordre pour reconstituer la phrase, puis clique sur « Faire traverser Gavroche ». Si l'ordre est bon, il passe. Sinon le pont cède : les caisses coulent avec lui, et il faut tout reconstruire."
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

      // Pose "pieds joints" figée sur les 3 feuilles (face/dos/profil) :
      // l'Esprit vole, il ne marche pas — plus de cycle d'animation.
      const IDLE_FRAME = 1;

      // --- Choix de la phrase ---
      const pitch = PITCH_BANK[Math.floor(Math.random() * PITCH_BANK.length)];
      const pieces = pitch.chunks.map((text, i) => ({
        chunkIndex: i,
        text,
        size: Math.min(4, text.split(" ").length),
        row: BRIDGE_ROW,
        colStart: 0
      }));

      /**
       * Une case d'eau : dans les colonnes du canal, sur n'importe
       * quelle rangée SAUF la rangée du pont. Le joueur (qui vole)
       * peut la traverser librement ; une caisse jamais.
       */
      function isWaterCell(col, row) {
        return col >= CANAL_START_COL && col < CANAL_END_COL && row !== BRIDGE_ROW;
      }

      function crateAt(col, row) {
        return pieces.find(p => row === p.row && col >= p.colStart && col < p.colStart + p.size);
      }

      /** Une autre caisse que `excludePiece` occupe-t-elle une des cases visées ? */
      function otherCratesOccupy(excludePiece, colStart, size, row) {
        for (let c = colStart; c < colStart + size; c++) {
          const occ = crateAt(c, row);
          if (occ && occ !== excludePiece) return true;
        }
        return false;
      }

      /**
       * Cherche une case libre sur l'une des deux rives (n'importe
       * quelle rangée, puisque les rives ne sont jamais de l'eau)
       * pour reposer une caisse qui vient de couler.
       */
      function findFreeSpotForPiece(piece) {
        const banks = [
          { start: 0, end: BANK_COLS },
          { start: RIGHT_BANK_START_COL, end: RIGHT_BANK_START_COL + BANK_COLS }
        ];
        const candidates = [];
        banks.forEach(bank => {
          for (let row = 0; row < ROWS; row++) {
            for (let col = bank.start; col + piece.size <= bank.end; col++) {
              candidates.push({ col, row });
            }
          }
        });
        shuffle(candidates);
        for (const c of candidates) {
          if (!otherCratesOccupy(piece, c.col, piece.size, c.row)) return c;
        }
        return { col: banks[0].start, row: 0 }; // filet de sécurité, ne devrait jamais servir
      }

      function respawnPieces(subset) {
        subset.forEach(piece => {
          const spot = findFreeSpotForPiece(piece);
          piece.colStart = spot.col;
          piece.row = spot.row;
        });
      }

      // --- Placement initial mélangé, réparti rive gauche / rive droite ---
      function placePiecesInitial() {
        const order = shuffle(pieces.map((_, i) => i));
        let leftCursor = 0;
        let rightCursor = RIGHT_BANK_START_COL;
        order.forEach((pieceIdx, k) => {
          const piece = pieces[pieceIdx];
          piece.row = BRIDGE_ROW;
          if (k % 2 === 0) {
            piece.colStart = leftCursor;
            leftCursor += piece.size + 1; // +1 case d'écart pour pouvoir pousser
          } else {
            piece.colStart = rightCursor;
            rightCursor += piece.size + 1;
          }
        });
      }
      placePiecesInitial();

      // --- Joueur (l'Esprit) ---
      const player = { col: 1, row: 1, facing: "down" };
      let flightPhase = 0; // flottement vertical continu (impression de vol)

      // --- Poussière lumineuse sous les pieds, émise au déplacement ---
      const particles = [];
      function spawnDust() {
        const px = player.col * CELL + CELL / 2;
        const py = player.row * CELL + CELL * 0.85;
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: px + (Math.random() - 0.5) * 14,
            y: py + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.35 - Math.random() * 0.5,
            life: 26,
            maxLife: 26
          });
        }
      }

      // --- Gavroche (purement visuel : hors grille, anime seulement la traversée) ---
      // Point de départ éloigné du bord gauche du canevas ET du canal,
      // pour une vraie course d'élan visible (avant : collé au bord).
      const GAVROCHE_START_X = 90;
      const gavrocheEndX = CANAL_END_COL * CELL + 90;
      const GAVROCHE_Y = BRIDGE_ROW * CELL + (CELL - 42) / 2;
      const gavroche = {
        x: GAVROCHE_START_X,
        crossing: false,
        falling: false,
        fallTriggered: false,
        fallTimer: 0,
        correct: false,
        bridgePieces: []
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

      /**
       * Déplacement du joueur, D'UNE SEULE CASE. S'il y a une caisse
       * sur la case visée, elle est poussée d'UNE SEULE CASE dans la
       * même direction (plus de glissement jusqu'au bout) — et dans
       * n'importe laquelle des 4 directions, avec un unique garde-fou :
       * une caisse ne peut jamais être poussée dans l'eau (le canal,
       * hors de la rangée du pont).
       */
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
          spawnDust();
          return;
        }

        const newColStart = blocking.colStart + dx;
        const newRow = blocking.row + dy;

        if (newColStart < 0 || newColStart + blocking.size > COLS) return;
        if (newRow < 0 || newRow >= ROWS) return;

        for (let c = newColStart; c < newColStart + blocking.size; c++) {
          if (isWaterCell(c, newRow)) return; // une caisse ne flotte pas
        }
        if (otherCratesOccupy(blocking, newColStart, blocking.size, newRow)) return;

        blocking.colStart = newColStart;
        blocking.row = newRow;
        player.col = targetCol;
        player.row = targetRow;
        spawnDust();
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
          .filter(p => p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL)
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
        // Capture les caisses actuellement dans le canal (bonnes ou
        // pas) : ce sont elles qui couleront si la traversée échoue.
        gavroche.bridgePieces = pieces.filter(p =>
          p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL
        );
        gavroche.correct = checkBridgeCorrect();
        gavroche.crossing = true;
        gavroche.falling = false;
        gavroche.fallTriggered = false;
        gavroche.x = GAVROCHE_START_X;
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
        flightPhase += 0.12;

        // --- Particules de poussière ---
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy; p.life--;
          if (p.life <= 0) particles.splice(i, 1);
        }

        // --- Traversée de Gavroche ---
        if (gavroche.crossing) {
          if (!gavroche.falling) {
            gavroche.x += CROSS_SPEED;
            const progress = (gavroche.x - GAVROCHE_START_X) / (gavrocheEndX - GAVROCHE_START_X);
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
              gavroche.x = GAVROCHE_START_X;
              // Les caisses qui formaient le (mauvais) pont coulent
              // avec lui : elles se réparties ailleurs sur les rives,
              // à reconstruire.
              respawnPieces(gavroche.bridgePieces);
              gavroche.bridgePieces = [];
              showFeedback("✗ Le pont cède... les caisses coulent, Gavroche retourne au départ.", "#d9534f");
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

      /**
       * Gavroche est dessiné RETOURNÉ (miroir horizontal) : la feuille
       * fournie semble orientée par défaut vers la gauche, à l'inverse
       * de la convention utilisée pour l'Esprit — sans ce retournement
       * il traversait le pont à reculons.
       */
      function drawGavroche(x, y, w, h, alpha) {
        const img = gavrocheSide[1];
        ctx.save();
        ctx.globalAlpha = alpha;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, w, h);
        } else {
          ctx.fillStyle = "#c0392b";
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
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
          const isSinking = gavroche.falling && gavroche.bridgePieces.includes(p);
          const sinkRatio = isSinking ? Math.max(0, gavroche.fallTimer / 40) : 1;

          const x = p.colStart * CELL;
          const y = p.row * CELL + CELL * 0.1 + (1 - sinkRatio) * 14;
          const w = p.size * CELL - 4;
          const h = CELL * 0.8;

          ctx.save();
          ctx.globalAlpha = sinkRatio;

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

          ctx.restore();
        });

        // --- Joueur (l'Esprit) : pose figée + léger flottement vertical ---
        const PW = 34, PH = 46;
        const bob = Math.sin(flightPhase) * 2;
        const px = player.col * CELL + (CELL - PW) / 2;
        const py = player.row * CELL + (CELL - PH) / 2 + bob;

        if (player.facing === "down") {
          drawSprite(espritFace, IDLE_FRAME, px, py, PW, PH, "#e8c468");
        } else if (player.facing === "up") {
          drawSprite(espritDos, IDLE_FRAME, px, py, PW, PH, "#e8c468");
        } else {
          const img = espritSide[IDLE_FRAME];
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

        // --- Poussière lumineuse ---
        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.7;
          ctx.fillStyle = "#e8c468";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // --- Gavroche ---
        const GW = 30, GH = 42;
        if (gavroche.falling) {
          const shrink = Math.max(0, gavroche.fallTimer / 40);
          drawGavroche(gavroche.x, GAVROCHE_Y + (1 - shrink) * 20, GW * shrink, GH * shrink, shrink);
        } else {
          drawGavroche(gavroche.x, GAVROCHE_Y, GW, GH, 1);
        }

        // --- Message de feedback ---
        if (feedbackTimer > 0) {
          ctx.fillStyle = "rgba(26,21,48,0.8)";
          ctx.fillRect(CANVAS_W / 2 - 240, 10, 480, 34);
          ctx.fillStyle = feedbackColor;
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(feedbackText, CANVAS_W / 2, 27);
        }
      }

      render();
      loop();
    });
  }

  SceneManager.registerMinigame("ordre_des_mots", "egouts_hugo", {
    title: "Le Pont de Gavroche",
    run
  });

})();
