/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js
   ============================================================
   Mini-jeu de ponctuation, variante "Tri des Barricades"
   (Monde 1 — Hugo).

   Principe pédagogique (ancrage visuel/spatial, Paivio) :
   le joueur déplace $gavroche.png dans un couloir et doit
   "attraper" le bon signe de ponctuation pour compléter la
   phrase affichée en haut de l'écran, en évitant les
   silhouettes de Thénardier (distracteurs/pénalités).

   Ce module s'enregistre auprès de SceneManager sous la
   notion "ponctuation", variante "barricades_hugo". D'autres
   mondes enregistreront d'autres variantes pour la même
   notion (ex. "duel_epee_dumas"), garantissant une répétition
   espacée avec des modalités sensorielles différentes.

   API attendue par sceneManager.playMinigameForNotion :
     module.run({ worldId, actId, canvas, uiContainer, isRemediation })
       -> Promise<{ passed: boolean, score: number, total: number }>
   ============================================================ */

(function registerPonctuationHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  /**
   * Banque d'exercices : chaque entrée propose une phrase à
   * compléter et la liste de signes "ramassables" (bons + leurres).
   * Une nouvelle phrase est piochée à chaque lancement pour
   * éviter la répétition d'occurrence (cf. consigne pédagogique).
   */
  const EXERCISES = [
    {
      sentence: "Gavroche courait dans la rue ___",
      correct: "!",
      collectibles: ["!", ".", "?", ","]
    },
    {
      sentence: "Il s'arrêta net ___ puis repartit aussitôt",
      correct: ",",
      collectibles: [",", ".", "!", ";"]
    },
    {
      sentence: "Connais-tu le chemin des barricades ___",
      correct: "?",
      collectibles: ["?", ".", "!", ","]
    },
    {
      sentence: "La nuit tombait sur Paris ___",
      correct: ".",
      collectibles: [".", "!", "?", ","]
    }
  ];

  function pickExercise() {
    return EXERCISES[Math.floor(Math.random() * EXERCISES.length)];
  }

  function run({ canvas, uiContainer, isRemediation }) {
    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const exercise = pickExercise();

      // --- État du joueur (sprite Gavroche) ---
      // Sprite sheet RPG Maker MZ : 576x384px, cellules de 96x96px
      // (grille 6 colonnes x 4 lignes). Le personnage occupe les
      // colonnes 0-2 de chaque ligne (3 frames de marche par
      // direction) ; colonnes 3-5 réservées à un éventuel 2e
      // personnage sur la même feuille.
      // Lignes : 0=bas, 1=gauche, 2=droite, 3=haut.
      const SPRITE_CELL_W = 96;
      const SPRITE_CELL_H = 96;
      const DRAW_W = 48;  // taille d'affichage à l'écran (réduite du sprite source)
      const DRAW_H = 64;

      const SPRITE_ROWS = { down: 0, left: 1, right: 2, up: 3 };
      const ANIM_FRAMES = 3;     // colonnes 0..2 utilisées pour le cycle
      const ANIM_SPEED = 8;      // ticks de jeu entre deux frames

      const player = {
        x: 60, y: CANVAS_H / 2,
        w: DRAW_W, h: DRAW_H,
        speed: 4,
        direction: "right",
        animFrame: 0,
        animTimer: 0,
        moving: false
      };

      // --- Génération des signes à collecter (positions aléatoires) ---
      const items = exercise.collectibles.map((symbol, i) => ({
        symbol,
        x: 200 + i * 140,
        y: 80 + Math.random() * (CANVAS_H - 200),
        w: 40, h: 40,
        collected: false,
        isCorrect: symbol === exercise.correct
      }));

      // --- Obstacles (Thénardier) : pénalité si touché ---
      const obstacles = [
        { x: 350, y: CANVAS_H - 100, w: 36, h: 48, vx: 1.5 },
        { x: 550, y: 60, w: 36, h: 48, vx: -1.2 }
      ];

      let lives = 3;
      let resultGiven = false;

      // --- Image du sprite (sheet de marche, découpée à l'affichage) ---
      const sprite = new Image();
      sprite.src = "assets/sprites/characters/gavroche-marche.png";

      // --- HUD ---
      uiContainer.innerHTML = `
        <div class="hud-item">Vies : <span id="mg-lives">${lives}</span></div>
        <div class="hud-item" id="mg-sentence"></div>
      `;
      document.getElementById("mg-sentence").textContent = exercise.sentence;

      // --- Contrôles clavier ---
      const keys = {};
      function onKeyDown(e) { keys[e.key] = true; }
      function onKeyUp(e) { keys[e.key] = false; }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      // --- Contrôles tactiles simples (mobile) ---
      const touchState = { up: false, down: false, left: false, right: false };
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" data-dir="left">◀</button>
          <button class="touch-btn" data-dir="up">▲</button>
          <button class="touch-btn" data-dir="down">▼</button>
          <button class="touch-btn" data-dir="right">▶</button>
        </div>
      `);
      uiContainer.querySelectorAll(".touch-btn").forEach(btn => {
        const dir = btn.dataset.dir;
        const set = v => () => touchState[dir] = v;
        btn.addEventListener("touchstart", set(true));
        btn.addEventListener("touchend", set(false));
        btn.addEventListener("mousedown", set(true));
        btn.addEventListener("mouseup", set(false));
      });

      function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
      }

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(rafId);
      }

      function endGame(passed) {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        resolve({
          passed,
          score: passed ? 1 : 0,
          total: 1
        });
      }

      let rafId;
      function loop() {
        // --- Déplacement joueur ---
        let dx = 0, dy = 0;
        if (keys["ArrowUp"] || keys["w"] || touchState.up)    dy -= player.speed;
        if (keys["ArrowDown"] || keys["s"] || touchState.down) dy += player.speed;
        if (keys["ArrowLeft"] || keys["a"] || touchState.left) dx -= player.speed;
        if (keys["ArrowRight"] || keys["d"] || touchState.right) dx += player.speed;

        player.moving = (dx !== 0 || dy !== 0);

        // Détermine la direction du sprite (priorité à l'axe dominant)
        if (dx !== 0 && Math.abs(dx) >= Math.abs(dy)) {
          player.direction = dx > 0 ? "right" : "left";
        } else if (dy !== 0) {
          player.direction = dy > 0 ? "down" : "up";
        }

        player.x += dx;
        player.y += dy;

        // Animation : avance d'une frame toutes les ANIM_SPEED ticks
        if (player.moving) {
          player.animTimer++;
          if (player.animTimer >= ANIM_SPEED) {
            player.animTimer = 0;
            player.animFrame = (player.animFrame + 1) % ANIM_FRAMES;
          }
        } else {
          player.animFrame = 0; // frame "debout" = première colonne
          player.animTimer = 0;
        }

        player.x = Math.max(0, Math.min(CANVAS_W - player.w, player.x));
        player.y = Math.max(0, Math.min(CANVAS_H - player.h, player.y));

        // --- Déplacement obstacles (va-et-vient vertical simple) ---
        obstacles.forEach(o => {
          o.y += o.vx;
          if (o.y <= 0 || o.y + o.h >= CANVAS_H) o.vx *= -1;
        });

        // --- Collisions avec items ---
        items.forEach(item => {
          if (item.collected) return;
          if (rectsOverlap(player, item)) {
            item.collected = true;
            if (item.isCorrect) {
              endGame(true);
            } else {
              lives--;
              document.getElementById("mg-lives").textContent = lives;
              if (lives <= 0) endGame(false);
            }
          }
        });

        // --- Collisions avec obstacles ---
        obstacles.forEach(o => {
          if (rectsOverlap(player, o)) {
            lives--;
            document.getElementById("mg-lives").textContent = lives;
            player.x = 60; player.y = CANVAS_H / 2; // repositionnement
            if (lives <= 0) endGame(false);
          }
        });

        // --- Rendu ---
        ctx.fillStyle = "#1a1530";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Joueur (découpe de la cellule correspondant à direction + frame)
        if (sprite.complete && sprite.naturalWidth > 0) {
          const row = SPRITE_ROWS[player.direction];
          const sx = player.animFrame * SPRITE_CELL_W;
          const sy = row * SPRITE_CELL_H;
          ctx.drawImage(
            sprite,
            sx, sy, SPRITE_CELL_W, SPRITE_CELL_H,
            player.x, player.y, player.w, player.h
          );
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(player.x, player.y, player.w, player.h);
        }

        // Items
        items.forEach(item => {
          if (item.collected) return;
          ctx.fillStyle = "#2b2347";
          ctx.fillRect(item.x, item.y, item.w, item.h);
          ctx.strokeStyle = "#9d8cff";
          ctx.strokeRect(item.x, item.y, item.w, item.h);
          ctx.fillStyle = "#f4f1ea";
          ctx.font = "28px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(item.symbol, item.x + item.w / 2, item.y + item.h / 2);
        });

        // Obstacles (silhouettes Thénardier — placeholder en attendant le sprite)
        ctx.fillStyle = "#7a3b3b";
        obstacles.forEach(o => {
          ctx.beginPath();
          ctx.roundRect(o.x, o.y, o.w, o.h, 6);
          ctx.fill();
        });

        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      loop();
    });
  }

  // Enregistrement auprès du sceneManager
  SceneManager.registerMinigame("ponctuation", "barricades_hugo", {
    title: "Le Tri des Barricades",
    run
  });

})();
