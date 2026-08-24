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

  function loadImg(name) {
    const img = new Image();
    img.onerror = () => console.error(`[La Liane des Mots] Image introuvable : ${CHAR_DIR + name}`);
    img.src = CHAR_DIR + name;
    return img;
  }
  function loadImgs(list) { return list.map(loadImg); }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "La Liane des Mots",
      objective: "L'Esprit porte une proposition principale (affichée au-dessus de lui). Deux échafaudages de fortune traversent le gouffre : l'un mène à Gavroche, l'autre à Esméralda, chacun te proposant une suite possible. Avance avec les flèches gauche/droite (ou les boutons tactiles) sur l'échafaudage de ton choix. Le personnage bloque le passage tant que tu n'as pas répondu : si sa proposition est la bonne, il te laisse passer (bulle toute contente) ; sinon, il t'explique pourquoi ce n'est pas ça (bulle déçue), et il faut retourner au départ pour retenter avec une nouvelle phrase. Attention : les deux propositions sont grammaticalement correctes, mais une seule dit vraiment ce qu'annonce son connecteur (cause ou conséquence)."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const bgImg = new Image(); bgImg.src = BG_SRC;

      const espritSide = [0, 1, 2, 3, 4, 5].map(n => loadImg(`esprit-marche-${n}.png`));
      const gavrocheSide = [1, 2, 3].map(n => loadImg(`gavroche-marche-${n}.png`));
      const esmeraldaSide = [1, 2, 3].map(n => loadImg(`esmeralda-marche${n}.png`));

      // --- File de phrases mélangée, jamais épuisée : si on la vide
      //     (plusieurs erreurs d'affilée), on la remélange plutôt que
      //     de planter ou de répéter toujours la même. ---
      let pitchQueue = [];
      function nextPitch() {
        if (pitchQueue.length === 0) pitchQueue = shuffle(PITCH_BANK.map((_, i) => i));
        return PITCH_BANK[pitchQueue.shift()];
      }

      // --- Chemin en deux échafaudages : t va de -1 (Gavroche) à +1
      //     (Esméralda), en passant par 0 (départ, au centre, sur la
      //     bande de pavés solide devant le gouffre). Un léger arc
      //     vers le haut au milieu du trajet ("on grimpe sur la
      //     structure") ; l'arrivée retombe au niveau du sol du PNJ. ---
      const START_X = 0.5 * CANVAS_W;
      const START_Y = 0.96 * CANVAS_H;
      const NPC_Y = GROUND_Y;
      const RISE = 46; // hauteur de l'arc au sommet de l'échafaudage

      function pathPosition(t) {
        const side = t < 0 ? -1 : 1;
        const a = Math.min(1, Math.abs(t));
        const targetX = side < 0 ? NPC_LEFT_X : NPC_RIGHT_X;
        const x = START_X + (targetX - START_X) * a;
        const y = START_Y + (NPC_Y - START_Y) * a - RISE * Math.sin(a * Math.PI);
        return { x, y };
      }

      let round = null; // { pitch, leftIsCorrect, leftName, rightName, leftText, rightText }
      let roundIndex = 0;
      let roundsWon = 0;

      const player = { t: 0, facing: "right", moving: false };
      let animFrame = 0, animTimer = 0;

      let locked = false;
      let crossingSide = 0; // -1/0/+1 pendant l'animation de franchissement après une bonne réponse
      let resultBubble = { side: 0, kind: null, text: "" }; // kind: "happy" | "sad"
      let resultTimer = 0;
      let resultGiven = false;

      function loadRound() {
        const pitch = nextPitch();
        const correctOnLeft = Math.random() < 0.5;
        const names = shuffle(["Gavroche", "Esméralda"]);
        round = {
          pitch,
          leftIsCorrect: correctOnLeft,
          leftName: names[0],
          rightName: names[1],
          leftText: correctOnLeft ? pitch.correct : pitch.wrong,
          rightText: correctOnLeft ? pitch.wrong : pitch.correct
        };
        resultBubble = { side: 0, kind: null, text: "" };
      }
      loadRound();

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Franchissements réussis : <span id="mg-round">0</span> / ${ROUNDS_TO_WIN}</div>
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

      function resolveChoice(side) {
        // side: -1 (Gavroche) ou +1 (Esméralda)
        locked = true;
        const pickedCorrect = side < 0 ? round.leftIsCorrect : !round.leftIsCorrect;
        const why = round.pitch.why;

        if (pickedCorrect) {
          resultBubble = { side, kind: "happy", text: "" };
          setTimeout(() => {
            // Le passage est libre : on continue au-delà du PNJ pour
            // terminer la traversée, puis on enchaîne.
            crossingSide = side;
            const finishCrossing = () => {
              player.t += side * 0.03;
              if (Math.abs(player.t) < 1.3) { requestAnimationFrame(finishCrossing); return; }
              roundsWon++;
              roundLabel.textContent = Math.min(roundsWon, ROUNDS_TO_WIN);
              if (roundsWon >= ROUNDS_TO_WIN) { endGame(); return; }
              player.t = 0;
              crossingSide = 0;
              loadRound();
              locked = false;
            };
            finishCrossing();
          }, 1300);
        } else {
          resultBubble = { side, kind: "sad", text: why };
          resultTimer = 220;
          setTimeout(() => {
            player.t = 0;
            resultBubble = { side: 0, kind: null, text: "" };
            loadRound(); // nouvelle phrase obligatoire après une erreur
            locked = false;
          }, 2600);
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
          message: "Trois échafaudages franchis, trois liens logiques rétablis. Gavroche et Esméralda applaudissent bien fort !"
        });
        resolve({ passed: true, score: ROUNDS_TO_WIN, total: ROUNDS_TO_WIN });
      }

      let rafId;
      function loop() {
        try {
          if (!locked) {
            player.moving = false;
            if (keys.left) { player.t = Math.max(-1, player.t - 0.018); player.facing = "left"; player.moving = true; }
            if (keys.right) { player.t = Math.min(1, player.t + 0.018); player.facing = "right"; player.moving = true; }

            if (player.moving) {
              animTimer++;
              if (animTimer >= 8) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
            }

            // Le PNJ bloque le passage : atteindre ±1 déclenche la résolution.
            if (player.t <= -0.98) resolveChoice(-1);
            else if (player.t >= 0.98) resolveChoice(1);
          }

          if (resultTimer > 0) resultTimer--;

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

      function drawBubbleBox(cx, y, w, h) {
        const bx = Math.max(6, Math.min(CANVAS_W - w - 6, cx - w / 2));
        const by = y - h - 14;
        ctx.fillStyle = "rgba(26,21,48,0.92)";
        ctx.strokeStyle = "#e8c468";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, w, h, 8) : ctx.rect(bx, by, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 8, by + h);
        ctx.lineTo(cx + 8, by + h);
        ctx.lineTo(cx, by + h + 10);
        ctx.closePath();
        ctx.fillStyle = "#e8c468";
        ctx.fill();
        return { bx, by };
      }

      function drawTextBubble(cx, y, text, maxWidth) {
        ctx.font = "12px sans-serif";
        const lines = wrapText(text, maxWidth - 24);
        const lh = 15;
        const bh = lines.length * lh + 18;
        const { bx, by } = drawBubbleBox(cx, y, maxWidth, bh);
        ctx.fillStyle = "#f4f1ea";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let ty = by + 9;
        lines.forEach(l => { ctx.fillText(l, bx + maxWidth / 2, ty); ty += lh; });
      }

      function drawSmiley(cx, cy, happy, radius) {
        ctx.save();
        ctx.strokeStyle = "#1a1530";
        ctx.lineWidth = 2;
        ctx.fillStyle = happy ? "#6fcf97" : "#d9534f";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1a1530";
        ctx.beginPath(); ctx.arc(cx - radius * 0.35, cy - radius * 0.15, radius * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + radius * 0.35, cy - radius * 0.15, radius * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        if (happy) ctx.arc(cx, cy + radius * 0.05, radius * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
        else ctx.arc(cx, cy + radius * 0.55, radius * 0.4, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      function drawSmileyBubble(cx, y, happy, why) {
        const w = happy ? 90 : 260;
        if (happy) {
          const h = 66;
          const { bx, by } = drawBubbleBox(cx, y, w, h);
          drawSmiley(bx + w / 2, by + h / 2, true, 22);
        } else {
          ctx.font = "12px sans-serif";
          const lines = wrapText(why, w - 60);
          const lh = 15;
          const h = Math.max(66, lines.length * lh + 18);
          const { bx, by } = drawBubbleBox(cx, y, w, h);
          drawSmiley(bx + 34, by + h / 2, false, 18);
          ctx.fillStyle = "#f4f1ea";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          let ty = by + (h - lines.length * lh) / 2;
          lines.forEach(l => { ctx.fillText(l, bx + 60, ty); ty += lh; });
        }
      }

      function render() {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Deux échafaudages (traits pointillés simples, style bois de fortune)
        [-1, 1].forEach(side => {
          const from = pathPosition(0);
          const mid = pathPosition(side * 0.5);
          const to = pathPosition(side);
          ctx.strokeStyle = "rgba(180,150,110,0.8)";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y + 6);
          ctx.quadraticCurveTo(mid.x, mid.y + 6, to.x, to.y + 6);
          ctx.stroke();
          ctx.strokeStyle = "rgba(90,70,50,0.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y + 6);
          ctx.quadraticCurveTo(mid.x, mid.y + 6, to.x, to.y + 6);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Principale (bulle fixe en haut, ne suit plus le joueur pour rester lisible)
        drawTextBubble(CANVAS_W / 2, 90, round.pitch.principal, 320);

        // PNJ + leur proposition (ou le smiley de résultat, une fois résolu)
        const NW = 34, NH = 46;
        const leftPos = pathPosition(-1), rightPos = pathPosition(1);

        if (resultBubble.side === -1 && resultBubble.kind) {
          drawSmileyBubble(leftPos.x, leftPos.y, resultBubble.kind === "happy", resultBubble.text);
        } else {
          drawTextBubble(leftPos.x, leftPos.y, round.leftText, 230);
        }
        if (resultBubble.side === 1 && resultBubble.kind) {
          drawSmileyBubble(rightPos.x, rightPos.y, resultBubble.kind === "happy", resultBubble.text);
        } else {
          drawTextBubble(rightPos.x, rightPos.y, round.rightText, 230);
        }

        const leftImgs = round.leftName === "Gavroche" ? gavrocheSide : esmeraldaSide;
        const rightImgs = round.rightName === "Gavroche" ? gavrocheSide : esmeraldaSide;
        drawSprite(leftImgs[1], leftPos.x - NW / 2, leftPos.y - NH, NW, NH, true);
        drawSprite(rightImgs[1], rightPos.x - NW / 2, rightPos.y - NH, NW, NH, false);

        ctx.fillStyle = "#c9c2e0";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(round.leftName, leftPos.x, leftPos.y + 14);
        ctx.fillText(round.rightName, rightPos.x, rightPos.y + 14);

        // Esprit (joueur), sur l'échafaudage
        const PW = 30, PH = 44;
        const pos = pathPosition(player.t);
        const frame = player.moving ? espritSide[1 + (animFrame % 3)] : espritSide[1];
        drawSprite(frame, pos.x - PW / 2, pos.y - PH, PW, PH, player.facing === "left");
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
