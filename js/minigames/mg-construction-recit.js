/* ============================================================
   LE MANUSCRIT DES MONDES — mg-construction-recit.js
   ============================================================
   Mini-jeu "Le Récit de Gavroche" (Monde 1 — Hugo).
   Notion : construction d'une histoire (schéma narratif en
   5 étapes : situation initiale, élément déclencheur,
   péripéties, résolution, situation finale).

   Principe pédagogique (vision structurelle globale) : le joueur
   doit placer 5 cartes-étapes dans les bons emplacements d'un
   "parchemin" (le récit de Gavroche), par clic successif
   (carte sélectionnée -> emplacement cible).

   Enregistré sous la notion "construction_recit",
   variante "parchemin_hugo".
   ============================================================ */

(function registerConstructionRecitHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  const STAGE_ORDER = [
    "situation_initiale",
    "element_declencheur",
    "peripeties",
    "resolution",
    "situation_finale"
  ];
  const STAGE_LABELS = {
    situation_initiale: "Situation initiale",
    element_declencheur: "Élément déclencheur",
    peripeties: "Péripéties",
    resolution: "Résolution",
    situation_finale: "Situation finale"
  };

  /**
   * Banque de mini-récits : 5 cartes correspondant chacune à
   * une étape du schéma narratif, dans l'ordre correct.
   */
  const STORY_BANK = [
    [
      { stage: "situation_initiale", text: "Gavroche dormait sur les pavés." },
      { stage: "element_declencheur", text: "Un bruit de pas le réveilla en sursaut." },
      { stage: "peripeties", text: "Il se cacha et observa la silhouette approcher." },
      { stage: "resolution", text: "Il reconnut un ami et sortit de sa cachette." },
      { stage: "situation_finale", text: "Ils repartirent ensemble vers les barricades." }
    ],
    [
      { stage: "situation_initiale", text: "L'Esprit explorait calmement Notre-Dame." },
      { stage: "element_declencheur", text: "Un vitrail se brisa soudainement au sol." },
      { stage: "peripeties", text: "Casimodo et l'Esprit ramassèrent les morceaux ensemble." },
      { stage: "resolution", text: "Le vitrail reprit forme sous leurs mains." },
      { stage: "situation_finale", text: "La lumière à travers le vitrail éclaira toute la nef." }
    ],
    [
      { stage: "situation_initiale", text: "Jean Valjean marchait seul sur la route." },
      { stage: "element_declencheur", text: "La pluie commença à tomber violemment." },
      { stage: "peripeties", text: "Il chercha un abri sous un grand arbre." },
      { stage: "resolution", text: "Il aperçut enfin une maison éclairée." },
      { stage: "situation_finale", text: "Il s'y dirigea, trempé mais soulagé." }
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

  function run({ canvas, uiContainer, isRemediation }) {
    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const story = STORY_BANK[Math.floor(Math.random() * STORY_BANK.length)];

      // Cartes mélangées (zone basse), emplacements ordonnés (zone haute)
      const order = shuffle(story.map((_, i) => i));

      const SLOT_W = 720;
      const SLOT_H = 50;
      const slots = STAGE_ORDER.map((stage, i) => ({
        stage,
        x: 40,
        y: 30 + i * (SLOT_H + 12),
        w: SLOT_W,
        h: SLOT_H,
        filled: null
      }));

      const CARD_W = 340;
      const CARD_H = 60;
      const cards = order.map((storyIdx, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return {
          storyIdx,
          x: 40 + col * (CARD_W + 20),
          y: 290 + row * (CARD_H + 12),
          w: CARD_W,
          h: CARD_H,
          placedInSlot: null,
          selected: false
        };
      });

      let resultGiven = false;
      let selectedCard = null;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Place chaque carte dans la bonne étape</div>
        <div class="hud-item"><button id="mg-validate" class="touch-btn" style="width:auto;height:auto;border-radius:8px;padding:8px 16px;">Valider</button></div>
      `;

      function endGame(passed) {
        if (resultGiven) return;
        resultGiven = true;
        canvas.removeEventListener("click", onClick);
        resolve({ passed, score: passed ? 1 : 0, total: 1 });
      }

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function onClick(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);

        // Clic sur une carte ?
        const card = cards.find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
        if (card) {
          cards.forEach(c => c.selected = false);
          if (card.placedInSlot !== null) {
            slots[card.placedInSlot].filled = null;
            card.placedInSlot = null;
          }
          card.selected = true;
          selectedCard = card;
          render();
          return;
        }

        // Clic sur un emplacement ?
        const slot = slots.find(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
        if (slot && selectedCard) {
          if (slot.filled !== null) {
            // Libère la carte déjà présente
            const occupant = cards[slot.filled];
            occupant.placedInSlot = null;
          }
          slot.filled = cards.indexOf(selectedCard);
          selectedCard.placedInSlot = slots.indexOf(slot);
          selectedCard.selected = false;
          selectedCard = null;
          render();
        }
      }

      canvas.addEventListener("click", onClick);

      document.getElementById("mg-validate").addEventListener("click", () => {
        const allFilled = slots.every(s => s.filled !== null);
        if (!allFilled) return;

        let allCorrect = true;
        slots.forEach((slot, slotIdx) => {
          const card = cards[slot.filled];
          const isCorrect = story[card.storyIdx].stage === slot.stage;
          if (!isCorrect) allCorrect = false;
          card.feedback = isCorrect ? "correct" : "incorrect";
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

        ctx.font = "13px sans-serif";

        // Emplacements (parchemin)
        slots.forEach(slot => {
          ctx.fillStyle = "rgba(157,140,255,0.08)";
          ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
          ctx.strokeStyle = "#e8c468";
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
          ctx.setLineDash([]);

          ctx.fillStyle = "#e8c468";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(STAGE_LABELS[slot.stage] + " :", slot.x + 10, slot.y + slot.h / 2);

          if (slot.filled !== null) {
            const card = cards[slot.filled];
            ctx.font = "13px sans-serif";
            ctx.fillStyle = "#f4f1ea";
            ctx.textAlign = "right";
            const labelWidth = ctx.measureText(STAGE_LABELS[slot.stage] + " : ").width;
            const availW = slot.w - 20 - labelWidth - 10;
            const lines = wrapText(story[card.storyIdx].text, availW);
            ctx.fillText(lines[0] + (lines.length > 1 ? "…" : ""), slot.x + slot.w - 10, slot.y + slot.h / 2);
          }
        });

        // Cartes (pool du bas)
        ctx.font = "13px sans-serif";
        cards.forEach(card => {
          if (card.placedInSlot !== null) return; // affichée dans le slot

          let fillColor = "#2b2347";
          if (card.feedback === "correct") fillColor = "#6fcf97";
          if (card.feedback === "incorrect") fillColor = "#d9534f";

          ctx.fillStyle = fillColor;
          ctx.fillRect(card.x, card.y, card.w, card.h);
          ctx.strokeStyle = card.selected ? "#e8c468" : "#9d8cff";
          ctx.lineWidth = card.selected ? 3 : 2;
          ctx.strokeRect(card.x, card.y, card.w, card.h);

          ctx.fillStyle = "#f4f1ea";
          const lines = wrapText(story[card.storyIdx].text, card.w - 20);
          const lineHeight = 16;
          const totalH = lines.length * lineHeight;
          let ty = card.y + card.h / 2 - totalH / 2 + lineHeight / 2;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          lines.forEach(line => {
            ctx.fillText(line, card.x + card.w / 2, ty);
            ty += lineHeight;
          });
        });
      }

      render();
    });
  }

  SceneManager.registerMinigame("construction_recit", "parchemin_hugo", {
    title: "Le Récit de Gavroche",
    run
  });

})();
