/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v7)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase (+ ponctuation
   de fin de phrase).

   ---- CORRECTIONS v7 (contournement du bug "Gavroche n'avance
   toujours pas", voir TRANSMISSION_pont-de-gavroche-blocage-
   traversee.md) ----

   Sans accès à un navigateur en direct, impossible de confirmer
   avec certitude l'hypothèse de superposition CSS invisible
   (`.touch-controls` par-dessus le bouton `#mg-cross`, définie
   dans minigames.css, jamais transmis). Plutôt que de deviner à
   l'aveugle, cette version CONTOURNE le problème par plusieurs
   filets de sécurité indépendants :

   1. RACCOURCI CLAVIER (Entrée ou Espace) qui déclenche la
      traversée exactement comme le bouton — totalement insensible
      à un éventuel souci CSS, puisqu'il ne dépend d'aucun clic sur
      un élément HTML.
   2. Bouton "durci" : position/z-index forcés en `!important`
      directement en style inline, pour qu'aucun autre élément ne
      puisse passer par-dessus sans qu'on le voie (le bloc
      `.touch-controls` est lui aussi forcé à un z-index inférieur).
   3. Le bouton est récupéré via `uiContainer.querySelector(...)`
      plutôt que `document.getElementById(...)` : si une instance
      précédente du mini-jeu avait laissé un bouton fantôme ailleurs
      dans la page (même id), on ne risque plus de cibler le mauvais.
   4. `try/catch` à l'intérieur du minuteur de traversée : si une
      erreur imprévue survenait à un moment donné, elle ne bloque
      plus silencieusement tout le mini-jeu (bouton resté désactivé
      pour toujours, sans aucun message).
   5. Petits `console.log` de traçage (clic reçu, traversée démarrée)
      + indicateur visuel permanent "Pont : prêt / incomplet" en
      haut du canevas, pour voir immédiatement si le souci vient du
      clic lui-même ou d'autre chose, sans même ouvrir les DevTools.

   Aucune autre mécanique n'a été modifiée : déplacement de l'Esprit,
   poussée en chaîne des caisses, tailles/police, canal dynamique,
   ponctuation — tout reste identique à la v6, déjà validé par Julie.
   ============================================================ */

(function registerOrdreMotsHugoV7() {

  console.log("[Pont de Gavroche] Fichier mg-ordre-mots.js v7 chargé.");

  const CANVAS_W = 960;
  const CANVAS_H = 400;
  const CELL = 40;
  const COLS = CANVAS_W / CELL; // 24
  const ROWS = CANVAS_H / CELL; // 10

  const BRIDGE_ROW = 5; // rangée unique où le canal est franchissable

  const CRATE_COL_MIN = 1;
  const CRATE_COL_MAX = COLS - 1;
  const CRATE_ROW_MIN = 1;
  const CRATE_ROW_MAX = ROWS - 2;

  const BG_SRC = "/assets/backgrounds/decors_egouts_traversee_hugo.jpg";

  const CRATE_IMAGES_SRC = {
    1: "/assets/sprites/props/boite-petite.png",
    2: "/assets/sprites/props/boite-moyenne.png",
    3: "/assets/sprites/props/boite-longue.png",
    4: "/assets/sprites/props/boite-tres-longue.png"
  };

  const CRATE_FONT_SIZE = 12;
  const CRATE_TEXT_COLOR = "#d9b482";
  const CRATE_TEXT_PAD = 20;
  const MAX_CRATE_SIZE = 6;

  const PITCH_BANK = [
    { chunks: ["Dans les égouts", "Gavroche", "avançait", "sans un bruit"], punctuation: ".", hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["Sous les pavés", "l'Esprit", "guidait", "son ami"], punctuation: ".", hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["Frollo", "le", "suivait", "de près"], punctuation: ".", hint: "Le pronom complément (« le ») se place avant le verbe, jamais après." },
    { chunks: ["Gavroche", "la", "traversa", "en courant"], punctuation: ".", hint: "Le pronom complément (« la ») se place avant le verbe, jamais après." },
    { chunks: ["L'Esprit", "comprit", "vite", "le danger"], punctuation: ".", hint: "L'adverbe se colle juste après le verbe, avant le complément." },
    { chunks: ["Gavroche", "grimpa", "vite", "sur la caisse"], punctuation: ".", hint: "L'adverbe se colle juste après le verbe, avant le complément." },
    { chunks: ["Près du canal", "Frollo", "cherchait", "sa proie"], punctuation: ".", hint: "Le complément de lieu se place en tête de phrase." },
    { chunks: ["L'Esprit", "les", "empila", "avec soin"], punctuation: ".", hint: "Le pronom complément (« les ») se place avant le verbe, jamais après." },
    { chunks: ["Sans faire de bruit", "Gavroche", "franchit", "le pont"], punctuation: ".", hint: "Le complément de manière se place en tête de phrase." }
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
      objective: "L'Esprit vole : déplace-le avec les flèches (ou les boutons tactiles), il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser d'une case dans la direction où tu avances — y compris vers le haut ou le bas — et si plusieurs caisses se suivent, elles avancent toutes ensemble. Aligne les caisses-mots ET la petite caisse de ponctuation dans le canal, dans le bon ordre, puis clique sur « Faire traverser Gavroche » (ou appuie sur Entrée / Espace). Si l'ordre est bon, il passe. Sinon le pont cède : les caisses coulent avec lui, et il faut tout reconstruire."
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

      const IDLE_FRAME = 1;

      const pitch = PITCH_BANK[Math.floor(Math.random() * PITCH_BANK.length)];
      ctx.font = `${CRATE_FONT_SIZE}px sans-serif`;

      function sizeForText(text) {
        const textWidth = ctx.measureText(text).width;
        return Math.max(1, Math.min(MAX_CRATE_SIZE, Math.ceil((textWidth + CRATE_TEXT_PAD) / CELL)));
      }

      const pieces = pitch.chunks.map((text, i) => ({
        chunkIndex: i,
        text,
        size: sizeForText(text),
        isPunctuation: false,
        row: BRIDGE_ROW,
        colStart: 0
      }));
      pieces.push({
        chunkIndex: pieces.length,
        text: pitch.punctuation || ".",
        size: 1,
        isPunctuation: true,
        row: BRIDGE_ROW,
        colStart: 0
      });

      const CANAL_COLS = pieces.reduce((sum, p) => sum + p.size, 0);
      const CANAL_START_COL = Math.max(CRATE_COL_MIN, Math.floor((COLS - CANAL_COLS) / 2));
      const CANAL_END_COL = CANAL_START_COL + CANAL_COLS;
      const LEFT_BANK = { start: CRATE_COL_MIN, end: CANAL_START_COL };
      const RIGHT_BANK = { start: CANAL_END_COL, end: CRATE_COL_MAX };

      function isWaterCell(col, row) {
        return col >= CANAL_START_COL && col < CANAL_END_COL && row !== BRIDGE_ROW;
      }

      function crateAt(col, row) {
        return pieces.find(p => row === p.row && col >= p.colStart && col < p.colStart + p.size);
      }

      function otherCratesOccupy(excludeList, colStart, size, row) {
        for (let c = colStart; c < colStart + size; c++) {
          const occ = crateAt(c, row);
          if (occ && !excludeList.includes(occ)) return true;
        }
        return false;
      }

      function findFreeSpotForPiece(piece) {
        const preferred = [];
        const others = [];
        [LEFT_BANK, RIGHT_BANK].forEach(bank => {
          for (let row = CRATE_ROW_MIN; row <= CRATE_ROW_MAX; row++) {
            for (let col = bank.start; col + piece.size <= bank.end; col++) {
              (row === BRIDGE_ROW ? preferred : others).push({ col, row });
            }
          }
        });
        const candidates = shuffle(preferred).concat(shuffle(others));
        for (const c of candidates) {
          if (!otherCratesOccupy([piece], c.col, piece.size, c.row)) return c;
        }
        return { col: CRATE_COL_MIN, row: CRATE_ROW_MIN };
      }

      function respawnPieces(subset) {
        subset.forEach(piece => {
          const spot = findFreeSpotForPiece(piece);
          piece.colStart = spot.col;
          piece.row = spot.row;
        });
      }

      function placePiecesInitial() {
        shuffle(pieces).forEach(piece => {
          const spot = findFreeSpotForPiece(piece);
          piece.colStart = spot.col;
          piece.row = spot.row;
        });
      }
      placePiecesInitial();

      // --- Joueur (l'Esprit) ---
      const player = { col: 1, row: 1, facing: "down" };
      let flightPhase = 0;

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

      const GAVROCHE_START_X = Math.max(50, CANAL_START_COL * CELL - 110);
      const gavrocheEndX = CANAL_END_COL * CELL + 110;
      const GAVROCHE_Y = BRIDGE_ROW * CELL + (CELL - 42) / 2;
      const gavroche = {
        x: GAVROCHE_START_X,
        crossing: false,
        falling: false,
        fallTimer: 0,
        bridgePieces: []
      };

      let resultGiven = false;
      let feedbackTimer = 0;
      let feedbackText = "";
      let feedbackColor = "#f4f1ea";

      // v7 : bouton "durci" (z-index/position forcés en !important en
      // style inline) + rappel du raccourci clavier, et bloc tactile
      // explicitement placé derrière (z-index inférieur) pour éliminer
      // tout risque de superposition invisible.
      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — construis le pont dans le bon ordre</div>
        <div class="hud-item" id="mg-cross-wrapper" style="position:relative !important; z-index:1000 !important; pointer-events:auto !important;">
          <button id="mg-cross" type="button" class="touch-btn"
            style="position:relative !important; z-index:1000 !important; pointer-events:auto !important; width:auto;height:auto;border-radius:8px;padding:8px 16px;">
            🏃 Faire traverser Gavroche
          </button>
          <div style="font-size:11px; color:#c9c2e0; margin-top:4px;">(ou appuie sur Entrée / Espace)</div>
        </div>
        <div class="hud-item" id="mg-bridge-status" style="font-size:12px; color:#c9c2e0;"></div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls" style="position:relative !important; z-index:1 !important; display:grid; grid-template-columns:repeat(3,44px); grid-template-rows:repeat(2,44px); gap:4px; justify-content:center;">
          <div></div><button class="touch-btn" data-dir="up">▲</button><div></div>
          <button class="touch-btn" data-dir="left">◀</button><div></div><button class="touch-btn" data-dir="right">▶</button>
          <div></div><button class="touch-btn" data-dir="down">▼</button><div></div>
        </div>
      `);

      function buildHorizontalChain(first, dx) {
        const row = first.row;
        const chain = [first];
        let edge = dx > 0 ? first.colStart + first.size : first.colStart - 1;
        while (true) {
          const next = crateAt(edge, row);
          if (!next || chain.includes(next)) break;
          chain.push(next);
          edge = dx > 0 ? next.colStart + next.size : next.colStart - 1;
        }
        return { chain, edge };
      }

      function buildVerticalChain(first, dy) {
        const chain = [first];
        let edge = dy > 0 ? first.row + 1 : first.row - 1;
        while (true) {
          const next = pieces.find(p =>
            !chain.includes(p) && p.row === edge &&
            p.colStart === first.colStart && p.size === first.size
          );
          if (!next) break;
          chain.push(next);
          edge = dy > 0 ? next.row + 1 : next.row - 1;
        }
        return { chain, edge };
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
          spawnDust();
          return;
        }

        if (dx !== 0) {
          const { chain, edge } = buildHorizontalChain(blocking, dx);
          if (edge < 0 || edge >= COLS) return;
          if (isWaterCell(edge, blocking.row)) return;
          for (const c of chain) {
            const newStart = c.colStart + dx;
            if (newStart < CRATE_COL_MIN || newStart + c.size > CRATE_COL_MAX) return;
          }
          chain.forEach(c => { c.colStart += dx; });
        } else {
          const { chain, edge } = buildVerticalChain(blocking, dy);
          if (edge < CRATE_ROW_MIN || edge > CRATE_ROW_MAX) return;
          for (let c = blocking.colStart; c < blocking.colStart + blocking.size; c++) {
            if (isWaterCell(c, edge)) return;
          }
          chain.forEach(c => { c.row += dy; });
        }

        player.col = targetCol;
        player.row = targetRow;
        spawnDust();
      }

      // v7 : Entrée / Espace déclenchent aussi la traversée, en plus
      // du clic sur le bouton — chemin totalement indépendant, qui ne
      // dépend d'aucun positionnement CSS.
      function onKeyDown(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          console.log("[Pont de Gavroche] Raccourci clavier (Entrée/Espace) détecté.");
          attemptCrossing();
          return;
        }
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

      function isBridgeFull() {
        const inCanal = pieces.filter(p => p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL);
        return inCanal.length === pieces.length;
      }

      function showFeedback(text, color, durationFrames) {
        feedbackText = text;
        feedbackColor = color;
        feedbackTimer = durationFrames || 90;
      }

      // v7 : bouton récupéré via le conteneur du mini-jeu (pas
      // document.getElementById global) — évite de cibler un bouton
      // fantôme d'une instance précédente mal nettoyée si jamais deux
      // instances du mini-jeu coexistaient dans le DOM.
      const crossBtn = uiContainer.querySelector("#mg-cross");
      const bridgeStatusEl = uiContainer.querySelector("#mg-bridge-status");
      const CROSS_SPEED = 4;
      let crossInterval = null;

      function attemptCrossing() {
        if (gavroche.crossing || resultGiven) return;
        console.log("[Pont de Gavroche] attemptCrossing() démarrée.");

        gavroche.bridgePieces = pieces.filter(p =>
          p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL
        );
        const correct = checkBridgeCorrect();

        gavroche.crossing = true;
        gavroche.falling = false;
        gavroche.fallTimer = 0;
        gavroche.x = GAVROCHE_START_X;

        if (crossBtn) crossBtn.disabled = true;
        showFeedback("🏃 Gavroche s'élance sur le pont...", "#e8c468", 999);

        const fallTriggerX = GAVROCHE_START_X + (gavrocheEndX - GAVROCHE_START_X) * 0.5;
        let falling = false;
        let fallTimer = 0;

        clearInterval(crossInterval);
        crossInterval = setInterval(() => {
          // v7 : try/catch — si une erreur imprévue survient, elle ne
          // bloque plus silencieusement tout le mini-jeu (bouton
          // resté désactivé pour toujours sans aucun message).
          try {
            if (!falling) {
              gavroche.x += CROSS_SPEED;
              if (!correct && gavroche.x >= fallTriggerX) {
                falling = true;
                fallTimer = 40;
                gavroche.falling = true;
                gavroche.fallTimer = fallTimer;
              } else if (correct && gavroche.x >= gavrocheEndX) {
                clearInterval(crossInterval);
                endGame();
              }
            } else {
              fallTimer--;
              gavroche.fallTimer = fallTimer;
              if (fallTimer <= 0) {
                clearInterval(crossInterval);
                gavroche.crossing = false;
                gavroche.falling = false;
                gavroche.x = GAVROCHE_START_X;
                respawnPieces(gavroche.bridgePieces);
                gavroche.bridgePieces = [];
                if (crossBtn) crossBtn.disabled = false;
                showFeedback("✗ Le pont cède... les caisses coulent, Gavroche retourne au départ.", "#d9534f", 150);
              }
            }
          } catch (err) {
            console.error("[Pont de Gavroche] Erreur pendant la traversée — réinitialisation forcée pour ne pas bloquer le jeu.", err);
            clearInterval(crossInterval);
            gavroche.crossing = false;
            gavroche.falling = false;
            gavroche.x = GAVROCHE_START_X;
            if (crossBtn) crossBtn.disabled = false;
            showFeedback("Un problème technique est survenu, réessaie.", "#d9534f", 150);
          }
        }, 1000 / 60);
      }

      if (crossBtn) {
        crossBtn.addEventListener("click", () => {
          console.log("[Pont de Gavroche] Clic reçu sur le bouton de traversée.");
          attemptCrossing();
        });
      } else {
        console.error("[Pont de Gavroche] Bouton #mg-cross introuvable dans le DOM — le raccourci clavier (Entrée/Espace) reste disponible.");
      }

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        cancelAnimationFrame(rafId);
        clearInterval(crossInterval);
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        const fullSentence = pitch.chunks.join(" ") + (pitch.punctuation || ".");
        await MinigameUI.showResult({
          passed: true,
          message: `Gavroche traverse sain et sauf ! « ${fullSentence} » — ${pitch.hint}`
        });
        resolve({ passed: true, score: 1, total: 1 });
      }

      let rafId;
      function loop() {
        try {
          flightPhase += 0.12;

          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) particles.splice(i, 1);
          }

          if (feedbackTimer > 0) feedbackTimer--;

          if (bridgeStatusEl && !gavroche.crossing) {
            bridgeStatusEl.textContent = isBridgeFull()
              ? (checkBridgeCorrect() ? "Pont : complet — semble correct ✅" : "Pont : complet, mais dans le mauvais ordre ⚠️")
              : "Pont : incomplet";
          }

          render();
        } catch (err) {
          console.error("[Pont de Gavroche] Erreur dans la boucle de rendu :", err);
        }
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

        pieces.forEach(p => {
          const isSinking = gavroche.falling && gavroche.bridgePieces.includes(p);
          const sinkRatio = isSinking ? Math.max(0, gavroche.fallTimer / 40) : 1;

          const w = p.size * CELL - 4;
          const x = p.colStart * CELL + 2;
          const y = p.row * CELL + CELL * 0.1 + (1 - sinkRatio) * 14;
          const h = CELL * 0.8;

          ctx.save();
          ctx.globalAlpha = sinkRatio;

          const img = crateImages[Math.min(4, p.size)];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x, y, w, h);
          } else {
            ctx.fillStyle = "#7a5230";
            ctx.fillRect(x, y, w, h);
          }

          ctx.font = `${CRATE_FONT_SIZE}px sans-serif`;
          const textWidth = ctx.measureText(p.text).width;
          const plaqueW = Math.min(w - 6, textWidth + CRATE_TEXT_PAD);

          ctx.fillStyle = "rgba(26,21,48,0.65)";
          ctx.fillRect(x + (w - plaqueW) / 2, y + h / 2 - 10, plaqueW, 20);
          ctx.fillStyle = CRATE_TEXT_COLOR;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.text, x + w / 2, y + h / 2);

          ctx.restore();
        });

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

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.7;
          ctx.fillStyle = "#e8c468";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const GW = 30, GH = 42;
        if (gavroche.falling) {
          const shrink = Math.max(0, gavroche.fallTimer / 40);
          drawGavroche(gavroche.x, GAVROCHE_Y + (1 - shrink) * 20, GW * shrink, GH * shrink, shrink);
        } else {
          drawGavroche(gavroche.x, GAVROCHE_Y, GW, GH, 1);
        }

        if (feedbackTimer > 0) {
          ctx.fillStyle = "rgba(26,21,48,0.85)";
          ctx.fillRect(CANVAS_W / 2 - 260, 10, 520, 34);
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
