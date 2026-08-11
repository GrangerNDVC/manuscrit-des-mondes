/* ============================================================
   LE MANUSCRIT DES MONDES — mg-coherence-paragraphe.js (v2)
   ============================================================
   Mini-jeu "Les Vitraux Retrouvés" (Monde 1 — Hugo, acte cohérence
   du paragraphe). REMPLACE ENTIÈREMENT l'ancien "Rangement de
   Quasimodo" (glisser-déposer vers des cases étiquetées, jugé trop
   facile et pas assez "arcade").

   ---- PRINCIPE (v2) ----
   1. PHASE DE COLLECTE : l'Esprit (joueur, déplacement libre 4
      directions façon Zelda/Mario, comme "Le Pont de Gavroche") se
      déplace dans la cathédrale et ramasse 11 éclats de vitrail
      dispersés au sol (3 + 5 + 3, un jeu de phrases par vitrail).
   2. PHASE DE PLACEMENT : une fois tous les éclats ramassés, le
      joueur les fait glisser vers des emplacements numérotés sous
      chacun des 3 vitraux (gauche/centre/droite), dans l'ordre qui
      lui semble correct. Il peut replacer autant de fois qu'il veut
      avant de valider.
   3. VALIDATION (un seul bouton, vérifie les 3 vitraux séparément) :
        - Vitrail correct → le compagnon associé grimpe à l'échelle
          (de dos), se tourne sur le côté pour installer chaque
          éclat (qui s'illumine), puis redescend se placer devant,
          vitrail acquis définitivement.
        - Vitrail faux (ou incomplet) → le compagnon tombe de
          l'échelle (sprite KO), les éclats de CE vitrail
          retournent dans la réserve du bas pour être replacés —
          les vitraux déjà réussis, eux, restent acquis.
   4. Les 3 vitraux réussis → le décor bascule sur sa version
      restaurée, victoire.

   Attribution des personnages (à confirmer avec Julie) :
     Esméralda = vitrail de GAUCHE (3 éclats)
     Casimodo  = vitrail CENTRAL  (5 éclats)
     Gavroche  = vitrail de DROITE (3 éclats)

   ⚠️ Pas de sprite Esprit "de profil en train de porter" fourni —
   on réutilise le sprite de marche normal pour les déplacements
   latéraux pendant la collecte (l'éclat porté n'est simplement pas
   dessiné sur ces frames-là). Non bloquant, juste moins joli.

   `gavroche-ko.png` : demandé à Julie, en cours de création (le
   sprite `frolo-ko.png` utilisé temporairement a été remplacé).

   ⚠️ Nom de fichier sans accent utilisé pour le décor restauré
   (voir BG_RESTORED ci-dessous) — le fichier doit être uploadé sous
   ce nom exact (sans accent) dans le dépôt, pour éviter le même 404
   que Frolo_colère.png plus tôt dans le projet.

   Enregistré sous la même notion/variante qu'avant
   ("coherence_paragraphe" / "vitraux_hugo") pour remplacer
   entièrement l'ancienne version — jamais les deux à la fois.
   ============================================================ */

(function registerCoherenceParagrapheHugoV2() {

  const CANVAS_W = 1024;
  const CANVAS_H = 576;

  const BG_BROKEN = "/assets/backgrounds/decors_minijeu_cathedrale.png";
  // Sans accent volontairement — voir avertissement en en-tête.
  const BG_RESTORED = "/assets/backgrounds/decors_minijeu_cathedrale_restauree.png";

  const GRAVITY_ICON_COLOR = "#e8c468";

  /**
   * Zones des 3 vitraux (en fraction du canevas), mesurées sur le
   * décor fourni par Julie. xCenter = centre horizontal de la
   * colonne d'emplacements ; yTop/yBottom = étendue verticale de la
   * zone de vitrail où empiler les emplacements ; standY = position
   * au sol du personnage devant son échelle.
   */
  const WINDOWS = [
    {
      id: "esmeralda",
      name: "Esméralda",
      pieceCount: 3,
      xCenter: 0.245,
      yTop: 0.44,
      yBottom: 0.62,
      standY: 0.84,
      sentences: [
        "Esméralda tourna sur elle-même, ses foulards colorés virevoltant dans la lumière du parvis.",
        "Les passants s'arrêtaient un instant, oubliant leurs soucis pour la regarder danser.",
        "Elle salua la foule d'une révérence, un sourire malicieux aux lèvres."
      ],
      sprites: {
        dos: ["esmeralda-dos1.png", "esmeralda-dos2.png", "esmeralda-dos3.png"],
        dosPorte: ["esmeralda-dos-porte1.png", "esmeralda-dos-porte2.png", "esmeralda-dos-porte3.png"],
        face: ["esmeralda-face1.png", "esmeralda-face2.png", "esmeralda-face3.png"],
        marchePorte: ["esmeralda-marche-porte1.png", "esmeralda-marche-porte2.png", "esmeralda-marche-porte3.png"],
        ko: "esmeralda-ko.png"
      }
    },
    {
      id: "casimodo",
      name: "Casimodo",
      pieceCount: 5,
      xCenter: 0.5,
      yTop: 0.30,
      yBottom: 0.62,
      standY: 0.84,
      sentences: [
        "Casimodo grimpa lentement l'escalier de pierre qui menait au sommet du beffroi.",
        "Ses mains calleuses se posèrent sur la plus grande des cloches, encore tiède du soleil couchant.",
        "Il sentit sous ses doigts les fêlures laissées par le passage du Mal-Dit.",
        "Avec précaution, il fit sonner la cloche une première fois, pour vérifier qu'elle tenait encore debout.",
        "Le son grave résonna dans toute la cathédrale, chassant un peu de l'obscurité qui rongeait les murs."
      ],
      sprites: {
        dos: ["casimodo-dos1.png", "casimodo-dos2.png", "casimodo-dos3.png"],
        dosPorte: ["casimodo-dos-porte1.png", "casimodo-dos-porte2.png", "casimodo-dos-porte3.png"],
        face: ["casimodo-face1.png", "casimodo-face2.png", "casimodo-face3.png"],
        marchePorte: ["casimodo-marche-porte1.png", "casimodo-marche-porte2.png", "casimodo-marche-porte3.png"],
        ko: "casimodo-ko.png"
      }
    },
    {
      id: "gavroche",
      name: "Gavroche",
      pieceCount: 3,
      xCenter: 0.755,
      yTop: 0.44,
      yBottom: 0.62,
      standY: 0.84,
      sentences: [
        "Gavroche se hissa sur la corniche, agrippant la pierre du bout des doigts.",
        "De là, il apercevait tout Paris qui s'étendait, gris et endormi, sous un ciel bas.",
        "Il redescendit d'un bond, fier d'avoir trouvé le meilleur poste de guet de la ville."
      ],
      sprites: {
        // Sprites "dos"/"face" non-porte déjà existants depuis Le Pont
        // de Gavroche (nommage avec tiret avant le chiffre, différent
        // des nouveaux sprites "porte" — attention à la distinction).
        dos: ["gavroche-dos-1.png", "gavroche-dos-2.png", "gavroche-dos-3.png"],
        dosPorte: ["gavroche-dos-porte1.png", "gavroche-dos-porte2.png", "gavroche-dos-porte3.png"],
        face: ["gavroche-face-1.png", "gavroche-face-2.png", "gavroche-face-3.png"],
        marchePorte: ["gavroche-marche-porte1.png", "gavroche-marche-porte2.png", "gavroche-marche-porte3.png"],
        ko: "gavroche-ko.png"
      }
    }
  ];

  const TOTAL_PIECES = WINDOWS.reduce((s, w) => s + w.pieceCount, 0); // 11

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function loadImg(src) {
    const img = new Image();
    img.src = "/assets/sprites/characters/" + src;
    return img;
  }
  function loadImgs(list) { return list.map(loadImg); }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Les Vitraux Retrouvés",
      objective: "Déplace l'Esprit avec les flèches (ou les boutons tactiles) pour ramasser les 11 éclats de vitrail dispersés au sol. Une fois tous ramassés, fais glisser chaque éclat vers l'emplacement numéroté du bon vitrail, dans l'ordre qui te semble logique — tu peux les replacer autant de fois que tu veux. Clique sur « Valider » quand tu penses avoir fini : chaque vitrail est vérifié séparément. S'il est juste, Esméralda, Casimodo ou Gavroche grimpe l'installer. S'il est faux, le personnage tombe et les éclats de ce vitrail-là repartent dans la réserve — mais les vitraux déjà réussis restent acquis."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      const bgBrokenImg = new Image(); bgBrokenImg.src = BG_BROKEN;
      const bgRestoredImg = new Image(); bgRestoredImg.src = BG_RESTORED;

      // --- Prépare chaque fenêtre : sprites chargés, pièces mélangées,
      //     slots calculés en coordonnées canevas ---
      WINDOWS.forEach(win => {
        win.img = {
          dos: loadImgs(win.sprites.dos),
          dosPorte: loadImgs(win.sprites.dosPorte),
          face: loadImgs(win.sprites.face),
          marchePorte: loadImgs(win.sprites.marchePorte),
          ko: loadImg(win.sprites.ko)
        };
        win.correctOrder = win.sentences.map((_, i) => i);
        win.slots = win.sentences.map((_, i) => {
          const t = win.pieceCount > 1 ? i / (win.pieceCount - 1) : 0.5;
          return {
            x: win.xCenter * CANVAS_W,
            y: (win.yTop + t * (win.yBottom - win.yTop)) * CANVAS_H,
            filled: null,   // index de pièce (globale) posée ici
            lit: false       // définitivement acquis
          };
        });
        win.standX = win.xCenter * CANVAS_W;
        win.standY = win.standY * CANVAS_H;
        win.state = "idle"; // idle | climbing | installing | descending | falling | done
        win.animTimer = 0;
        win.animFrame = 0;
        win.solved = false;
      });

      // --- Construction des 11 pièces globales (fragments au sol) ---
      let pieceId = 0;
      const pieces = [];
      WINDOWS.forEach((win, wIdx) => {
        win.sentences.forEach((text, sIdx) => {
          pieces.push({
            id: pieceId++,
            windowIndex: wIdx,
            sentenceIndex: sIdx,
            text,
            state: "floor", // floor | carried | pool | placed
            x: 0, y: 0,
            floorX: 0, floorY: 0
          });
        });
      });

      // Positions au sol, réparties aléatoirement mais à bonne
      // distance les unes des autres, sur la moitié basse du canevas
      // (loin des vitraux, comme des débris tombés au fil du temps).
      const FLOOR_MIN_Y = 0.68 * CANVAS_H;
      const FLOOR_MAX_Y = 0.92 * CANVAS_H;
      shuffle(pieces).forEach((p, i) => {
        const cols = 4;
        const col = i % cols;
        const row = Math.floor(i / cols);
        p.floorX = 60 + col * ((CANVAS_W - 120) / (cols - 1)) + (Math.random() - 0.5) * 30;
        p.floorY = FLOOR_MIN_Y + row * 46 + (Math.random() - 0.5) * 14;
        p.x = p.floorX;
        p.y = p.floorY;
      });

      // --- Joueur (Esprit) ---
      const espritSide = [0, 1, 2, 3, 4, 5].map(n => loadImg(`esprit-marche-${n}.png`));
      const espritFace = [1, 2, 3].map(n => loadImg(`esprit-face-${n}.png`));
      const espritDos = [1, 2, 3].map(n => loadImg(`esprit-dos-${n}.png`));
      const espritFacePorte = [loadImg("esprit-face-porte1.png")];
      const espritDosPorte = [1, 2, 3].map(n => loadImg(`esprit-dos-porte${n}.png`));

      const player = { x: CANVAS_W / 2, y: FLOOR_MIN_Y - 40, w: 36, h: 48, facing: "down", speed: 3.2 };
      let carrying = null; // pièce actuellement transportée (une à la fois)
      let animFrame = 0, animTimer = 0, moving = false;

      let phase = "collect"; // collect | place
      let resultGiven = false;

      // --- Réserve du bas (phase de placement) : pièces ramassées pas
      //     encore posées dans un vitrail ---
      function poolPieces() {
        return pieces.filter(p => p.state === "pool");
      }

      uiContainer.innerHTML = `
        <div class="hud-item" id="mg-phase-label">${isRemediation ? "Entraînement" : "Évaluation"} — Ramasse les éclats (<span id="mg-collected">0</span>/${TOTAL_PIECES})</div>
        <div class="hud-item"><button id="mg-validate" class="touch-btn" style="width:auto;height:auto;border-radius:8px;padding:8px 16px; display:none;">Valider</button></div>
      `;
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls" style="display:grid; grid-template-columns:repeat(3,44px); grid-template-rows:repeat(2,44px); gap:4px; justify-content:center;">
          <div></div><button class="touch-btn" data-dir="up">▲</button><div></div>
          <button class="touch-btn" data-dir="left">◀</button><div></div><button class="touch-btn" data-dir="right">▶</button>
          <div></div><button class="touch-btn" data-dir="down">▼</button><div></div>
        </div>
      `);
      const collectedEl = document.getElementById("mg-collected");
      const phaseLabelEl = document.getElementById("mg-phase-label");
      const validateBtn = document.getElementById("mg-validate");

      function updateCollectedHud() {
        const n = pieces.filter(p => p.state !== "floor").length;
        collectedEl.textContent = n;
        if (n >= TOTAL_PIECES && phase === "collect") {
          startPlacementPhase();
        }
      }

      function startPlacementPhase() {
        phase = "place";
        phaseLabelEl.textContent = `${isRemediation ? "Entraînement" : "Évaluation"} — Place les éclats dans les vitraux`;
        validateBtn.style.display = "inline-block";
        pieces.forEach(p => { if (p.state === "carried" || p.state === "floor") p.state = "pool"; });
        layoutPool();
      }

      function layoutPool() {
        const pool = poolPieces();
        const cols = 6;
        pool.forEach((p, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          p.x = 90 + col * 150;
          p.y = CANVAS_H - 40 - row * 34;
        });
      }

      // --- Déplacement du joueur (phase de collecte uniquement) ---
      const keys = {};
      function onKeyDown(e) {
        const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
          w: "up", s: "down", a: "left", d: "right", z: "up", q: "left" };
        if (map[e.key]) { keys[map[e.key]] = true; e.preventDefault(); }
      }
      function onKeyUp(e) {
        const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
          w: "up", s: "down", a: "left", d: "right", z: "up", q: "left" };
        if (map[e.key]) keys[map[e.key]] = false;
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

      // --- Glisser-déposer (phase de placement uniquement) ---
      let dragPiece = null, dragOffX = 0, dragOffY = 0;

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      const PIECE_W = 130, PIECE_H = 30;
      const SLOT_W = 130, SLOT_H = 30;

      function pieceAt(x, y) {
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i];
          if (p.state !== "pool") continue;
          if (x >= p.x - PIECE_W / 2 && x <= p.x + PIECE_W / 2 && y >= p.y - PIECE_H / 2 && y <= p.y + PIECE_H / 2) return p;
        }
        return null;
      }

      function slotAt(x, y) {
        for (const win of WINDOWS) {
          for (const slot of win.slots) {
            if (slot.lit) continue;
            if (x >= slot.x - SLOT_W / 2 && x <= slot.x + SLOT_W / 2 && y >= slot.y - SLOT_H / 2 && y <= slot.y + SLOT_H / 2) {
              return { win, slot };
            }
          }
        }
        return null;
      }

      function onPointerDown(e) {
        if (phase !== "place") return;
        const { x, y } = getCanvasCoords(e.clientX ?? e.touches[0].clientX, e.clientY ?? e.touches[0].clientY);
        const p = pieceAt(x, y);
        if (p) { dragPiece = p; dragOffX = x - p.x; dragOffY = y - p.y; }
      }
      function onPointerMove(e) {
        if (!dragPiece) return;
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;
        const { x, y } = getCanvasCoords(clientX, clientY);
        dragPiece.x = x - dragOffX;
        dragPiece.y = y - dragOffY;
      }
      function onPointerUp(e) {
        if (!dragPiece) return;
        const target = slotAt(dragPiece.x, dragPiece.y);
        // Libère la case qu'elle occupait déjà, le cas échéant
        WINDOWS.forEach(w => w.slots.forEach(s => { if (s.filled === dragPiece.id) s.filled = null; }));

        if (target) {
          if (target.slot.filled !== null) {
            // Une autre pièce était là : elle retourne en réserve
            const occupant = pieces.find(p => p.id === target.slot.filled);
            if (occupant) occupant.state = "pool";
          }
          target.slot.filled = dragPiece.id;
          dragPiece.state = "placed";
          dragPiece.x = target.slot.x;
          dragPiece.y = target.slot.y;
        } else {
          dragPiece.state = "pool";
        }
        dragPiece = null;
        layoutPool();
      }

      canvas.addEventListener("mousedown", onPointerDown);
      canvas.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);
      canvas.addEventListener("touchstart", onPointerDown, { passive: true });
      canvas.addEventListener("touchmove", onPointerMove, { passive: true });
      canvas.addEventListener("touchend", onPointerUp);

      // --- Validation ---
      validateBtn.addEventListener("click", () => {
        WINDOWS.forEach(win => {
          if (win.solved) return;
          const filledSlots = win.slots.filter(s => s.filled !== null);
          if (filledSlots.length < win.pieceCount) return; // incomplet : ignoré, pas de pénalité

          const placedOrder = win.slots.map(s => {
            const p = pieces.find(pp => pp.id === s.filled);
            return p ? p.sentenceIndex : -1;
          });
          const correct = placedOrder.join(",") === win.correctOrder.join(",");

          if (correct) {
            win.state = "climbing";
            win.animTimer = 0;
          } else {
            win.state = "falling";
            win.animTimer = 0;
          }
        });
      });

      function finalizeWindowSuccess(win) {
        win.solved = true;
        win.slots.forEach(s => { s.lit = true; });
        win.state = "done";
      }

      function finalizeWindowFailure(win) {
        win.slots.forEach(s => {
          if (!s.lit) {
            const p = pieces.find(pp => pp.id === s.filled);
            if (p) p.state = "pool";
            s.filled = null;
          }
        });
        win.state = "idle";
        layoutPool();
      }

      async function checkVictory() {
        if (WINDOWS.every(w => w.solved) && !resultGiven) {
          resultGiven = true;
          cleanup();
          await MinigameUI.showResult({
            passed: true,
            message: "Les trois vitraux retrouvent enfin leurs couleurs. Esméralda, Casimodo et Gavroche contemplent, côte à côte, la lumière revenue dans la cathédrale."
          });
          resolve({ passed: true, score: 1, total: 1 });
        }
      }

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("mouseup", onPointerUp);
        cancelAnimationFrame(rafId);
      }

      let rafId;
      function loop() {
        // --- Déplacement du joueur (collecte uniquement) ---
        if (phase === "collect") {
          moving = false;
          if (keys.left) { player.x -= player.speed; player.facing = "left"; moving = true; }
          if (keys.right) { player.x += player.speed; player.facing = "right"; moving = true; }
          if (keys.up) { player.y -= player.speed; player.facing = "up"; moving = true; }
          if (keys.down) { player.y += player.speed; player.facing = "down"; moving = true; }
          player.x = Math.max(20, Math.min(CANVAS_W - 20, player.x));
          player.y = Math.max(FLOOR_MIN_Y - 60, Math.min(CANVAS_H - 20, player.y));

          if (moving) {
            animTimer++;
            if (animTimer >= 9) { animTimer = 0; animFrame = (animFrame + 1) % 3; }
          }

          // Ramassage automatique au contact (une seule pièce à la fois)
          if (!carrying) {
            const near = pieces.find(p => p.state === "floor" &&
              Math.abs(p.floorX - player.x) < 26 && Math.abs(p.floorY - player.y) < 26);
            if (near) {
              near.state = "carried";
              carrying = near;
            }
          } else {
            // Dépose immédiate dès qu'on ramasse la suivante (transport
            // abstrait : la pièce rejoint directement l'inventaire).
            carrying.state = "pool";
            carrying = null;
            updateCollectedHud();
          }
        }

        // --- Animations des vitraux (grimpe / installe / tombe) ---
        WINDOWS.forEach(win => {
          if (win.state === "climbing") {
            win.animTimer++;
            if (win.animTimer >= 12) { win.animTimer = 0; win.animFrame = (win.animFrame + 1) % 3; }
            if (win.animTimer === 0 && win.progress === undefined) win.progress = 0;
            win.progress = (win.progress || 0) + 0.02;
            if (win.progress >= 1) { win.progress = 1; win.state = "installing"; win.installStep = 0; win.animTimer = 0; }
          } else if (win.state === "installing") {
            win.animTimer++;
            if (win.animTimer >= 25) {
              win.animTimer = 0;
              const slot = win.slots[win.installStep];
              if (slot) slot.lit = true;
              win.installStep++;
              if (win.installStep >= win.slots.length) {
                win.state = "descending";
                win.progress = 1;
              }
            }
          } else if (win.state === "descending") {
            win.progress -= 0.02;
            if (win.progress <= 0) { win.progress = 0; finalizeWindowSuccess(win); checkVictory(); }
          } else if (win.state === "falling") {
            win.animTimer++;
            win.progress = Math.max(0, 1 - win.animTimer / 20);
            if (win.animTimer >= 40) { finalizeWindowFailure(win); }
          }
        });

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

      function drawPiece(p, highlight) {
        ctx.save();
        ctx.fillStyle = highlight ? "#6fcf97" : "#2b2347";
        ctx.strokeStyle = "#9d8cff";
        ctx.lineWidth = 2;
        ctx.fillRect(p.x - PIECE_W / 2, p.y - PIECE_H / 2, PIECE_W, PIECE_H);
        ctx.strokeRect(p.x - PIECE_W / 2, p.y - PIECE_H / 2, PIECE_W, PIECE_H);
        ctx.fillStyle = "#f4f1ea";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const short = p.text.length > 46 ? p.text.slice(0, 44) + "…" : p.text;
        ctx.fillText(short, p.x, p.y);
        ctx.restore();
      }

      function render() {
        const bg = WINDOWS.every(w => w.solved) ? bgRestoredImg : bgBrokenImg;
        if (bg.complete && bg.naturalWidth > 0) {
          ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // --- Échelles (dessinées, pas d'image nécessaire) ---
        WINDOWS.forEach(win => {
          const ladderTop = win.yTop * CANVAS_H + 10;
          const ladderBottom = win.standY;
          ctx.strokeStyle = "rgba(200,180,140,0.7)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(win.xCenter * CANVAS_W - 14, ladderTop);
          ctx.lineTo(win.xCenter * CANVAS_W - 14, ladderBottom);
          ctx.moveTo(win.xCenter * CANVAS_W + 14, ladderTop);
          ctx.lineTo(win.xCenter * CANVAS_W + 14, ladderBottom);
          ctx.stroke();
          ctx.lineWidth = 2;
          for (let y = ladderTop; y < ladderBottom; y += 16) {
            ctx.beginPath();
            ctx.moveTo(win.xCenter * CANVAS_W - 14, y);
            ctx.lineTo(win.xCenter * CANVAS_W + 14, y);
            ctx.stroke();
          }
        });

        // --- Emplacements sous chaque vitrail ---
        WINDOWS.forEach(win => {
          win.slots.forEach(slot => {
            ctx.fillStyle = slot.lit ? "rgba(232,196,104,0.35)" : "rgba(157,140,255,0.08)";
            ctx.fillRect(slot.x - SLOT_W / 2, slot.y - SLOT_H / 2, SLOT_W, SLOT_H);
            ctx.strokeStyle = slot.lit ? "#e8c468" : "#9d8cff";
            ctx.setLineDash(slot.lit ? [] : [5, 5]);
            ctx.lineWidth = 2;
            ctx.strokeRect(slot.x - SLOT_W / 2, slot.y - SLOT_H / 2, SLOT_W, SLOT_H);
            ctx.setLineDash([]);
            if (slot.filled !== null && !slot.lit) {
              const p = pieces.find(pp => pp.id === slot.filled);
              if (p) drawPiece(p, false);
            }
          });
        });

        // --- Personnages compagnons (échelle / installation / chute) ---
        WINDOWS.forEach(win => {
          const cw = 44, ch = 60;
          const x = win.standX - cw / 2;
          if (win.state === "idle" || win.state === "done") {
            const img = win.img.face[0];
            drawSprite(img, x, win.standY - ch, cw, ch, false);
          } else if (win.state === "climbing" || win.state === "descending") {
            const y = win.standY - ch - (win.progress || 0) * (win.standY - win.yTop * CANVAS_H - ch);
            const img = win.img.dosPorte[win.animFrame % win.img.dosPorte.length];
            drawSprite(img, x, y, cw, ch, false);
          } else if (win.state === "installing") {
            const y = win.yTop * CANVAS_H;
            const img = win.img.marchePorte[win.installStep % win.img.marchePorte.length];
            drawSprite(img, x, y, cw, ch, false);
          } else if (win.state === "falling") {
            const fallY = win.standY - ch + (1 - (win.progress || 0)) * 40;
            ctx.save();
            ctx.globalAlpha = win.progress || 0;
            drawSprite(win.img.ko, x, fallY, cw, ch, false);
            ctx.restore();
          }
        });

        // --- Pièces au sol (phase de collecte) ---
        if (phase === "collect") {
          pieces.forEach(p => {
            if (p.state !== "floor") return;
            ctx.save();
            ctx.fillStyle = "#9d8cff";
            ctx.globalAlpha = 0.85;
            ctx.fillRect(p.floorX - 10, p.floorY - 7, 20, 14);
            ctx.strokeStyle = "#e8c468";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(p.floorX - 10, p.floorY - 7, 20, 14);
            ctx.restore();
          });
        }

        // --- Réserve du bas (phase de placement) ---
        if (phase === "place") {
          ctx.save();
          ctx.fillStyle = "rgba(26,21,48,0.55)";
          ctx.fillRect(0, CANVAS_H - 80, CANVAS_W, 80);
          ctx.restore();
          poolPieces().forEach(p => { if (p !== dragPiece) drawPiece(p, false); });
          if (dragPiece) drawPiece(dragPiece, true);
        }

        // --- Joueur (Esprit), uniquement en phase de collecte ---
        if (phase === "collect") {
          const PW = 34, PH = 46;
          const px = player.x - PW / 2, py = player.y - PH;
          const frameSet = carrying
            ? (player.facing === "down" ? espritFacePorte : player.facing === "up" ? espritDosPorte : espritSide)
            : (player.facing === "down" ? espritFace : player.facing === "up" ? espritDos : espritSide);
          const idx = carrying
            ? (player.facing === "up" ? animFrame % espritDosPorte.length : 0)
            : (player.facing === "left" || player.facing === "right" ? (moving ? animFrame + 1 : 1) : animFrame % 3);
          const img = frameSet[Math.min(idx, frameSet.length - 1)];
          drawSprite(img, px, py, PW, PH, player.facing === "left");
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
