/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v3)
   ============================================================
   Mini-jeu "L'Assaut des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- POURQUOI CETTE VERSION REMPLACE LA v2 ----
   La v2 (3 phrases, clic sur le bon signe parmi 4 boutons) reproduisait
   presque à l'identique un exercice du visual novel (QCM / texte à
   trous) : aucune différence de gameplay, donc aucun intérêt propre en
   tant que "mini-jeu" (verdict de Julie après test).

   Nouvelle mécanique (plateforme façon Mario, contenu pédagogique
   inchangé) : le joueur court automatiquement vers la droite et doit
   SAUTER pour taper, par en dessous, le bon bloc de ponctuation parmi
   4 blocs suspendus au-dessus de chaque "barricade" — comme les blocs
   "?" de Mario.

   Écart volontaire par rapport à l'idée d'origine (bloc unique dont le
   symbole alterne/tourne) : les 4 symboles restent VISIBLES en
   permanence. Un symbole qui change au hasard aurait réintroduit
   exactement le défaut de la v1/v2 — réussir en tombant au bon moment
   par chance plutôt qu'en sachant la bonne réponse. Ici la réflexion
   (quel signe est correct ?) reste 100% la compétence testée ; c'est
   l'EXÉCUTION (courir, sauter juste) qui devient un vrai jeu.

   Seul le PREMIER bloc touché compte comme réponse à la phrase en
   cours (comme un clic en v2 : pas de deuxième chance sur la même
   phrase). Feedback pédagogique immédiat et complet dans tous les cas,
   affiché en texte sous le jeu comme en v2. Il faut au moins 2 bonnes
   réponses sur 3 pour réussir.

   Sprite : feuille "marche" fournie par Julie (esprit-marche.png),
   mêmes dimensions de cellule que la feuille combat déjà utilisée
   ailleurs (72x96, grille 8 colonnes x 4 lignes). Une feuille "KO"
   (esprit-ko.png) est utilisée brièvement en cas de mauvaise réponse.

   Enregistré sous la notion "ponctuation", variante "barricades_hugo"
   (inchangée : aucune autre partie du code n'a besoin de changer).
   ============================================================ */

(function registerPonctuationHugoV3() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;
  const GROUND_Y = CANVAS_H - 60; // 390
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -10;
  const SCROLL_SPEED = 2.4;

  const DRAW_W = 48;
  const DRAW_H = 64;

  // --- Sprite "marche" (feuille 8 colonnes x 4 lignes, cellules 72x96 —
  //     mêmes dimensions que la feuille combat déjà utilisée ailleurs) ---
  const SPRITE_CELL_W = 72;
  const SPRITE_CELL_H = 96;
  // Convention supposée : ligne 0 = face, 1 = gauche, 2 = droite, 3 = dos.
  // On court vers la droite → ligne 2. Si le personnage a l'air de
  // travers une fois testé en jeu, change juste cette constante.
  const WALK_ROW = 2;

  // --- Sprite "KO" (même grille), pour un petit "aïe" visuel sur une
  //     mauvaise réponse. Cellule (0,0) utilisée telle quelle ; change
  //     KO_COL/KO_ROW si une autre case du sheet est plus lisible. ---
  const KO_COL = 0;
  const KO_ROW = 0;

  // --- Décor (à créer par Julie — voir message de livraison pour le
  //     nom exact, l'emplacement et les dimensions recommandées) ---
  const BG_SRC = "/assets/backgrounds/decors_Hugo_barricades_minijeu.png";

  // Même banque de phrases que la v2 : seul le mécanisme de jeu change,
  // pas le contenu pédagogique.
  const EXERCISE_SETS = [
    [
      {
        sentence: "Gavroche courait dans la rue ___",
        correct: "!",
        options: ["!", ".", "?", ","],
        why: "La phrase exprime une action vive, presque un cri : le point d'exclamation marque l'intensité."
      },
      {
        sentence: "Connais-tu le chemin des barricades ___",
        correct: "?",
        options: ["?", ".", "!", ","],
        why: "C'est une question directe : elle appelle un point d'interrogation."
      },
      {
        sentence: "Il s'arrêta net ___ puis repartit aussitôt",
        correct: ",",
        options: [",", ".", "!", ";"],
        why: "La phrase continue juste après (« puis repartit ») : une simple pause suffit, donc une virgule."
      }
    ],
    [
      {
        sentence: "La nuit tombait sur Paris ___",
        correct: ".",
        options: [".", "!", "?", ","],
        why: "C'est une simple constatation, calme : le point clôt la phrase normalement."
      },
      {
        sentence: "Attention, la barricade va céder ___",
        correct: "!",
        options: ["!", ".", "?", ","],
        why: "C'est un avertissement urgent : le point d'exclamation traduit l'alerte."
      },
      {
        sentence: "Qui va là ___",
        correct: "?",
        options: ["?", ".", "!", ","],
        why: "On interroge quelqu'un directement : point d'interrogation obligatoire."
      }
    ]
  ];

  // Position (monde) du centre de chaque rangée de blocs, une par phrase.
  const CHECKPOINT_X = [550, 1150, 1750];
  // Distance au-delà du checkpoint à partir de laquelle, si aucun bloc
  // n'a été touché, la phrase est considérée comme "passée sans réponse".
  const MISS_TRIGGER_OFFSET = 260;
  // Largeur totale de décor recommandée à Julie (voir message de
  // livraison) : dernier checkpoint (1750) + marge de déclenchement du
  // "raté" (260) + marge visuelle = 2200.

  const BLOCK_W = 70, BLOCK_H = 60, BLOCK_GAP = 14;
  // Le bas des blocs est placé 45px au-dessus de la tête du joueur à
  // l'arrêt — largement dans la portée du saut (~83px max avec les
  // constantes GRAVITY/JUMP_VELOCITY ci-dessus), pour un timing confortable.
  const BLOCK_BOTTOM_Y = GROUND_Y - DRAW_H - 45; // 281
  const BLOCK_TOP_Y = BLOCK_BOTTOM_Y - BLOCK_H;  // 221

  async function run({ canvas, uiContainer, isRemediation }) {

    // Chargement des images en parallèle de l'écran d'instructions
    const sprite = new Image();
    sprite.src = "/assets/sprites/characters/esprit-marche.png";
    const koSprite = new Image();
    koSprite.src = "/assets/sprites/characters/esprit-ko.png";
    const bgImage = new Image();
    bgImage.src = BG_SRC;

    await MinigameUI.showInstructions({
      title: "L'Assaut des Barricades",
      objective: "Tu cours vers la droite (déplacement automatique). À chaque barricade, saute — barre Espace, flèche du haut, ou le bouton ⤴ — pour taper par en dessous le bon signe de ponctuation parmi les 4 blocs suspendus au-dessus de ta tête. Un seul saut compte par phrase : lis bien avant de sauter ! Il te faut au moins 2 bonnes réponses sur 3 pour réussir."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const set = EXERCISE_SETS[Math.floor(Math.random() * EXERCISE_SETS.length)];

      const checkpoints = CHECKPOINT_X.map((cx, i) => {
        const ex = set[i];
        const totalW = ex.options.length * BLOCK_W + (ex.options.length - 1) * BLOCK_GAP;
        const startX = cx - totalW / 2;
        const blocks = ex.options.map((symbol, bi) => ({
          symbol,
          isCorrect: symbol === ex.correct,
          x: startX + bi * (BLOCK_W + BLOCK_GAP),
          y: BLOCK_TOP_Y,
          w: BLOCK_W,
          h: BLOCK_H,
          state: "idle" // idle | correct | wrong
        }));
        return { x: cx, exercise: ex, blocks, resolved: false };
      });

      const player = {
        x: 60, y: GROUND_Y - DRAW_H,
        w: DRAW_W, h: DRAW_H,
        vy: 0, onGround: true
      };

      let currentCheckpointIndex = 0;
      let score = 0;
      let resultGiven = false;
      let paused = false;
      let pauseTimer = 0;
      let koUntil = 0;
      const particles = [];

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"}</div>
        <div class="hud-item" id="mg-sentence" style="max-width:640px;"></div>
        <div class="hud-item">Barricade <span id="mg-progress">1</span> / ${checkpoints.length}</div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" id="jump-btn">⤴</button>
        </div>
      `);

      function updateSentenceDisplay() {
        const cp = checkpoints[currentCheckpointIndex];
        document.getElementById("mg-sentence").textContent = cp ? cp.exercise.sentence : "";
        document.getElementById("mg-progress").textContent = Math.min(currentCheckpointIndex + 1, checkpoints.length);
      }
      updateSentenceDisplay();

      // --- Contrôles ---
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
            life: 28, maxLife: 28,
            color
          });
        }
      }

      function resolveCheckpoint(cp, hitBlock) {
        if (cp.resolved) return;
        cp.resolved = true;
        paused = true;
        pauseTimer = 105; // ~1.7-1.8s à 60fps : le temps de lire le feedback

        const isCorrect = !!(hitBlock && hitBlock.isCorrect);
        if (isCorrect) {
          hitBlock.state = "correct";
          score++;
          spawnBurst(hitBlock.x + hitBlock.w / 2, hitBlock.y + hitBlock.h / 2, "#6fcf97");
        } else {
          if (hitBlock) hitBlock.state = "wrong";
          const correctBlock = cp.blocks.find(b => b.isCorrect);
          if (correctBlock) correctBlock.state = "correct";
          koUntil = performance.now() + 500;
        }

        uiContainer.insertAdjacentHTML("beforeend", `
          <div class="hud-item" id="mg-feedback" style="color:${isCorrect ? '#6fcf97' : '#d9534f'}; font-weight:bold; max-width:640px;">
            ${isCorrect ? "✓ Exact !" : "✗ Pas cette fois."} ${cp.exercise.why}
          </div>
        `);
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        const passed = score >= 2;
        await MinigameUI.showResult({
          passed,
          message: passed
            ? `Bien joué : ${score} / ${checkpoints.length} bonnes réponses.`
            : `${score} / ${checkpoints.length} bonnes réponses — il en fallait au moins 2. Relis bien la phrase avant de sauter la prochaine fois.`
        });
        resolve({ passed, score, total: checkpoints.length });
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
            currentCheckpointIndex++;
            if (currentCheckpointIndex >= checkpoints.length) {
              endGame();
              return;
            }
            updateSentenceDisplay();
          }
        } else {
          // --- Défilement + physique ---
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
          if (cp && !cp.resolved) {
            if (player.vy < 0) {
              const headY = player.y;
              for (const block of cp.blocks) {
                const withinX = player.x + player.w > block.x && player.x < block.x + block.w;
                const hitsUnderside = headY <= block.y + block.h && headY >= block.y - 10;
                if (withinX && hitsUnderside) {
                  player.y = block.y + block.h;
                  player.vy = 1.5;
                  resolveCheckpoint(cp, block);
                  break;
                }
              }
            }
            if (!cp.resolved && player.x > cp.x + MISS_TRIGGER_OFFSET) {
              resolveCheckpoint(cp, null);
            }
          }

          // --- anim sprite ---
          animTimer++;
          if (animTimer >= 7) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
        }

        // --- particules (continuent même pendant la pause de feedback) ---
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

        // Blocs
        ctx.font = "bold 30px serif";
        checkpoints.forEach(cp => {
          cp.blocks.forEach(block => {
            const screenX = block.x - screenOffset;
            if (screenX < -block.w || screenX > CANVAS_W) return;

            let fill = "#e8c468";
            if (block.state === "correct") fill = "#6fcf97";
            if (block.state === "wrong") fill = "#d9534f";

            ctx.fillStyle = fill;
            ctx.fillRect(screenX, block.y, block.w, block.h);
            ctx.strokeStyle = "#4a3a1a";
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, block.y, block.w, block.h);

            ctx.fillStyle = "#1a1530";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(block.symbol, screenX + block.w / 2, block.y + block.h / 2 + 2);
          });
        });

        // Particules
        particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x - screenOffset, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Joueur
        const useKo = performance.now() < koUntil && koSprite.complete && koSprite.naturalWidth > 0;
        if (useKo) {
          ctx.drawImage(
            koSprite,
            KO_COL * SPRITE_CELL_W, KO_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H,
            60, player.y, player.w, player.h
          );
        } else if (sprite.complete && sprite.naturalWidth > 0) {
          const frame = player.onGround ? animFrame : 1;
          ctx.drawImage(
            sprite,
            frame * SPRITE_CELL_W, WALK_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H,
            60, player.y, player.w, player.h
          );
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
