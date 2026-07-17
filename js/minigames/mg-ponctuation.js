/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v5)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

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
  const GROUND_Y = 390;
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -10;
  const WALK_SPEED = 1.3; // vitesse de déplacement RÉEL du personnage à l'écran

  const DRAW_W = 56, DRAW_H = 56; // le sprite source est carré (48x48) : on garde un rendu carré

  // --- Sprite "marche", format RPG Maker MZ (voir note en tête de fichier) ---
  const SPRITE_CELL_W = 48;
  const SPRITE_CELL_H = 48;
  // Bloc [0][0] = origine (0,0) du fichier, donc pas de décalage à ajouter.
  // Convention standard : 0=bas(face), 1=gauche, 2=droite, 3=haut(dos).
  const WALK_ROW = 2;

  const KO_COL = 0, KO_ROW = 0;

  // --- Décor : simple image fixe (plus besoin d'un long décor à faire
  //     défiler, tout tient sur un seul écran maintenant) ---
  const BG_SRC = "/assets/backgrounds/decors_Hugo_barricades_minijeu.png";

  // --- Mise en page du chemin (zone de jeu, sous le panneau de texte) ---
  const PATH_START_X = 110, PATH_END_X = 690;
  const DIE_W = 54, DIE_H = 54, DIE_BEVEL = 8;
  const DIE_BOTTOM_Y = GROUND_Y - DRAW_H - 45; // 289 : portée de saut confortable
  const DIE_TOP_Y = DIE_BOTTOM_Y - DIE_H;      // 235
  const MISS_TRIGGER_OFFSET = 140;
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

    const sprite = new Image();
    sprite.src = "/assets/sprites/characters/esprit-marche.png";
    const koSprite = new Image();
    koSprite.src = "/assets/sprites/characters/esprit-ko.png";
    const bgImage = new Image();
    bgImage.src = BG_SRC;

    await MinigameUI.showInstructions({
      title: "L'Assaut des Barricades",
      objective: "La phrase à compléter est affichée en haut de l'écran, fixe. Ton personnage avance automatiquement en dessous. À chaque trou, un dé tourne LENTEMENT parmi plusieurs signes : saute — Espace, flèche du haut, ou ⤴ — pour le toucher par en dessous PENDANT qu'il affiche le bon signe. Une erreur (mauvais signe, ou trou dépassé sans saut) t'explique pourquoi puis relance une nouvelle phrase. Une phrase réussie du début à la fin termine le mini-jeu."
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

      const player = { x: 60, y: GROUND_Y - DRAW_H, w: DRAW_W, h: DRAW_H, vy: 0, onGround: true };

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
      function onKeyDown(e) {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") tryJump();
      }
      window.addEventListener("keydown", onKeyDown);
      document.getElementById("jump-btn").addEventListener("click", tryJump);

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
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
          spawnBurst(cp.x + DIE_W / 2, DIE_TOP_Y + DIE_H / 2, "#6fcf97");
          showFeedback(true, cp.blank.why);
          pendingAction = "next";
        } else {
          cp.state = "wrong";
          koUntil = performance.now() + 500;
          showFeedback(false, cp.blank.why);
          pendingAction = "newPitch";
        }
      }

      function resolveMiss(cp) {
        if (cp.state !== "cycling") return;
        cp.state = "wrong";
        paused = true;
        pauseTimer = 115;
        koUntil = performance.now() + 500;
        showFeedback(false, "Tu es passé sous le dé sans sauter au bon moment. " + cp.blank.why);
        pendingAction = "newPitch";
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
      let animFrame = 0, animTimer = 0;

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
          if (player.x < PATH_END_X + 40) player.x += WALK_SPEED;
          player.vy += GRAVITY;
          player.y += player.vy;

          if (player.y + player.h >= GROUND_Y) {
            player.y = GROUND_Y - player.h;
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
              const hitsUnderside = headY <= DIE_TOP_Y + DIE_H && headY >= DIE_TOP_Y - 10;
              if (withinX && hitsUnderside) {
                player.y = DIE_TOP_Y + DIE_H;
                player.vy = 1.5;
                resolveHit(cp);
              }
            }
            if (cp.state === "cycling" && player.x > cp.x + MISS_TRIGGER_OFFSET) {
              resolveMiss(cp);
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

          animTimer++;
          if (animTimer >= 9) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
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
          drawDie(ctx, cp.x, DIE_TOP_Y, symbol, style);
        });

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const useKo = performance.now() < koUntil && koSprite.complete && koSprite.naturalWidth > 0;
        if (useKo) {
          ctx.drawImage(koSprite, KO_COL * SPRITE_CELL_W, KO_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H, player.x, player.y, player.w, player.h);
        } else if (sprite.complete && sprite.naturalWidth > 0) {
          const frame = player.onGround ? animFrame : 1;
          ctx.drawImage(sprite, frame * SPRITE_CELL_W, WALK_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H, player.x, player.y, player.w, player.h);
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(player.x, player.y, player.w, player.h);
        }

        // Sol
        ctx.strokeStyle = "rgba(232,196,104,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y + DRAW_H + 2);
        ctx.lineTo(CANVAS_W, GROUND_Y + DRAW_H + 2);
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
