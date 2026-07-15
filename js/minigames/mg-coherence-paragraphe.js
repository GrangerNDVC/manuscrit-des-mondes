/* ============================================================
   LE MANUSCRIT DES MONDES — mg-coherence-paragraphe.js
   ============================================================
   Mini-jeu "Le Rangement de Quasimodo" (Monde 1 — Hugo).
   Notion : cohérence du paragraphe (ordre logique des phrases,
   connecteurs).

   Principe pédagogique (manipulation de blocs, niveau supérieur
   à la phrase) : le joueur fait glisser des "vitraux" (blocs de
   texte = phrases) vers des emplacements numérotés dans une
   verrière, afin de reconstituer un paragraphe cohérent dans
   l'ordre logique (souvent marqué par des connecteurs
   chronologiques : d'abord/ensuite/enfin).

   Enregistré sous la notion "coherence_paragraphe",
   variante "vitraux_hugo".
   ============================================================ */

(function registerCoherenceParagrapheHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  /**
   * Banque de paragraphes : 3 phrases dans l'ordre logique correct.
   * Le mini-jeu les mélange et le joueur doit les reglisser dans
   * l'ordre (0,1,2).
   */
  const PARAGRAPH_BANK = [
    [
      "D'abord, Quasimodo grimpa tout en haut de la tour.",
      "Ensuite, il observa les toits de Paris s'étendre au loin.",
      "Enfin, il redescendit pour préparer les cloches du soir."
    ],
    [
      "D'abord, l'Esprit poussa la lourde porte de pierre.",
      "Ensuite, une lumière douce envahit la pièce.",
      "Enfin, Quasimodo apparut entre les vitraux brisés."
    ],
    [
      "D'abord, Gavroche ramassa un vitrail tombé au sol.",
      "Ensuite, il le tendit avec précaution à Quasimodo.",
      "Enfin, Quasimodo le replaça avec un sourire ému."
    ]
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
      title: "Le Rangement de Quasimodo",
      objective: "Fais glisser les 3 phrases-vitraux (à gauche) vers les 3 emplacements de la verrière (à droite), dans l'ordre logique du récit — repère les mots comme « d'abord », « ensuite », « enfin ». Clique sur Valider une fois les 3 placées."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const sentences = PARAGRAPH_BANK[Math.floor(Math.random() * PARAGRAPH_BANK.length)];
      const correctOrder = [0, 1, 2];

      // Mélange l'ordre des "vitraux" disponibles (zone de gauche)
      let pool = correctOrder.slice();
      do {
        pool = shuffle(pool);
      } while (pool.join() === correctOrder.join());

      const SLOT_W = 420;
      const SLOT_H = 80;
      const SLOT_X = CANVAS_W - SLOT_W - 40;
      const slots = correctOrder.map((_, i) => ({
        x: SLOT_X,
        y: 40 + i * (SLOT_H + 20),
        w: SLOT_W,
        h: SLOT_H,
        filled: null // index de phrase placée ici
      }));

      const PIECE_W = 300;
      const PIECE_H = 80;
      const pieces = pool.map((sentenceIdx, i) => ({
        sentenceIdx,
        x: 40,
        y: 40 + i * (PIECE_H + 20),
        homeX: 40,
        homeY: 40 + i * (PIECE_H + 20),
        w: PIECE_W,
        h: PIECE_H,
        placedInSlot: null,
        dragging: false
      }));

      let resultGiven = false;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Glisse les vitraux dans l'ordre logique</div>
        <div class="hud-item"><button id="mg-validate" class="touch-btn" style="width:auto;height:auto;border-radius:8px;padding:8px 16px;">Valider</button></div>
      `;

      async function endGame(passed) {
        if (resultGiven) return;
        resultGiven = true;
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseup", onUp);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onUp);
        await MinigameUI.showResult({
          passed,
          message: passed
            ? "Le paragraphe est maintenant dans le bon ordre !"
            : `Ce n'était pas le bon ordre. L'ordre logique était : « ${sentences.join(" ")} »`
        });
        resolve({ passed, score: passed ? 1 : 0, total: 1 });
      }

      let dragTarget = null;
      let dragOffsetX = 0, dragOffsetY = 0;

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function pieceAt(x, y) {
        // Itère à l'envers pour prioriser les pièces dessinées au-dessus
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i];
          if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
        }
        return null;
      }

      function startDrag(x, y) {
        const piece = pieceAt(x, y);
        if (!piece) return;
        dragTarget = piece;
        dragOffsetX = x - piece.x;
        dragOffsetY = y - piece.y;
        piece.dragging = true;

        // Libère le slot qu'elle occupait
        if (piece.placedInSlot !== null) {
          slots[piece.placedInSlot].filled = null;
          piece.placedInSlot = null;
        }
      }

      function moveDrag(x, y) {
        if (!dragTarget) return;
        dragTarget.x = x - dragOffsetX;
        dragTarget.y = y - dragOffsetY;
        render();
      }

      function endDrag() {
        if (!dragTarget) return;
        dragTarget.dragging = false;

        // Vérifie si la pièce est déposée sur un slot libre
        const center = { x: dragTarget.x + dragTarget.w / 2, y: dragTarget.y + dragTarget.h / 2 };
        const slotIdx = slots.findIndex(s =>
          s.filled === null &&
          center.x >= s.x && center.x <= s.x + s.w &&
          center.y >= s.y && center.y <= s.y + s.h
        );

        if (slotIdx !== -1) {
          const slot = slots[slotIdx];
          dragTarget.x = slot.x + (slot.w - dragTarget.w) / 2;
          dragTarget.y = slot.y + (slot.h - dragTarget.h) / 2;
          slot.filled = pieces.indexOf(dragTarget);
          dragTarget.placedInSlot = slotIdx;
        } else {
          // Retour à la position d'origine
          dragTarget.x = dragTarget.homeX;
          dragTarget.y = dragTarget.homeY;
        }

        dragTarget = null;
        render();
      }

      function onDown(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        startDrag(x, y);
      }
      function onMove(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        moveDrag(x, y);
      }
      function onUp() { endDrag(); }

      function onTouchStart(e) {
        const t = e.touches[0];
        const { x, y } = getCanvasCoords(t.clientX, t.clientY);
        startDrag(x, y);
        e.preventDefault();
      }
      function onTouchMove(e) {
        const t = e.touches[0];
        const { x, y } = getCanvasCoords(t.clientX, t.clientY);
        moveDrag(x, y);
        e.preventDefault();
      }

      canvas.addEventListener("mousedown", onDown);
      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseup", onUp);
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onUp);

      document.getElementById("mg-validate").addEventListener("click", () => {
        const allFilled = slots.every(s => s.filled !== null);
        if (!allFilled) return;

        let allCorrect = true;
        slots.forEach((slot, slotIdx) => {
          const piece = pieces[slot.filled];
          const isCorrect = piece.sentenceIdx === correctOrder[slotIdx];
          if (!isCorrect) allCorrect = false;
          piece.feedback = isCorrect ? "correct" : "incorrect";
        });
        render();

        setTimeout(() => endGame(allCorrect), 1000);
      });

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

        // Slots (verrière)
        slots.forEach((slot, i) => {
          ctx.fillStyle = "rgba(157,140,255,0.08)";
          ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
          ctx.strokeStyle = "#e8c468";
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
          ctx.setLineDash([]);

          ctx.fillStyle = "#c9c2e0";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`Position ${i + 1}`, slot.x + 8, slot.y + 16);
        });

        // Pièces (vitraux)
        ctx.font = "14px sans-serif";
        pieces.forEach(piece => {
          let fillColor = "#2b2347";
          if (piece.feedback === "correct") fillColor = "#6fcf97";
          if (piece.feedback === "incorrect") fillColor = "#d9534f";

          ctx.fillStyle = fillColor;
          ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
          ctx.strokeStyle = piece.dragging ? "#e8c468" : "#9d8cff";
          ctx.lineWidth = piece.dragging ? 3 : 2;
          ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);

          ctx.fillStyle = "#f4f1ea";
          const lines = wrapText(sentences[piece.sentenceIdx], piece.w - 20);
          const lineHeight = 18;
          const totalH = lines.length * lineHeight;
          let ty = piece.y + piece.h / 2 - totalH / 2 + lineHeight / 2;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          lines.forEach(line => {
            ctx.fillText(line, piece.x + piece.w / 2, ty);
            ty += lineHeight;
          });
        });
      }

      render();
    });
  }

  SceneManager.registerMinigame("coherence_paragraphe", "vitraux_hugo", {
    title: "Le Rangement de Quasimodo",
    run
  });

})();
