/* ============================================================
   LE MANUSCRIT DES MONDES — mg-subordonnees.js (v3)
   ============================================================
   Mini-jeu "La Liane des Mots" (Monde 1 — Hugo, acte propositions
   subordonnées). REFONTE COMPLÈTE suite au cahier des charges
   validé par Julie (CAHIER_DES_CHARGES_liane-des-mots.md) — les
   deux tentatives précédentes (curseur simple, poutres courbées)
   ne correspondaient pas à sa vision. Cette version suit le
   document de référence de près : vraie structure Donkey Kong,
   plateformes + échelles, contrôles haut/bas/gauche/droite.

   ---- STRUCTURE DU NIVEAU (Monde 1 : 2 choix, 1 bifurcation) ----

                [Plateforme A]              [Plateforme B]
                PNJ bloque le passage       PNJ bloque le passage
                     |                            |
                échelle A                    échelle B
                     |                            |
                +----+----------------------------+----+
                |      Plateforme de bifurcation        |
                +---------------+------------------------+
                                |
                          échelle d'entrée
                                |
                            [Départ]

   - Une échelle d'entrée unique mène du sol à la plateforme de
     bifurcation.
   - Sur la bifurcation, on se déplace latéralement pour choisir
     l'échelle A (gauche) ou B (droite), qui montent chacune vers
     une plateforme à une hauteur DIFFÉRENTE.
   - Chaque plateforme d'arrivée est BLOQUÉE par un PNJ qui affiche
     sa proposition de subordonnée — impossible de le contourner.
   - Bonne réponse → une échelle de sortie apparaît PLUS LOIN sur
     cette même plateforme (au-delà du PNJ), qui permet de
     redescendre de l'autre côté : la manche est gagnée.
   - Mauvaise réponse → chute comique (tête de mort façon "Game
     Over" rétro), retour à la case départ, NOUVELLE phrase à la
     prochaine tentative (jamais la même qu'on vient de rater).

   ---- CONTRÔLES ----
   Gauche/Droite : déplacement le long d'une plateforme.
   Haut/Bas : grimper/descendre une échelle, uniquement si le
   personnage est aligné avec sa base (comme dans Donkey Kong).

   ---- LES PNJ SONT UN PARAMÈTRE DU NIVEAU ----
   Volontairement définis dans LEVEL_NPCS (pas codés en dur ailleurs
   dans le fichier) : quand on dupliquera ce fichier pour un futur
   monde, seule cette liste (+ les phrases) doit changer.

   Enregistré sous la même notion/variante qu'avant
   ("subordonnees" / "cloches_hugo") pour remplacer entièrement
   les versions précédentes.
   ============================================================ */

(function registerSubordonneesHugoV3() {

  const CANVAS_W = 1024;
  const CANVAS_H = 572;

  const BG_SRC = "/assets/backgrounds/decors_minijeu_cour_miracles.png";
  const CHAR_DIR = "/assets/sprites/characters/";

  const ROUNDS_TO_WIN = 3;
  const ALIGN_TOLERANCE = 14; // marge horizontale tolérée pour "aligné avec la base d'une échelle"
  const WALK_SPEED = 2.6;
  const CLIMB_SPEED = 2.2;

  // --- PNJ du Monde 1 (Hugo). À REMPLACER intégralement pour un futre
  //     monde — rien d'autre dans ce fichier ne dépend de ces noms. ---
  const LEVEL_NPCS = [
    { name: "Gavroche", sprites: [1, 2, 3].map(n => `gavroche-marche-${n}.png`) },
    { name: "Esméralda", sprites: [1, 2, 3].map(n => `esmeralda-marche${n}.png`) }
  ];

  /**
   * Banque de manches : une principale + une subordonnée correcte
   * (avec son vrai connecteur) + une version INVERSÉE (même contenu
   * factuel, mauvais connecteur — piège purement logique).
   */
  const PITCH_BANK = [
    {
      principal: "La foule se précipita vers la sortie",
      correct: "parce qu'un cri d'alarme avait retenti",
      wrong: "si bien qu'un cri d'alarme avait retenti",
      why: "« parce que » annonce une CAUSE : le cri d'alarme est ce qui a PROVOQUÉ la fuite, pas ce qui en a résulté."
    },
    {
      principal: "Quasimodo grimpa précipitamment jusqu'au sommet du beffroi",
      correct: "parce que les cloches s'étaient mises à sonner toutes seules",
      wrong: "si bien que les cloches s'étaient mises à sonner toutes seules",
      why: "« parce que » annonce une CAUSE : les cloches qui sonnent seules sont ce qui l'a fait grimper, pas une conséquence de son ascension."
    },
    {
      principal: "Le pont de pierre s'effondra sous leurs pieds",
      correct: "si bien qu'ils durent nager jusqu'à l'autre rive",
      wrong: "puisqu'ils durent nager jusqu'à l'autre rive",
      why: "« si bien que » annonce une CONSÉQUENCE : nager est ce qui a résulté de l'effondrement, pas ce qui l'a causé."
    },
    {
      principal: "Gavroche éclata de rire",
      correct: "parce que Frollo venait de glisser sur une peau de banane",
      wrong: "si bien que Frollo venait de glisser sur une peau de banane",
      why: "« parce que » annonce une CAUSE : c'est la glissade de Frollo qui a fait rire Gavroche, pas l'inverse."
    },
    {
      principal: "Esméralda se figea sur place",
      correct: "si bien que toute la foule se tut à son tour",
      wrong: "puisque toute la foule se tut à son tour",
      why: "« si bien que » annonce une CONSÉQUENCE : le silence de la foule a suivi son geste, il ne l'a pas causé."
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

  function loadImg(name) {
    const img = new Image();
    img.onerror = () => console.error(`[La Liane des Mots] Image introuvable : ${CHAR_DIR + name}`);
    img.src = CHAR_DIR + name;
    return img;
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "La Liane des Mots",
      objective: "Grimpe l'échelle de départ (flèche du haut), puis choisis ton chemin sur la plateforme de bifurcation (flèches gauche/droite) pour emprunter l'une des deux échelles qui montent chacune vers un personnage différent. Ce personnage bloque le passage tant que tu n'as pas répondu : bonne proposition → une échelle de sortie s'ouvre plus loin sur sa plateforme, tu peux redescendre de l'autre côté. Mauvaise proposition → tout le monde dégringole, il faut recommencer avec une nouvelle phrase. Les deux propositions sont grammaticalement correctes : une seule dit vraiment ce qu'annonce son connecteur (cause ou conséquence)."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const bgImg = new Image(); bgImg.src = BG_SRC;

      const espritSide = [0, 1, 2, 3, 4, 5].map(n => loadImg(`esprit-marche-${n}.png`));
      const espritDos = [1, 2, 3].map(n => loadImg(`esprit-dos-${n}.png`));
      const npcSprites = LEVEL_NPCS.map(npc => npc.sprites.map(loadImg));

      // ============================================================
      // GÉOMÉTRIE DU NIVEAU (voir schéma en en-tête)
      // ============================================================
      const GROUND_Y = 0.90 * CANVAS_H;
      const LADDER0_X = 0.15 * CANVAS_W;
      const GROUND_X0 = LADDER0_X - 50;

      const FORK_Y = 0.62 * CANVAS_H;
      const FORK_X0 = 0.10 * CANVAS_W;
      const FORK_X1 = 0.58 * CANVAS_W;
      const LADDER_A_X = 0.25 * CANVAS_W;
      const LADDER_B_X = 0.48 * CANVAS_W;

      const PLAT_A_Y = 0.40 * CANVAS_H;
      const PLAT_A_X0 = LADDER_A_X;
      const PLAT_A_X1 = 0.62 * CANVAS_W;
      const NPC_A_X = 0.44 * CANVAS_W;
      const EXIT_LADDER_A_X = PLAT_A_X1 - 20;

      const PLAT_B_Y = 0.20 * CANVAS_H;
      const PLAT_B_X0 = LADDER_B_X;
      const PLAT_B_X1 = 0.90 * CANVAS_W;
      const NPC_B_X = 0.68 * CANVAS_W;
      const EXIT_LADDER_B_X = PLAT_B_X1 - 20;

      const EXIT_GROUND_Y = GROUND_Y;

      // --- File de phrases mélangée, jamais épuisée ---
      let pitchQueue = [];
      function nextPitch() {
        if (pitchQueue.length === 0) pitchQueue = shuffle(PITCH_BANK.map((_, i) => i));
        return PITCH_BANK[pitchQueue.shift()];
      }

      let round = null; // { pitch, aIsCorrect, npcA, npcB, textA, textB }
      let roundsWon = 0;
      let resultGiven = false;

      function loadRound() {
        const pitch = nextPitch();
        const aIsCorrect = Math.random() < 0.5;
        const npcOrder = shuffle([0, 1]); // qui (parmi LEVEL_NPCS) est sur A, qui est sur B
        round = {
          pitch,
          aIsCorrect,
          npcAIndex: npcOrder[0],
          npcBIndex: npcOrder[1],
          textA: aIsCorrect ? pitch.correct : pitch.wrong,
          textB: aIsCorrect ? pitch.wrong : pitch.correct
        };
        platformState.A = { resolved: false, blocked: true };
        platformState.B = { resolved: false, blocked: true };
      }

      const platformState = { A: { resolved: false, blocked: true }, B: { resolved: false, blocked: true } };
      loadRound();

      // --- Joueur : état = segment courant + position sur ce segment ---
      const player = {
        state: "ground", // ground | ladder0 | fork | ladderA | ladderB | platA | platB | exitLadderA | exitLadderB
        x: GROUND_X0,
        y: GROUND_Y,
        facing: "right",
        moving: false
      };
      let animFrame = 0, animTimer = 0;

      let locked = false;
      let falling = false, fallTimer = 0, fallX = 0, fallY = 0;
      let resultBubble = { platform: null, kind: null, text: "" }; // kind: "happy" | null (l'échec est géré par la chute, pas une bulle)

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Franchissements réussis : <span id="mg-round">0</span> / ${ROUNDS_TO_WIN}</div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls" style="display:grid; grid-template-columns:repeat(3,44px); grid-template-rows:repeat(2,44px); gap:4px; justify-content:center;">
          <div></div><button class="touch-btn" data-dir="up">▲</button><div></div>
          <button class="touch-btn" data-dir="left">◀</button><div></div><button class="touch-btn" data-dir="right">▶</button>
          <div></div><button class="touch-btn" data-dir="down">▼</button><div></div>
        </div>
      `);
      const roundLabel = document.getElementById("mg-round");

      const keys = {};
      function mapKey(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") return "left";
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") return "right";
        if (e.key === "ArrowUp" || e.key === "z" || e.key === "Z" || e.key === "w" || e.key === "W") return "up";
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") return "down";
        return null;
      }
      function onKeyDown(e) { const k = mapKey(e); if (k) { keys[k] = true; e.preventDefault(); } }
      function onKeyUp(e) { const k = mapKey(e); if (k) keys[k] = false; }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      uiContainer.querySelectorAll(".touch-btn[data-dir]").forEach(btn => {
        const dir = btn.dataset.dir;
        const set = v => () => keys[dir] = v;
        btn.addEventListener("touchstart", set(true));
        btn.addEventListener("touchend", set(false));
        btn.addEventListener("mousedown", set(true));
        btn.addEventListener("mouseup", set(false));
      });

      function aligned(x, targetX) { return Math.abs(x - targetX) <= ALIGN_TOLERANCE; }

      /**
       * Met à jour player.state/x/y d'un pas, selon les touches
       * actuellement enfoncées — machine à états explicite, câblée
       * pour CETTE géométrie précise (voir schéma en en-tête).
       */
      function updateMovement() {
        player.moving = false;
        const s = player.state;

        if (s === "ground") {
          if (keys.left) { player.x -= WALK_SPEED; player.facing = "left"; player.moving = true; }
          if (keys.right) { player.x += WALK_SPEED; player.facing = "right"; player.moving = true; }
          player.x = Math.max(GROUND_X0, Math.min(LADDER0_X, player.x));
          if (aligned(player.x, LADDER0_X) && keys.up) player.state = "ladder0";

        } else if (s === "ladder0") {
          if (keys.up) { player.y -= CLIMB_SPEED; player.moving = true; }
          if (keys.down) { player.y += CLIMB_SPEED; player.moving = true; }
          player.y = Math.max(FORK_Y, Math.min(GROUND_Y, player.y));
          if (player.y <= FORK_Y) { player.state = "fork"; player.x = LADDER0_X; }
          if (player.y >= GROUND_Y) { player.state = "ground"; player.x = LADDER0_X; }

        } else if (s === "fork") {
          if (keys.left) { player.x -= WALK_SPEED; player.facing = "left"; player.moving = true; }
          if (keys.right) { player.x += WALK_SPEED; player.facing = "right"; player.moving = true; }
          player.x = Math.max(FORK_X0, Math.min(FORK_X1, player.x));
          if (aligned(player.x, LADDER0_X) && keys.down) player.state = "ladder0";
          if (aligned(player.x, LADDER_A_X) && keys.up) player.state = "ladderA";
          if (aligned(player.x, LADDER_B_X) && keys.up) player.state = "ladderB";

        } else if (s === "ladderA" || s === "ladderB") {
          const targetY = s === "ladderA" ? PLAT_A_Y : PLAT_B_Y;
          if (keys.up) { player.y -= CLIMB_SPEED; player.moving = true; }
          if (keys.down) { player.y += CLIMB_SPEED; player.moving = true; }
          player.y = Math.max(targetY, Math.min(FORK_Y, player.y));
          if (player.y <= targetY) {
            player.state = s === "ladderA" ? "platA" : "platB";
            player.x = s === "ladderA" ? LADDER_A_X : LADDER_B_X;
          }
          if (player.y >= FORK_Y) { player.state = "fork"; player.x = s === "ladderA" ? LADDER_A_X : LADDER_B_X; }

        } else if (s === "platA" || s === "platB") {
          const isA = s === "platA";
          const platY = isA ? PLAT_A_Y : PLAT_B_Y;
          const platX0 = isA ? PLAT_A_X0 : PLAT_B_X0;
          const platX1 = isA ? PLAT_A_X1 : PLAT_B_X1;
          const laddX = isA ? LADDER_A_X : LADDER_B_X;
          const npcX = isA ? NPC_A_X : NPC_B_X;
          const exitX = isA ? EXIT_LADDER_A_X : EXIT_LADDER_B_X;
          const st = isA ? platformState.A : platformState.B;

          let minX = platX0, maxX = platX1;
          if (st.blocked) {
            // Le PNJ bloque le passage : impossible d'aller plus loin
            // que lui tant que ce n'est pas résolu.
            maxX = npcX;
          }

          if (keys.left) { player.x -= WALK_SPEED; player.facing = "left"; player.moving = true; }
          if (keys.right) { player.x += WALK_SPEED; player.facing = "right"; player.moving = true; }
          player.x = Math.max(minX, Math.min(maxX, player.x));

          if (aligned(player.x, npcX) && st.blocked) {
            resolveChoice(isA ? "A" : "B");
            return;
          }
          if (aligned(player.x, laddX) && keys.down) { player.state = isA ? "ladderA" : "ladderB"; }
          if (st.resolved && aligned(player.x, exitX) && keys.down) {
            player.state = isA ? "exitLadderA" : "exitLadderB";
          }

        } else if (s === "exitLadderA" || s === "exitLadderB") {
          player.y += CLIMB_SPEED;
          player.moving = true;
          if (player.y >= EXIT_GROUND_Y) {
            winRound();
          }
        }
      }

      function showFeedback(text, color, duration) {
        // conservé pour d'éventuels messages ponctuels ; non utilisé
        // pour l'échec, géré par la chute comique à la place.
      }

      function resolveChoice(platformKey) {
        locked = true;
        const isA = platformKey === "A";
        const correct = isA ? round.aIsCorrect : !round.aIsCorrect;
        const st = isA ? platformState.A : platformState.B;

        if (correct) {
          st.resolved = true;
          st.blocked = false;
          resultBubble = { platform: platformKey, kind: "happy", text: "" };
          setTimeout(() => { locked = false; }, 900);
        } else {
          startFall(isA ? NPC_A_X : NPC_B_X, isA ? PLAT_A_Y : PLAT_B_Y, round.pitch.why);
        }
      }

      function startFall(x, y, why) {
        falling = true;
        fallTimer = 0;
        fallX = x; fallY = y;
        setTimeout(() => {
          falling = false;
          player.state = "ground";
          player.x = GROUND_X0;
          player.y = GROUND_Y;
          resultBubble = { platform: null, kind: null, text: "" };
          loadRound(); // nouvelle phrase obligatoire après une erreur
          locked = false;
        }, 1900);
      }

      function winRound() {
        roundsWon++;
        roundLabel.textContent = Math.min(roundsWon, ROUNDS_TO_WIN);
        if (roundsWon >= ROUNDS_TO_WIN) { endGame(); return; }
        player.state = "ground";
        player.x = GROUND_X0;
        player.y = GROUND_Y;
        resultBubble = { platform: null, kind: null, text: "" };
        loadRound();
      }

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(rafId);
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: "Trois plateformes franchies, trois liens logiques rétablis !"
        });
        resolve({ passed: true, score: ROUNDS_TO_WIN, total: ROUNDS_TO_WIN });
      }

      let rafId;
      function loop() {
        try {
          if (!locked && !falling) {
            updateMovement();
            if (player.moving) {
              animTimer++;
              if (animTimer >= 8) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
            }
          }
          if (falling) fallTimer++;
          render();
        } catch (err) {
          console.error("[La Liane des Mots] Erreur dans la boucle de jeu :", err);
        }
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      function drawSprite(img, x, y, w, h, flip) {
        if (img && img.complete && img.naturalWidth > 0) {
          if (flip) {
            ctx.save();
            ctx.translate(x + w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, w, h);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, w, h);
          }
        } else {
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(x, y, w, h);
        }
      }

      function wrapText(text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let line = "";
        words.forEach(word => {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
          else line = test;
        });
        if (line) lines.push(line);
        return lines;
      }

      function drawLadder(x, yTop, yBottom) {
        ctx.strokeStyle = "#c98a4b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 10, yTop); ctx.lineTo(x - 10, yBottom);
        ctx.moveTo(x + 10, yTop); ctx.lineTo(x + 10, yBottom);
        ctx.stroke();
        ctx.lineWidth = 3;
        for (let y = yTop; y <= yBottom; y += 14) {
          ctx.beginPath();
          ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
          ctx.stroke();
        }
      }

      function drawPlatform(x0, x1, y, tilt) {
        ctx.save();
        const midX = (x0 + x1) / 2;
        ctx.translate(midX, y);
        ctx.rotate(tilt || 0);
        ctx.translate(-midX, -y);
        ctx.fillStyle = "#5a4632";
        ctx.fillRect(x0, y - 6, x1 - x0, 10);
        ctx.strokeStyle = "#2f2418";
        ctx.lineWidth = 2;
        ctx.strokeRect(x0, y - 6, x1 - x0, 10);
        ctx.restore();
      }

      function drawSkull(cx, cy, size, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#f4f1ea";
        ctx.strokeStyle = "#1a1530";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, size, Math.PI, 0);
        ctx.lineTo(cx + size, cy + size * 0.5);
        ctx.lineTo(cx + size * 0.6, cy + size * 0.4);
        ctx.lineTo(cx + size * 0.3, cy + size * 0.7);
        ctx.lineTo(cx, cy + size * 0.4);
        ctx.lineTo(cx - size * 0.3, cy + size * 0.7);
        ctx.lineTo(cx - size * 0.6, cy + size * 0.4);
        ctx.lineTo(cx - size, cy + size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // yeux en croix
        ctx.strokeStyle = "#1a1530";
        ctx.lineWidth = 2.5;
        [-1, 1].forEach(sideX => {
          const ex = cx + sideX * size * 0.42, ey = cy - size * 0.05;
          ctx.beginPath();
          ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5);
          ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5);
          ctx.stroke();
        });
        ctx.restore();
      }

      function drawTextBubble(cx, y, text, maxWidth) {
        ctx.font = "12px sans-serif";
        const lines = wrapText(text, maxWidth - 24);
        const lh = 15;
        const bh = lines.length * lh + 18;
        const bx = Math.max(6, Math.min(CANVAS_W - maxWidth - 6, cx - maxWidth / 2));
        const by = y - bh - 14;
        ctx.fillStyle = "rgba(26,21,48,0.92)";
        ctx.strokeStyle = "#e8c468";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, maxWidth, bh, 8) : ctx.rect(bx, by, maxWidth, bh);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 8, by + bh); ctx.lineTo(cx + 8, by + bh); ctx.lineTo(cx, by + bh + 10);
        ctx.closePath();
        ctx.fillStyle = "#e8c468";
        ctx.fill();
        ctx.fillStyle = "#f4f1ea";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let ty = by + 9;
        lines.forEach(l => { ctx.fillText(l, bx + maxWidth / 2, ty); ty += lh; });
      }

      function drawHappyBubble(cx, y) {
        const w = 90, h = 66;
        const bx = cx - w / 2, by = y - h - 14;
        ctx.fillStyle = "rgba(26,21,48,0.92)";
        ctx.strokeStyle = "#6fcf97";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, w, h, 8) : ctx.rect(bx, by, w, h);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 8, by + h); ctx.lineTo(cx + 8, by + h); ctx.lineTo(cx, by + h + 10);
        ctx.closePath();
        ctx.fillStyle = "#6fcf97";
        ctx.fill();
        // smiley content
        const scx = bx + w / 2, scy = by + h / 2;
        ctx.strokeStyle = "#6fcf97";
        ctx.fillStyle = "#6fcf97";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(scx, scy, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(scx - 7, scy - 4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(scx + 7, scy - 4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(scx, scy + 2, 10, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }

      function render() {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Structure : échelles + plateformes (légèrement inclinées pour le style)
        drawLadder(LADDER0_X, FORK_Y, GROUND_Y);
        drawPlatform(FORK_X0, FORK_X1, FORK_Y, -0.01);
        drawLadder(LADDER_A_X, PLAT_A_Y, FORK_Y);
        drawLadder(LADDER_B_X, PLAT_B_Y, FORK_Y);
        drawPlatform(PLAT_A_X0, PLAT_A_X1, PLAT_A_Y, 0.015);
        drawPlatform(PLAT_B_X0, PLAT_B_X1, PLAT_B_Y, -0.012);
        if (platformState.A.resolved) drawLadder(EXIT_LADDER_A_X, PLAT_A_Y, GROUND_Y);
        if (platformState.B.resolved) drawLadder(EXIT_LADDER_B_X, PLAT_B_Y, GROUND_Y);

        // Principale (bulle fixe en haut)
        drawTextBubble(CANVAS_W / 2, 60, round.pitch.principal, 340);

        // PNJ A et B + leur proposition
        const NW = 34, NH = 46;
        const npcAImgs = npcSprites[round.npcAIndex];
        const npcBImgs = npcSprites[round.npcBIndex];

        if (!platformState.A.resolved) {
          drawTextBubble(NPC_A_X, PLAT_A_Y, round.textA, 220);
          drawSprite(npcAImgs[1], NPC_A_X - NW / 2, PLAT_A_Y - NH, NW, NH, true);
          ctx.fillStyle = "#c9c2e0"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(LEVEL_NPCS[round.npcAIndex].name, NPC_A_X, PLAT_A_Y + 14);
        } else if (resultBubble.platform === "A" && resultBubble.kind === "happy") {
          drawHappyBubble(NPC_A_X, PLAT_A_Y);
          drawSprite(npcAImgs[1], NPC_A_X - NW / 2, PLAT_A_Y - NH, NW, NH, true);
        }

        if (!platformState.B.resolved) {
          drawTextBubble(NPC_B_X, PLAT_B_Y, round.textB, 220);
          drawSprite(npcBImgs[1], NPC_B_X - NW / 2, PLAT_B_Y - NH, NW, NH, true);
          ctx.fillStyle = "#c9c2e0"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(LEVEL_NPCS[round.npcBIndex].name, NPC_B_X, PLAT_B_Y + 14);
        } else if (resultBubble.platform === "B" && resultBubble.kind === "happy") {
          drawHappyBubble(NPC_B_X, PLAT_B_Y);
          drawSprite(npcBImgs[1], NPC_B_X - NW / 2, PLAT_B_Y - NH, NW, NH, true);
        }

        // Esprit (joueur) : de dos sur les échelles, de profil sur les plateformes
        const PW = 30, PH = 44;
        if (!falling) {
          const onLadder = player.state.startsWith("ladder") || player.state.startsWith("exitLadder");
          let frame;
          if (onLadder) {
            frame = player.moving ? espritDos[animFrame % espritDos.length] : espritDos[0];
          } else {
            frame = player.moving ? espritSide[1 + (animFrame % 3)] : espritSide[1];
          }
          const flip = !onLadder && player.facing === "left";
          drawSprite(frame, player.x - PW / 2, player.y - PH, PW, PH, flip);
        } else {
          // Chute comique : le joueur (et le PNJ fautif) dégringolent,
          // une tête de mort apparaît au point de chute.
          const t = Math.min(1, fallTimer / 34);
          const dropY = fallY + t * (GROUND_Y - fallY) + 10;
          ctx.save();
          ctx.globalAlpha = 1 - t * 0.3;
          drawSprite(espritSide[1], fallX - PW / 2, dropY - PH, PW, PH, false);
          ctx.restore();
          if (t > 0.35) drawSkull(fallX, dropY - PH - 30, 22, Math.min(1, (t - 0.35) / 0.3));
        }
      }

      render();
      loop();
    });
  }

  SceneManager.registerMinigame("subordonnees", "cloches_hugo", {
    title: "La Liane des Mots",
    run
  });

})();
