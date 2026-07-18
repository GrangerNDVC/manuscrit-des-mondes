/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v6)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- v6 : corrections suite au 2e retour de Julie ----
   1. DÉPLACEMENT JOUEUR : le personnage n'avance plus tout seul.
      Flèches gauche/droite (ou Q/D, ou boutons tactiles ◀ ▶) pour se
      déplacer, saut inchangé (Espace / flèche haut / bouton ⤴).
      Le sprite change de ligne selon la direction (WALK_ROW_LEFT /
      WALK_ROW_RIGHT) au lieu d'une ligne fixe.
   2. POSITION DES DÉS : n'est plus une hauteur fixe et lointaine.
      Recalculée chaque frame à partir de la hauteur RÉELLE du panneau
      de texte (variable selon le nombre de trous/lignes du mini-pitch)
      + un petit écart fixe (DIE_GAP_BELOW_TEXT). Corrige le grand vide
      signalé par Julie entre le texte et les dés. Le sol suit à son
      tour les dés, avec une marge calculée pour que le saut reste
      toujours jouable (portée de saut ~83px avec les constantes
      GRAVITY/JUMP_VELOCITY actuelles).
   3. Suppression du "miss" par simple passage devant un dé sans sauter
      (n'avait plus de sens avec un déplacement libre bidirectionnel) :
      seul le fait de sauter sur le MAUVAIS signe compte comme erreur.
   4. ⚠️ Le rectangle jaune de secours et un éventuel rognage du canevas
      par le CSS ne sont PAS traités ici — cause probable : fichier
      esprit-marche.png non chargé (404) et/ou minigames.css absent du
      dossier fourni. Voir TRANSMISSION.md : ces deux fichiers restent
      nécessaires pour confirmer/corriger ces deux points.

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

  // v7 : le sprite n'est plus une feuille RPG Maker à découper (source
  // d'ambiguïté et de bugs depuis 3 versions). Julie a fourni un GIF
  // d'animation de marche complet ; on l'utilise tel quel comme IMAGE
  // ANIMÉE (le navigateur gère l'avancée des frames du GIF tout seul,
  // il suffit de le redessiner chaque frame). Une image statique séparée
  // (première frame, détourée) sert de pose immobile pour l'arrêt et le
  // saut, comme demandé.

  // --- Décor : simple image fixe (plus besoin d'un long décor à faire
  //     défiler, tout tient sur un seul écran maintenant) ---
  const BG_SRC = "/assets/backgrounds/decors_Hugo_barricades_minijeu.png";

  // --- Mise en page du chemin (zone de jeu, sous le panneau de texte) ---
  // Alignée sur la largeur réelle du panneau de texte (TEXT_PANEL_X=60,
  // TEXT_PANEL_W=680 -> le panneau va de 60 à 740), pour que la zone de
  // jeu se lise comme "juste sous le texte" plutôt que comme une zone
  // séparée plus étroite.
  const PATH_START_X = 90, PATH_END_X = 710;
  const DIE_W = 54, DIE_H = 54, DIE_BEVEL = 8;
  // v6 : la position verticale des dés n'est plus une constante figée
  // loin du texte. Elle est recalculée CHAQUE FRAME à partir de la
  // hauteur réelle du panneau de texte (variable selon le nombre de
  // trous/lignes du mini-pitch), avec un petit écart fixe DIE_GAP_BELOW_TEXT
  // en dessous. C'est ce calcul qui corrige le "grand vide" signalé par
  // Julie : avant, les dés étaient à une hauteur fixe indépendante du
  // texte, ce qui créait un vide énorme si le panneau était court.
  const DIE_GAP_BELOW_TEXT = 32;
  // v7 : corrige un vrai bug de v6 — cette marge était PLUS GRANDE que la
  // portée de saut réelle (v²/2g ≈ 83px avec les constantes ci-dessus),
  // ce qui rendait les dés impossibles à toucher. Remise à une valeur
  // sûrement inférieure à la portée de saut, avec une marge de confort.
  const GROUND_GAP_BELOW_DICE = 50;
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

  function drawDie(ctx, x, y, symbol, style) {
    let face = "#e8c468", top = "#f3dc9a", side = "#b9903f";
    if (style === "correct") { face = "#6fcf97"; top = "#9fe6bd"; side = "#3f9c68"; }
    if (style === "wrong")   { face = "#d9534f"; top = "#e88d8a"; side = "#a83a37"; }

    ctx.fillStyle = face;
    ctx.fillRect(x, y + DIE_BEVEL, DIE_W, DIE_H - DIE_BEVEL);
    ctx.strokeStyle = "#1a1530";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y + DIE_BEVEL, DIE_W, DIE_H - DIE_BEVEL);

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(x, y + DIE_BEVEL);
    ctx.lineTo(x + DIE_BEVEL, y);
    ctx.lineTo(x + DIE_W + DIE_BEVEL, y);
    ctx.lineTo(x + DIE_W, y + DIE_BEVEL);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x + DIE_W, y + DIE_BEVEL);
    ctx.lineTo(x + DIE_W + DIE_BEVEL, y);
    ctx.lineTo(x + DIE_W + DIE_BEVEL, y + DIE_H);
    ctx.lineTo(x + DIE_W, y + DIE_H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1a1530";
    ctx.font = "bold 24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x + DIE_W / 2, y + DIE_BEVEL + (DIE_H - DIE_BEVEL) / 2 + 1);
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

    // v7 : GIF de marche fourni par Julie -> converti en WEBP animé (fond
    // détouré) côté outil. Le navigateur avance les frames du WEBP animé
    // tout seul quand on le redessine à chaque frame de la boucle de jeu :
    // aucun découpage manuel de grille à faire, contrairement à l'ancien
    // système RPG Maker qui n'a jamais marché correctement.
    const walkSprite = new Image();
    walkSprite.src = "/assets/sprites/characters/esprit-marche.webp";
    const idleSprite = new Image();
    idleSprite.src = "/assets/sprites/characters/esprit-idle.png";
    const bgImage = new Image();
    bgImage.src = BG_SRC;

    await MinigameUI.showInstructions({
      title: "L'Assaut des Barricades",
      objective: "La phrase à compléter est affichée en haut de l'écran, fixe. Déplace ton personnage avec les flèches gauche/droite (ou ◀ ▶ tactile) et saute — Espace, flèche du haut, ou ⤴ — pour toucher le dé par en dessous PENDANT qu'il affiche le bon signe. À chaque trou, un dé tourne LENTEMENT parmi plusieurs signes. Une erreur (mauvais signe touché) t'explique pourquoi puis relance une nouvelle phrase. Une phrase réussie du début à la fin termine le mini-jeu."
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
        const n = pitch.blanks.length;
        checkpoints = pitch.blanks.map((blank, i) => ({
          x: n === 1 ? (PATH_START_X + PATH_END_X) / 2 : PATH_START_X + i * (PATH_END_X - PATH_START_X) / (n - 1),
          blank,
          blankIndex: i,
          optionIndex: 0,
          cycleTimer: 0,
          state: "cycling" // cycling | correct | wrong
        }));
      }
      loadPitch(pitchIndex);

      // v6 : GROUND_Y et la hauteur des dés dépendent de la hauteur réelle
      // du panneau de texte (variable selon le mini-pitch). Recalculés à
      // chaque frame par updateVerticalLayout(), avant la physique et le
      // rendu, pour que collision et affichage utilisent toujours la même
      // valeur. Valeurs de secours ici, écrasées dès la première frame.
      let dieTopY = 200;
      let groundY = 420;

      function updateVerticalLayout(panelH) {
        const panelBottom = TEXT_PANEL_Y + panelH;
        dieTopY = panelBottom + DIE_GAP_BELOW_TEXT;
        groundY = dieTopY + DIE_H + DRAW_H + GROUND_GAP_BELOW_DICE;
      }

      function panelHeightFor(lines) {
        return lines.length * TEXT_LINE_HEIGHT + TEXT_PADDING * 2 - 6;
      }

      const player = { x: 60, y: 0, w: DRAW_W, h: DRAW_H, vy: 0, onGround: true, facing: "right", moving: false };
      // Layout initial (avant la première frame) pour placer le joueur au sol dès le départ.
      updateVerticalLayout(panelHeightFor(layoutText()));
      player.y = groundY - DRAW_H;

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
        if (player.onGround && !paused) {
          player.vy = JUMP_VELOCITY;
          player.onGround = false;
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
          spawnBurst(cp.x + DIE_W / 2, dieTopY + DIE_H / 2, "#6fcf97");
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
        player.y = groundY - DRAW_H;
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
          // v6/v7 : recalcule la position verticale des dés/sol à partir de
          // la hauteur réelle du panneau de texte, ET la position horizontale
          // de chaque dé à partir de la position réelle de SON trou dans le
          // texte (avant la physique, pour que collision et rendu utilisent
          // toujours les mêmes valeurs cette frame-ci).
          const lines = layoutText();
          updateVerticalLayout(panelHeightFor(lines));
          const blankCenters = computeBlankCenters(lines);
          checkpoints.forEach(cp => {
            const bx = blankCenters[cp.blankIndex];
            if (bx !== undefined) {
              cp.x = Math.max(PATH_START_X, Math.min(PATH_END_X - DIE_W, bx - DIE_W / 2));
            }
          });

          // Déplacement horizontal piloté par le joueur (remplace l'avancée
          // automatique). Bornes = zone de jeu sous le panneau de texte.
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

          player.vy += GRAVITY;
          player.y += player.vy;

          if (player.y + player.h >= groundY) {
            player.y = groundY - player.h;
            player.vy = 0;
            player.onGround = true;
          } else {
            player.onGround = false;
          }

          const cp = checkpoints[currentCheckpointIndex];
          if (cp && cp.state === "cycling") {
            if (player.vy < 0) {
              const headY = player.y;
              const withinX = player.x + player.w > cp.x - 6 && player.x < cp.x + DIE_W + DIE_BEVEL + 6;
              const hitsUnderside = headY <= dieTopY + DIE_H && headY >= dieTopY - 10;
              if (withinX && hitsUnderside) {
                player.y = dieTopY + DIE_H;
                player.vy = 1.5;
                resolveHit(cp);
              }
            }
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
        const blankW = 30;
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

      // v7 : les dés sont maintenant alignés horizontalement sous LEUR
      // trou réel dans le texte (calculé à partir du même layout que
      // l'affichage), au lieu d'être répartis uniformément sur un chemin
      // générique sans rapport avec la position des mots.
      function computeBlankCenters(lines) {
        const centers = {};
        lines.forEach(ln => {
          let x = TEXT_PANEL_X + (TEXT_PANEL_W - ln.width) / 2;
          ln.tokens.forEach(tok => {
            if (tok.type === "blank") centers[tok.index] = x + tok.w / 2;
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
              ctx.textAlign = "center";
              ctx.fillStyle = resolved ? "#e8c468" : "rgba(244,241,234,0.35)";
              ctx.font = resolved ? "bold 19px serif" : TEXT_FONT;
              ctx.fillText(resolved ? pitch.blanks[tok.index].correct : "_", x + tok.w / 2, y + (resolved ? 0 : 2));
              ctx.font = TEXT_FONT;
            }
            x += tok.w + ctx.measureText(" ").width;
          });
        });

        // Dés (zone de jeu)
        checkpoints.forEach(cp => {
          let symbol, style;
          if (cp.state === "correct") { symbol = cp.blank.correct; style = "correct"; }
          else if (cp.state === "wrong") { symbol = cp.blank.options[cp.optionIndex]; style = "wrong"; }
          else { symbol = cp.blank.options[cp.optionIndex]; style = "cycling"; }
          drawDie(ctx, cp.x, dieTopY, symbol, style);
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
        const activeSprite = useWalkAnim ? walkSprite : idleSprite;

        if (activeSprite.complete && activeSprite.naturalWidth > 0) {
          // Le sprite fourni est un portrait (pas une case carrée) : on
          // garde son ratio, on cale la hauteur sur celle du personnage
          // (un peu agrandie pour rester lisible) et on aligne les pieds
          // sur le bas de la zone de collision, qui elle ne change pas.
          const renderH = player.h * 1.9;
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
        ctx.moveTo(0, groundY + 2);
        ctx.lineTo(CANVAS_W, groundY + 2);
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
