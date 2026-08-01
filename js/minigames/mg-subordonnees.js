/* ============================================================
   LE MANUSCRIT DES MONDES — mg-subordonnees.js
   ============================================================
   Mini-jeu "Les Cloches de Notre-Dame" (Monde 1 — Hugo).
   Notion : propositions subordonnées (lien principale <-> subordonnée).

   Principe pédagogique (mémoire associative, double encodage) :
   jeu de type "memory" — des cloches affichent chacune un
   fragment de phrase (principale ou subordonnée). Le joueur
   clique deux cloches pour les retourner ; si elles forment une
   paire principale/subordonnée cohérente, elles restent visibles
   et sonnent (succès visuel + auditif implicite via couleur/anim).

   Enregistré sous la notion "subordonnees",
   variante "cloches_hugo".
   ============================================================ */

(function registerSubordonneesHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  /**
   * Banque de paires principale/subordonnée. À chaque lancement,
   * on pioche 3 paires (6 cloches) pour garder le jeu rapide.
   */
  const PAIR_BANK = [
    { main: "Gavroche se cacha", sub: "parce qu'il avait vu Frollo" },
    { main: "L'Esprit comprit", sub: "que Casimodo les protégeait" },
    { main: "Esmeralda sourit", sub: "quand elle reconnut Gavroche" },
    { main: "Les cloches sonnèrent", sub: "dès que la nuit tomba" },
    { main: "Casimodo descendit", sub: "pour accueillir ses amis" },
    { main: "Frollo s'enfuit", sub: "avant que la lumière n'arrive" },
    { main: "Gavroche hésita", sub: "bien qu'il connût le chemin par cœur" },
    { main: "L'Esprit s'arrêta", sub: "là où les vitraux brillaient encore" },
    { main: "Quasimodo se tut", sub: "de peur que Frollo ne l'entende" },
    { main: "Esmeralda attendit", sub: "jusqu'à ce que la cloche sonne" },
    { main: "Les gardes reculèrent", sub: "quand ils virent la barricade" },
    { main: "Gavroche revint", sub: "après avoir prévenu ses amis" }
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickPairs(n) {
    return shuffle(PAIR_BANK).slice(0, n);
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Les Cloches de Notre-Dame",
      objective: "C'est un jeu de memory. Clique sur deux cloches pour les retourner : trouve les paires proposition principale ↔ proposition subordonnée qui vont logiquement ensemble. Tu as droit à 4 erreurs maximum."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const NUM_PAIRS = 4;
      const pairs = pickPairs(NUM_PAIRS);

      // Construit les cartes "cloches" : { pairId, role, text, x, y, flipped, matched }
      let cards = [];
      pairs.forEach((p, i) => {
        cards.push({ pairId: i, role: "main", text: p.main, flipped: false, matched: false });
        cards.push({ pairId: i, role: "sub", text: p.sub, flipped: false, matched: false });
      });
      cards = shuffle(cards);

      // Grille 4 colonnes x 2 lignes (pour 4 paires = 8 cartes) — cartes
      // plus compactes que l'ancienne grille 3x2 pour tenir dans le canevas.
      const COLS = 4;
      const ROWS = Math.ceil(cards.length / COLS);
      const CARD_W = 170;
      const CARD_H = 130;
      const GAP = 18;
      const gridW = COLS * CARD_W + (COLS - 1) * GAP;
      const gridH = ROWS * CARD_H + (ROWS - 1) * GAP;
      const startX = (CANVAS_W - gridW) / 2;
      const startY = (CANVAS_H - gridH) / 2;

      cards.forEach((card, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        card.x = startX + col * (CARD_W + GAP);
        card.y = startY + row * (CARD_H + GAP);
        card.w = CARD_W;
        card.h = CARD_H;
      });

      let flippedCards = [];
      let mistakes = 0;
      const MAX_MISTAKES = 4;
      let resultGiven = false;
      let lockInput = false;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Associe principale et subordonnée</div>
        <div class="hud-item">Erreurs : <span id="mg-mistakes">0</span> / ${MAX_MISTAKES}</div>
      `;

      async function endGame(passed) {
        if (resultGiven) return;
        resultGiven = true;
        canvas.removeEventListener("click", onClick);
        await MinigameUI.showResult({
          passed,
          message: passed
            ? "Toutes les paires principale / subordonnée sont retrouvées !"
            : "Trop d'erreurs cette fois. Relis bien chaque paire de cloches avant de valider une association."
        });
        resolve({ passed, score: passed ? 1 : 0, total: 1 });
      }

      function onClick(e) {
        if (lockInput || resultGiven) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const card = cards.find(c =>
          !c.matched && !c.flipped &&
          mx >= c.x && mx <= c.x + c.w &&
          my >= c.y && my <= c.y + c.h
        );
        if (!card) return;

        card.flipped = true;
        flippedCards.push(card);
        render();

        if (flippedCards.length === 2) {
          lockInput = true;
          const [a, b] = flippedCards;
          const isMatch = a.pairId === b.pairId && a.role !== b.role;

          setTimeout(() => {
            if (isMatch) {
              a.matched = true;
              b.matched = true;
            } else {
              a.flipped = false;
              b.flipped = false;
              mistakes++;
              document.getElementById("mg-mistakes").textContent = mistakes;
            }
            flippedCards = [];
            lockInput = false;
            render();

            const allMatched = cards.every(c => c.matched);
            if (allMatched) {
              endGame(true);
            } else if (mistakes >= MAX_MISTAKES) {
              endGame(false);
            }
          }, 900);
        }
      }

      canvas.addEventListener("click", onClick);

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

      function render() {
        ctx.fillStyle = "#1a1530";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "14px sans-serif";
        cards.forEach(card => {
          ctx.fillStyle = card.matched ? "#6fcf97" :
                           card.flipped ? "#9d8cff" : "#2b2347";
          ctx.fillRect(card.x, card.y, card.w, card.h);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 2;
          ctx.strokeRect(card.x, card.y, card.w, card.h);

          if (card.flipped || card.matched) {
            ctx.fillStyle = "#1a1530";
            const lines = wrapText(card.text, card.w - 20);
            const lineHeight = 18;
            const totalH = lines.length * lineHeight;
            let ty = card.y + card.h / 2 - totalH / 2 + lineHeight / 2;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            lines.forEach(line => {
              ctx.fillText(line, card.x + card.w / 2, ty);
              ty += lineHeight;
            });
          } else {
            // Dos de carte : icône de cloche stylisée
            ctx.fillStyle = "#f4f1ea";
            ctx.font = "32px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🔔", card.x + card.w / 2, card.y + card.h / 2);
            ctx.font = "14px sans-serif";
          }
        });
      }

      render();
    });
  }

  SceneManager.registerMinigame("subordonnees", "cloches_hugo", {
    title: "Les Cloches de Notre-Dame",
    run
  });

})();
