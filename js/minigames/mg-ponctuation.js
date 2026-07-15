/* ============================================================
   LE MANUSCRIT DES MONDES — mg-ponctuation.js (v2)
   ============================================================
   Mini-jeu "Le Tri des Barricades" (Monde 1 — Hugo).
   Notion : ponctuation.

   ---- POURQUOI CETTE VERSION REMPLACE LA PRÉCÉDENTE ----
   L'ancienne version (déplacement + esquive d'obstacles +
   ramassage d'un signe au hasard parmi 4) n'engageait aucun
   raisonnement sur la notion : gagner ou perdre dépendait
   surtout du hasard de placement des objets à l'écran, pas de
   la compréhension de la ponctuation.

   Nouvelle mécanique (discrimination répétée avec feedback
   immédiat) : le joueur voit 3 phrases l'une après l'autre,
   choisit le bon signe parmi 4 pour chacune, et reçoit
   IMMÉDIATEMENT un retour explicite (bonne/mauvaise réponse +
   pourquoi). Il faut au moins 2 bonnes réponses sur 3 pour
   réussir.

   Enregistré sous la notion "ponctuation", variante
   "barricades_hugo" (même nom qu'avant : aucune autre partie
   du code n'a besoin de changer).
   ============================================================ */

(function registerPonctuationHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

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

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Le Tri des Barricades",
      objective: "Trois phrases vont s'afficher, chacune avec un signe de ponctuation manquant. " +
        "Choisis le bon signe parmi les 4 proposés. Il te faut au moins 2 bonnes réponses sur 3 pour réussir.",
      html: `<p style="opacity:0.8; font-size:0.9rem;">Clique directement sur le signe qui te semble correct.</p>`
    });

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");

    const set = EXERCISE_SETS[Math.floor(Math.random() * EXERCISE_SETS.length)];
    let currentIndex = 0;
    let score = 0;
    let awaitingFeedback = false;

    const OPTION_W = 140, OPTION_H = 90, GAP = 30;

    function currentExercise() { return set[currentIndex]; }

    function optionRects() {
      const ex = currentExercise();
      const totalW = ex.options.length * OPTION_W + (ex.options.length - 1) * GAP;
      const startX = (CANVAS_W - totalW) / 2;
      return ex.options.map((symbol, i) => ({
        symbol,
        x: startX + i * (OPTION_W + GAP),
        y: 220, w: OPTION_W, h: OPTION_H
      }));
    }

    function render() {
      ctx.fillStyle = "#1a1530";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = "#f4f1ea";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Phrase ${currentIndex + 1} / ${set.length}`, 24, 32);

      const ex = currentExercise();
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ex.sentence, CANVAS_W / 2, 120);

      optionRects().forEach(opt => {
        ctx.fillStyle = "#2b2347";
        ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
        ctx.strokeStyle = "#9d8cff";
        ctx.lineWidth = 2;
        ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);

        ctx.fillStyle = "#e8c468";
        ctx.font = "36px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.symbol, opt.x + opt.w / 2, opt.y + opt.h / 2);
      });
      ctx.textBaseline = "alphabetic";
    }

    function onCanvasClick(e) {
      if (awaitingFeedback) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const opt = optionRects().find(o =>
        mx >= o.x && mx <= o.x + o.w && my >= o.y && my <= o.y + o.h
      );
      if (!opt) return;

      awaitingFeedback = true;
      const ex = currentExercise();
      const isCorrect = opt.symbol === ex.correct;
      if (isCorrect) score++;

      uiContainer.innerHTML = `
        <div class="hud-item" style="color:${isCorrect ? '#6fcf97' : '#d9534f'}; font-weight:bold; max-width:600px;">
          ${isCorrect ? "✓ Exact !" : "✗ Pas cette fois."} ${ex.why}
        </div>
      `;

      setTimeout(() => {
        currentIndex++;
        awaitingFeedback = false;
        if (currentIndex >= set.length) {
          finish();
        } else {
          uiContainer.innerHTML = `<div class="hud-item">Score : ${score} / ${set.length}</div>`;
          render();
        }
      }, 1800);
    }

    let resultResolve;
    const resultPromise = new Promise(resolve => { resultResolve = resolve; });

    async function finish() {
      canvas.removeEventListener("click", onCanvasClick);
      const passed = score >= Math.ceil(set.length * 2 / 3);

      await MinigameUI.showResult({
        passed,
        message: passed
          ? `Bien joué : ${score} / ${set.length} bonnes réponses.`
          : `${score} / ${set.length} bonnes réponses — il en fallait au moins ${Math.ceil(set.length * 2 / 3)}. Relis bien les indices avant de choisir la prochaine fois.`
      });

      resultResolve({ passed, score, total: set.length });
    }

    uiContainer.innerHTML = `<div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Score : 0 / ${set.length}</div>`;
    canvas.addEventListener("click", onCanvasClick);
    render();

    return resultPromise;
  }

  SceneManager.registerMinigame("ponctuation", "barricades_hugo", {
    title: "Le Tri des Barricades",
    run
  });

})();
