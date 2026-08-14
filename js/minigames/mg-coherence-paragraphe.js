/* ============================================================
   LE MANUSCRIT DES MONDES — mg-coherence-paragraphe.js (v3)
   ============================================================
   Mini-jeu "Les Vitraux Retrouvés" (Monde 1 — Hugo, acte cohérence
   du paragraphe). REFONTE COMPLÈTE de la v2 suite aux retours de
   Julie ("pas jouable en l'état").

   ---- CHANGEMENTS v3 ----
   1. CURSEUR-ESPRIT : l'Esprit passe en "mode fée" (rétréci) et
      DEVIENT le curseur de la souris — plus de phase de collecte au
      clavier séparée, plus de disparition bizarre. On ramasse et on
      pose dans le même geste, à la souris/au doigt.
   2. Les 11 éclats sont visibles dès le départ dans une réserve en
      bas de l'écran (plus de "ramassage" préalable).
   3. Glisser-déposer LIBRE à tout moment : un éclat déjà posé peut
      être ressorti et remis ailleurs autant de fois que voulu, avant
      ET après avoir rempli un vitrail.
   4. UN bouton "Valider" PAR vitrail (visible dès que ce vitrail est
      complet), pas un bouton unique global.
   5. Les compagnons (Esméralda/Casimodo/Gavroche) se tiennent EN HAUT
      de leur échelle pendant le jeu. À la validation d'un vitrail :
        - correct → il descend en confirmant chaque morceau un par un
          (léger halo à chaque étape), puis sursaute sur place, bras
          levés (sprite `<nom>-face-porte2`, réutilisé pour cette
          pose) avec une bulle souriante dessinée en canevas.
        - faux → il tombe (sprite `<nom>-ko`) avec un "!" ; les éclats
          de CE vitrail SEULEMENT retournent en réserve. Les vitraux
          déjà réussis restent acquis.
   6. Cliquer (sans glisser) sur un éclat affiche sa phrase en grand
      en haut de l'écran, pour les élèves qui lisent moins bien.
   7. Réserve du bas minimisée, avec un bouton "?" qui déplie/replie
      les instructions au lieu de tout étaler en permanence.
   8. Correctifs techniques : taille de l'Esprit alignée sur celle
      des compagnons (bug de la v2) ; canevas en haute résolution
      (mise à l'échelle sur window.devicePixelRatio) pour un texte
      net, plus de flou.
   9. Contenu : 3 mini-textes INDÉPENDANTS (pas un grand texte
      découpé) — un pour le vitrail central (Casimodo, 5 phrases,
      toujours le même), et 2 tirés au hasard parmi une banque de 4
      pour les vitraux latéraux (3 phrases chacun, répartis
      aléatoirement entre gauche et droite à chaque partie).
   10. Tableau final (les 3 vitraux réussis) : décor remplacé par la
       version restaurée, chaque compagnon se place devant SON
       vitrail en pose `<nom>-marche-porte2` (bras tendu, comme s'il
       le présentait), l'Esprit reprend sa taille normale et sursaute
       en pose `esprit-face-porte2` avec sa bulle souriante.

   Éclats de vitrail : `vitrail-eclat-1.png` à `vitrail-eclat-8.png`,
   fournis par Julie (320×112px, style pixel art cohérent avec le
   décor), dans /assets/sprites/props/.

   Enregistré sous la même notion/variante qu'avant
   ("coherence_paragraphe" / "vitraux_hugo") pour remplacer
   entièrement la version précédente.
   ============================================================ */

(function registerCoherenceParagrapheHugoV3() {

  const CANVAS_W = 1024;
  const CANVAS_H = 576;

  const BG_BROKEN = "/assets/backgrounds/decors_minijeu_cathedrale.png";
  const BG_RESTORED = "/assets/backgrounds/decors_minijeu_cathedrale_restauree.png";

  const CHAR_DIR = "/assets/sprites/characters/";
  const PROPS_DIR = "/assets/sprites/props/";

  const SHARD_IMAGE_COUNT = 8; // vitrail-eclat-1.png à vitrail-eclat-8.png
  const SHARD_W = 160, SHARD_H = 56; // taille affichée (images sources en 320x112, 2x, pour la netteté)

  // --- Texte central, toujours le même (vitrail de Casimodo) ---
  const CENTER_TEXT = [
    "Casimodo grimpa lentement l'escalier de pierre qui menait au sommet du beffroi.",
    "Ses mains calleuses se posèrent sur la plus grande des cloches, encore tiède du soleil couchant.",
    "Il sentit sous ses doigts les fêlures laissées par le passage du Mal-Dit.",
    "Avec précaution, il fit sonner la cloche une première fois, pour vérifier qu'elle tenait encore debout.",
    "Le son grave résonna dans toute la cathédrale, chassant un peu de l'obscurité qui rongeait les murs."
  ];

  // --- Banque de mini-textes à 3 phrases (2 tirés au hasard à chaque
  //     partie, répartis aléatoirement entre gauche et droite) ---
  const SIDE_TEXT_BANK = [
    [
      "Gavroche se hissa sur la corniche, agrippant la pierre du bout des doigts.",
      "De là, il apercevait tout Paris qui s'étendait, gris et endormi, sous un ciel bas.",
      "Il redescendit d'un bond, fier d'avoir trouvé le meilleur poste de guet de la ville."
    ],
    [
      "Esméralda tourna sur elle-même, ses foulards colorés virevoltant dans la lumière du parvis.",
      "Les passants s'arrêtaient un instant, oubliant leurs soucis pour la regarder danser.",
      "Elle salua la foule d'une révérence, un sourire malicieux aux lèvres."
    ],
    [
      "Un pigeon se posa sur le rebord d'une gargouille, indifférent au vacarme de la ville.",
      "Il observa un moment les toits de Paris qui s'étendaient à perte de vue.",
      "Puis il s'envola, disparaissant derrière les tours de Notre-Dame."
    ],
    [
      "La pluie se mit à tomber sur les pavés, d'abord fine, puis de plus en plus forte.",
      "Les marchands se hâtèrent de couvrir leurs étals avant que tout ne soit trempé.",
      "En quelques minutes, le parvis se vida presque entièrement."
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

  function loadChar(name) { const img = new Image(); img.src = CHAR_DIR + name; return img; }
  function loadProp(name) { const img = new Image(); img.src = PROPS_DIR + name; return img; }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Les Vitraux Retrouvés",
      objective: "L'Esprit rétrécit et devient ton curseur : fais glisser les éclats de vitrail vers les emplacements du bon vitrail, dans l'ordre qui te semble logique. Tu peux les déplacer et les intervertir autant de fois que tu veux. Clique (sans glisser) sur un éclat pour lire sa phrase en grand. Quand un vitrail est complet, un bouton « Valider » apparaît sous son échelle : le compagnon descend vérifier. Si c'est bon, il célèbre ; sinon il tombe et il faut recommencer CE vitrail-là seulement."
    });

    return new Promise(resolve => {

      // --- Canevas en haute résolution (corrige le flou du texte) ---
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      const bgBrokenImg = new Image(); bgBrokenImg.src = BG_BROKEN;
      const bgRestoredImg = new Image(); bgRestoredImg.src = BG_RESTORED;

      const shardImgs = [];
      for (let i = 1; i <= SHARD_IMAGE_COUNT; i++) shardImgs.push(loadProp(`vitrail-eclat-${i}.png`));

      // --- Choix des textes latéraux (2 parmi la banque, répartis au
      //     hasard entre gauche et droite) ---
      const [textLeft, textRight] = shuffle(SIDE_TEXT_BANK).slice(0, 2);

      const WINDOWS = [
        {
          id: "esmeralda", name: "Esméralda",
          sentences: textLeft,
          xCenter: 0.245, yTop: 0.40, yBottom: 0.60, standY: 0.86,
          sprites: {
            face: "esmeralda-face1.png",
            facePorte2: "esmeralda-face-porte2.png",
            dosPorte: ["esmeralda-dos-porte1.png", "esmeralda-dos-porte2.png", "esmeralda-dos-porte3.png"],
            marchePorte2: "esmeralda-marche-porte2.png",
            ko: "esmeralda-ko.png"
          }
        },
        {
          id: "casimodo", name: "Casimodo",
          sentences: CENTER_TEXT,
          xCenter: 0.5, yTop: 0.27, yBottom: 0.60, standY: 0.86,
          sprites: {
            face: "casimodo-face1.png",
            facePorte2: "casimodo-face-porte2.png",
            dosPorte: ["casimodo-dos-porte1.png", "casimodo-dos-porte2.png", "casimodo-dos-porte3.png"],
            marchePorte2: "casimodo-marche-porte2.png",
            ko: "casimodo-ko.png"
          }
        },
        {
          id: "gavroche", name: "Gavroche",
          sentences: textRight,
          xCenter: 0.755, yTop: 0.40, yBottom: 0.60, standY: 0.86,
          sprites: {
            face: "gavroche-face-1.png",
            facePorte2: "gavroche-face-porte2.png",
            dosPorte: ["gavroche-dos-porte1.png", "gavroche-dos-porte2.png", "gavroche-dos-porte3.png"],
            marchePorte2: "gavroche-marche-porte2.png",
            ko: "gavroche-ko.png"
          }
        }
      ];

      WINDOWS.forEach(win => {
        win.pieceCount = win.sentences.length;
        win.correctOrder = win.sentences.map((_, i) => i);
        win.slots = win.sentences.map((_, i) => {
          const t = win.pieceCount > 1 ? i / (win.pieceCount - 1) : 0.5;
          return {
            x: win.xCenter * CANVAS_W,
            y: (win.yTop + t * (win.yBottom - win.yTop)) * CANVAS_H,
            filled: null,
            lit: false
          };
        });
        win.standX = win.xCenter * CANVAS_W;
        win.standYpx = win.standY * CANVAS_H;
        win.topYpx = win.yTop * CANVAS_H - 30;
        win.img = {
          face: loadChar(win.sprites.face),
          facePorte2: loadChar(win.sprites.facePorte2),
          dosPorte: win.sprites.dosPorte.map(loadChar),
          marchePorte2: loadChar(win.sprites.marchePorte2),
          ko: loadChar(win.sprites.ko)
        };
        win.solved = false;
        win.state = "top"; // top | descending | celebrating | falling | done
        win.animTimer = 0;
        win.descendStep = -1;
        win.progress = 0;
      });

      // --- Construction des 11 pièces globales ---
      let pieceId = 0;
      const pieces = [];
      WINDOWS.forEach((win, wIdx) => {
        win.sentences.forEach((text, sIdx) => {
          pieces.push({
            id: pieceId++,
            windowIndex: wIdx,
            sentenceIndex: sIdx,
            text,
            shardVariant: Math.floor(Math.random() * SHARD_IMAGE_COUNT),
            state: "pool", // pool | placed
            x: 0, y: 0
          });
        });
      });

      function poolPieces() { return pieces.filter(p => p.state === "pool"); }

      function layoutPool() {
        const pool = poolPieces();
        const cols = 6;
        const startX = (CANVAS_W - Math.min(cols, pool.length || 1) * (SHARD_W + 10)) / 2 + SHARD_W / 2;
        pool.forEach((p, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          p.x = startX + col * (SHARD_W + 10);
          p.y = CANVAS_H - 30 - row * (SHARD_H + 8);
        });
      }
      layoutPool();

      // --- Curseur-Esprit ("mode fée") ---
      const espritCursor = loadChar("esprit-face-1.png");
      const espritFinal = loadChar("esprit-face-porte2.png");
      const CURSOR_SIZE = 34; // taille réduite du "mode fée" — volontairement plus petit que sa taille normale
      let cursorX = CANVAS_W / 2, cursorY = CANVAS_H / 2;
      let cursorInsideCanvas = false;

      canvas.style.cursor = "none";

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      let dragPiece = null, dragFromSlot = null, dragStartX = 0, dragStartY = 0, dragMoved = false;
      let enlargedText = null, enlargedTimer = 0;

      function pieceAt(x, y) {
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i];
          if (p.state !== "pool") continue;
          if (x >= p.x - SHARD_W / 2 && x <= p.x + SHARD_W / 2 && y >= p.y - SHARD_H / 2 && y <= p.y + SHARD_H / 2) return p;
        }
        return null;
      }

      function slotAt(x, y) {
        for (const win of WINDOWS) {
          for (const slot of win.slots) {
            if (slot.lit) continue;
            if (x >= slot.x - SHARD_W / 2 && x <= slot.x + SHARD_W / 2 && y >= slot.y - SHARD_H / 2 && y <= slot.y + SHARD_H / 2) {
              return { win, slot };
            }
          }
        }
        return null;
      }

      function validateButtonAt(x, y) {
        for (const win of WINDOWS) {
          if (win.state !== "top") continue;
          const full = win.slots.every(s => s.filled !== null || s.lit);
          if (!full) continue;
          const btn = win.validateBtnRect;
          if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return win;
        }
        return null;
      }

      /**
       * v3 (correctif) : un simple CLIC sur un éclat déjà posé dans un
       * vitrail ne doit RIEN déplacer — seulement afficher sa phrase en
       * grand. On ne retire donc la pièce de son emplacement qu'au
       * moment où un VRAI glissement est détecté (voir onMove), jamais
       * dès le mousedown/touchstart.
       */
      function onDown(clientX, clientY) {
        const { x, y } = getCanvasCoords(clientX, clientY);
        cursorX = x; cursorY = y;

        const btnWin = validateButtonAt(x, y);
        if (btnWin) { startValidation(btnWin); return; }

        let p = pieceAt(x, y); // éclats en réserve uniquement
        let fromSlot = null;

        if (!p) {
          outer:
          for (const win of WINDOWS) {
            if (win.state !== "top") continue;
            for (const slot of win.slots) {
              if (slot.lit || slot.filled === null) continue;
              if (x >= slot.x - SHARD_W / 2 && x <= slot.x + SHARD_W / 2 && y >= slot.y - SHARD_H / 2 && y <= slot.y + SHARD_H / 2) {
                const piece = pieces.find(pp => pp.id === slot.filled);
                if (piece) { p = piece; fromSlot = { win, slot }; }
                break outer;
              }
            }
          }
        }

        if (p) {
          dragPiece = p;
          dragFromSlot = fromSlot;
          dragStartX = x; dragStartY = y;
          dragMoved = false;
        }
      }

      function onMove(clientX, clientY) {
        const { x, y } = getCanvasCoords(clientX, clientY);
        cursorX = x; cursorY = y;
        cursorInsideCanvas = true;
        if (dragPiece) {
          if (!dragMoved && (Math.abs(x - dragStartX) > 4 || Math.abs(y - dragStartY) > 4)) {
            dragMoved = true;
            // Le glissement ne fait vraiment "sortir" la pièce de son
            // emplacement qu'à cet instant précis — jamais avant.
            if (dragFromSlot) {
              dragFromSlot.slot.filled = null;
              dragPiece.state = "pool";
              layoutPool();
            }
          }
          if (dragMoved) {
            dragPiece.x = x; dragPiece.y = y;
          }
        }
      }

      function onUp() {
        if (dragPiece) {
          if (!dragMoved) {
            // Clic simple, sans glissement : on affiche juste la
            // phrase en grand, rien d'autre ne bouge.
            enlargedText = dragPiece.text;
            enlargedTimer = 210;
          } else {
            const target = slotAt(dragPiece.x, dragPiece.y);
            if (target) {
              if (target.slot.filled !== null) {
                const occupant = pieces.find(pp => pp.id === target.slot.filled);
                if (occupant) occupant.state = "pool";
              }
              target.slot.filled = dragPiece.id;
              dragPiece.state = "placed";
              dragPiece.x = target.slot.x;
              dragPiece.y = target.slot.y;
            } else {
              dragPiece.state = "pool";
            }
            layoutPool();
          }
        }
        dragPiece = null;
        dragFromSlot = null;
      }

      const onMouseDown = e => onDown(e.clientX, e.clientY);
      const onMouseMove = e => onMove(e.clientX, e.clientY);
      const onMouseUp = () => onUp();
      const onTouchStart = e => { onDown(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); };
      const onTouchMove = e => { onMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); };
      const onTouchEnd = () => onUp();

      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd);

      // --- Panneau "?" (instructions dépliables) — remplace le
      //     panneau du bas surdimensionné de la v2. ---
      let instructionsOpen = false;
      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Les Vitraux Retrouvés</div>
        <div class="hud-item">
          <button id="mg-help-btn" class="touch-btn" style="width:32px;height:32px;border-radius:50%;">?</button>
        </div>
        <div id="mg-help-text" style="display:none; max-width:520px; font-size:0.85rem; color:#c9c2e0; background:rgba(26,21,48,0.85); border:1px solid #9d8cff; border-radius:8px; padding:8px 12px; margin-top:4px;">
          Glisse les éclats vers les emplacements du vitrail qui te semble correct. Tu peux les changer de place autant de fois que tu veux. Clique sans glisser pour lire une phrase en grand. Un bouton « Valider » apparaît sous chaque vitrail une fois rempli.
        </div>
      `;
      document.getElementById("mg-help-btn").addEventListener("click", () => {
        instructionsOpen = !instructionsOpen;
        document.getElementById("mg-help-text").style.display = instructionsOpen ? "block" : "none";
      });

      // --- Validation d'un vitrail ---
      function startValidation(win) {
        const placedOrder = win.slots.map(s => {
          const p = pieces.find(pp => pp.id === s.filled);
          return p ? p.sentenceIndex : -1;
        });
        win.pendingCorrect = placedOrder.join(",") === win.correctOrder.join(",");
        win.state = "descending";
        win.descendStep = 0;
        win.animTimer = 0;
        win.progress = 0;
      }

      function finalizeWindowFailure(win) {
        win.slots.forEach(s => {
          const p = pieces.find(pp => pp.id === s.filled);
          if (p) p.state = "pool";
          s.filled = null;
        });
        win.state = "top";
        win.descendStep = -1;
        layoutPool();
      }

      function finalizeWindowSuccess(win) {
        win.solved = true;
        win.slots.forEach(s => { s.lit = true; });
        win.state = "celebrating";
        win.animTimer = 0;
        checkGlobalVictory();
      }

      let victoryStarted = false;
      let resultGiven = false;

      function checkGlobalVictory() {
        if (WINDOWS.every(w => w.solved) && !victoryStarted) {
          victoryStarted = true;
          setTimeout(() => startVictoryTableau(), 1400);
        }
      }

      let tableau = false;
      function startVictoryTableau() {
        tableau = true;
        WINDOWS.forEach(w => { w.state = "done"; });
      }

      function cleanup() {
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
        canvas.style.cursor = "auto";
        cancelAnimationFrame(rafId);
      }

      async function endGame() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: "Les trois vitraux retrouvent enfin leurs couleurs. Esméralda, Casimodo et Gavroche contemplent, côte à côte, la lumière revenue dans la cathédrale."
        });
        resolve({ passed: true, score: 1, total: 1 });
      }

      let rafId;
      let tableauTimer = 0;

      function loop() {
        WINDOWS.forEach(win => {
          if (win.state === "descending") {
            win.animTimer++;
            if (win.animTimer >= 14) {
              win.animTimer = 0;
              win.progress = Math.min(1, win.progress + 1 / win.pieceCount);
              win.descendStep++;
              if (win.pendingCorrect) {
                const slot = win.slots[win.descendStep - 1];
                if (slot) slot.lit = true;
              }
              if (win.descendStep >= win.pieceCount) {
                if (win.pendingCorrect) finalizeWindowSuccess(win);
                else win.state = "falling";
                win.animTimer = 0;
              }
            }
          } else if (win.state === "falling") {
            win.animTimer++;
            if (win.animTimer >= 30) finalizeWindowFailure(win);
          } else if (win.state === "celebrating") {
            win.animTimer++;
            if (win.animTimer >= 70) win.state = "idleDone";
          }
        });

        if (tableau) {
          tableauTimer++;
          if (tableauTimer >= 90 && !resultGiven) endGame();
        }

        if (enlargedTimer > 0) enlargedTimer--;

        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      function drawImgSafe(img, x, y, w, h, flip) {
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
          ctx.fillStyle = "#9d8cff";
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

      function drawShard(p) {
        const img = shardImgs[p.shardVariant];
        const x = p.x - SHARD_W / 2, y = p.y - SHARD_H / 2;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, x, y, SHARD_W, SHARD_H);
        } else {
          ctx.fillStyle = "#2b2347";
          ctx.strokeStyle = "#9d8cff";
          ctx.lineWidth = 2;
          ctx.fillRect(x, y, SHARD_W, SHARD_H);
          ctx.strokeRect(x, y, SHARD_W, SHARD_H);
        }
        ctx.font = "600 11px sans-serif";
        ctx.fillStyle = "#f4f1ea";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = wrapText(p.text, SHARD_W - 14).slice(0, 2);
        const lh = 13;
        let ty = p.y - (lines.length - 1) * lh / 2;
        lines.forEach((line, i) => {
          const truncated = (i === 1 && lines.length === 2 && line.length > 26) ? line.slice(0, 24) + "…" : line;
          ctx.fillText(truncated, p.x, ty);
          ty += lh;
        });
      }

      function drawSmileyBubble(x, y) {
        ctx.save();
        ctx.fillStyle = "#f4f1ea";
        ctx.beginPath();
        ctx.ellipse(x, y, 16, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e8c468";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 11);
        ctx.lineTo(x - 8, y + 18);
        ctx.lineTo(x + 2, y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#1a1530";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x - 5, y - 2, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 5, y - 2, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 2, 6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      function render() {
        const bg = tableau ? bgRestoredImg : bgBrokenImg;
        if (bg.complete && bg.naturalWidth > 0) ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
        else { ctx.fillStyle = "#1a1530"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }

        // Échelles
        WINDOWS.forEach(win => {
          const top = win.yTop * CANVAS_H + 10, bottom = win.standYpx;
          ctx.strokeStyle = "rgba(200,180,140,0.7)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(win.xCenter * CANVAS_W - 14, top); ctx.lineTo(win.xCenter * CANVAS_W - 14, bottom);
          ctx.moveTo(win.xCenter * CANVAS_W + 14, top); ctx.lineTo(win.xCenter * CANVAS_W + 14, bottom);
          ctx.stroke();
          ctx.lineWidth = 2;
          for (let y = top; y < bottom; y += 16) {
            ctx.beginPath(); ctx.moveTo(win.xCenter * CANVAS_W - 14, y); ctx.lineTo(win.xCenter * CANVAS_W + 14, y); ctx.stroke();
          }
        });

        // Emplacements
        WINDOWS.forEach(win => {
          win.slots.forEach(slot => {
            ctx.fillStyle = slot.lit ? "rgba(232,196,104,0.35)" : "rgba(157,140,255,0.08)";
            ctx.fillRect(slot.x - SHARD_W / 2, slot.y - SHARD_H / 2, SHARD_W, SHARD_H);
            ctx.strokeStyle = slot.lit ? "#e8c468" : "#9d8cff";
            ctx.setLineDash(slot.lit ? [] : [5, 5]);
            ctx.lineWidth = 2;
            ctx.strokeRect(slot.x - SHARD_W / 2, slot.y - SHARD_H / 2, SHARD_W, SHARD_H);
            ctx.setLineDash([]);
            if (slot.filled !== null) {
              const p = pieces.find(pp => pp.id === slot.filled);
              if (p && p !== dragPiece) drawShard(p);
            }
          });
        });

        // Bouton "Valider" par vitrail
        WINDOWS.forEach(win => {
          const full = win.slots.every(s => s.filled !== null || s.lit);
          if (win.state === "top" && full) {
            const bw = 90, bh = 26;
            const bx = win.xCenter * CANVAS_W - bw / 2;
            const by = win.standYpx + 6;
            win.validateBtnRect = { x: bx, y: by, w: bw, h: bh };
            ctx.fillStyle = "#e8c468";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#1a1530";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.fillStyle = "#1a1530";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Valider", bx + bw / 2, by + bh / 2 + 1);
          } else {
            win.validateBtnRect = null;
          }
        });

        // Compagnons
        const CW = 42, CH = 58;
        WINDOWS.forEach(win => {
          const x = win.standX - CW / 2;
          if (win.state === "top") {
            drawImgSafe(win.img.face, x, win.topYpx, CW, CH, false);
          } else if (win.state === "descending") {
            const y = win.topYpx + win.progress * (win.standYpx - CH - win.topYpx);
            const frame = win.img.dosPorte[Math.floor(win.animTimer / 5) % win.img.dosPorte.length];
            drawImgSafe(frame, x, y, CW, CH, false);
          } else if (win.state === "falling") {
            const t = win.animTimer / 30;
            const y = win.topYpx + t * (win.standYpx - CH - win.topYpx);
            ctx.save();
            ctx.globalAlpha = 1 - t * 0.5;
            drawImgSafe(win.img.ko, x, y, CW, CH, false);
            ctx.font = "bold 22px sans-serif";
            ctx.fillStyle = "#d9534f";
            ctx.textAlign = "center";
            ctx.fillText("!", win.standX, y - 6);
            ctx.restore();
          } else if (win.state === "celebrating") {
            const bounce = Math.abs(Math.sin(win.animTimer * 0.35)) * 10;
            drawImgSafe(win.img.facePorte2, x, win.standYpx - CH - bounce, CW, CH, false);
            drawSmileyBubble(win.standX + CW / 2 + 6, win.standYpx - CH - bounce - 14);
          } else if (win.state === "idleDone") {
            drawImgSafe(win.img.facePorte2, x, win.standYpx - CH, CW, CH, false);
          } else if (win.state === "done") {
            // Tableau final : personnage devant son vitrail, bras tendu
            drawImgSafe(win.img.marchePorte2, x, win.standYpx - CH, CW, CH, false);
          }
        });

        // Éclats en réserve
        poolPieces().forEach(p => { if (p !== dragPiece) drawShard(p); });
        if (dragPiece) drawShard(dragPiece);

        // Texte agrandi (clic simple sur un éclat)
        if (enlargedTimer > 0 && enlargedText) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, enlargedTimer / 30);
          ctx.fillStyle = "rgba(26,21,48,0.92)";
          ctx.fillRect(CANVAS_W / 2 - 380, 14, 760, 56);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 2;
          ctx.strokeRect(CANVAS_W / 2 - 380, 14, 760, 56);
          ctx.fillStyle = "#f4f1ea";
          ctx.font = "15px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const lines = wrapText(enlargedText, 730);
          const lh = 18;
          let ty = 42 - (lines.length - 1) * lh / 2;
          lines.forEach(line => { ctx.fillText(line, CANVAS_W / 2, ty); ty += lh; });
          ctx.restore();
        }

        // Tableau final : bulle sur l'Esprit redevenu grand
        if (tableau) {
          const ex = CANVAS_W / 2 - 20, ey = CANVAS_H * 0.7;
          const bounce = Math.abs(Math.sin(tableauTimer * 0.3)) * 8;
          drawImgSafe(espritFinal, ex, ey - bounce, 40, 54, false);
          drawSmileyBubble(ex + 40 + 4, ey - bounce - 12);
        } else {
          // Curseur-Esprit ("mode fée")
          drawImgSafe(espritCursor, cursorX - CURSOR_SIZE / 2, cursorY - CURSOR_SIZE / 2, CURSOR_SIZE, CURSOR_SIZE, false);
        }
      }

      render();
      loop();
    });
  }

  SceneManager.registerMinigame("coherence_paragraphe", "vitraux_hugo", {
    title: "Les Vitraux Retrouvés",
    run
  });

})();
