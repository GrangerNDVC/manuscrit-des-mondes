/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ordre-mots.js
   ============================================================
   Mini-jeu "La Course dans les Égouts" (Monde 1 — Hugo).
   Notion : ordre des mots / structure de la phrase
   (sujet -> verbe -> complément).

   Principe pédagogique (ancrage kinesthésique séquentiel) :
   le joueur avance automatiquement vers la droite et doit
   SAUTER sur les plateformes-mots dans l'ordre syntaxique
   correct. Sauter sur le mauvais mot fait tomber le joueur
   (retour en arrière, pas d'échec direct sauf chute dans le vide).

   Enregistré sous la notion "ordre_des_mots",
   variante "egouts_hugo".
   ============================================================ */

(function registerOrdreMotsHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;
  const GROUND_Y = CANVAS_H - 60;
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -10;
  const SCROLL_SPEED = 2;

  /**
   * Banque de phrases : chaque "word" est un groupe de mots
   * (chunk) placé sur une plateforme, dans l'ordre correct
   * sujet -> verbe -> complément. L'affichage mélange l'ordre
   * des plateformes ; seul le bon enchaînement fait progresser
   * sans chute.
   */
  const SENTENCES = [
    { chunks: ["Gavroche", "courait", "vers la sortie"] },
    { chunks: ["L'Esprit", "suivait", "le jeune garçon"] },
    { chunks: ["Les égouts", "résonnaient", "sous leurs pas"] },
    { chunks: ["Une lumière", "filtrait", "depuis la rue"] }
  ];

  function pickSentence() {
    return SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "La Course dans les Égouts",
      objective: "Tu avances automatiquement. Saute (barre Espace, flèche haut, ou le bouton ⤴) sur les mots-plateformes dans le bon ordre : sujet, puis verbe, puis complément. Un mauvais saut te fait tomber, mais tu peux repartir du début."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const sentence = pickSentence();
      const correctOrder = sentence.chunks.map((_, i) => i);

      // Mélange l'ordre d'apparition des plateformes (sauf si trop court)
      let order = correctOrder;
      if (sentence.chunks.length > 1) {
        do {
          order = shuffle(correctOrder);
        } while (order.join() === correctOrder.join());
      }

      // --- Génération des plateformes-mots, espacées horizontalement ---
      const platforms = order.map((chunkIdx, i) => ({
        chunkIdx,
        x: 250 + i * 220,
        y: GROUND_Y - 90,
        w: 160,
        h: 24,
        landed: false
      }));

      // --- Sprite de l'Esprit (feuille "marche", réutilisée pour idle/saut) ---
      const SPRITE_CELL_W = 48;
      const SPRITE_CELL_H = 48;
      // Format RPG Maker MZ : le vrai personnage est dans le bloc [0][0]
      // (origine du fichier), grille 3 colonnes x 4 lignes de 48x48 —
      // vérifié par analyse des pixels (voir mg-ponctuation.js v5 pour
      // le détail). Convention supposée pour les lignes (à vérifier
      // visuellement en jeu) : ligne 0 = face, 1 = gauche, 2 = droite,
      // 3 = dos. On court vers la droite → ligne 2. Si l'animation a
      // l'air de travers, change juste WALK_ROW ci-dessous.
      const WALK_ROW = 2;
      const DRAW_W = 48;
      const DRAW_H = 64;
      const sprite = new Image();
      sprite.src = "/assets/sprites/characters/esprit-marche.png";

      const player = {
        x: 60, y: GROUND_Y - DRAW_H,
        w: DRAW_W, h: DRAW_H,
        vy: 0,
        onGround: true
      };

      let cameraX = 0;
      let nextExpectedStep = 0; // index dans correctOrder attendu
      let resultGiven = false;
      let message = "";
      let messageTimer = 0;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Sujet → Verbe → Complément</div>
      `;

      // --- Contrôles ---
      const keys = {};
      function onKeyDown(e) {
        keys[e.key] = true;
        if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && player.onGround) {
          player.vy = JUMP_VELOCITY;
          player.onGround = false;
        }
      }
      function onKeyUp(e) { keys[e.key] = false; }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" id="jump-btn">⤴</button>
        </div>
      `);
      const jumpBtn = document.getElementById("jump-btn");
      jumpBtn.addEventListener("click", () => {
        if (player.onGround) {
          player.vy = JUMP_VELOCITY;
          player.onGround = false;
        }
      });

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(rafId);
      }

      async function endGame(passed) {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed,
          message: passed
            ? "Tu as retrouvé l'ordre sujet → verbe → complément !"
            : `Ce n'était pas le bon ordre. La phrase correcte était : « ${sentence.chunks.join(" ")} ».`
        });
        resolve({ passed, score: passed ? 1 : 0, total: 1 });
      }

      let rafId;
      let animFrame = 0;
      let animTimer = 0;

      function loop() {
        // --- Avance automatique de la caméra (défilement) ---
        cameraX += SCROLL_SPEED;
        player.x += SCROLL_SPEED;

        // --- Physique verticale ---
        player.vy += GRAVITY;
        player.y += player.vy;

        // --- Collision avec le sol ---
        if (player.y + player.h >= GROUND_Y) {
          player.y = GROUND_Y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else {
          player.onGround = false;
        }

        // --- Collision avec plateformes (atterrissage par le dessus) ---
        platforms.forEach((plat, i) => {
          if (plat.landed) return;
          const withinX = player.x + player.w > plat.x && player.x < plat.x + plat.w;
          const fallingOnTop = player.vy >= 0 &&
            (player.y + player.h) >= plat.y &&
            (player.y + player.h) <= plat.y + plat.h + 10;

          if (withinX && fallingOnTop) {
            plat.landed = true;
            player.y = plat.y - player.h;
            player.vy = 0;
            player.onGround = true;

            if (plat.chunkIdx === correctOrder[nextExpectedStep]) {
              // Bon mot dans l'ordre attendu
              nextExpectedStep++;
              message = "✓";
              messageTimer = 30;
              if (nextExpectedStep >= correctOrder.length) {
                endGame(true);
              }
            } else {
              // Mauvais mot : le sol se dérobe, le joueur tombe
              message = "✗ Pas dans cet ordre...";
              messageTimer = 40;
              plat.falling = true;
            }
          }
        });

        // Plateformes qui s'effondrent après un mauvais atterrissage
        platforms.forEach(plat => {
          if (plat.falling) {
            plat.y += 6;
            if (plat.y > CANVAS_H) plat.landed = true; // disparue
          }
        });

        // --- Chute dans le vide = retour au début ---
        if (player.y > CANVAS_H) {
          endGame(false);
          return;
        }

        if (messageTimer > 0) messageTimer--;

        // --- Animation du sprite ---
        animTimer++;
        if (animTimer >= 8) {
          animTimer = 0;
          animFrame = (animFrame + 1) % 3;
        }

        // --- Rendu ---
        ctx.fillStyle = "#1a1530";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Sol
        ctx.fillStyle = "#2b2347";
        ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

        // Plateformes (positions écran = position monde - cameraX + offset joueur fixe)
        const screenOffset = player.x - 60; // le joueur reste fixe à x=60 à l'écran
        platforms.forEach(plat => {
          if (plat.landed && !plat.falling) return;
          if (plat.y > CANVAS_H) return;
          const screenX = plat.x - screenOffset;
          if (screenX < -plat.w || screenX > CANVAS_W) return;

          ctx.fillStyle = plat.falling ? "#d9534f" : "#9d8cff";
          ctx.fillRect(screenX, plat.y, plat.w, plat.h);

          ctx.fillStyle = "#1a1530";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sentence.chunks[plat.chunkIdx], screenX + plat.w / 2, plat.y + plat.h / 2);
        });

        // Joueur (toujours affiché à x fixe = 60)
        if (sprite.complete && sprite.naturalWidth > 0) {
          const frame = player.onGround ? animFrame : 1; // pose figée sur la 2e frame pendant le saut
          ctx.drawImage(
            sprite,
            frame * SPRITE_CELL_W, WALK_ROW * SPRITE_CELL_H, SPRITE_CELL_W, SPRITE_CELL_H,
            60, player.y, player.w, player.h
          );
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(60, player.y, player.w, player.h);
        }

        // Message de feedback
        if (messageTimer > 0) {
          ctx.fillStyle = message.startsWith("✓") ? "#6fcf97" : "#d9534f";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(message, CANVAS_W / 2, 60);
        }

        // Indicateur de progression
        ctx.fillStyle = "#f4f1ea";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Mots trouvés : ${nextExpectedStep} / ${correctOrder.length}`, 16, 24);

        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      loop();
    });
  }

  SceneManager.registerMinigame("ordre_des_mots", "egouts_hugo", {
    title: "La Course dans les Égouts",
    run
  });

})();
