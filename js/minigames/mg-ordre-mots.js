/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v4)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase.

   ---- CORRECTIONS (session du 3 août 2026, suite au 1er test réel) ----
   Quatre problèmes remontés par Julie après avoir vraiment joué à la
   v3 (capture d'écran à l'appui) :

   1. CAISSES BLOQUÉES TROP PRÈS DU BORD DE L'ÉCRAN.
      Une caisse collée à la colonne 0 (bord gauche) ou à la dernière
      colonne (bord droit), ou aux rangées extrêmes (haut/bas), ne
      pouvait plus jamais être poussée dans cette direction : il
      aurait fallu que le joueur se tienne HORS du monde pour la
      pousser depuis "derrière" — impossible. Corrigé : les caisses ne
      peuvent plus jamais toucher les bords absolus du monde
      (`CRATE_COL_MIN`, `CRATE_COL_MAX`, `CRATE_ROW_MIN`,
      `CRATE_ROW_MAX`) — une marge d'une case est toujours réservée
      tout autour, pour que le joueur (qui vole, lui, sans restriction)
      puisse toujours se placer de l'autre côté.

   2. CAISSES "COINCÉES" AU-DESSUS DE L'EAU (ex. "vite" / "comprit").
      Deux caisses adjacentes ne pouvaient pas être poussées ensemble
      (l'ancienne mécanique ne poussait que LA caisse directement
      touchée) — si une troisième caisse bloquait juste derrière,
      tout se figeait, et comme il est interdit de sortir une caisse
      de l'eau ailleurs que sur la rangée du pont, il n'y avait alors
      plus aucun moyen de les déplacer. Corrigé : la poussée fonctionne
      maintenant EN CHAÎNE (`buildHorizontalChain` / `buildVerticalChain`)
      — pousser une caisse pousse aussi toutes celles alignées juste
      derrière elle, tant qu'il y a de la place au bout de la chaîne.

   3. CAISSES TROP PROCHES DE LA TAILLE DU MOT + TEXTE BLANC TROP VOYANT.
      La largeur de la caisse pouvait être plus étroite que son texte
      (selon la longueur réelle du mot une fois rendu), et le texte en
      blanc cassé tranchait trop fort sur le décor. Corrigé : la caisse
      est maintenant TOUJOURS dessinée un peu plus large que son texte
      (marge fixe des deux côtés, `CRATE_TEXT_PAD`), et le texte est
      recoloré dans un ton bois clair (`CRATE_TEXT_COLOR`) au lieu du
      blanc.

   4. LE BOUTON "FAIRE TRAVERSER GAVROCHE" SEMBLAIT NE RIEN FAIRE.
      Aucune erreur JS ne remonte dans la console au clic (vérifié sur
      la capture fournie) — le code s'exécute donc bien. L'hypothèse la
      plus probable : l'échec est très bref (Gavroche parcourt une
      partie du canal puis coule en un peu plus d'une seconde) et
      passait inaperçu, surtout avec l'attention sur les caisses.
      Corrigé, sans certitude à 100% que c'était LE souci, mais qui
      rend le problème visible si ça persiste :
        - retour visuel INSTANTANÉ dès le clic (indépendant de la boucle
          d'animation), bouton désactivé pendant la traversée pour
          éviter les double-clics silencieux ;
        - message d'échec conservé plus longtemps à l'écran ;
        - logs de diagnostic (`console.log`) à chaque étape clé
          (clic reçu, résultat évalué, chute déclenchée) : si le
          bouton semble encore inactif, regarder la console (F12) au
          moment du clic dira exactement où ça coince.

   Reste inchangé : banque de phrases, notion/variante enregistrée
   ("ordre_des_mots" / "egouts_hugo"), vol figé de l'Esprit + poussière
   lumineuse (v3), retournement + distance de Gavroche (v3).

   ⚠️ Contrainte resserrée sur la banque de phrases (section PITCH_BANK) :
   à cause de la marge de bord (point 1), chaque rive utilisable passe
   de 8 à 7 colonnes. La somme des tailles de deux morceaux quelconques
   d'une même phrase ne doit donc plus dépasser 7, mais 6. Vérifié :
   toutes les phrases actuelles respectent cette nouvelle limite.
   ============================================================ */

(function registerOrdreMotsHugoV4() {

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

  // Marge de bord réservée pour les CAISSES uniquement (jamais pour le
  // joueur, qui vole et peut toujours se placer n'importe où, y compris
  // sur la case bord elle-même, pour pousser une caisse depuis l'autre
  // côté). Sans cette marge, une caisse collée au bord ne peut plus
  // jamais être poussée dans cette direction — voir point 1 du header.
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

  // Rendu du texte porté par chaque caisse : ton bois clair (au lieu
  // du blanc cassé d'origine, jugé trop voyant), et marge fixe garantie
  // de chaque côté du mot pour que la caisse paraisse toujours un peu
  // plus grande que son texte, jamais pile ajustée dessus.
  const CRATE_TEXT_COLOR = "#d9b482";
  const CRATE_TEXT_PAD = 22; // marge (px) de chaque côté du texte

  /**
   * Banque de phrases. La taille de chaque caisse (1 à 4) est calculée
   * automatiquement à partir du nombre de mots du morceau. Contrainte
   * technique : exactement 4 morceaux par phrase, et la somme des
   * tailles de deux morceaux quelconques ne doit jamais dépasser 6
   * (marge resserrée depuis la v4 — voir avertissement en en-tête).
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
      objective: "L'Esprit vole : déplace-le avec les flèches (ou les boutons tactiles), il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser d'une case dans la direction où tu avances — y compris vers le haut ou le bas, pour la sortir du chemin d'une autre (et si plusieurs caisses se suivent, elles avancent toutes ensemble). Aligne les caisses dans le canal, dans le bon ordre pour reconstituer la phrase, puis clique sur « Faire traverser Gavroche ». Si l'ordre est bon, il passe. Sinon le pont cède : les caisses coulent avec lui, et il faut tout reconstruire."
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

      /** Une autre caisse que celles de `excludeList` occupe-t-elle une des cases visées ? */
      function otherCratesOccupy(excludeList, colStart, size, row) {
        for (let c = colStart; c < colStart + size; c++) {
          const occ = crateAt(c, row);
          if (occ && !excludeList.includes(occ)) return true;
        }
        return false;
      }

      /**
       * Cherche une case libre sur l'une des deux rives (dans les
       * limites de marge autorisées) pour reposer une caisse qui vient
       * de couler.
       */
      function findFreeSpotForPiece(piece) {
        const banks = [
          { start: CRATE_COL_MIN, end: BANK_COLS },
          { start: RIGHT_BANK_START_COL, end: CRATE_COL_MAX }
        ];
        const candidates = [];
        banks.forEach(bank => {
          for (let row = CRATE_ROW_MIN; row <= CRATE_ROW_MAX; row++) {
            for (let col = bank.start; col + piece.size <= bank.end; col++) {
              candidates.push({ col, row });
            }
          }
        });
        shuffle(candidates);
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

      // --- Placement initial mélangé, réparti rive gauche / rive droite ---
      function placePiecesInitial() {
        const order = shuffle(pieces.map((_, i) => i));
        let leftCursor = CRATE_COL_MIN;
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
       * caisses occupant EXACTEMENT la même plage de colonnes (cas
       * rare, mais géré par sécurité).
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
       * poussées EN CHAÎNE d'UNE SEULE CASE dans la même direction —
       * dans n'importe laquelle des 4 directions — avec deux
       * garde-fous : une caisse ne peut jamais être poussée dans l'eau
       * (le canal, hors de la rangée du pont), ni jamais toucher les
       * bords absolus du monde (voir CRATE_COL_MIN/MAX, CRATE_ROW_MIN/MAX).
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

      function attemptCrossing() {
        console.log("[Pont de Gavroche] Clic sur « Faire traverser Gavroche » reçu.");
        if (gavroche.crossing || resultGiven) {
          console.log("[Pont de Gavroche] Ignoré : traversée déjà en cours ou mini-jeu déjà terminé.");
          return;
        }
        // Capture les caisses actuellement dans le canal (bonnes ou
        // pas) : ce sont elles qui couleront si la traversée échoue.
        gavroche.bridgePieces = pieces.filter(p =>
          p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL
        );
        gavroche.correct = checkBridgeCorrect();
        console.log(`[Pont de Gavroche] Pont ${gavroche.correct ? "CORRECT" : "incorrect"} — ${gavroche.bridgePieces.length}/${pieces.length} caisse(s) dans le canal.`);
        gavroche.crossing = true;
        gavroche.falling = false;
        gavroche.fallTriggered = false;
        gavroche.x = GAVROCHE_START_X;

        // Retour visuel INSTANTANÉ, indépendant de la boucle d'animation,
        // et bouton désactivé pour éviter les double-clics pendant la
        // traversée (elle ne dure que ~1 à 3 secondes).
        if (crossBtn) crossBtn.disabled = true;
        showFeedback("🏃 Gavroche s'élance sur le pont...", "#e8c468", 200);
      }

      if (crossBtn) {
        crossBtn.addEventListener("click", attemptCrossing);
      } else {
        console.error("[Pont de Gavroche] Bouton #mg-cross introuvable dans le DOM au moment du branchement de l'écouteur.");
      }

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
        try {
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
                console.log("[Pont de Gavroche] Chute déclenchée (pont incorrect).");
                gavroche.falling = true;
                gavroche.fallTriggered = true;
                gavroche.fallTimer = 40;
              } else if (gavroche.correct && gavroche.x >= gavrocheEndX) {
                console.log("[Pont de Gavroche] Traversée réussie.");
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
                if (crossBtn) crossBtn.disabled = false;
                showFeedback("✗ Le pont cède... les caisses coulent, Gavroche retourne au départ.", "#d9534f", 150);
              }
            }
          }

          if (feedbackTimer > 0) feedbackTimer--;

          render();
        } catch (err) {
          // Filet de sécurité : si une erreur survient dans la boucle,
          // on la voit clairement en console au lieu de figer le
          // mini-jeu sans aucune explication.
          console.error("[Pont de Gavroche] Erreur dans la boucle de jeu :", err);
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
        pieces.forEach(p => {
          const isSinking = gavroche.falling && gavroche.bridgePieces.includes(p);
          const sinkRatio = isSinking ? Math.max(0, gavroche.fallTimer / 40) : 1;

          ctx.font = "12px sans-serif";
          const textWidth = ctx.measureText(p.text).width;
          const baseW = p.size * CELL - 4;
          // La caisse est toujours dessinée un peu plus large que son
          // texte (marge fixe des deux côtés), jamais pile ajustée.
          const w = Math.max(baseW, textWidth + CRATE_TEXT_PAD * 2);
          // Recentrée sur l'emplacement d'origine si elle a dû s'élargir.
          const x = p.colStart * CELL + (baseW - w) / 2 + 2;
          const y = p.row * CELL + CELL * 0.1 + (1 - sinkRatio) * 14;
          const h = CELL * 0.8;

          ctx.save();
          ctx.globalAlpha = sinkRatio;

          const img = crateImages[p.size];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x, y, w, h);
          } else {
            ctx.fillStyle = "#7a5230";
            ctx.fillRect(x, y, w, h);
          }

          ctx.fillStyle = "rgba(26,21,48,0.65)";
          ctx.fillRect(x + (w - (textWidth + CRATE_TEXT_PAD)) / 2, y + h / 2 - 10, textWidth + CRATE_TEXT_PAD, 20);
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
