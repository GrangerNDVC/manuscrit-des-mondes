/* ============================================================
   LE MANUSCRIT DES MONDES — mg-selection-info.js
   ============================================================
   Mini-jeu "Le Tri de Valjean" (Monde 1 — Hugo).
   Notion : sélection d'informations pertinentes / accessoires.

   Principe pédagogique (discrimination sous contrainte de temps) :
   des bulles d'information tombent du haut de l'écran. Un court
   "contexte" est affiché en haut. Le joueur doit déplacer
   Jean Valjean (sprite Gavroche en placeholder le temps d'avoir
   un sprite dédié) pour attraper UNIQUEMENT les bulles pertinentes
   et laisser tomber (ignorer) les bulles de détails accessoires.

   Enregistré sous la notion "selection_info",
   variante "tri_valjean_hugo".
   ============================================================ */

(function registerSelectionInfoHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  /**
   * Banque de scénarios : un contexte + plusieurs items
   * (pertinents et accessoires), mélangés et fait tomber.
   */
  const SCENARIO_BANK = [
    {
      context: "Jean Valjean cherchait un abri pour la nuit.",
      items: [
        { text: "Il trouva une porte ouverte", relevant: true },
        { text: "Le ciel était gris", relevant: false },
        { text: "Une voix l'appela depuis l'intérieur", relevant: true },
        { text: "Ses chaussures étaient usées", relevant: false }
      ]
    },
    {
      context: "Valjean décida de changer de nom pour repartir à zéro.",
      items: [
        { text: "Il devint un homme respecté", relevant: true },
        { text: "Il aimait le pain encore chaud", relevant: false },
        { text: "Il ouvrit une fabrique", relevant: true },
        { text: "La route était poussiéreuse", relevant: false }
      ]
    },
    {
      context: "Cosette grandissait loin de ses origines.",
      items: [
        { text: "Elle ne connaissait pas son passé", relevant: true },
        { text: "Elle aimait les rubans bleus", relevant: false },
        { text: "Valjean veillait sur elle en secret", relevant: true },
        { text: "La maison avait un grand jardin", relevant: false }
      ]
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

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Le Tri de Valjean",
      objective: "Un contexte est affiché en haut de l'écran. Des informations tombent : déplace-toi avec les flèches gauche/droite (ou les boutons) pour attraper UNIQUEMENT celles qui sont essentielles à l'histoire, et laisse tomber les détails accessoires. 2 erreurs maximum."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const scenario = SCENARIO_BANK[Math.floor(Math.random() * SCENARIO_BANK.length)];
      const allItems = shuffle(scenario.items);

      const totalRelevant = allItems.filter(it => it.relevant).length;

      // --- Sprite joueur (Gavroche en placeholder) ---
      const SPRITE_CELL_W = 72;
      const SPRITE_CELL_H = 96;
      const DRAW_W = 64;
      const DRAW_H = 64;
      const sprite = new Image();
      sprite.src = "/assets/sprites/characters/esprit-combat.png";

      const player = { x: CANVAS_W / 2 - DRAW_W / 2, y: CANVAS_H - 80, w: DRAW_W, h: DRAW_H, speed: 7 };

      // --- Bulles tombantes : créées progressivement (une toutes ~50 ticks) ---
      const bubbles = [];
      let spawnIndex = 0;
      let spawnTimer = 0;
      const SPAWN_INTERVAL = 55;

      let goodCaught = 0;
      let badCaught = 0;
      const MAX_BAD = 2; // tolérance avant échec

      let resultGiven = false;

      uiContainer.innerHTML = `
        <div class="hud-item" id="mg-context">${scenario.context}</div>
        <div class="hud-item">Essentiel : <span id="mg-good">0</span> / ${totalRelevant}</div>
        <div class="hud-item">Erreurs : <span id="mg-bad">0</span> / ${MAX_BAD}</div>
      `;

      // --- Contrôles ---
      const keys = {};
      function onKeyDown(e) { keys[e.key] = true; }
      function onKeyUp(e) { keys[e.key] = false; }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      const touchState = { left: false, right: false };
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" data-dir="left">◀</button>
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
            ? `Bien vu : tu as attrapé ${goodCaught} / ${totalRelevant} informations essentielles.`
            : `Tu as attrapé ${goodCaught} / ${totalRelevant} informations essentielles, avec ${badCaught} détail(s) accessoire(s) en trop. Recentre-toi sur ce qui fait vraiment avancer l'histoire.`
        });
        resolve({ passed, score: goodCaught, total: totalRelevant });
      }

      function wrapText(text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let line = "";
        words.forEach(word => {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        });
        if (line) lines.push(line);
        return lines;
      }

      let rafId;
      let animFrame = 0;
      let animTimer = 0;

      function loop() {
        // --- Déplacement joueur (horizontal uniquement) ---
        if (keys["ArrowLeft"] || keys["a"] || touchState.left)  player.x -= player.speed;
        if (keys["ArrowRight"] || keys["d"] || touchState.right) player.x += player.speed;
        player.x = Math.max(0, Math.min(CANVAS_W - player.w, player.x));

        // --- Spawn de nouvelles bulles ---
        spawnTimer++;
        if (spawnTimer >= SPAWN_INTERVAL && spawnIndex < allItems.length) {
          spawnTimer = 0;
          const item = allItems[spawnIndex++];
          bubbles.push({
            item,
            x: 60 + Math.random() * (CANVAS_W - 120),
            y: -40,
            w: 180,
            h: 60,
            vy: 1.4 + Math.random() * 0.6,
            caught: false
          });
        }

        // --- Mise à jour des bulles ---
        bubbles.forEach(b => {
          if (b.caught) return;
          b.y += b.vy;

          // Collision avec le joueur
          if (b.y + b.h >= player.y && b.y <= player.y + player.h &&
              b.x + b.w > player.x && b.x < player.x + player.w) {
            b.caught = true;
            if (b.item.relevant) {
              goodCaught++;
              document.getElementById("mg-good").textContent = goodCaught;
            } else {
              badCaught++;
              document.getElementById("mg-bad").textContent = badCaught;
            }
          }
        });

        // Nettoyage des bulles hors écran
        for (let i = bubbles.length - 1; i >= 0; i--) {
          if (bubbles[i].caught || bubbles[i].y > CANVAS_H) bubbles.splice(i, 1);
        }

        // --- Conditions de fin ---
        if (badCaught >= MAX_BAD) {
          endGame(false);
          return;
        }
        if (goodCaught >= totalRelevant) {
          endGame(true);
          return;
        }
        if (spawnIndex >= allItems.length && bubbles.length === 0) {
          // Tout est passé : succès partiel si pas assez d'essentiels attrapés
          endGame(goodCaught >= totalRelevant);
          return;
        }

        // --- Animation sprite ---
        animTimer++;
        if (animTimer >= 10) {
          animTimer = 0;
          animFrame = (animFrame + 1) % 3;
        }

        // --- Rendu ---
        ctx.fillStyle = "#1a1530";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Bulles
        ctx.font = "13px sans-serif";
        bubbles.forEach(b => {
          ctx.fillStyle = "#2b2347";
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 12) : ctx.rect(b.x, b.y, b.w, b.h);
          ctx.fill();
          ctx.strokeStyle = "#9d8cff";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#f4f1ea";
          const lines = wrapText(b.item.text, b.w - 16);
          const lineHeight = 16;
          const totalH = lines.length * lineHeight;
          let ty = b.y + b.h / 2 - totalH / 2 + lineHeight / 2;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          lines.forEach(line => {
            ctx.fillText(line, b.x + b.w / 2, ty);
            ty += lineHeight;
          });
        });

        // Joueur
        if (sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(
            sprite,
            animFrame * SPRITE_CELL_W, 0, SPRITE_CELL_W, SPRITE_CELL_H,
            player.x, player.y, player.w, player.h
          );
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(player.x, player.y, player.w, player.h);
        }

        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      loop();
    });
  }

  SceneManager.registerMinigame("selection_info", "tri_valjean_hugo", {
    title: "Le Tri de Valjean",
    run
  });

})();
