/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v6)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase (+ ponctuation
   de fin de phrase, réintégrée cette version).

   ---- CORRECTIONS (session du 4 août 2026) ----

   1. GAVROCHE NE TRAVERSAIT TOUJOURS PAS.
      Plutôt que d'ajouter encore des diagnostics, la traversée est
      désormais gérée par un minuteur (`setInterval`) TOTALEMENT
      INDÉPENDANT de la boucle de rendu principale (`loop()` /
      `requestAnimationFrame`). Avant, l'avancée de Gavroche, la
      détection de la chute et la réinitialisation dépendaient toutes
      d'un empilement de conditions dans la même fonction `loop()` que
      tout le reste (particules, déplacement du joueur...) — un point
      d'interaction mal identifié pouvait silencieusement empêcher la
      progression sans qu'aucune erreur ne remonte. Le nouveau
      mécanisme (`attemptCrossing()`) ne dépend plus que de son propre
      minuteur : il avance Gavroche, vérifie la chute et se
      réinitialise entièrement seul, sans jamais passer par `loop()`.
      `loop()` ne fait plus que LIRE l'état de Gavroche pour l'afficher
      (rendu), jamais le modifier.

   2. PONCTUATION ABSENTE.
      Réintégrée : chaque phrase a maintenant, en plus de ses 4
      morceaux-mots, UNE petite caisse de ponctuation (`.` par défaut)
      à placer en dernière position — même mécanique que dans "L'Assaut
      des Barricades" (acte 1), reprise ici sur une caisse dédiée,
      toujours de petite taille.

   3. TAILLE DE POLICE INCONSTANTE + CAISSES NE REMPLISSANT PAS LE CANAL.
      Cause identifiée : la taille d'une caisse (nombre de cases)
      était basée sur le NOMBRE DE MOTS du morceau, pas sur la
      longueur réelle du texte une fois rendu — un mot long comme
      "L'Esprit" dans une caisse "1 mot" obligeait à réduire sa police
      pour tenir, d'où des tailles de police différentes d'une caisse
      à l'autre. Corrigé à la racine :
        - la taille de chaque caisse (en cases) est maintenant calculée
          à partir de la largeur RÉELLE du texte, mesurée à une police
          CONSTANTE (`CRATE_FONT_SIZE`, jamais modifiée) — chaque
          caisse est ainsi toujours un peu plus grande que son texte,
          à taille de police identique partout ;
        - le CANAL N'A PLUS UNE LARGEUR FIXE : sa largeur est calculée
          à chaque partie pour correspondre EXACTEMENT à la somme des
          tailles des 5 caisses (4 mots + ponctuation) de la phrase du
          jour. Une fois le pont correctement reconstitué, les caisses
          remplissent donc TOUJOURS la totalité du canal, quelle que
          soit la longueur de la phrase — plus jamais d'espace vide
          résiduel sur les côtés.
      Effet de bord positif : la contrainte manuelle "la somme de deux
      morceaux ne doit pas dépasser X cases" (présente dans les
      versions précédentes) disparaît complètement — le canal et les
      rives s'adaptent désormais automatiquement à n'importe quelle
      longueur de phrase, sans calcul de capacité à vérifier à la main
      à chaque ajout de phrase dans PITCH_BANK.

   Le placement initial des caisses (et leur réapparition après une
   chute) utilise la même fonction de recherche de case libre
   (`findFreeSpotForPiece`), qui préfère la rangée du pont mais
   accepte n'importe quelle rangée autorisée si besoin — plus de
   calcul de curseur manuel, donc plus de risque de dépassement.

   Reste inchangé : vol figé de l'Esprit + poussière lumineuse,
   poussée en chaîne des caisses, marge de bord infranchissable pour
   les caisses, retournement de Gavroche, notion/variante enregistrée
   ("ordre_des_mots" / "egouts_hugo").
   ============================================================ */

(function registerOrdreMotsHugoV6() {

  const CANVAS_W = 960;
  const CANVAS_H = 400;
  const CELL = 40;
  const COLS = CANVAS_W / CELL; // 24
  const ROWS = CANVAS_H / CELL; // 10

  const BRIDGE_ROW = 5; // rangée unique où le canal est franchissable

  // Marge de bord réservée pour les CAISSES uniquement (jamais pour le
  // joueur, qui vole et peut toujours se placer n'importe où, y compris
  // sur la case bord elle-même, pour pousser une caisse depuis l'autre
  // côté).
  const CRATE_COL_MIN = 1;
  const CRATE_COL_MAX = COLS - 1;   // une caisse ne doit jamais atteindre colStart+size > ceci
  const CRATE_ROW_MIN = 1;
  const CRATE_ROW_MAX = ROWS - 2;   // une caisse ne doit jamais atteindre row > ceci

  const BG_SRC = "/assets/backgrounds/decors_egouts_traversee_hugo.jpg";

  const CRATE_IMAGES_SRC = {
    1: "/assets/sprites/props/boite-petite.png",
    2: "/assets/sprites/props/boite-moyenne.png",
    3: "/assets/sprites/props/boite-longue.png",
    4: "/assets/sprites/props/boite-tres-longue.png"
  };

  // Rendu du texte porté par chaque caisse : police CONSTANTE (jamais
  // réduite au cas par cas — voir point 3 du header) et ton bois clair
  // (au lieu du blanc cassé d'origine, jugé trop voyant).
  const CRATE_FONT_SIZE = 12;
  const CRATE_TEXT_COLOR = "#d9b482";
  const CRATE_TEXT_PAD = 20;  // marge totale visée autour du texte, utilisée pour calculer la taille de la caisse
  const MAX_CRATE_SIZE = 6;   // sécurité anti-débordement pour un morceau exceptionnellement long

  /**
   * Banque de phrases. `punctuation` est le signe porté par la petite
   * caisse de fin de phrase (point par défaut ; à varier au cas par
   * cas si Julie souhaite plus de diversité — non prioritaire pour
   * cette session).
   */
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
      objective: "L'Esprit vole : déplace-le avec les flèches (ou les boutons tactiles), il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser d'une case dans la direction où tu avances — y compris vers le haut ou le bas — et si plusieurs caisses se suivent, elles avancent toutes ensemble. Aligne les caisses-mots ET la petite caisse de ponctuation dans le canal, dans le bon ordre, puis clique sur « Faire traverser Gavroche ». Si l'ordre est bon, il passe. Sinon le pont cède : les caisses coulent avec lui, et il faut tout reconstruire."
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
      // l'Esprit vole, il ne marche pas — pas de cycle d'animation.
      const IDLE_FRAME = 1;

      // --- Choix de la phrase, et calcul de la taille de chaque caisse
      //     à partir de la largeur RÉELLE du texte (police constante). ---
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

      // --- Canal DYNAMIQUE : sa largeur correspond exactement à la
      //     somme des tailles des caisses de cette phrase, centré sur
      //     le plateau. Les deux rives se partagent le reste. ---
      const CANAL_COLS = pieces.reduce((sum, p) => sum + p.size, 0);
      const CANAL_START_COL = Math.max(CRATE_COL_MIN, Math.floor((COLS - CANAL_COLS) / 2));
      const CANAL_END_COL = CANAL_START_COL + CANAL_COLS;
      const LEFT_BANK = { start: CRATE_COL_MIN, end: CANAL_START_COL };
      const RIGHT_BANK = { start: CANAL_END_COL, end: CRATE_COL_MAX };

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

      /** Une autre caisse que celles de `excludeList` occupe-t-elle une des cases visées ? */
      function otherCratesOccupy(excludeList, colStart, size, row) {
        for (let c = colStart; c < colStart + size; c++) {
          const occ = crateAt(c, row);
          if (occ && !excludeList.includes(occ)) return true;
        }
        return false;
      }

      /**
       * Cherche une case libre sur l'une des deux rives pour une
       * caisse — utilisée à la fois pour le placement initial et pour
       * la réapparition après une chute. Préfère la rangée du pont
       * (esthétique : les caisses démarrent alignées), mais accepte
       * n'importe quelle rangée autorisée si nécessaire.
       */
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
        return { col: CRATE_COL_MIN, row: CRATE_ROW_MIN }; // filet de sécurité, ne devrait jamais servir
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

      // --- Gavroche (purement visuel : hors grille, anime seulement la
      //     traversée). Position calculée à partir du canal DYNAMIQUE. ---
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
       * Rassemble la CHAÎNE de caisses alignées à partir de `first`,
       * dans la direction (dx,0). Renvoie la chaîne complète et la
       * première case libre juste après son dernier élément.
       */
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

      /**
       * Idem pour une chaîne verticale (0,dy). Ne concerne que des
       * caisses occupant EXACTEMENT la même plage de colonnes.
       */
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

      /**
       * Déplacement du joueur, D'UNE SEULE CASE. S'il y a une (ou
       * plusieurs) caisse(s) alignée(s) sur la case visée, elles sont
       * poussées EN CHAÎNE d'UNE SEULE CASE dans la même direction,
       * avec deux garde-fous : jamais dans l'eau hors de la rangée du
       * pont, jamais au-delà des bords absolus du monde.
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

      function showFeedback(text, color, durationFrames) {
        feedbackText = text;
        feedbackColor = color;
        feedbackTimer = durationFrames || 90;
      }

      const crossBtn = document.getElementById("mg-cross");
      const CROSS_SPEED = 4;
      let crossInterval = null;

      /**
       * Traversée de Gavroche — mécanisme AUTONOME (son propre
       * minuteur), qui ne dépend d'aucune autre boucle du jeu. Avance
       * Gavroche, détecte la chute si besoin, et se réinitialise
       * entièrement seul à la fin. `loop()` ne fait que LIRE
       * `gavroche.x` / `gavroche.falling` pour l'afficher — jamais les
       * modifier.
       */
      function attemptCrossing() {
        if (gavroche.crossing || resultGiven) return;

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
              // Les caisses qui formaient le (mauvais) pont coulent
              // avec lui : elles se répartissent ailleurs sur les
              // rives, à reconstruire.
              respawnPieces(gavroche.bridgePieces);
              gavroche.bridgePieces = [];
              if (crossBtn) crossBtn.disabled = false;
              showFeedback("✗ Le pont cède... les caisses coulent, Gavroche retourne au départ.", "#d9534f", 150);
            }
          }
        }, 1000 / 60);
      }

      if (crossBtn) crossBtn.addEventListener("click", attemptCrossing);

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

      /**
       * Gavroche est dessiné RETOURNÉ (miroir horizontal) : la feuille
       * fournie semble orientée par défaut vers la gauche, à l'inverse
       * de la convention utilisée pour l'Esprit.
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
        // Largeur AFFICHÉE toujours strictement égale à la largeur
        // LOGIQUE (p.size*CELL) : aucun chevauchement possible. La
        // taille elle-même a été choisie (voir sizeForText) pour que
        // le texte, à police CONSTANTE, tienne toujours avec une
        // marge confortable — jamais l'inverse.
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
