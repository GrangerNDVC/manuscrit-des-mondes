/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v8)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- v8 : corrections suite au 3e retour de Julie (capture d'écran) ----
   1. CHANGEMENT DE MÉCANIQUE — les dés ne sont plus une zone de jeu à
      part en dessous du texte. Chaque trou affiche maintenant un petit
      jeton coloré DIRECTEMENT DANS LA PHRASE, à la place du signe de
      ponctuation (comme dans la maquette de Julie). Le "_" placeholder
      a disparu : c'est le jeton lui-même qui occupe cette place.
      Conséquence mécanique : comme un trou peut désormais se trouver
      tout en haut de l'écran (dans le texte), une collision de saut
      verticale classique n'a plus de sens. La validation se fait donc
      sur l'ALIGNEMENT HORIZONTAL du joueur avec le trou actif au moment
      où il appuie sur saut (voir tryJump / HIT_TOLERANCE_X). Le saut
      reste un vrai geste (physique, animation) mais sert de "bouton de
      validation contextualisé" plutôt que de collision au pixel près.
   2. SPRITE TROP GROS + PAS ANIMÉ : deux bugs distincts.
      - Trop gros : le facteur d'agrandissement (x1.9) ne correspondait
        plus à la nouvelle échelle du jeu (dés et texte bien plus
        compacts). Réduit à x1.15.
      - Pas animé : un Image() jamais inséré dans la page n'anime pas
        forcément son GIF/WEBP tout seul selon les navigateurs (contrairement
        à un <img> affiché dans le DOM). On ne dépend donc plus de
        l'animation native du fichier : les 6 frames de marche sont
        fournies comme 6 PNG séparés, et c'est le code qui les fait
        défiler lui-même pendant le déplacement (fiable, indépendant du
        navigateur). Figé sur la pose immobile à l'arrêt/au saut, comme
        demandé.
   3. Les gros dés 3D flottants (souvent perçus comme "coupés" en bas)
      sont remplacés par un petit jeton arrondi compact, dimensionné
      pour tenir dans la hauteur d'une ligne de texte.

   ---- v7 : 2e retour de Julie (voir historique dans le dépôt) ----
   ---- v6 : 2e retour de Julie ----
   ---- v5 : corrections suite à test réel par Julie ----
   1. Ce n'est plus le MONDE qui défile sous un personnage fixe à
      l'écran (caméra scrollée, v3/v4) : c'est maintenant le
      PERSONNAGE qui se déplace réellement sur un canevas fixe.
      Le texte de la phrase est fixe en haut de l'écran, jamais en
      mouvement.
   2. Les dés tournent beaucoup plus lentement (voir CYCLE_INTERVAL) :
      l'objectif est de LIRE et RECONNAÎTRE le bon signe, pas de
      réagir au hasard.
   3. Correction d'un vrai bug de sprite : les feuilles fournies
      (esprit-marche.png / esprit-ko.png) suivent le format standard
      RPG Maker MZ — un canevas de 576x384 prévu pour 8 personnages
      (grille 4x2 de blocs 144x192), mais SEUL le bloc [0][0] (haut
      gauche) contient réellement un personnage, le reste est
      transparent. À l'intérieur de ce bloc, la vraie grille est
      3 colonnes x 4 lignes de 48x48 (et non 72x96 comme supposé en
      v3/v4 — d'où le sprite invisible : on lisait dans le vide).
      Vérifié par analyse directe des pixels, pas une supposition.
   4. Contenu : plus 2-3 phrases fixes, mais une BANQUE de 5 mini-pitchs
      tirés d'œuvres connues d'Hugo (Les Misérables, Notre-Dame de
      Paris), nombre de trous variable (3 à 5).
   5. Flux : une mauvaise réponse (mauvais signe touché, ou trou
      dépassé sans saut) déclenche une remédiation explicite PUIS un
      NOUVEAU mini-pitch (différent) — on ne rejoue plus la même
      phrase en boucle. Une réussite complète met fin au mini-jeu
      (retour au visual novel, géré par sceneManager.js comme pour
      tous les autres mini-jeux).
   6. Majuscule : les mots qui suivent un trou non résolu s'affichent
      en minuscule (pour ne pas trahir qu'un point/! /? arrive) ; dès
      que le trou est validé, la vraie casse s'affiche automatiquement.

   Sprite : bloc [0][0] de la feuille RPG Maker MZ, cellules 48x48.
   Ligne supposée pour "regarde vers la droite" : ligne 2 (convention
   standard bas/gauche/droite/haut). À ajuster via WALK_ROW si besoin.

   Enregistré sous la notion "ponctuation", variante "barricades_hugo"
   (inchangée : aucune autre partie du code n'a besoin de changer).
   ============================================================ */

(function registerPonctuationHugoV5() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -10;
  const WALK_SPEED = 3.2; // vitesse de déplacement au clavier (joueur), remplace l'avancée automatique

  const DRAW_W = 56, DRAW_H = 56; // le sprite source est carré (48x48) : on garde un rendu carré

  // v8 : changement de mécanique suite au 3e retour de Julie — les dés ne
  // sont plus une "zone de jeu" séparée sous le texte. Ils sont affichés
  // EN PLACE des signes de ponctuation, directement dans la phrase (comme
  // dans sa maquette). Le saut reste un geste ludique, mais la validation
  // se fait sur l'alignement horizontal du joueur avec le trou actif au
  // moment du saut (et plus sur une collision verticale précise avec un
  // dé qui peut désormais se trouver tout en haut de l'écran, hors de
  // portée physique d'un saut de plateforme classique).
  const INLINE_DIE_SIZE = 28;

  // --- Décor : simple image fixe (plus besoin d'un long décor à faire
  //     défiler, tout tient sur un seul écran maintenant) ---
  const BG_SRC = "/assets/backgrounds/decors_Hugo_barricades_minijeu.png";

  // --- Déplacement (zone de marche, sous le panneau de texte) ---
  const PATH_START_X = 90, PATH_END_X = 710;
  const GROUND_Y = 300; // fixe : la marge sous le texte redevient une zone de marche normale, pas un vide
  const HIT_TOLERANCE_X = 40; // marge horizontale tolérée pour valider un saut sous le bon trou
  const CYCLE_INTERVAL = 110; // frames entre deux signes (~1.8s à 60fps) : lent, lisible

  // --- Mise en page du panneau de texte fixe ---
  const TEXT_PANEL_X = 60, TEXT_PANEL_Y = 16, TEXT_PANEL_W = 680;
  const TEXT_LINE_HEIGHT = 30, TEXT_FONT = "19px sans-serif";
  const TEXT_PADDING = 16;

  /**
   * Banque de mini-pitchs (œuvres connues de Victor Hugo). segments[i]
   * est TOUJOURS suivi de blanks[i] (même longueur), sans texte après
   * le dernier trou. Les mots doivent être écrits avec leur VRAIE
   * casse : la minuscule forcée après un trou non résolu est gérée
   * automatiquement à l'affichage.
   */
  const PITCH_BANK = [
    {
      title: "Les Misérables",
      segments: [
        "Dans les Misérables de Victor Hugo",
        "Fantine confia Cosette",
        "sa fille",
        "aux Thénardier",
        "Jean Valjean promit de la retrouver un jour"
      ],
      blanks: [
        { correct: ",", options: [",", ".", "!", "?"], why: "Cette virgule sépare le complément placé en tête de phrase (« Dans les Misérables... ») du reste de la phrase : virgule d'introduction." },
        { correct: ",", options: [",", ".", "!", ";"], why: "« sa fille » est une apposition qui précise qui est Cosette : elle s'ouvre par une virgule." },
        { correct: ",", options: [",", ".", "!", ";"], why: "L'apposition « sa fille » se referme par une seconde virgule avant de continuer la phrase." },
        { correct: ".", options: [".", ",", "!", "?"], why: "C'est la fin de la première phrase : un point la clôt, et le mot suivant (« Jean Valjean ») prend une majuscule." },
        { correct: ".", options: [".", ",", "!", "?"], why: "C'est la fin de la phrase : un point la clôt normalement." }
      ]
    },
    {
      title: "Les Misérables",
      segments: ["Quand la nuit tomba sur Paris", "Gavroche", "prudent", "se glissa vers la barricade"],
      blanks: [
        { correct: ",", options: [",", ".", "!", "?"], why: "« Quand la nuit tomba sur Paris » est une proposition placée en tête de phrase : une virgule la sépare de la suite." },
        { correct: ",", options: [",", ".", "!", ";"], why: "« prudent » est une apposition qui décrit Gavroche : elle s'ouvre par une virgule." },
        { correct: ",", options: [",", ".", "!", ";"], why: "L'apposition « prudent » se referme par une seconde virgule." },
        { correct: ".", options: [".", ",", "!", "?"], why: "C'est la fin de la phrase : un point la clôt normalement." }
      ]
    },
    {
      title: "Notre-Dame de Paris",
      segments: ["Dans Notre-Dame de Paris", "Quasimodo", "le sonneur de cloches", "aimait Esmeralda"],
      blanks: [
        { correct: ",", options: [",", ".", "!", "?"], why: "« Dans Notre-Dame de Paris » est un complément placé en tête de phrase : virgule d'introduction." },
        { correct: ",", options: [",", ".", "!", ";"], why: "« le sonneur de cloches » est une apposition qui précise qui est Quasimodo : elle s'ouvre par une virgule." },
        { correct: ",", options: [",", ".", "!", ";"], why: "L'apposition se referme par une seconde virgule avant de continuer la phrase." },
        { correct: ".", options: [".", ",", "!", "?"], why: "C'est la fin de la phrase : un point la clôt normalement." }
      ]
    },
    {
      title: "Notre-Dame de Paris",
      segments: ["Du haut de la tour", "Quasimodo", "affolé", "hurla que le danger approchait"],
      blanks: [
        { correct: ",", options: [",", ".", "!", "?"], why: "« Du haut de la tour » est un complément de lieu placé en tête de phrase : virgule d'introduction." },
        { correct: ",", options: [",", ".", "!", ";"], why: "« affolé » est une apposition qui décrit l'état de Quasimodo : elle s'ouvre par une virgule." },
        { correct: ",", options: [",", ".", "!", ";"], why: "L'apposition « affolé » se referme par une seconde virgule." },
        { correct: "!", options: ["!", ".", "?", ","], why: "Quasimodo hurle un danger : l'intensité de l'action appelle un point d'exclamation." }
      ]
    },
    {
      title: "Notre-Dame de Paris",
      segments: ["Quasimodo", "du haut de la tour", "cria-t-il vraiment son amour à Esmeralda"],
      blanks: [
        { correct: ",", options: [",", ".", "!", ";"], why: "« du haut de la tour » est une apposition insérée après Quasimodo : elle s'ouvre par une virgule." },
        { correct: ",", options: [",", ".", "!", ";"], why: "L'apposition « du haut de la tour » se referme par une seconde virgule." },
        { correct: "?", options: ["?", ".", "!", ","], why: "Le verbe inversé (« cria-t-il ») signale une question directe : elle se termine par un point d'interrogation." }
      ]
    }
  ];

  function pickPitch(excludeIndex) {
    let idx;
    do {
      idx = Math.floor(Math.random() * PITCH_BANK.length);
    } while (PITCH_BANK.length > 1 && idx === excludeIndex);
    return idx;
  }

  // v8 : petit "jeton" inline (remplace le gros cube 3D flottant). Assez
  // compact pour tenir DANS une ligne de texte, à la place du signe.
  function drawInlineDie(ctx, cx, cy, symbol, style, size) {
    let face = "#e8c468", border = "#1a1530", text = "#1a1530";
    if (style === "correct") { face = "#6fcf97"; }
    if (style === "wrong") { face = "#d9534f"; text = "#fff"; }

    const half = size / 2;
    ctx.fillStyle = face;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(cx - half + r, cy - half);
    ctx.arcTo(cx + half, cy - half, cx + half, cy + half, r);
    ctx.arcTo(cx + half, cy + half, cx - half, cy + half, r);
    ctx.arcTo(cx - half, cy + half, cx - half, cy - half, r);
    ctx.arcTo(cx - half, cy - half, cx + half, cy - half, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = "bold 17px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, cx, cy + 1);
  }

  // Panneau "épais" derrière le texte, même esprit que les dés (tranche
  // visible en dessous/à droite pour donner une impression de relief).
  function drawPlaque(ctx, x, y, w, h) {
    const bevel = 6;
    ctx.fillStyle = "#4a3a1a";
    ctx.fillRect(x + bevel, y + bevel, w, h);
    ctx.fillStyle = "#2b2347";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#e8c468";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    // v8 : l'animation du WEBP ne se jouait pas — un Image() jamais
    // inséré dans la page n'est pas garanti d'avancer ses frames tout
    // seul selon les navigateurs (comportement différent d'un <img> dans
    // le DOM). On reprend donc le contrôle nous-mêmes : 6 images fixes
    // (une par frame de marche, déjà détourées) qu'on fait défiler à la
    // main pendant le déplacement, exactement comme demandé (animé en
    // marchant, figé à l'arrêt/au saut).
    const walkFrames = [0, 1, 2, 3, 4, 5].map(i => {
      const img = new Image();
      img.src = `/assets/sprites/characters/esprit-marche-${i}.png`;
      return img;
    });
    const idleSprite = new Image();
    idleSprite.src = "/assets/sprites/characters/esprit-idle.png";
    const bgImage = new Image();
    bgImage.src = BG_SRC;

    await MinigameUI.showInstructions({
      title: "L'Assaut des Barricades",
      objective: "La phrase à compléter est affichée en haut de l'écran, fixe : chaque trou est un petit jeton de couleur, À LA PLACE du signe de ponctuation. Déplace-toi avec les flèches gauche/droite (ou ◀ ▶ tactile) jusqu'à te trouver sous le trou à compléter, puis saute — Espace, flèche du haut, ou ⤴ — PENDANT que le jeton affiche le bon signe (il change LENTEMENT parmi plusieurs signes). Une erreur (mauvais signe) t'explique pourquoi puis relance une nouvelle phrase. Une phrase réussie du début à la fin termine le mini-jeu."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      let pitchIndex = pickPitch(-1);
      let pitch, checkpoints, resolvedFlags;

      function loadPitch(idx) {
        pitchIndex = idx;
        pitch = PITCH_BANK[idx];
        resolvedFlags = pitch.blanks.map(() => false);
        checkpoints = pitch.blanks.map((blank, i) => ({
          blank,
          blankIndex: i,
          optionIndex: 0,
          cycleTimer: 0,
          lastX: CANVAS_W / 2, lastY: TEXT_PANEL_Y, // dernière position connue (pour les particules), mise à jour chaque frame
          state: "cycling" // cycling | correct | wrong
        }));
      }
      loadPitch(pitchIndex);

      function panelHeightFor(lines) {
        return lines.length * TEXT_LINE_HEIGHT + TEXT_PADDING * 2 - 6;
      }

      const player = { x: 60, y: GROUND_Y - DRAW_H, w: DRAW_W, h: DRAW_H, vy: 0, onGround: true, facing: "right", moving: false };
      let animFrame = 0, animTimer = 0;
      // v8 : dernière position calculée de chaque trou, utilisée à la fois
      // par le rendu (dessiner le jeton au bon endroit dans le texte) et
      // par le saut (vérifier l'alignement horizontal au moment du saut).
      let currentBlankPositions = {};

      let currentCheckpointIndex = 0;
      let attempt = 1;
      let resultGiven = false;
      let paused = false;
      let pauseTimer = 0;
      let pendingAction = null; // "next" | "newPitch"
      let koUntil = 0;
      const particles = [];

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"}</div>
        <div class="hud-item">Trou <span id="mg-progress">1</span> / <span id="mg-total">${checkpoints.length}</span></div>
        <div class="hud-item">Tentative n° <span id="mg-attempt">1</span></div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" id="left-btn">◀</button>
          <button class="touch-btn" id="right-btn">▶</button>
          <button class="touch-btn" id="jump-btn">⤴</button>
        </div>
      `);

      function updateHud() {
        document.getElementById("mg-progress").textContent = Math.min(currentCheckpointIndex + 1, checkpoints.length);
        document.getElementById("mg-total").textContent = checkpoints.length;
        document.getElementById("mg-attempt").textContent = attempt;
      }

      function tryJump() {
        if (!player.onGround || paused) return;
        player.vy = JUMP_VELOCITY;
        player.onGround = false;

        // v8 : la validation ne dépend plus d'une collision verticale avec
        // le dé (impossible désormais qu'il soit tout en haut, dans le
        // texte) mais de l'alignement horizontal du joueur avec le trou
        // actif au moment du saut.
        const cp = checkpoints[currentCheckpointIndex];
        if (cp && cp.state === "cycling") {
          const target = currentBlankPositions[cp.blankIndex];
          if (target) {
            const playerCenter = player.x + player.w / 2;
            if (Math.abs(playerCenter - target.x) <= HIT_TOLERANCE_X) {
              resolveHit(cp);
            }
          }
        }
      }

      // v6 : déplacement horizontal au clavier, remplace l'avancée
      // automatique. Le joueur avance/recule avec les flèches gauche/droite
      // (ou Q/D, layout AZERTY), et saute avec Espace / flèche haut / Z.
      const keysPressed = { left: false, right: false };
      function onKeyUp(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keysPressed.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysPressed.right = false;
      }
      function onKeyDown(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keysPressed.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysPressed.right = true;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") tryJump();
      }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      document.getElementById("jump-btn").addEventListener("click", tryJump);

      const leftBtn = document.getElementById("left-btn");
      const rightBtn = document.getElementById("right-btn");
      const pressLeft = () => keysPressed.left = true;
      const releaseLeft = () => keysPressed.left = false;
      const pressRight = () => keysPressed.right = true;
      const releaseRight = () => keysPressed.right = false;
      ["mousedown", "touchstart"].forEach(evt => {
        leftBtn.addEventListener(evt, pressLeft);
        rightBtn.addEventListener(evt, pressRight);
      });
      ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(evt => {
        leftBtn.addEventListener(evt, releaseLeft);
        rightBtn.addEventListener(evt, releaseRight);
      });

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(rafId);
      }

      function spawnBurst(x, y, color) {
        for (let i = 0; i < 14; i++) {
          const angle = (Math.PI * 2 * i) / 14;
          particles.push({
            x, y,
            vx: Math.cos(angle) * (1.5 + Math.random() * 2),
            vy: Math.sin(angle) * (1.5 + Math.random() * 2) - 1,
            life: 28, maxLife: 28, color
          });
        }
      }

      function showFeedback(isCorrect, why) {
        uiContainer.insertAdjacentHTML("beforeend", `
          <div class="hud-item" id="mg-feedback" style="color:${isCorrect ? '#6fcf97' : '#d9534f'}; font-weight:bold; max-width:680px;">
            ${isCorrect ? "✓ Exact !" : "✗ Pas ça —"} ${why}${isCorrect ? "" : " Nouvelle phrase !"}
          </div>
        `);
      }

      function resolveHit(cp) {
        if (cp.state !== "cycling") return;
        const shownSymbol = cp.blank.options[cp.optionIndex];
        const isCorrect = shownSymbol === cp.blank.correct;
        paused = true;
        pauseTimer = 115;

        if (isCorrect) {
          cp.state = "correct";
          resolvedFlags[cp.blankIndex] = true;
          spawnBurst(cp.lastX, cp.lastY, "#6fcf97");
          showFeedback(true, cp.blank.why);
          pendingAction = "next";
        } else {
          cp.state = "wrong";
          koUntil = performance.now() + 500;
          showFeedback(false, cp.blank.why);
          pendingAction = "newPitch";
        }
      }

      function startNewPitch() {
        loadPitch(pickPitch(pitchIndex));
        player.x = 60;
        player.y = GROUND_Y - DRAW_H;
        player.vy = 0;
        player.onGround = true;
        currentCheckpointIndex = 0;
        attempt++;
        updateHud();
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: `« ${pitch.title} » reconstitué sans faute, bien joué ! (en ${attempt} tentative${attempt > 1 ? "s" : ""})`
        });
        resolve({ passed: true, score: checkpoints.length, total: checkpoints.length });
      }

      let rafId;

      function loop() {
        if (paused) {
          pauseTimer--;
          if (pauseTimer <= 0) {
            paused = false;
            const feedbackEl = document.getElementById("mg-feedback");
            if (feedbackEl) feedbackEl.remove();

            if (pendingAction === "newPitch") {
              pendingAction = null;
              startNewPitch();
            } else if (pendingAction === "next") {
              pendingAction = null;
              currentCheckpointIndex++;
              updateHud();
              if (currentCheckpointIndex >= checkpoints.length) {
                endGame();
                return;
              }
            }
          }
        } else {
          // v8 : calcule où se trouve réellement chaque trou dans le texte
          // affiché cette frame-ci (utilisé pour dessiner les jetons ET pour
          // valider un saut, voir tryJump). Plus de repositionnement du sol
          // ou d'une zone de dés séparée : le sol est fixe désormais.
          const lines = layoutText();
          currentBlankPositions = computeBlankCenters(lines);
          checkpoints.forEach(cp => {
            const pos = currentBlankPositions[cp.blankIndex];
            if (pos) { cp.lastX = pos.x; cp.lastY = pos.y; }
          });

          // Déplacement horizontal piloté par le joueur.
          player.moving = false;
          if (keysPressed.left && !keysPressed.right) {
            player.x -= WALK_SPEED;
            player.facing = "left";
            player.moving = true;
          } else if (keysPressed.right && !keysPressed.left) {
            player.x += WALK_SPEED;
            player.facing = "right";
            player.moving = true;
          }
          player.x = Math.max(PATH_START_X - 20, Math.min(PATH_END_X + 20 - player.w, player.x));

          if (player.onGround && player.moving) {
            animTimer++;
            if (animTimer >= 8) { animTimer = 0; animFrame = (animFrame + 1) % walkFrames.length; }
          } else {
            animTimer = 0;
          }

          player.vy += GRAVITY;
          player.y += player.vy;

          if (player.y + player.h >= GROUND_Y) {
            player.y = GROUND_Y - player.h;
            player.vy = 0;
            player.onGround = true;
          } else {
            player.onGround = false;
          }

          checkpoints.forEach(c => {
            if (c.state !== "cycling") return;
            c.cycleTimer++;
            if (c.cycleTimer >= CYCLE_INTERVAL) {
              c.cycleTimer = 0;
              c.optionIndex = (c.optionIndex + 1) % c.blank.options.length;
            }
          });

        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
          if (p.life <= 0) particles.splice(i, 1);
        }

        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      // --- Mise en page du texte (recalculée chaque frame : peu coûteux
      //     à cette échelle, dépend de resolvedFlags qui change peu) ---
      function layoutText() {
        ctx.font = TEXT_FONT;
        const maxW = TEXT_PANEL_W - TEXT_PADDING * 2;
        const tokens = [];
        pitch.segments.forEach((segText, i) => {
          let text = segText;
          if (i > 0 && !resolvedFlags[i - 1]) {
            text = text.charAt(0).toLowerCase() + text.slice(1);
          }
          text.split(" ").forEach(w => tokens.push({ type: "word", text: w }));
          tokens.push({ type: "blank", index: i });
        });

        const spaceW = ctx.measureText(" ").width;
        const blankW = INLINE_DIE_SIZE + 6;
        const lines = [];
        let line = [], lineW = 0;
        tokens.forEach(tok => {
          const w = tok.type === "word" ? ctx.measureText(tok.text).width : blankW;
          if (lineW + w > maxW && line.length > 0) {
            lines.push({ tokens: line, width: lineW - spaceW });
            line = []; lineW = 0;
          }
          line.push({ ...tok, w });
          lineW += w + spaceW;
        });
        if (line.length) lines.push({ tokens: line, width: lineW - spaceW });
        return lines;
      }

      // v8 : renvoie x ET y de chaque trou (plus seulement x), puisque le
      // jeton est maintenant dessiné directement dans le fil du texte —
      // sa hauteur dépend de la ligne sur laquelle il tombe.
      function computeBlankCenters(lines) {
        const centers = {};
        lines.forEach((ln, li) => {
          let x = TEXT_PANEL_X + (TEXT_PANEL_W - ln.width) / 2;
          const y = TEXT_PANEL_Y + TEXT_PADDING + li * TEXT_LINE_HEIGHT + TEXT_LINE_HEIGHT / 2 - 4;
          ln.tokens.forEach(tok => {
            if (tok.type === "blank") centers[tok.index] = { x: x + tok.w / 2, y };
            x += tok.w + ctx.measureText(" ").width;
          });
        });
        return centers;
      }

      function render() {
        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Panneau de texte fixe
        const lines = layoutText();
        const panelH = lines.length * TEXT_LINE_HEIGHT + TEXT_PADDING * 2 - 6;
        drawPlaque(ctx, TEXT_PANEL_X, TEXT_PANEL_Y, TEXT_PANEL_W, panelH);

        ctx.font = TEXT_FONT;
        ctx.fillStyle = "#f4f1ea";
        ctx.textBaseline = "middle";
        lines.forEach((ln, li) => {
          let x = TEXT_PANEL_X + (TEXT_PANEL_W - ln.width) / 2;
          const y = TEXT_PANEL_Y + TEXT_PADDING + li * TEXT_LINE_HEIGHT + TEXT_LINE_HEIGHT / 2 - 4;
          ln.tokens.forEach(tok => {
            if (tok.type === "word") {
              ctx.textAlign = "left";
              ctx.fillStyle = "#f4f1ea";
              ctx.fillText(tok.text, x, y);
            } else {
              const resolved = resolvedFlags[tok.index];
              if (resolved) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#e8c468";
                ctx.font = "bold 19px serif";
                ctx.fillText(pitch.blanks[tok.index].correct, x + tok.w / 2, y);
                ctx.font = TEXT_FONT;
              } else {
                // v8 : le jeton (jaune/vert/rouge selon l'état) s'affiche
                // ICI, à la place du signe, directement dans la phrase —
                // ce n'est plus un gros dé séparé sous le texte.
                const cp = checkpoints[tok.index];
                let symbol, style;
                if (cp.state === "wrong") { symbol = cp.blank.options[cp.optionIndex]; style = "wrong"; }
                else { symbol = cp.blank.options[cp.optionIndex]; style = "cycling"; }
                drawInlineDie(ctx, x + tok.w / 2, y, symbol, style, INLINE_DIE_SIZE);
              }
            }
            x += tok.w + ctx.measureText(" ").width;
          });
        });

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const isKo = performance.now() < koUntil;
        const useWalkAnim = player.onGround && player.moving && !isKo;
        const activeSprite = useWalkAnim ? walkFrames[animFrame] : idleSprite;

        if (activeSprite.complete && activeSprite.naturalWidth > 0) {
          // Le sprite fourni est un portrait (pas une case carrée) : on
          // garde son ratio, on cale la hauteur sur celle du personnage
          // (un peu agrandie pour rester lisible) et on aligne les pieds
          // sur le bas de la zone de collision, qui elle ne change pas.
          const renderH = player.h * 1.15;
          const renderW = renderH * (activeSprite.naturalWidth / activeSprite.naturalHeight);
          const drawX = player.x + player.w / 2 - renderW / 2;
          const drawY = player.y + player.h - renderH;

          ctx.save();
          if (player.facing === "left") {
            ctx.translate(drawX + renderW, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(activeSprite, 0, 0, renderW, renderH);
          } else {
            ctx.drawImage(activeSprite, drawX, drawY, renderW, renderH);
          }
          if (isKo) {
            // Flash rouge sur les pixels visibles du sprite (pas de sprite KO séparé nécessaire).
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = "rgba(217,83,79,0.55)";
            ctx.fillRect(player.facing === "left" ? 0 : drawX, player.facing === "left" ? 0 : drawY, renderW, renderH);
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.restore();
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(player.x, player.y, player.w, player.h);
        }

        // Sol
        ctx.strokeStyle = "rgba(232,196,104,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y + 2);
        ctx.lineTo(CANVAS_W, GROUND_Y + 2);
        ctx.stroke();
      }

      loop();
    });
  }

  SceneManager.registerMinigame("ponctuation", "barricades_hugo", {
    title: "L'Assaut des Barricades",
    run
  });

})();
