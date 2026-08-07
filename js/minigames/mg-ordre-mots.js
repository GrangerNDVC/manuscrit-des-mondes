/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js (v9)
   ============================================================
   Mini-jeu "Le Pont de Gavroche" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase, virgule
   après un complément circonstanciel en tête de phrase, et
   tolérance de placement pour les compléments circonstanciels
   qui ne sont pas fixés en tête de phrase.

   ---- CORRECTIONS v9 (retours de Julie après test de la v7 —
   la v8 n'avait en réalité jamais été sauvegardée à cause d'une
   erreur technique, donc ces deux lots de corrections sont
   fusionnés ici) ----

   1. VIRGULE MANQUANTE APRÈS UN COMPLÉMENT CIRCONSTANCIEL EN
      TÊTE DE PHRASE, + TOLÉRANCE DE PLACEMENT.
      Ancien format : `chunks: [...]` avec un seul ordre correct
      possible, jamais de virgule. Nouveau format par phrase :
        - `pieces`: liste de morceaux à pousser (mots ET virgules,
          les virgules étant maintenant des caisses à part entière,
          minuscules, comme la ponctuation finale) ;
        - `correctOrders`: TABLEAU d'ordres acceptés (des
          permutations d'indices dans `pieces`), pas un seul ordre
          figé. La ponctuation finale est toujours implicitement en
          dernière position, ajoutée automatiquement.
      Règle appliquée pour CHAQUE phrase de la banque (voir
      commentaires par phrase ci-dessous) :
        - un complément circonstanciel qui commence par une
          MAJUSCULE est nécessairement en tête de phrase → une
          seule caisse-virgule est ajoutée juste après lui, et un
          seul `correctOrders` est fourni (pas de tolérance : la
          majuscule fixe déjà sa place) ;
        - un complément circonstanciel SANS majuscule (donc pas en
          tête) peut, quand deux phrases s'y prêtent, être permuté
          avec un autre complément circonstanciel également mobile
          — dans ce cas `correctOrders` contient plusieurs
          permutations acceptées, et aucune virgule n'est requise.

   2. CAISSES QUI SE "FIGENT" DE FAÇON ÉTRANGE — bug réel trouvé.
      Le déplacement VERTICAL d'une chaîne de caisses ne vérifiait
      la présence d'une AUTRE caisse sur la case d'arrivée que si
      elle avait EXACTEMENT la même largeur et le même alignement
      que celle poussée (voir l'ancienne `buildVerticalChain`,
      filtrait par `colStart === first.colStart && size === first.size`).
      Une caisse de taille différente sur cette case (fréquent
      maintenant qu'il y a aussi des petites caisses-virgules)
      pouvait donc passer inaperçue de cette vérification, menant à
      un chevauchement SILENCIEUX de deux caisses au même endroit —
      et une fois ce chevauchement produit, les déplacements
      suivants paraissent incohérents ou bloqués, ce qui correspond
      exactement à ce qui a été signalé. Corrigé : après avoir
      construit la chaîne (qui ne concerne toujours que les caisses
      alignées de même taille, seules capables d'avancer ensemble),
      une vérification SUPPLÉMENTAIRE et GÉNÉRALE détecte désormais
      n'importe quelle autre caisse — de n'importe quelle taille —
      sur la case d'arrivée, et bloque le mouvement si c'est le cas.

   3. LE JEU RÉVÉLAIT LA RÉPONSE AVANT LA TRAVERSÉE.
      L'indicateur affiché en permanence ("Pont : complet — semble
      correct ✅ / mauvais ordre ⚠️") appelait checkBridgeCorrect()
      avant même que l'élève ne lance la traversée. Corrigé :
      l'indicateur dit uniquement "Pont : complet" ou
      "Pont : incomplet" — jamais si l'ordre est bon. Seule la
      traversée elle-même (réussie ou ratée) révèle la réponse.

   4. GAVROCHE TROP BAS ("passe dessous les caisses").
      Sa position verticale est maintenant calée pour que ses PIEDS
      restent toujours au-dessus (ou au même niveau) du HAUT visuel
      des caisses, jamais en dessous — au lieu d'être calée près de
      leur bas comme avant, ce qui donnait l'impression qu'il
      marchait derrière/sous elles.

   Tout le reste (raccourci clavier Entrée/Espace, bouton durci,
   récupération du bouton via uiContainer, try/catch de sécurité,
   déplacement, poussée en chaîne horizontale, tailles/police,
   canal dynamique) reste inchangé.
   ============================================================ */

(function registerOrdreMotsHugoV9() {

  console.log("[Pont de Gavroche] Fichier mg-ordre-mots.js v9 chargé.");

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

  const GAVROCHE_GW = 30;
  const GAVROCHE_GH = 42;
  // v9 : petit espace de sécurité entre les pieds de Gavroche et le
  // haut visuel des caisses, pour qu'il ne les touche/chevauche
  // jamais (voir point 4 du header) — garantit qu'il apparaît
  // toujours AU-DESSUS, jamais en dessous.
  const GAVROCHE_CLEARANCE_ABOVE_CRATES = 4;

  /**
   * Banque de phrases. `pieces` liste les morceaux à replacer dans
   * le canal (mots ET virgules, dans un ordre de référence quelconque
   * — pas forcément l'ordre correct). `correctOrders` liste TOUS les
   * ordres (permutations d'indices dans `pieces`) considérés comme
   * corrects. La ponctuation finale n'est jamais incluse dans
   * `pieces`/`correctOrders` : elle est ajoutée automatiquement à la
   * toute fin, quelle que soit la phrase.
   */
  const PITCH_BANK = [
    // Complément circonstanciel EN TÊTE (majuscule) → virgule requise
    // juste après lui, un seul ordre accepté.
    {
      pieces: ["Dans les égouts", ",", "Gavroche", "avançait", "sans un bruit"],
      correctOrders: [[0, 1, 2, 3, 4]],
      punctuation: ".",
      hint: "« Dans les égouts » est un complément de lieu placé en tête de phrase : il est suivi d'une virgule, et sa position ne peut pas changer."
    },
    {
      pieces: ["Sous les pavés", ",", "l'Esprit", "guidait", "son ami"],
      correctOrders: [[0, 1, 2, 3, 4]],
      punctuation: ".",
      hint: "« Sous les pavés » est un complément de lieu placé en tête de phrase : il est suivi d'une virgule, et sa position ne peut pas changer."
    },
    {
      pieces: ["Près du canal", ",", "Frollo", "cherchait", "sa proie"],
      correctOrders: [[0, 1, 2, 3, 4]],
      punctuation: ".",
      hint: "« Près du canal » est un complément de lieu placé en tête de phrase : il est suivi d'une virgule, et sa position ne peut pas changer."
    },
    {
      pieces: ["Sans faire de bruit", ",", "Gavroche", "franchit", "le pont"],
      correctOrders: [[0, 1, 2, 3, 4]],
      punctuation: ".",
      hint: "« Sans faire de bruit » est un complément de manière placé en tête de phrase : il est suivi d'une virgule, et sa position ne peut pas changer."
    },

    // Pronom complément avant le verbe — aucune virgule, ordre unique
    // (la place du pronom, elle, n'est jamais mobile).
    {
      pieces: ["Frollo", "le", "suivait", "de près"],
      correctOrders: [[0, 1, 2, 3]],
      punctuation: ".",
      hint: "Le pronom complément (« le ») se place avant le verbe, jamais après."
    },
    {
      pieces: ["Gavroche", "la", "traversa", "en courant"],
      correctOrders: [[0, 1, 2, 3]],
      punctuation: ".",
      hint: "Le pronom complément (« la ») se place avant le verbe, jamais après."
    },
    {
      pieces: ["L'Esprit", "les", "empila", "avec soin"],
      correctOrders: [[0, 1, 2, 3]],
      punctuation: ".",
      hint: "Le pronom complément (« les ») se place avant le verbe, jamais après."
    },

    // Adverbe collé au verbe — pas de virgule, ordre unique.
    {
      pieces: ["L'Esprit", "comprit", "vite", "le danger"],
      correctOrders: [[0, 1, 2, 3]],
      punctuation: ".",
      hint: "L'adverbe se colle juste après le verbe, avant le complément."
    },
    {
      pieces: ["Gavroche", "grimpa", "vite", "sur la caisse"],
      correctOrders: [[0, 1, 2, 3]],
      punctuation: ".",
      hint: "L'adverbe se colle juste après le verbe, avant le complément."
    },

    // v9 : NOUVEAU — compléments circonstanciels SANS majuscule (donc
    // pas en tête de phrase) : leur ordre entre eux est réellement
    // interchangeable, pas de virgule nécessaire dans ce cas. Deux
    // ordres différents sont acceptés.
    {
      pieces: ["L'Esprit", "avança", "sans un bruit", "dans les égouts"],
      correctOrders: [
        [0, 1, 2, 3],
        [0, 1, 3, 2]
      ],
      punctuation: ".",
      hint: "« sans un bruit » et « dans les égouts » sont deux compléments circonstanciels : aucun des deux n'est en tête de phrase, donc ils peuvent s'échanger sans changer le sens — les deux ordres sont acceptés, tant que le sujet et le verbe restent en tête."
    },
    {
      pieces: ["L'Esprit", "se cacha", "derrière une caisse", "dans le silence"],
      correctOrders: [
        [0, 1, 2, 3],
        [0, 1, 3, 2]
      ],
      punctuation: ".",
      hint: "« derrière une caisse » et « dans le silence » sont deux compléments circonstanciels : aucun des deux n'est en tête de phrase, donc ils peuvent s'échanger sans changer le sens — les deux ordres sont acceptés, tant que le sujet et le verbe restent en tête."
    }
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
      objective: "L'Esprit vole : déplace-le avec les flèches (ou les boutons tactiles), il n'a peur ni de l'eau ni du vide. Fonce dans une caisse pour la pousser d'une case dans la direction où tu avances, y compris vers le haut ou le bas ; si plusieurs caisses se suivent, elles avancent toutes ensemble. Certaines phrases ont une petite caisse-virgule à placer juste après un complément en tête de phrase. Aligne toutes les caisses dans le canal, dans un ordre qui te semble correct, puis clique sur « Faire traverser Gavroche » (ou appuie sur Entrée / Espace) : c'est SEULEMENT à ce moment-là que tu sauras si l'ordre est bon."
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

      // --- Construction des caisses : tous les `pieces` de la phrase
      //     (mots + virgules éventuelles), puis la ponctuation finale
      //     ajoutée automatiquement en dernier morceau. ---
      const pieces = pitch.pieces.map((text, i) => ({
        chunkIndex: i,
        text,
        size: sizeForText(text),
        row: BRIDGE_ROW,
        colStart: 0
      }));
      const finalPunctIndex = pieces.length;
      pieces.push({
        chunkIndex: finalPunctIndex,
        text: pitch.punctuation || ".",
        size: 1,
        row: BRIDGE_ROW,
        colStart: 0
      });

      // v9 : chaque ordre accepté (pitch.correctOrders) porte sur les
      // `pieces` de la phrase UNIQUEMENT — la ponctuation finale est
      // ajoutée ici automatiquement à la fin de CHAQUE ordre, puisqu'elle
      // doit toujours être en dernière position quel que soit l'ordre
      // choisi par ailleurs.
      const acceptedOrders = pitch.correctOrders.map(order => order.concat([finalPunctIndex]));

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

      // v9 : Gavroche est calé au-dessus du HAUT visuel des caisses
      // (jamais en dessous), avec une petite marge de sécurité — voir
      // point 4 du header. Le haut visuel d'une caisse correspond à
      // row*CELL + CELL*0.1 (voir son rendu plus bas).
      const CRATE_VISUAL_TOP = BRIDGE_ROW * CELL + CELL * 0.1;
      const GAVROCHE_Y = CRATE_VISUAL_TOP - GAVROCHE_GH - GAVROCHE_CLEARANCE_ABOVE_CRATES;

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
          // v9 : vérification GÉNÉRALE supplémentaire — l'ancienne
          // buildVerticalChain ne détecte que les caisses de taille et
          // d'alignement IDENTIQUES à celle poussée pour continuer la
          // chaîne ; une caisse de taille différente sur la case
          // d'arrivée passait donc inaperçue, provoquant un
          // chevauchement silencieux (source des blocages étranges
          // signalés). On vérifie ici, pour CHAQUE caisse de la chaîne,
          // qu'aucune AUTRE caisse (quelle que soit sa taille) n'occupe
          // déjà sa case d'arrivée.
          for (const c of chain) {
            for (let col = c.colStart; col < c.colStart + c.size; col++) {
              const occupant = crateAt(col, edge);
              if (occupant && !chain.includes(occupant)) return;
            }
          }
          chain.forEach(c => { c.row += dy; });
        }

        player.col = targetCol;
        player.row = targetRow;
        spawnDust();
      }

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

      /**
       * v9 : accepte désormais PLUSIEURS ordres valables
       * (acceptedOrders), pas un seul — voir la banque de phrases.
       */
      function checkBridgeCorrect() {
        const inCanal = pieces
          .filter(p => p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL)
          .sort((a, b) => a.colStart - b.colStart);
        if (inCanal.length !== pieces.length) return false;
        for (let i = 1; i < inCanal.length; i++) {
          if (inCanal[i].colStart !== inCanal[i - 1].colStart + inCanal[i - 1].size) return false;
        }
        const placedOrder = inCanal.map(p => p.chunkIndex).join(",");
        return acceptedOrders.some(order => order.join(",") === placedOrder);
      }

      // Ne renvoie QUE si le pont est complet (toutes les caisses dans
      // le canal) — jamais s'il est correct, voir point 3 du header.
      function isBridgeFull() {
        const inCanal = pieces.filter(p => p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL);
        return inCanal.length === pieces.length;
      }

      function showFeedback(text, color, durationFrames) {
        feedbackText = text;
        feedbackColor = color;
        feedbackTimer = durationFrames || 90;
      }

      /**
       * Reconstruit le texte affiché pour un ensemble de caisses déjà
       * triées par position (utilisé pour le message de fin) — une
       * virgule s'attache directement au mot précédent, sans espace
       * avant elle.
       */
      function joinPiecesText(orderedPieces) {
        let out = "";
        orderedPieces.forEach((p, i) => {
          if (p.text === ",") {
            out += ",";
          } else {
            out += (i === 0 ? "" : " ") + p.text;
          }
        });
        return out;
      }

      const crossBtn = uiContainer.querySelector("#mg-cross");
      const bridgeStatusEl = uiContainer.querySelector("#mg-bridge-status");
      const CROSS_SPEED = 4;
      let crossInterval = null;

      function attemptCrossing() {
        if (gavroche.crossing || resultGiven) return;
        console.log("[Pont de Gavroche] attemptCrossing() démarrée.");

        gavroche.bridgePieces = pieces
          .filter(p => p.row === BRIDGE_ROW && p.colStart >= CANAL_START_COL && p.colStart + p.size <= CANAL_END_COL)
          .sort((a, b) => a.colStart - b.colStart);
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
        const fullSentence = joinPiecesText(gavroche.bridgePieces);
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
              ? "Pont : complet — tente la traversée !"
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

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.7;
          ctx.fillStyle = "#e8c468";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // --- Gavroche (v9 : toujours au-dessus du haut des caisses) ---
        if (gavroche.falling) {
          const shrink = Math.max(0, gavroche.fallTimer / 40);
          drawGavroche(gavroche.x, GAVROCHE_Y + (1 - shrink) * 20, GAVROCHE_GW * shrink, GAVROCHE_GH * shrink, shrink);
        } else {
          drawGavroche(gavroche.x, GAVROCHE_Y, GAVROCHE_GW, GAVROCHE_GH, 1);
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
