/* ============================================================
   LE MANUSCRIT DES MONDES — mg-subordonnees.js (v2)
   ============================================================
   Mini-jeu "La Liane des Mots" (Monde 1 — Hugo, acte propositions
   subordonnées). REMPLACE ENTIÈREMENT l'ancien "Les Cloches de
   Notre-Dame" (memory), jugé "nul" par Julie.

   ---- PRINCIPE ----
   L'Esprit (joueur) porte une PROPOSITION PRINCIPALE, affichée en
   bulle au-dessus de lui. Gavroche et Esméralda, postés chacun d'un
   côté du gouffre de la Cour des Miracles, proposent chacun une
   PROPOSITION SUBORDONNÉE candidate pour compléter la phrase.

   Le piège n'est PAS "une subordonnée correcte contre une absurde" :
   les deux propositions sont grammaticalement correctes et
   plausibles isolément — mais UNE SEULE correspond réellement au
   lien logique annoncé par son propre connecteur (cause vs
   conséquence, pour ce premier monde). L'autre utilise un connecteur
   qui annonce le contraire de ce que dit vraiment la phrase (ex. un
   "si bien que" sur un contenu qui est en réalité une CAUSE, pas une
   conséquence).

   Déplacement simple, un seul axe horizontal, le long du premier
   plan (bande de pavés devant le gouffre) — pas de saut ni de vraie
   physique de plateforme (choix délibéré : impossible de calibrer
   des sauts de façon fiable sans pouvoir tester en direct). S'approcher
   du bon PNJ fait apparaître un pont magique lumineux au-dessus du
   gouffre ; se tromper fait glisser l'Esprit en arrière (grimace,
   AUCUNE perte de vie), et on retente aussitôt.

   Palier 1 (ce monde) : le connecteur est déjà écrit dans la
   proposition candidate, rien à assembler. Les paliers suivants
   (Monde 2+) introduiront la récolte du bon connecteur séparément —
   volontairement pas ici, pour rester simple en première rencontre.

   Assignation Gavroche/Esméralda (qui dit la bonne réponse, de quel
   côté) : entièrement aléatoire à chaque manche, pour qu'aucune
   mémorisation de position ne remplace la réflexion.

   Enregistré sous la même notion/variante qu'avant
   ("subordonnees" / "cloches_hugo") pour remplacer entièrement
   l'ancienne version.
   ============================================================ */

(function registerSubordonneesHugoV2() {

  const CANVAS_W = 1024;
  const CANVAS_H = 572;

  const BG_SRC = "/assets/backgrounds/decors_minijeu_cour_miracles.png";
  const CHAR_DIR = "/assets/sprites/characters/";

  const GROUND_Y = 0.90 * CANVAS_H;   // ligne de déplacement (pavés du premier plan)
  const NPC_LEFT_X = 0.30 * CANVAS_W;
  const NPC_RIGHT_X = 0.70 * CANVAS_W;
  const START_X = 0.10 * CANVAS_W;
  const GORGE_X1 = 0.40 * CANVAS_W;   // zone du gouffre (pour le pont dessiné)
  const GORGE_X2 = 0.60 * CANVAS_W;

  const ROUNDS_TO_WIN = 3;

  /**
   * Banque de manches : une principale + une subordonnée correcte
   * (avec son vrai connecteur) + une version INVERSÉE (même contenu
   * factuel, mauvais connecteur — piège purement logique, jamais une
   * phrase absurde).
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
      correct: "parce que Frollo venait de glisser sur une pelure",
      wrong: "si bien que Frollo venait de glisser sur une pelure",
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

  function loadImg(name) { const img = new Image(); img.src = CHAR_DIR + name; return img; }
  function loadImgs(list) { return list.map(loadImg); }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "La Liane des Mots",
      objective: "L'Esprit porte une proposition principale (affichée au-dessus de lui). Gavroche et Esméralda, chacun d'un côté du gouffre, proposent une suite possible. Déplace-toi avec les flèches gauche/droite (ou les boutons tactiles) et approche-toi de celui qui a, selon toi, la bonne proposition — un pont magique apparaît si c'est juste ! Attention : les deux propositions sont grammaticalement correctes, mais une seule dit vraiment ce qu'annonce son connecteur (cause ou conséquence). Une erreur ne fait que reculer l'Esprit — aucune vie perdue, on retente aussitôt."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const bgImg = new Image(); bgImg.src = BG_SRC;

      const espritSide = [0, 1, 2, 3, 4, 5].map(n => loadImg(`esprit-marche-${n}.png`));
      const gavrocheSide = [1, 2, 3].map(n => loadImg(`gavroche-marche-${n}.png`));
      const esmeraldaSide = [1, 2, 3].map(n => loadImg(`esmeralda-marche${n}.png`));

      let pitchOrder = shuffle(PITCH_BANK.map((_, i) => i)).slice(0, Math.max(ROUNDS_TO_WIN, 3));
      let roundIndex = 0;
      let round = null;         // { pitch, leftIsCorrect, leftName, rightName, leftText, rightText }
      let roundsWon = 0;

      const player = { x: START_X, y: GROUND_Y, facing: "right", moving: false };
      let animFrame = 0, animTimer = 0;

      let locked = false; // pendant une résolution (succès/échec), plus de déplacement
      let bridgeProgress = 0; // 0..1, pont qui se construit
      let feedbackText = "", feedbackColor = "#f4f1ea", feedbackTimer = 0;
      let slipTimer = 0;
      let resultGiven = false;

      function loadRound() {
        const pitch = PITCH_BANK[pitchOrder[roundIndex]];
        const correctOnLeft = Math.random() < 0.5;
        // Attribue Gavroche/Esméralda aléatoirement aux deux côtés,
        // indépendamment de qui a la bonne réponse — aucune position
        // ni aucun personnage n'est jamais un indice fiable.
        const names = shuffle(["Gavroche", "Esméralda"]);
        round = {
          pitch,
          leftIsCorrect: correctOnLeft,
          leftName: names[0],
          rightName: names[1],
          leftText: correctOnLeft ? pitch.correct : pitch.wrong,
          rightText: correctOnLeft ? pitch.wrong : pitch.correct
        };
        bridgeProgress = 0;
      }
      loadRound();

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Manche <span id="mg-round">1</span> / ${ROUNDS_TO_WIN}</div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" data-dir="left">◀</button>
          <button class="touch-btn" data-dir="right">▶</button>
        </div>
      `);
      const roundLabel = document.getElementById("mg-round");

      const keys = {};
      function onKeyDown(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
      }
      function onKeyUp(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
      }
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

      function showFeedback(text, color, duration) {
        feedbackText = text; feedbackColor = color; feedbackTimer = duration || 90;
      }

      function resolveChoice(pickedCorrect) {
        locked = true;
        if (pickedCorrect) {
          const buildBridge = () => {
            bridgeProgress += 0.03;
            if (bridgeProgress < 1) { requestAnimationFrame(buildBridge); return; }
            showFeedback("✓ Exact ! " + round.pitch.why, "#6fcf97", 160);
            roundsWon++;
            setTimeout(() => {
              roundIndex++;
              if (roundsWon >= ROUNDS_TO_WIN) { endGame(); return; }
              player.x = START_X;
              loadRound();
              roundLabel.textContent = Math.min(roundsWon + 1, ROUNDS_TO_WIN);
              locked = false;
            }, 1700);
          };
          buildBridge();
        } else {
          showFeedback("✗ Pas cette fois — " + round.pitch.why, "#d9534f", 160);
          slipTimer = 24;
          setTimeout(() => {
            player.x = START_X;
            locked = false;
          }, 1400);
        }
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
          message: "Trois ponts franchis, trois liens logiques rétablis. Gavroche et Esméralda applaudissent bien fort !"
        });
        resolve({ passed: true, score: ROUNDS_TO_WIN, total: ROUNDS_TO_WIN });
      }

      let rafId;
      function loop() {
        if (!locked) {
          player.moving = false;
          if (keys.left) { player.x -= 3.4; player.facing = "left"; player.moving = true; }
          if (keys.right) { player.x += 3.4; player.facing = "right"; player.moving = true; }
          player.x = Math.max(20, Math.min(CANVAS_W - 20, player.x));

          if (player.moving) {
            animTimer++;
            if (animTimer >= 8) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
          }

          // Proximité avec un PNJ = choix déclenché automatiquement
          if (Math.abs(player.x - NPC_LEFT_X) < 30) {
            resolveChoice(round.leftIsCorrect);
          } else if (Math.abs(player.x - NPC_RIGHT_X) < 30) {
            resolveChoice(!round.leftIsCorrect);
          }
        } else if (slipTimer > 0) {
          slipTimer--;
        }

        if (feedbackTimer > 0) feedbackTimer--;

        render();
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

      function drawBubble(cx, y, text, maxWidth) {
        ctx.font = "12px sans-serif";
        const lines = wrapText(text, maxWidth - 24);
        const lh = 15;
        const bw = maxWidth;
        const bh = lines.length * lh + 18;
        const bx = cx - bw / 2;
        const by = y - bh - 14;

        ctx.fillStyle = "rgba(26,21,48,0.92)";
        ctx.strokeStyle = "#e8c468";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 8) : ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();
        // petite pointe
        ctx.beginPath();
        ctx.moveTo(cx - 8, by + bh);
        ctx.lineTo(cx + 8, by + bh);
        ctx.lineTo(cx, by + bh + 10);
        ctx.closePath();
        ctx.fillStyle = "#e8c468";
        ctx.fill();

        ctx.fillStyle = "#f4f1ea";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let ty = by + 9;
        lines.forEach(l => { ctx.fillText(l, cx, ty); ty += lh; });
      }

      function render() {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Pont magique (se construit progressivement au centre du gouffre)
        if (bridgeProgress > 0) {
          const w = (GORGE_X2 - GORGE_X1) * bridgeProgress;
          ctx.save();
          ctx.shadowColor = "#e8c468";
          ctx.shadowBlur = 14;
          ctx.fillStyle = "#e8c468";
          ctx.fillRect(GORGE_X1, GROUND_Y - 6, w, 8);
          ctx.restore();
        }

        // Principale (bulle fixe au-dessus de l'Esprit, suit son déplacement)
        drawBubble(player.x, player.y - 46, round.pitch.principal, 260);

        // PNJ + leurs propositions
        const NW = 34, NH = 46;
        drawBubble(NPC_LEFT_X, GROUND_Y - NH - 10, round.leftText, 240);
        drawBubble(NPC_RIGHT_X, GROUND_Y - NH - 10, round.rightText, 240);

        const leftImgs = round.leftName === "Gavroche" ? gavrocheSide : esmeraldaSide;
        const rightImgs = round.rightName === "Gavroche" ? gavrocheSide : esmeraldaSide;
        drawSprite(leftImgs[1], NPC_LEFT_X - NW / 2, GROUND_Y - NH, NW, NH, true);
        drawSprite(rightImgs[1], NPC_RIGHT_X - NW / 2, GROUND_Y - NH, NW, NH, false);

        ctx.fillStyle = "#c9c2e0";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(round.leftName, NPC_LEFT_X, GROUND_Y + 14);
        ctx.fillText(round.rightName, NPC_RIGHT_X, GROUND_Y + 14);

        // Esprit (joueur)
        const PW = 30, PH = 44;
        const wobble = slipTimer > 0 ? Math.sin(slipTimer * 0.8) * 6 : 0;
        const frame = player.moving ? espritSide[1 + (animFrame % 3)] : espritSide[1];
        drawSprite(frame, player.x - PW / 2 + wobble, player.y - PH, PW, PH, player.facing === "left");

        // Message de retour (succès/échec de la manche)
        if (feedbackTimer > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, feedbackTimer / 30);
          ctx.fillStyle = "rgba(26,21,48,0.88)";
          ctx.fillRect(CANVAS_W / 2 - 340, 14, 680, 50);
          ctx.fillStyle = feedbackColor;
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const lines = wrapText(feedbackText, 650);
          const lh = 16;
          let ty = 39 - (lines.length - 1) * lh / 2;
          lines.forEach(l => { ctx.fillText(l, CANVAS_W / 2, ty); ty += lh; });
          ctx.restore();
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
