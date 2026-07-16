/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v4)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- v4 : mécanique clarifiée par Julie (visuels à l'appui) ----
   Ce n'est plus 3 courtes phrases indépendantes (v2 : clic ; v3 :
   4 blocs statiques pour 1 trou). C'est maintenant UNE seule longue
   phrase contenant PLUSIEURS trous de ponctuation, chacun matérialisé
   par UN dé flottant au-dessus du texte, à l'endroit exact du trou.
   Chaque dé tourne LENTEMENT parmi plusieurs signes possibles. Le
   joueur avance automatiquement sur un chemin et doit SAUTER, par en
   dessous, au bon moment pour toucher le dé pendant qu'il affiche le
   bon signe.

   - Bonne réponse (dé touché pendant qu'il affiche le bon signe) →
     le dé se fige sur ce signe, le joueur continue vers le trou
     suivant DANS LA MÊME phrase.
   - Mauvaise réponse (dé touché sur le mauvais signe, OU trou dépassé
     sans avoir sauté) → toute la phrase recommence depuis le début
     (tous les dés, y compris ceux déjà réussis, repartent de zéro).

   Le jeu ne se termine (résolution de la Promise, toujours en
   succès) qu'une fois la phrase entièrement réussie d'un seul tenant
   — les échecs sont des tentatives internes, pas un échec du
   mini-jeu au sens de sceneManager.js.

   Sprite : feuille "marche" (esprit-marche.png, voir mg-shared.js /
   livraison précédente), mêmes cellules 72x96 que la feuille combat.

   Enregistré sous la notion "ponctuation", variante "barricades_hugo"
   (inchangée : aucune autre partie du code n'a besoin de changer).
   ============================================================ */

(function registerPonctuationHugoV4() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;
  const GROUND_Y = CANVAS_H - 60; // 390
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -10;
  const SCROLL_SPEED = 2.4;

  const DRAW_W = 48;
  const DRAW_H = 64;

  // --- Sprite "marche" (grille 8 colonnes x 4 lignes, cellules 72x96) ---
  const SPRITE_CELL_W = 72;
  const SPRITE_CELL_H = 96;
  // Convention supposée : 0=face, 1=gauche, 2=droite, 3=dos. On court
  // vers la droite → ligne 2. Ajuste cette constante si besoin une
  // fois testé en jeu (même réglage que mg-ordre-mots.js).
  const WALK_ROW = 2;

  // --- Sprite "KO" (même grille), petit "aïe" visuel sur une mauvaise
  //     réponse. Change KO_COL/KO_ROW si une autre case est plus lisible. ---
  const KO_COL = 0;
  const KO_ROW = 0;

  // --- Décor (à créer par Julie — voir message de livraison) ---
  const BG_SRC = "/assets/backgrounds/decors_Hugo_barricades_minijeu.png";

  // --- Dés (trous de ponctuation) ---
  const DIE_W = 54, DIE_H = 54, DIE_BEVEL = 8;
  // Même logique de portée de saut que la v3 : le bas du dé est 45px
  // au-dessus de la tête du joueur à l'arrêt (~83px de portée max).
  const DIE_BOTTOM_Y = GROUND_Y - DRAW_H - 45; // 281
  const DIE_TOP_Y = DIE_BOTTOM_Y - DIE_H;      // 227
  const TEXT_Y = DIE_TOP_Y + DIE_BEVEL + (DIE_H - DIE_BEVEL) / 2; // aligné sur le centre du dé
  const CYCLE_INTERVAL = 50; // frames entre deux signes affichés (~0.8s) : lent, lisible

  // Largeur allouée par "segment de phrase + son dé" ; le texte est
  // dessiné en partant de la gauche du segment, le dé se place vers
  // la fin du segment (marge avant le suivant).
  const SEGMENT_SLOT_WIDTH = 600;
  const LEVEL_START_X = 140;
  const DIE_MARGIN_BEFORE_NEXT = 80;
  const MISS_TRIGGER_OFFSET = 260;

  // Deux phrases possibles (tirée au sort) : contenu pédagogique.
  // segments[i] est suivi du trou blanks[i] (même longueur).
  const LONG_SENTENCE_SETS = [
    {
      segments: ["Dans les Misérables de Victor Hugo", "Fantine confia Cosette", "sa fille", "aux Thénardier"],
      blanks: [
        {
          correct: ",",
          options: [",", ".", "!", "?"],
          why: "Cette virgule sépare le complément placé en tête de phrase (« Dans les Misérables... ») du reste de la phrase : virgule d'introduction."
        },
        {
          correct: ",",
          options: [",", ".", "!", ";"],
          why: "« sa fille » est une apposition qui précise qui est Cosette : elle s'ouvre par une virgule."
        },
        {
          correct: ",",
          options: [",", ".", "!", ";"],
          why: "L'apposition « sa fille » se referme par une seconde virgule avant de continuer la phrase."
        },
        {
          correct: ".",
          options: [".", ",", "!", "?"],
          why: "C'est la fin de la phrase : un point la clôt normalement."
        }
      ]
    },
    {
      segments: ["Quand la nuit tomba sur Paris", "Gavroche", "prudent", "se glissa vers la barricade"],
      blanks: [
        {
          correct: ",",
          options: [",", ".", "!", "?"],
          why: "« Quand la nuit tomba sur Paris » est une proposition placée en tête de phrase : une virgule la sépare de la suite."
        },
        {
          correct: ",",
          options: [",", ".", "!", ";"],
          why: "« prudent » est une apposition qui décrit Gavroche : elle s'ouvre par une virgule."
        },
        {
          correct: ",",
          options: [",", ".", "!", ";"],
          why: "L'apposition « prudent » se referme par une seconde virgule."
        },
        {
          correct: ".",
          options: [".", ",", "!", "?"],
          why: "C'est la fin de la phrase : un point la clôt normalement."
        }
      ]
    }
  ];

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

  async function run({ canvas, uiContainer, isRemediation }) {

    const sprite = new Image();
    sprite.src = "/assets/sprites/characters/esprit-marche.png";
    const koSprite = new Image();
    koSprite.src = "/assets/sprites/characters/esprit-ko.png";
    const bgImage = new Image();
    bgImage.src = BG_SRC;

    await MinigameUI.showInstructions({
      title: "L'Assaut des Barricades",
      objective: "Tu avances automatiquement le long de la phrase affichée au-dessus de toi. À chaque trou, un dé tourne lentement parmi plusieurs signes de ponctuation : saute — Espace, flèche du haut, ou ⤴ — pour le toucher par en dessous PENDANT qu'il affiche le bon signe. Une bonne réponse te fait continuer vers le trou suivant. Une mauvaise réponse (ou un trou dépassé sans saut) te fait recommencer TOUTE la phrase depuis le début."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const set = LONG_SENTENCE_SETS[Math.floor(Math.random() * LONG_SENTENCE_SETS.length)];

      const checkpoints = set.blanks.map((blank, i) => ({
        x: LEVEL_START_X + (i + 1) * SEGMENT_SLOT_WIDTH - DIE_MARGIN_BEFORE_NEXT,
        segmentText: set.segments[i],
        segmentX: LEVEL_START_X + i * SEGMENT_SLOT_WIDTH + 16,
        blank,
        optionIndex: 0,
        cycleTimer: 0,
        state: "cycling" // cycling | correct
      }));

      const player = { x: 60, y: GROUND_Y - DRAW_H, w: DRAW_W, h: DRAW_H, vy: 0, onGround: true };

      let currentCheckpointIndex = 0;
      let attempt = 1;
      let resultGiven = false;
      let paused = false;
      let pauseTimer = 0;
      let pendingRestart = false;
      let koUntil = 0;
      const particles = [];

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"}</div>
        <div class="hud-item">Trou <span id="mg-progress">1</span> / ${checkpoints.length}</div>
        <div class="hud-item">Tentative n° <span id="mg-attempt">1</span></div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" id="jump-btn">⤴</button>
        </div>
      `);

      function updateHud() {
        document.getElementById("mg-progress").textContent = Math.min(currentCheckpointIndex + 1, checkpoints.length);
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
          <div class="hud-item" id="mg-feedback" style="color:${isCorrect ? '#6fcf97' : '#d9534f'}; font-weight:bold; max-width:640px;">
            ${isCorrect ? "✓ Exact !" : "✗ Pas ça —"} ${why}${isCorrect ? "" : " On recommence la phrase depuis le début !"}
          </div>
        `);
      }

      function resolveHit(cp) {
        if (cp.state !== "cycling") return;
        const shownSymbol = cp.blank.options[cp.optionIndex];
        const isCorrect = shownSymbol === cp.blank.correct;
        paused = true;
        pauseTimer = 105;

        if (isCorrect) {
          cp.state = "correct";
          spawnBurst(cp.x + DIE_W / 2, DIE_TOP_Y + DIE_H / 2, "#6fcf97");
          showFeedback(true, cp.blank.why);
        } else {
          cp.state = "wrong";
          koUntil = performance.now() + 500;
          pendingRestart = true;
          showFeedback(false, cp.blank.why);
        }
      }

      function resolveMiss(cp) {
        if (cp.state !== "cycling") return;
        cp.state = "wrong";
        paused = true;
        pauseTimer = 105;
        pendingRestart = true;
        koUntil = performance.now() + 500;
        showFeedback(false, "Tu es passé sous le dé sans sauter au bon moment. " + cp.blank.why);
      }

      function restartLevel() {
        player.x = 60;
        player.y = GROUND_Y - DRAW_H;
        player.vy = 0;
        player.onGround = true;
        currentCheckpointIndex = 0;
        attempt++;
        checkpoints.forEach(cp => {
          cp.state = "cycling";
          cp.optionIndex = 0;
          cp.cycleTimer = 0;
        });
        updateHud();
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: `Phrase complète, bien joué ! (en ${attempt} tentative${attempt > 1 ? "s" : ""})`
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

            if (pendingRestart) {
              pendingRestart = false;
              restartLevel();
            } else {
              currentCheckpointIndex++;
              updateHud();
              if (currentCheckpointIndex >= checkpoints.length) {
                endGame();
                return;
              }
            }
          }
        } else {
          player.x += SCROLL_SPEED;
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

          // cycle de tous les dés non résolus (visible même à distance)
          checkpoints.forEach(c => {
            if (c.state !== "cycling") return;
            c.cycleTimer++;
            if (c.cycleTimer >= CYCLE_INTERVAL) {
              c.cycleTimer = 0;
              c.optionIndex = (c.optionIndex + 1) % c.blank.options.length;
            }
          });

          animTimer++;
          if (animTimer >= 7) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
          if (p.life <= 0) particles.splice(i, 1);
        }

        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      function render() {
        const screenOffset = player.x - 60;

        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, -screenOffset, 0, bgImage.naturalWidth, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Texte de la phrase (segments), aligné sur la ligne des dés
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#f4f1ea";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        checkpoints.forEach(cp => {
          const screenX = cp.segmentX - screenOffset;
          if (screenX > -600 && screenX < CANVAS_W + 100) {
            ctx.fillText(cp.segmentText, screenX, TEXT_Y);
          }
        });

        // Dés
        checkpoints.forEach(cp => {
          const screenX = cp.x - screenOffset;
          if (screenX < -DIE_W - DIE_BEVEL || screenX > CANVAS_W) return;
          let symbol, style;
          if (cp.state === "correct") {
            symbol = cp.blank.correct; style = "correct";
          } else if (cp.state === "wrong") {
            symbol = cp.blank.options[cp.optionIndex]; style = "wrong";
          } else {
            symbol = cp.blank.options[cp.optionIndex]; style = "cycling";
          }
          drawDie(ctx, screenX, DIE_TOP_Y, symbol, style);
        });

        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x - screenOffset, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const useKo = performance.now() < koUntil && koSprite.complete && koSprite.naturalWidth > 0;
        if (useKo) {
          ctx.drawImage(koSprite, KO_COL * SPRITE_CELL_W, KO_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H, 60, player.y, player.w, player.h);
        } else if (sprite.complete && sprite.naturalWidth > 0) {
          const frame = player.onGround ? animFrame : 1;
          ctx.drawImage(sprite, frame * SPRITE_CELL_W, WALK_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H, 60, player.y, player.w, player.h);
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(60, player.y, player.w, player.h);
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
