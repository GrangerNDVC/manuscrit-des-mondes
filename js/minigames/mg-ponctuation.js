/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v9)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- v9 : corrections suite au 4e retour de Julie ----
   1. TEXTE SUR UNE SEULE LIGNE (jamais deux) : l'ancien système repliait
      le texte dans une boîte de largeur fixe (source du retour à la
      ligne refusé). Remplacé par une ligne UNIQUE en coordonnées MONDE,
      potentiellement plus large que l'écran, avec une CAMÉRA qui suit le
      joueur horizontalement (défilement façon plateforme classique) :
      avancer vers le bord de l'écran fait apparaître la suite du texte.
   2. SAUT "PAS ASSEZ HAUT" : la validation (alignement horizontal au
      moment du saut) était déjà correcte depuis la v8, mais visuellement
      le saut n'atteignait pas la ligne de texte, ce qui le faisait
      paraître cassé. GROUND_Y rapproché du texte (200 au lieu de 300)
      pour que l'arc du saut culmine réellement au niveau du texte.
   3. POLICE UNIQUE : "Press Start 2P" (Google Fonts, police "pixel")
      utilisée partout — mots, ponctuation résolue, jeton — au lieu de
      trois polices différentes (sans-serif / serif / serif) mélangées.
   4. Ligne de sol supprimée : Julie ajoute son propre décor
      (decors_ponctuation_hugo.jpg). Le sol reste géré en interne pour la
      physique mais n'est plus dessiné.

   ---- v8 : 3e retour de Julie (voir historique dans le dépôt) ----
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

  // v9 : changement suite au 4e retour de Julie.
  // 1. TEXTE SUR UNE SEULE LIGNE, JAMAIS SUR DEUX : le texte n'est plus
  //    contraint dans une boîte de largeur fixe qui force un retour à la
  //    ligne. Il est posé sur UNE ligne, potentiellement plus large que
  //    l'écran, et une caméra suit le joueur horizontalement (comme un
  //    jeu de plateforme classique) : avancer fait défiler la suite du
  //    texte. currentBlankPositions/computeLineLayout travaillent donc en
  //    coordonnées "monde" (indépendantes de l'écran) ; seul le rendu
  //    convertit en coordonnées écran via cameraX.
  // 2. Plus de ligne de sol dessinée : Julie ajoute son propre décor
  //    (voir BG_SRC). GROUND_Y reste utilisé en interne pour la physique
  //    (invisible), rapproché du texte pour que le saut l'atteigne
  //    visuellement (c'était le vrai problème du "saut pas assez haut" :
  //    la validation était déjà correcte au clavier, mais le saut
  //    n'allait pas visuellement jusqu'à la ligne de texte).
  // 3. Une seule police partout (mots, ponctuation résolue, jeton) :
  //    "Press Start 2P" (Google Fonts), police "pixel" à dessein.
  const INLINE_DIE_SIZE = 26;

  // --- Décor : image fixe fournie par Julie ---
  const BG_SRC = "/assets/backgrounds/decors_ponctuation_hugo.jpg";

  const WORLD_MARGIN = 40;         // marge avant le premier mot / après le dernier
  const TEXT_Y = 60;                // hauteur fixe de l'unique ligne de texte (monde = écran en Y, seul X défile)
  const GROUND_Y = 200;             // sol (invisible), assez proche du texte pour que le saut l'atteigne visuellement
  const HIT_TOLERANCE_X = 40;       // marge horizontale tolérée pour valider un saut sous le bon trou
  const CYCLE_INTERVAL = 110;       // frames entre deux signes (~1.8s à 60fps) : lent, lisible
  const CAMERA_LEAD = 0.35;         // le joueur reste à ~35% depuis la gauche de l'écran pendant le défilement

  const TEXT_FONT_SIZE = 15;
  const TEXT_FONT = `${TEXT_FONT_SIZE}px "Press Start 2P", monospace`;

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
    ctx.font = `bold ${Math.round(size * 0.55)}px "Press Start 2P", monospace`;
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

    // v9 : police unique "pixel" (clin d'œil demandé), chargée depuis
    // Google Fonts et attendue AVANT le premier rendu pour éviter un
    // flash avec la police de secours.
    if (!document.getElementById("mg-pixel-font-link")) {
      const link = document.createElement("link");
      link.id = "mg-pixel-font-link";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      document.head.appendChild(link);
    }
    try {
      await document.fonts.load(`${TEXT_FONT_SIZE}px "Press Start 2P"`);
    } catch (e) { /* pas grave : la police de secours (monospace) prendra le relais */ }

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
      objective: "La phrase à compléter défile sur UNE seule ligne : chaque trou est un petit jeton de couleur, À LA PLACE du signe de ponctuation. Déplace-toi avec les flèches gauche/droite (ou ◀ ▶ tactile) — avancer fait défiler la suite du texte — jusqu'à te trouver sous le trou à compléter, puis saute — Espace, flèche du haut, ou ⤴ — PENDANT que le jeton affiche le bon signe (il change LENTEMENT parmi plusieurs signes). Une erreur (mauvais signe) t'explique pourquoi puis relance une nouvelle phrase. Une phrase réussie du début à la fin termine le mini-jeu."
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
          lastX: WORLD_MARGIN, lastY: TEXT_Y, // dernière position connue (monde), pour les particules ; mise à jour chaque frame
          state: "cycling" // cycling | correct | wrong
        }));
      }
      loadPitch(pitchIndex);

      const player = { x: WORLD_MARGIN, y: GROUND_Y - DRAW_H, w: DRAW_W, h: DRAW_H, vy: 0, onGround: true, facing: "right", moving: false };
      let animFrame = 0, animTimer = 0;
      // v8 : dernière position calculée de chaque trou, utilisée à la fois
      // par le rendu (dessiner le jeton au bon endroit dans le texte) et
      // par le saut (vérifier l'alignement horizontal au moment du saut).
      // v9 : toutes ces positions sont en coordonnées MONDE désormais.
      let currentBlankPositions = {};
      let cameraX = 0; // décalage caméra (monde -> écran), suit le joueur horizontalement

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
        player.x = WORLD_MARGIN;
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
          // v9 : calcule la position (MONDE) de chaque trou sur l'unique
          // ligne de texte, et fait suivre la caméra au joueur (défilement
          // horizontal classique). Plus de repositionnement du sol : il
          // est fixe désormais (voir GROUND_Y).
          const layout = computeLineLayout();
          currentBlankPositions = layout.blankPositions;
          checkpoints.forEach(cp => {
            const pos = currentBlankPositions[cp.blankIndex];
            if (pos) { cp.lastX = pos.x; cp.lastY = pos.y; }
          });

          // Déplacement horizontal piloté par le joueur (coordonnées monde).
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
          player.x = Math.max(WORLD_MARGIN - 20, Math.min(layout.totalWidth + 20 - player.w, player.x));

          // La caméra garde le joueur à ~35% depuis la gauche de l'écran,
          // sans jamais montrer avant le début du texte ni après sa fin
          // (donc pas de défilement inutile sur une phrase courte).
          const maxCamera = Math.max(0, layout.totalWidth + WORLD_MARGIN - CANVAS_W);
          cameraX = Math.max(0, Math.min(maxCamera, player.x - CANVAS_W * CAMERA_LEAD));

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

      // v9 : disposition du texte sur UNE SEULE ligne, en coordonnées
      // MONDE (peut être plus large que l'écran — la caméra défile pour
      // suivre le joueur). Remplace l'ancien layoutText() qui repliait le
      // texte sur plusieurs lignes dans une boîte de largeur fixe.
      function computeLineLayout() {
        ctx.font = TEXT_FONT;
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
        let x = WORLD_MARGIN;
        const blankPositions = {};
        const laidOut = tokens.map(tok => {
          const w = tok.type === "word" ? ctx.measureText(tok.text).width : INLINE_DIE_SIZE + 6;
          const item = { ...tok, w, x };
          if (tok.type === "blank") blankPositions[tok.index] = { x: x + w / 2, y: TEXT_Y };
          x += w + spaceW;
          return item;
        });
        return { tokens: laidOut, totalWidth: x - spaceW + WORLD_MARGIN, blankPositions };
      }

      function render() {
        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Bande de lisibilité fixe derrière le texte (largeur écran fixe,
        // ne dépend plus de la largeur du texte puisque celui-ci défile).
        drawPlaque(ctx, 0, TEXT_Y - 34, CANVAS_W, 56);

        const layout = computeLineLayout();
        ctx.font = TEXT_FONT;
        ctx.fillStyle = "#f4f1ea";
        ctx.textBaseline = "middle";
        layout.tokens.forEach(tok => {
          const screenX = tok.x - cameraX;
          if (screenX + tok.w < -20 || screenX > CANVAS_W + 20) return; // hors écran : rien à dessiner
          if (tok.type === "word") {
            ctx.textAlign = "left";
            ctx.fillStyle = "#f4f1ea";
            ctx.font = TEXT_FONT;
            ctx.fillText(tok.text, screenX, TEXT_Y);
          } else {
            const resolved = resolvedFlags[tok.index];
            if (resolved) {
              ctx.textAlign = "center";
              ctx.fillStyle = "#e8c468";
              ctx.font = TEXT_FONT;
              ctx.fillText(pitch.blanks[tok.index].correct, screenX + tok.w / 2, TEXT_Y);
            } else {
              // v8 : le jeton (jaune/rouge selon l'état) s'affiche ICI, à
              // la place du signe, directement dans la phrase.
              const cp = checkpoints[tok.index];
              const symbol = cp.blank.options[cp.optionIndex];
              const style = cp.state === "wrong" ? "wrong" : "cycling";
              drawInlineDie(ctx, screenX + tok.w / 2, TEXT_Y, symbol, style, INLINE_DIE_SIZE);
            }
          }
        });

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x - cameraX, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const isKo = performance.now() < koUntil;
        const useWalkAnim = player.onGround && player.moving && !isKo;
        const activeSprite = useWalkAnim ? walkFrames[animFrame] : idleSprite;
        const screenPlayerX = player.x - cameraX;

        if (activeSprite.complete && activeSprite.naturalWidth > 0) {
          // Le sprite fourni est un portrait (pas une case carrée) : on
          // garde son ratio, on cale la hauteur sur celle du personnage
          // (un peu agrandie pour rester lisible) et on aligne les pieds
          // sur le bas de la zone de collision, qui elle ne change pas.
          const renderH = player.h * 1.15;
          const renderW = renderH * (activeSprite.naturalWidth / activeSprite.naturalHeight);
          const drawX = screenPlayerX + player.w / 2 - renderW / 2;
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
          ctx.fillRect(screenPlayerX, player.y, player.w, player.h);
        }
      }

      loop();
    });
  }

  SceneManager.registerMinigame("ponctuation", "barricades_hugo", {
    title: "L'Assaut des Barricades",
    run
  });

})();
