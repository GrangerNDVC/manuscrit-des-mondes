/* ============================================================
   LE MANUSCRIT DES MONDES — vnEngine.js
   ============================================================
   Moteur d'affichage du Visual Novel.
   Toutes les fonctions retournent des Promises pour permettre
   à sceneManager.js d'enchaîner les séquences avec await.

   FORMAT D'UNE SCÈNE (objet JS, généralement issu d'un JSON
   chargé par vnParser.js) :
   {
     background: "assets/backgrounds/m1-paris-nocturne.png",
     speakerName: "Gavroche",
     speakerSide: "left" | "right",       // portrait actif
     portraitLeft:  "assets/portraits/gavroche-content.png" | null,
     portraitRight: "assets/portraits/esprit-neutre.png" | null,
     text: "Texte affiché, en passé simple/imparfait selon le récit.",
     // Optionnel : avance automatiquement après X ms (pour les
     // scènes de cinématique sans interaction)
     autoAdvanceMs: null
   }

   FORMAT D'UN QCM :
   {
     speakerName: "Thénardier",
     portraitLeft: "assets/portraits/Thenardier_neutre.png",
     background: "...",
     question: "Quel signe faut-il placer ici : « Attention ___ »",
     options: [
       { text: "un point", correct: false },
       { text: "un point d'exclamation", correct: true },
       { text: "une virgule", correct: false }
     ],
     feedbackCorrect: "...",
     feedbackIncorrect: "..."
   }

   FORMAT D'UN EXERCICE "TEXTE À TROUS" :
   {
     background: "...",
     speakerName: "...",
     portraitLeft / portraitRight: "...",
     // segments alternant texte fixe (string) et trous (objet)
     segments: [
       "Gavroche courut",
       { type: "blank", options: [",", ".", "!"], correct: "," },
       " puis il s'arrêta",
       { type: "blank", options: [".", "?", "!"], correct: "." }
     ],
     successThreshold: 1.0  // proportion de trous corrects requise (1.0 = tout juste)
   }
   ============================================================ */

const VNEngine = (() => {

  const els = {
    bg: document.getElementById("vn-bg-image"),
    portraitLeft: document.getElementById("vn-portrait-left"),
    portraitRight: document.getElementById("vn-portrait-right"),
    speakerName: document.getElementById("vn-speaker-name"),
    text: document.getElementById("vn-text"),
    dialogueBox: document.getElementById("vn-dialogue-box"),
    nextBtn: document.getElementById("vn-next-btn"),
    choices: document.getElementById("vn-choices"),
    fillBlank: document.getElementById("vn-fill-blank"),
    fillText: document.getElementById("vn-fill-text"),
    fillValidate: document.getElementById("vn-fill-validate")
  };

  /**
   * Affiche une scène statique (sans attendre d'interaction).
   * Utilisé en interne par playScene/playScenes.
   */
  function renderScene(scene) {
    if (scene.background) {
      els.bg.src = scene.background;
    }

    updatePortrait(els.portraitLeft, scene.portraitLeft, scene.speakerSide === "left");
    updatePortrait(els.portraitRight, scene.portraitRight, scene.speakerSide === "right");

    els.speakerName.textContent = scene.speakerName || "";
    els.speakerName.style.display = scene.speakerName ? "inline-block" : "none";

    els.text.textContent = scene.text || "";
  }

  function updatePortrait(imgEl, src, isSpeaking) {
    if (!src) {
      imgEl.classList.remove("visible", "speaking");
      return;
    }
    imgEl.src = src;
    imgEl.classList.add("visible");
    imgEl.classList.toggle("speaking", !!isSpeaking);
    imgEl.classList.toggle("dimmed", !isSpeaking);
  }

  /**
   * Joue une scène et attend un clic (ou l'auto-avance) avant de résoudre.
   */
  function playScene(scene) {
    return new Promise(resolve => {
      renderScene(scene);
      els.choices.classList.add("hidden");
      els.fillBlank.classList.add("hidden");

      if (scene.autoAdvanceMs) {
        setTimeout(resolve, scene.autoAdvanceMs);
        return;
      }

      const onAdvance = () => {
        els.dialogueBox.removeEventListener("click", onAdvance);
        els.nextBtn.removeEventListener("click", onAdvance);
        resolve();
      };
      els.dialogueBox.addEventListener("click", onAdvance);
      els.nextBtn.addEventListener("click", onAdvance);
    });
  }

  /**
   * Joue une liste de scènes séquentiellement.
   */
  async function playScenes(scenes) {
    for (const scene of scenes) {
      await playScene(scene);
    }
  }

  /**
   * Joue un QCM (typiquement posé par un antagoniste).
   * Retourne { passed: boolean, selectedIndex: number }.
   */
  function playQCM(qcmData) {
    return new Promise(resolve => {
      renderScene({
        background: qcmData.background,
        speakerName: qcmData.speakerName,
        speakerSide: "left",
        portraitLeft: qcmData.portraitLeft,
        portraitRight: qcmData.portraitRight,
        text: qcmData.question
      });

      els.fillBlank.classList.add("hidden");
      els.choices.classList.remove("hidden");
      els.choices.innerHTML = "";

      qcmData.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "vn-choice-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", () => {
          // Désactive tous les boutons et affiche le retour visuel
          const buttons = els.choices.querySelectorAll(".vn-choice-btn");
          buttons.forEach(b => b.disabled = true);
          btn.classList.add(opt.correct ? "correct" : "incorrect");

          els.text.textContent = opt.correct
            ? (qcmData.feedbackCorrect || "Correct !")
            : (qcmData.feedbackIncorrect || "Pas tout à fait...");

          setTimeout(() => {
            els.choices.classList.add("hidden");
            resolve({ passed: opt.correct, selectedIndex: i });
          }, 1400);
        });
        els.choices.appendChild(btn);
      });
    });
  }

  /**
   * Joue une scène d'exercice ("évaluation" formative ou de transfert).
   * Détecte le type du premier segment et délègue au renderer adapté.
   * Tous les renderers partagent la même signature :
   *   renderer(exerciseData) -> Promise<{ passed, score, total }>
   *
   * Options :
   *  - fixedText: true => (transfert différé) le contenu narratif
   *    reste identique entre tentatives ; n'affecte pas le rendu
   *    lui-même, sert de marqueur sémantique pour sceneManager.
   */
  function playFillBlank(exerciseData, options = {}) {
    const seg0 = exerciseData.segments[0];
    const type = (typeof seg0 === "object" && seg0.type) ? seg0.type : "blank";

    switch (type) {
      case "blank":          return renderBlankExercise(exerciseData);
      case "reorder":         return renderReorderExercise(exerciseData);
      case "match":            return renderMatchExercise(exerciseData);
      case "reorder_blocks":  return renderReorderBlocksExercise(exerciseData);
      case "select_relevant": return renderSelectRelevantExercise(exerciseData);
      case "narrative_order": return renderNarrativeOrderExercise(exerciseData);
      default:
        console.error(`Type d'exercice inconnu : "${type}".`);
        return Promise.resolve({ passed: true, score: 1, total: 1 });
    }
  }

  /**
   * Prépare l'écran commun à tous les exercices : fond, portraits,
   * affiche la zone fillBlank (vidée), masque les choix QCM.
   * Retourne le conteneur dans lequel injecter le contenu spécifique.
   */
  function setupExerciseScreen(exerciseData) {
    renderScene({
      background: exerciseData.background,
      speakerName: exerciseData.speakerName,
      speakerSide: exerciseData.speakerSide,
      portraitLeft: exerciseData.portraitLeft,
      portraitRight: exerciseData.portraitRight,
      text: ""
    });

    els.choices.classList.add("hidden");
    els.fillBlank.classList.remove("hidden");
    els.fillText.innerHTML = "";

    if (exerciseData.instructions) {
      const instr = document.createElement("p");
      instr.className = "exercise-instructions";
      instr.textContent = exerciseData.instructions;
      els.fillText.appendChild(instr);
    }

    return els.fillText;
  }

  /**
   * Résout l'exercice après un court délai de feedback visuel.
   */
  function resolveAfterFeedback(resolve, result) {
    setTimeout(() => {
      els.fillBlank.classList.add("hidden");
      resolve(result);
    }, 1200);
  }

  /* ------------------------------------------------------------
     TYPE "blank" — texte à trous classique (ponctuation, etc.)
     segments: alternance de string et { type:"blank", options, correct }
     ------------------------------------------------------------ */
  function renderBlankExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);

      const blanks = []; // { el, options, correct }

      exerciseData.segments.forEach(seg => {
        if (typeof seg === "string") {
          container.appendChild(document.createTextNode(seg));
        } else if (seg.type === "blank") {
          const span = document.createElement("span");
          span.className = "fill-slot";
          span.textContent = "?";
          span.dataset.correct = seg.correct;
          span.dataset.selectedIndex = "-1";

          const opts = seg.options;
          span.addEventListener("click", () => {
            let idx = parseInt(span.dataset.selectedIndex, 10);
            idx = (idx + 1) % opts.length;
            span.dataset.selectedIndex = idx;
            span.textContent = opts[idx];
            span.classList.add("filled");
            span.classList.remove("correct", "incorrect");
          });

          blanks.push({ el: span, options: opts, correct: seg.correct });
          container.appendChild(span);
        }
      });

      els.fillValidate.onclick = () => {
        let correctCount = 0;
        blanks.forEach(b => {
          const idx = parseInt(b.el.dataset.selectedIndex, 10);
          const selected = idx >= 0 ? b.options[idx] : null;
          const isCorrect = selected === b.correct;
          b.el.classList.toggle("correct", isCorrect);
          b.el.classList.toggle("incorrect", !isCorrect);
          if (isCorrect) correctCount++;
        });

        const total = blanks.length;
        const threshold = exerciseData.successThreshold ?? 1.0;
        const passed = (correctCount / total) >= threshold;
        resolveAfterFeedback(resolve, { passed, score: correctCount, total });
      };
    });
  }

  /* ------------------------------------------------------------
     TYPE "reorder" — remettre des groupes de mots dans l'ordre
     segments: [{ type:"reorder", chunks: [...], correctOrder: [...] }]
     Affiche les chunks dans un ordre mélangé ; le joueur clique
     pour les sélectionner dans l'ordre voulu (1, 2, 3...).
     ------------------------------------------------------------ */
  function renderReorderExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);
      const seg = exerciseData.segments[0];
      const chunks = seg.chunks;
      const correctOrder = seg.correctOrder;

      // Mélange l'ordre d'affichage (en évitant de retomber sur l'ordre correct)
      let displayIndices = chunks.map((_, i) => i);
      do {
        displayIndices = shuffle(displayIndices.slice());
      } while (displayIndices.join() === correctOrder.join() && chunks.length > 1);

      const sequenceArea = document.createElement("div");
      sequenceArea.className = "reorder-sequence";

      const poolArea = document.createElement("div");
      poolArea.className = "reorder-pool";

      const selection = []; // indices originaux choisis, dans l'ordre du clic

      function refreshSequence() {
        sequenceArea.innerHTML = "";
        for (let i = 0; i < chunks.length; i++) {
          const slot = document.createElement("span");
          slot.className = "reorder-slot";
          if (selection[i] !== undefined) {
            slot.textContent = chunks[selection[i]];
            slot.classList.add("filled");
          } else {
            slot.textContent = (i + 1) + ".";
          }
          sequenceArea.appendChild(slot);
        }
      }

      function refreshPool() {
        poolArea.innerHTML = "";
        displayIndices.forEach(origIdx => {
          if (selection.includes(origIdx)) return;
          const chip = document.createElement("button");
          chip.className = "reorder-chip";
          chip.textContent = chunks[origIdx];
          chip.addEventListener("click", () => {
            if (selection.length < chunks.length) {
              selection.push(origIdx);
              refreshSequence();
              refreshPool();
            }
          });
          poolArea.appendChild(chip);
        });
      }

      refreshSequence();
      refreshPool();

      container.appendChild(sequenceArea);
      container.appendChild(poolArea);

      els.fillValidate.onclick = () => {
        if (selection.length < chunks.length) return; // pas encore complet
        const passed = selection.join() === correctOrder.join();

        sequenceArea.querySelectorAll(".reorder-slot").forEach((slot, i) => {
          slot.classList.toggle("correct", selection[i] === correctOrder[i]);
          slot.classList.toggle("incorrect", selection[i] !== correctOrder[i]);
        });

        resolveAfterFeedback(resolve, { passed, score: passed ? 1 : 0, total: 1 });
      };
    });
  }

  /* ------------------------------------------------------------
     TYPE "match" — associer principale <-> subordonnée
     segments: [{ type:"match", pairs: [{left, right}, ...] }]
     Le joueur clique un élément de gauche puis un de droite ;
     une paire se forme et se colore selon sa validité.
     ------------------------------------------------------------ */
  function renderMatchExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);
      const seg = exerciseData.segments[0];
      const pairs = seg.pairs;

      const leftItems = pairs.map((p, i) => ({ text: p.left, pairIndex: i }));
      const rightItems = shuffle(pairs.map((p, i) => ({ text: p.right, pairIndex: i })));

      const matchArea = document.createElement("div");
      matchArea.className = "match-area";

      const leftCol = document.createElement("div");
      leftCol.className = "match-column";
      const rightCol = document.createElement("div");
      rightCol.className = "match-column";

      let selectedLeft = null;
      const userMatches = {}; // leftPairIndex -> rightPairIndex chosen
      const leftButtons = [];
      const rightButtons = [];

      leftItems.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "match-item match-left";
        btn.textContent = item.text;
        btn.dataset.pairIndex = item.pairIndex;
        btn.addEventListener("click", () => {
          if (userMatches[item.pairIndex] !== undefined) return; // déjà associé
          leftButtons.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          selectedLeft = item.pairIndex;
        });
        leftButtons.push(btn);
        leftCol.appendChild(btn);
      });

      rightItems.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "match-item match-right";
        btn.textContent = item.text;
        btn.dataset.pairIndex = item.pairIndex;
        btn.addEventListener("click", () => {
          if (selectedLeft === null) return;
          if (Object.values(userMatches).includes(item.pairIndex)) return; // déjà utilisé
          userMatches[selectedLeft] = item.pairIndex;

          const leftBtn = leftButtons.find(b => parseInt(b.dataset.pairIndex, 10) === selectedLeft);
          leftBtn.classList.remove("selected");
          leftBtn.classList.add("matched");
          btn.classList.add("matched");

          selectedLeft = null;
        });
        rightButtons.push(btn);
        rightCol.appendChild(btn);
      });

      matchArea.appendChild(leftCol);
      matchArea.appendChild(rightCol);
      container.appendChild(matchArea);

      els.fillValidate.onclick = () => {
        const total = pairs.length;
        if (Object.keys(userMatches).length < total) return; // incomplet

        let correctCount = 0;
        leftButtons.forEach(leftBtn => {
          const li = parseInt(leftBtn.dataset.pairIndex, 10);
          const chosenRi = userMatches[li];
          const isCorrect = chosenRi === li; // pairIndex identique = bonne association
          leftBtn.classList.toggle("correct", isCorrect);
          leftBtn.classList.toggle("incorrect", !isCorrect);
          const rightBtn = rightButtons.find(b => parseInt(b.dataset.pairIndex, 10) === chosenRi);
          rightBtn.classList.toggle("correct", isCorrect);
          rightBtn.classList.toggle("incorrect", !isCorrect);
          if (isCorrect) correctCount++;
        });

        const threshold = exerciseData.successThreshold ?? 1.0;
        const passed = (correctCount / total) >= threshold;
        resolveAfterFeedback(resolve, { passed, score: correctCount, total });
      };
    });
  }

  /* ------------------------------------------------------------
     TYPE "reorder_blocks" — remettre des phrases/blocs dans l'ordre
     segments: [{ type:"reorder_blocks", blocks: [...], correctOrder: [...] }]
     Même interaction que "reorder" mais avec des blocs de texte
     plus longs, affichés en colonne (paragraphe).
     ------------------------------------------------------------ */
  function renderReorderBlocksExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);
      const seg = exerciseData.segments[0];
      const blocks = seg.blocks;
      const correctOrder = seg.correctOrder;

      let displayIndices = blocks.map((_, i) => i);
      do {
        displayIndices = shuffle(displayIndices.slice());
      } while (displayIndices.join() === correctOrder.join() && blocks.length > 1);

      const sequenceArea = document.createElement("div");
      sequenceArea.className = "reorder-blocks-sequence";
      const poolArea = document.createElement("div");
      poolArea.className = "reorder-blocks-pool";

      const selection = [];

      function refreshSequence() {
        sequenceArea.innerHTML = "";
        for (let i = 0; i < blocks.length; i++) {
          const slot = document.createElement("div");
          slot.className = "reorder-block-slot";
          if (selection[i] !== undefined) {
            slot.textContent = blocks[selection[i]];
            slot.classList.add("filled");
          } else {
            slot.textContent = `Paragraphe ${i + 1}`;
            slot.classList.add("empty");
          }
          sequenceArea.appendChild(slot);
        }
      }

      function refreshPool() {
        poolArea.innerHTML = "";
        displayIndices.forEach(origIdx => {
          if (selection.includes(origIdx)) return;
          const chip = document.createElement("button");
          chip.className = "reorder-block-chip";
          chip.textContent = blocks[origIdx];
          chip.addEventListener("click", () => {
            if (selection.length < blocks.length) {
              selection.push(origIdx);
              refreshSequence();
              refreshPool();
            }
          });
          poolArea.appendChild(chip);
        });
      }

      refreshSequence();
      refreshPool();
      container.appendChild(sequenceArea);
      container.appendChild(poolArea);

      els.fillValidate.onclick = () => {
        if (selection.length < blocks.length) return;
        const passed = selection.join() === correctOrder.join();

        sequenceArea.querySelectorAll(".reorder-block-slot").forEach((slot, i) => {
          slot.classList.toggle("correct", selection[i] === correctOrder[i]);
          slot.classList.toggle("incorrect", selection[i] !== correctOrder[i]);
        });

        resolveAfterFeedback(resolve, { passed, score: passed ? 1 : 0, total: 1 });
      };
    });
  }

  /* ------------------------------------------------------------
     TYPE "select_relevant" — choisir l'information pertinente
     segments: [{ type:"select_relevant", context, options:[{text, relevant}] }]
     ------------------------------------------------------------ */
  function renderSelectRelevantExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);
      const seg = exerciseData.segments[0];

      const contextEl = document.createElement("p");
      contextEl.className = "select-relevant-context";
      contextEl.textContent = seg.context;
      container.appendChild(contextEl);

      const optionsArea = document.createElement("div");
      optionsArea.className = "select-relevant-options";

      const options = shuffle(seg.options.map((o, i) => ({ ...o, origIndex: i })));
      let chosen = null;
      const buttons = [];

      options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "vn-choice-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          chosen = opt;
        });
        buttons.push(btn);
        optionsArea.appendChild(btn);
      });

      container.appendChild(optionsArea);

      els.fillValidate.onclick = () => {
        if (!chosen) return;
        const passed = !!chosen.relevant;

        buttons.forEach(b => {
          const opt = options.find(o => o.text === b.textContent);
          if (b.classList.contains("selected")) {
            b.classList.add(passed ? "correct" : "incorrect");
          } else if (opt.relevant) {
            b.classList.add("correct"); // révèle la bonne réponse
          }
          b.disabled = true;
        });

        resolveAfterFeedback(resolve, { passed, score: passed ? 1 : 0, total: 1 });
      };
    });
  }

  /* ------------------------------------------------------------
     TYPE "narrative_order" — schéma narratif (5 étapes)
     segments: [{ type:"narrative_order", cards:[{text, stage}] }]
     Le joueur place les cartes dans l'ordre du schéma narratif :
     situation_initiale, element_declencheur, peripeties,
     resolution, situation_finale.
     ------------------------------------------------------------ */
  function renderNarrativeOrderExercise(exerciseData) {
    return new Promise(resolve => {
      const container = setupExerciseScreen(exerciseData);
      const seg = exerciseData.segments[0];
      const cards = seg.cards;

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
      const correctOrder = cards
        .map((c, i) => i)
        .sort((a, b) => STAGE_ORDER.indexOf(cards[a].stage) - STAGE_ORDER.indexOf(cards[b].stage));

      let displayIndices = cards.map((_, i) => i);
      do {
        displayIndices = shuffle(displayIndices.slice());
      } while (displayIndices.join() === correctOrder.join() && cards.length > 1);

      const sequenceArea = document.createElement("div");
      sequenceArea.className = "narrative-sequence";
      const poolArea = document.createElement("div");
      poolArea.className = "narrative-pool";

      const selection = [];

      function refreshSequence() {
        sequenceArea.innerHTML = "";
        for (let i = 0; i < cards.length; i++) {
          const slot = document.createElement("div");
          slot.className = "narrative-slot";
          const label = document.createElement("div");
          label.className = "narrative-slot-label";
          label.textContent = STAGE_LABELS[STAGE_ORDER[i]];
          slot.appendChild(label);

          const content = document.createElement("div");
          content.className = "narrative-slot-content";
          if (selection[i] !== undefined) {
            content.textContent = cards[selection[i]].text;
            slot.classList.add("filled");
          } else {
            content.textContent = "...";
            slot.classList.add("empty");
          }
          slot.appendChild(content);
          sequenceArea.appendChild(slot);
        }
      }

      function refreshPool() {
        poolArea.innerHTML = "";
        displayIndices.forEach(origIdx => {
          if (selection.includes(origIdx)) return;
          const chip = document.createElement("button");
          chip.className = "narrative-chip";
          chip.textContent = cards[origIdx].text;
          chip.addEventListener("click", () => {
            if (selection.length < cards.length) {
              selection.push(origIdx);
              refreshSequence();
              refreshPool();
            }
          });
          poolArea.appendChild(chip);
        });
      }

      refreshSequence();
      refreshPool();
      container.appendChild(sequenceArea);
      container.appendChild(poolArea);

      els.fillValidate.onclick = () => {
        if (selection.length < cards.length) return;
        const passed = selection.join() === correctOrder.join();

        sequenceArea.querySelectorAll(".narrative-slot").forEach((slot, i) => {
          slot.classList.toggle("correct", selection[i] === correctOrder[i]);
          slot.classList.toggle("incorrect", selection[i] !== correctOrder[i]);
        });

        resolveAfterFeedback(resolve, { passed, score: passed ? 1 : 0, total: 1 });
      };
    });
  }

  /* ------------------------------------------------------------
     Utilitaire : mélange Fisher-Yates
     ------------------------------------------------------------ */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return {
    playScene,
    playScenes,
    playQCM,
    playFillBlank
  };

})();
