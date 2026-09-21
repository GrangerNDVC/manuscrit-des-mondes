/* ============================================================
   LE MANUSCRIT DES MONDES — mg-construction-recit.js (v6)
   ============================================================
   Mini-jeu "Le Sceau du Mal-Dit" (Monde 1 — Hugo, acte 6).

   ---- v6 : retour de test — gabarit, mise en page, contrôles ----
   1. PERSONNAGES BEAUCOUP TROP GRANDS ET TROP HAUTS. Réduits
      drastiquement (l'Esprit ~1cm à l'écran, Frollo exactement le
      double dans les deux dimensions — même rapport largeur/hauteur
      pour les deux) et reposés au sol, en bas du canevas — l'espace
      libéré au-dessus leur est rendu pour l'exercice (questions,
      jauges), qui passe donc du bas vers le haut de l'écran.
   2. TEXTES TROP GROS/PIXELISÉS. Toutes les tailles de police et
      les boutons ont été réduits en conséquence, pour se rapprocher
      de la sobriété des autres mini-jeux du jeu.
   3. CONTRÔLES CLAVIER EN TEMPS RÉEL (remplace les boutons cliqués
      pour les actions de combat — les boutons tactiles restent
      disponibles en parallèle pour le tactile, même esprit que Le
      Pont de Gavroche) :
        - Flèches gauche/droite (ou Q/D) : déplace l'Esprit sur sa
          zone, purement cosmétique (aucun effet de jeu — juste plus
          vivant qu'un personnage figé).
        - Flèche haut ou barre Espace : SAUT. Remplace l'ancien
          bouton "Parer" — si une boule de feu de Frollo est en vol
          ET qu'il reste une charge 🛡️, le saut esquive/pare
          (consomme la charge, comme avant). Sans boule de feu en
          vol, c'est un saut purement cosmétique, sans coût ni effet.
        - Entrée (ou bouton tactile ⚔️) : ATTAQUE, comme avant
          (consomme une charge ⚔️, retire un segment à Frollo).
      "Recharger" reste un bouton cliqué (canevas) : ce n'est pas une
      action de combat, mais un changement de phase.

   Le reste (mécanique en deux phases, banque de questions mixte,
   jauges, vies, victoire/défaite) est IDENTIQUE à la v5 — voir
   ci-dessous pour le détail.

   ---- v5 (mécanique, inchangée) ----
   Notion officielle de l'acte : construction d'une histoire
   (schéma narratif). Mais suite à la discussion avec Julie, ce
   combat final teste désormais un MIX de révision sur TOUTES les
   notions du monde (voir QUESTION_BANK) — le schéma narratif n'en
   est qu'une composante parmi d'autres, pour ne pas faire doublon
   avec "Les Vitraux Retrouvés" (acte 4), qui teste déjà la mise en
   ordre logique d'un paragraphe.

   1. PHASE ENTRAÎNEMENT (accumulation, sans risque) : une question
      rapide à la fois (QCM à 3 options), piochée au hasard dans
      QUESTION_BANK (mélange des 6 notions du monde). Bonne réponse
      → gagne au hasard UNE charge ⚔️ Attaque OU 🛡️ Défense (jamais
      les deux à la fois), jusqu'à 4 de chaque. Mauvaise réponse →
      pas de charge, juste un feedback explicatif, question
      suivante. Le joueur peut arrêter d'accumuler quand il veut en
      cliquant "⚔️ Combattre !" (actif dès qu'il a au moins 1
      charge, peu importe laquelle).

   2. PHASE COMBAT : Frollo attaque automatiquement à intervalle
      régulier (boule de feu). Le joueur peut :
      - SAUTER (voir contrôles v6 ci-dessus) pour esquiver, si charge
        dispo. Sans parade, l'Esprit est touché et perd une vie
        (sur 3, comme avant).
      - ATTAQUER (voir contrôles v6), à tout moment si charge dispo,
        pour frapper Frollo et lui retirer un segment de vie (4
        segments = 4 charges d'attaque max, un coup = un segment).
      - cliquer "🔄 Recharger" à tout moment pour retourner en phase
        Entraînement et regagner des charges (vie de Frollo et vies
        du joueur inchangées, seules les jauges de charges sont
        concernées).

   Victoire : les 4 segments de vie de Frollo tombent à zéro.
   Défaite : les 3 vies du joueur tombent à zéro. Comme pour tous
   les autres mini-jeux, retour au VN pour remédiation classique en
   cas d'échec.

   ⚠️ Difficulté volontairement DOUCE pour ce premier monde
   (intervalle d'attaque de Frollo lent, cf. FROLLO_ATTACK_INTERVAL) —
   Julie a prévu une difficulté croissante d'un monde à l'autre
   (questions plus dures, jauges plus grandes, Frollo plus agressif)
   à ajuster monde par monde plus tard, pas dans cette session.

   Personnage joueur : L'Esprit (cf. v4 — précision déjà actée).
   Gavroche rejoint l'équipe après la victoire (scène de fin, VN).

   ---- v4.1 (conservé) : corrections visuelles ----
   Personnages redimensionnés (gabarit proche des autres mini-jeux)
   et l'Esprit retourné (miroir horizontal) pour faire face à
   Frollo au lieu de lui tourner le dos — signalé par Julie après
   test réel.

   Assets (inchangés depuis la v4, voir ETAT_DU_PROJET.md pour la
   liste complète) : sprites esprit-combat (1-3), defense (1-2), touche, touche-critique, KO,
   victoire*, frolodemon1-3, frolo-transformation-demon.jfif,
   frolo-vaincu-retransformation-humain.jfif, cle-monde1.png (n'est
   plus qu'un SIGNE annonciateur pendant la victoire, la remise
   officielle de la clé se fait dans hugo_scenes.json / "ending"),
   decors_combat_maldit_hugo.jfif.

   Variante enregistrée INCHANGÉE ("construction_recit" /
   "parchemin_hugo").
   ============================================================ */

(function registerSceauDuMalDitHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  const CHAR_DIR = "/assets/sprites/characters/";
  const PROPS_DIR = "/assets/sprites/props/";
  const BG_SRC = "/assets/backgrounds/decors_combat_maldit_hugo.jfif";

  const MAX_LIVES = 3;
  const MAX_CHARGE = 4; // par jauge (attaque / défense) — aussi le nb de segments de vie de Frollo

  // Douceur du 1er monde : Frollo attaque assez rarement, laisse le
  // temps de lire et de réagir. À resserrer dans les mondes suivants.
  const FROLLO_ATTACK_INTERVAL = 200; // ~3.3s à 60fps
  const FIREBALL_TRAVEL_FRAMES = 55;

  // --- Banque de questions mixte : mélange les 6 notions du monde,
  //     un QCM rapide (3 options) à la fois. Volontairement PAS de
  //     "remets dans l'ordre" pour cohérence_paragraphe (déjà testé
  //     aux Vitraux Retrouvés, acte 4) — ici : connecteur logique.
  const QUESTION_BANK = [
    // Ponctuation
    { notion: "ponctuation", question: "Complète : « Gavroche courut vers la barricade ___ »", options: [".", ",", "?"], correct: 0, why: "C'est la fin d'une phrase déclarative : un point la clôt." },
    { notion: "ponctuation", question: "Complète : « As-tu vu Frollo ___ »", options: ["?", ".", "!"], correct: 0, why: "C'est une question directe : point d'interrogation." },
    { notion: "ponctuation", question: "Complète : « Dans les rues de Paris ___ les gardes patrouillaient »", options: [",", ".", "!"], correct: 0, why: "Complément placé en tête de phrase : virgule d'introduction." },
    // Ordre des mots
    { notion: "ordre_des_mots", question: "Quelle phrase est correctement construite ?", options: ["Gavroche vite courait.", "Vite Gavroche courait.", "Gavroche courait vite."], correct: 2, why: "Sujet → verbe → complément : l'adverbe se place après le verbe." },
    { notion: "ordre_des_mots", question: "Quelle phrase est correctement construite ?", options: ["Mangea Gavroche la pomme.", "Gavroche mangea la pomme.", "La pomme mangea Gavroche."], correct: 1, why: "Sujet (Gavroche) → verbe (mangea) → complément (la pomme)." },
    { notion: "ordre_des_mots", question: "Quelle phrase est correctement construite ?", options: ["L'Esprit suivait Gavroche en silence.", "En silence suivait l'Esprit Gavroche.", "Suivait en silence l'Esprit Gavroche."], correct: 0, why: "Sujet → verbe → complément, dans cet ordre." },
    // Subordonnées
    { notion: "subordonnees", question: "Laquelle contient une proposition subordonnée ?", options: ["Gavroche courut vite.", "Gavroche courut parce qu'il avait peur.", "Gavroche et Esmeralda coururent."], correct: 1, why: "« parce qu'il avait peur » dépend de la principale : c'est une subordonnée." },
    { notion: "subordonnees", question: "Quelle suite complète logiquement : « L'Esprit comprit ___ » ?", options: ["que Casimodo les protégeait", "et courut", "Gavroche"], correct: 0, why: "« que Casimodo... » est une subordonnée complétive, liée au verbe « comprit »." },
    { notion: "subordonnees", question: "Quel mot introduit souvent une proposition subordonnée ?", options: ["parce que", "rouge", "vite"], correct: 0, why: "« parce que » est une conjonction de subordination classique." },
    // Cohérence du paragraphe (connecteur logique, PAS l'ordre — déjà testé aux Vitraux)
    { notion: "coherence_paragraphe", question: "Quel connecteur enchaîne logiquement deux idées ?", options: ["Ensuite", "Banane", "Rouge"], correct: 0, why: "« Ensuite » relie deux idées dans le temps : c'est un connecteur logique." },
    { notion: "coherence_paragraphe", question: "« ___, il redescendit, le sourire aux lèvres. » Quel connecteur convient en fin de récit ?", options: ["Enfin", "D'abord", "Rouge"], correct: 0, why: "« Enfin » marque la dernière étape d'une suite d'actions." },
    { notion: "coherence_paragraphe", question: "Quel connecteur marque une opposition entre deux idées ?", options: ["Cependant", "Ensuite", "Parce que"], correct: 0, why: "« Cependant » introduit un contraste, une opposition." },
    // Sélection d'info
    { notion: "selection_info", question: "« Jean Valjean marchait depuis l'aube. Le ciel était gris. Il cherchait un village. » Quelle info est essentielle ?", options: ["Le ciel était gris", "Il cherchait un village", "Il marchait pieds nus"], correct: 1, why: "C'est ce qui fait avancer l'histoire — le reste n'est qu'un détail de décor." },
    { notion: "selection_info", question: "« La porte était bleue. Une faible lumière brillait à l'intérieur. » Quelle info est essentielle ?", options: ["La porte était bleue", "Une lumière brillait à l'intérieur", "La peinture était écaillée"], correct: 1, why: "Cette info annonce que quelqu'un est peut-être éveillé — elle fait avancer le récit." },
    { notion: "selection_info", question: "Quel type de détail peut-on le plus souvent laisser de côté dans un résumé ?", options: ["Un détail visuel sans lien avec l'action", "L'action principale", "Le nom du personnage"], correct: 0, why: "Un détail purement décoratif n'aide pas à comprendre l'histoire." },
    // Construction du récit (schéma narratif — seule notion propre à cet acte)
    { notion: "construction_recit", question: "Dans un récit, qu'est-ce qui arrive juste après la situation initiale ?", options: ["L'élément déclencheur", "La situation finale", "Rien, l'histoire est déjà finie"], correct: 0, why: "L'élément déclencheur vient rompre la situation de départ." },
    { notion: "construction_recit", question: "Quelle étape vient juste avant la situation finale ?", options: ["La résolution", "La situation initiale", "L'élément déclencheur"], correct: 0, why: "La résolution règle le problème, juste avant que tout se stabilise (situation finale)." },
    { notion: "construction_recit", question: "« Un bruit de pas le réveilla en sursaut. » — à quelle étape appartient cette phrase ?", options: ["Élément déclencheur", "Péripéties", "Situation finale"], correct: 0, why: "C'est l'évènement qui rompt la tranquillité du début : l'élément déclencheur." }
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
  function loadBg(src) { const img = new Image(); img.src = src; return img; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function wrapText(ctx, text, maxWidth) {
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

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Le Sceau du Mal-Dit",
      objective: "ENTRAÎNEMENT : réponds aux questions (mélange de tout ce que tu as appris dans ce monde) pour débloquer des charges ⚔️ Attaque ou 🛡️ Défense, au hasard, jusqu'à 4 de chaque. Clique sur « Combattre ! » quand tu es prêt. COMBAT : Frollo attaque régulièrement — pare avec 🛡️ (sinon tu perds une vie), et frappe avec ⚔️ pour lui retirer un segment de vie. Plus de charges ? Clique sur 🔄 pour retourner t'entraîner. Vide sa barre de vie avant de perdre tes 3 vies !"
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      // --- Assets ---
      const bgImage = loadBg(BG_SRC);
      const cleImg = loadProp("cle-monde1.png");

      const esprit = {
        combat: [loadChar("esprit-combat1.png"), loadChar("esprit-combat2.png"), loadChar("esprit-combat3.png")],
        esquive: loadChar("esprit-combat_esquive.png"),
        defense: [loadChar("esprit-defense1.png"), loadChar("esprit-defense2.png")],
        touche: loadChar("esprit-touche.png"),
        toucheCritique: loadChar("esprit-touche-critique.png"),
        ko: loadChar("esprit-KO.png"),
        victoire: [loadChar("esprit-victoire1.png"), loadChar("esprit-victoire2.png")]
      };
      const frollo = {
        demon: [loadChar("frolodemon1.png"), loadChar("frolodemon2.png"), loadChar("frolodemon3.png")],
        transformation: loadChar("frolo-transformation-demon.jfif"),
        retransformation: loadChar("frolo-vaincu-retransformation-humain.jfif")
      };

      // --- Positions (v4.1 : réduites, Esprit en miroir vers Frollo) ---
      const ESPRIT_BOX = { x: 100, y: 160, w: 90, h: 130 };
      const FROLLO_BOX = { x: 600, y: 120, w: 120, h: 170 };

      // --- État de partie ---
      let lives = MAX_LIVES;
      let frolloHealth = MAX_CHARGE;
      let attackCharge = 0;
      let defenseCharge = 0;

      // phase: intro_transform | training | combat |
      //        victory_transform | victory_key | defeat
      let phase = "intro_transform";
      let phaseTimer = 110; // laisse voir la transformation avant de commencer

      let espritSprite = { kind: "combat", frame: 0 };
      let frolloAnimTimer = 0, frolloAnimFrame = 0;
      let frolloFlash = 0;

      const fireball = { active: false, x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, total: 1 };
      let frolloAttackTimer = FROLLO_ATTACK_INTERVAL;
      let combatLocked = false; // vrai pendant une résolution (esquive/touché/attaque), bloque les clics

      let feedback = "";
      let feedbackColor = "#f4f1ea";

      // --- Questions (entraînement) ---
      let questionQueue = shuffle(QUESTION_BANK.map((_, i) => i));
      let currentQuestion = null;
      let questionLocked = false; // pendant l'affichage du feedback

      function nextQuestion() {
        if (questionQueue.length === 0) questionQueue = shuffle(QUESTION_BANK.map((_, i) => i));
        currentQuestion = QUESTION_BANK[questionQueue.pop()];
        questionLocked = false;
      }

      let resultGiven = false;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Le Sceau du Mal-Dit</div>
      `;

      function espritCenter() { return { x: ESPRIT_BOX.x + ESPRIT_BOX.w / 2, y: ESPRIT_BOX.y + ESPRIT_BOX.h * 0.4 }; }
      function frolloCenter() { return { x: FROLLO_BOX.x + FROLLO_BOX.w / 2, y: FROLLO_BOX.y + FROLLO_BOX.h * 0.4 }; }

      function launchFireball() {
        const from = frolloCenter(), to = espritCenter();
        fireball.active = true;
        fireball.fromX = from.x; fireball.fromY = from.y;
        fireball.toX = to.x; fireball.toY = to.y;
        fireball.t = 0;
        fireball.total = FIREBALL_TRAVEL_FRAMES;
      }

      function goToPhase(next, timer) {
        phase = next;
        phaseTimer = timer || 0;
      }

      function enterTraining() {
        goToPhase("training", 0);
        nextQuestion();
      }

      function enterCombat() {
        goToPhase("combat", 0);
        frolloAttackTimer = FROLLO_ATTACK_INTERVAL;
        combatLocked = false;
        espritSprite = { kind: "combat", frame: 0 };
      }

      // --- Réponses en entraînement ---
      function onAnswerClick(optIndex) {
        if (questionLocked || phase !== "training") return;
        questionLocked = true;
        const q = currentQuestion;
        const correct = optIndex === q.correct;

        if (correct) {
          let grantedTo = pick(["attack", "defense"]);
          if (grantedTo === "attack" && attackCharge >= MAX_CHARGE) grantedTo = "defense";
          if (grantedTo === "defense" && defenseCharge >= MAX_CHARGE) grantedTo = "attack";
          if (grantedTo === "attack" && attackCharge < MAX_CHARGE) { attackCharge++; feedback = "✓ Exact ! ⚔️ Attaque débloquée !"; }
          else if (grantedTo === "defense" && defenseCharge < MAX_CHARGE) { defenseCharge++; feedback = "✓ Exact ! 🛡️ Défense débloquée !"; }
          else { feedback = "✓ Exact ! (déjà au maximum de charges pour l'instant)"; }
          feedbackColor = "#6fcf97";
        } else {
          feedback = `✗ Pas cette fois — la bonne réponse était « ${q.options[q.correct]} ». ${q.why}`;
          feedbackColor = "#d9534f";
        }

        setTimeout(() => {
          if (resultGiven) return;
          feedback = "";
          nextQuestion();
        }, 1600);
      }

      // --- Actions en combat ---
      function onAttackClick() {
        if (combatLocked || phase !== "combat" || attackCharge <= 0) return;
        attackCharge--;
        combatLocked = true;
        espritSprite = { kind: "combat", frame: 0 };
        frolloFlash = 18;
        frolloHealth = Math.max(0, frolloHealth - 1);
        feedback = "✓ Coup porté !";
        feedbackColor = "#6fcf97";
        goToPhase("combat_strike", 24);
      }

      function onParryClick() {
        if (combatLocked || phase !== "combat" || defenseCharge <= 0 || !fireball.active) return;
        defenseCharge--;
        combatLocked = true;
        const style = pick(["esquive", "defense1", "defense2"]);
        espritSprite = style === "esquive" ? { kind: "esquive" } : { kind: "defense", frame: style === "defense1" ? 0 : 1 };
        fireball.active = false;
        feedback = "✓ Paré !";
        feedbackColor = "#6fcf97";
        goToPhase("combat_parry", 40);
      }

      function onRechargeClick() {
        if (phase !== "combat") return;
        enterTraining();
      }

      function hitEsprit(critical) {
        lives--;
        espritSprite = critical ? { kind: "toucheCritique" } : { kind: "touche" };
        fireball.active = false;
        feedback = critical ? "✗ Touché de plein fouet !" : "✗ Touché...";
        feedbackColor = "#d9534f";
        if (lives <= 0) {
          espritSprite = { kind: "ko" };
          goToPhase("defeat", 90);
        } else {
          combatLocked = true;
          goToPhase("combat_hit", 50);
        }
      }

      // --- Interactions (clic canvas, hit-test manuel) ---
      let clickRects = [];

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function onClick(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        for (const r of clickRects) {
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { r.onClick(); return; }
        }
      }
      canvas.addEventListener("click", onClick);

      function cleanup() {
        canvas.removeEventListener("click", onClick);
        cancelAnimationFrame(rafId);
      }

      async function endVictory() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: "Le sceau se brise ! Frollo reprend forme humaine, vaincu et hagard. Une lueur dorée, en forme de clé, scintille un instant dans les airs avant de s'évanouir — un signe que le chemin vers la clé est désormais ouvert. Gavroche annonce qu'il accompagnera désormais l'Esprit dans ses prochaines aventures."
        });
        resolve({ passed: true, score: MAX_CHARGE, total: MAX_CHARGE });
      }

      async function endDefeat() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: false,
          message: "Le Mal-Dit est trop puissant, cette fois. L'Esprit doit reprendre des forces avant de retenter l'assaut."
        });
        resolve({ passed: false, score: MAX_CHARGE - frolloHealth, total: MAX_CHARGE });
      }

      // --- Boucle principale ---
      let rafId;

      function update() {
        if (phase !== "intro_transform" && phase !== "victory_transform" && phase !== "victory_key") {
          frolloAnimTimer++;
          if (frolloAnimTimer >= 18) { frolloAnimTimer = 0; frolloAnimFrame = (frolloAnimFrame + 1) % frollo.demon.length; }
        }
        if (frolloFlash > 0) frolloFlash--;

        if (fireball.active) {
          fireball.t++;
          const p = Math.min(1, fireball.t / fireball.total);
          fireball.x = fireball.fromX + (fireball.toX - fireball.fromX) * p;
          fireball.y = fireball.fromY + (fireball.toY - fireball.fromY) * p;
          if (fireball.t >= fireball.total) {
            fireball.active = false;
            hitEsprit(false);
          }
        }

        if (phaseTimer > 0) phaseTimer--;

        switch (phase) {
          case "intro_transform":
            if (phaseTimer <= 0) enterTraining();
            break;

          case "combat":
            frolloAttackTimer--;
            if (frolloAttackTimer <= 0 && !fireball.active) {
              frolloAttackTimer = FROLLO_ATTACK_INTERVAL;
              launchFireball();
            }
            break;

          case "combat_strike":
            espritSprite.frame = Math.floor((24 - phaseTimer) / 8) % esprit.combat.length;
            if (phaseTimer <= 0) {
              feedback = "";
              combatLocked = false;
              if (frolloHealth <= 0) goToPhase("victory_transform", 100);
              else goToPhase("combat", 0);
            }
            break;

          case "combat_parry":
            if (phaseTimer <= 0) {
              feedback = "";
              combatLocked = false;
              espritSprite = { kind: "combat", frame: 0 };
              goToPhase("combat", 0);
            }
            break;

          case "combat_hit":
            if (phaseTimer <= 0) {
              feedback = "";
              combatLocked = false;
              espritSprite = { kind: "combat", frame: 0 };
              goToPhase("combat", 0);
            }
            break;

          case "victory_transform":
            if (phaseTimer <= 0) goToPhase("victory_key", 70);
            break;

          case "victory_key":
            if (phaseTimer <= 0) endVictory();
            break;

          case "defeat":
            if (phaseTimer <= 0) endDefeat();
            break;
        }

        if (espritSprite.kind === "victoire") {
          espritSprite.timer = (espritSprite.timer || 0) + 1;
          if (espritSprite.timer % 24 === 0) espritSprite.frame = 1 - (espritSprite.frame || 0);
        }
      }

      // --- Rendu ---
      function drawImgBox(img, box, flash, flip) {
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          if (flash) ctx.filter = "brightness(1.8) saturate(0.3)";
          if (flip) {
            ctx.translate(box.x + box.w, box.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, box.w, box.h);
          } else {
            ctx.drawImage(img, box.x, box.y, box.w, box.h);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = "#3a2a55";
          ctx.fillRect(box.x, box.y, box.w, box.h);
        }
      }

      function currentEspritImage() {
        switch (espritSprite.kind) {
          case "combat": return esprit.combat[espritSprite.frame % esprit.combat.length];
          case "esquive": return esprit.esquive;
          case "defense": return esprit.defense[espritSprite.frame];
          case "touche": return esprit.touche;
          case "toucheCritique": return esprit.toucheCritique;
          case "ko": return esprit.ko;
          case "victoire": return esprit.victoire[espritSprite.frame || 0];
          default: return esprit.combat[0];
        }
      }

      function drawFrolloHealthBar() {
        const segW = 60, segH = 14, gap = 6;
        const totalW = MAX_CHARGE * segW + (MAX_CHARGE - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        for (let i = 0; i < MAX_CHARGE; i++) {
          const x = startX + i * (segW + gap);
          ctx.fillStyle = i < frolloHealth ? "#d9534f" : "rgba(157,140,255,0.15)";
          ctx.fillRect(x, 10, segW, segH);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, 10, segW, segH);
        }
        ctx.fillStyle = "#c9c2e0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Sceau du Mal-Dit — vie de Frollo", CANVAS_W / 2, 40);
      }

      function drawLives() {
        ctx.font = "18px sans-serif";
        ctx.textAlign = "left";
        let hearts = "";
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? "❤ " : "🖤 ";
        ctx.fillText(hearts, 16, 28);
      }

      function drawCharges() {
        ctx.font = "13px sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = "#f4f1ea";
        ctx.fillText(`⚔️ ${attackCharge}/${MAX_CHARGE}    🛡️ ${defenseCharge}/${MAX_CHARGE}`, CANVAS_W - 16, 28);
      }

      function drawFeedback() {
        if (!feedback) return;
        ctx.fillStyle = "rgba(26,21,48,0.85)";
        ctx.fillRect(CANVAS_W / 2 - 320, 262, 640, 30);
        ctx.fillStyle = feedbackColor;
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(feedback.length > 110 ? feedback.slice(0, 108) + "…" : feedback, CANVAS_W / 2, 277);
        ctx.textBaseline = "alphabetic";
      }

      function drawFireball() {
        if (!fireball.active) return;
        const grad = ctx.createRadialGradient(fireball.x, fireball.y, 1, fireball.x, fireball.y, 14);
        grad.addColorStop(0, "#ffd6f0");
        grad.addColorStop(0.5, "#e85fc4");
        grad.addColorStop(1, "rgba(232,95,196,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawButton(rect, label, enabled) {
        ctx.fillStyle = enabled ? "#2b2347" : "rgba(43,35,71,0.4)";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = enabled ? "#e8c468" : "rgba(232,196,104,0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = enabled ? "#f4f1ea" : "rgba(244,241,234,0.4)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.textBaseline = "alphabetic";
      }

      function drawTrainingUI() {
        if (!currentQuestion) return;
        const q = currentQuestion;

        // Question
        ctx.fillStyle = "#2b2347";
        ctx.fillRect(60, 300, CANVAS_W - 120, 40);
        ctx.strokeStyle = "#9d8cff";
        ctx.lineWidth = 2;
        ctx.strokeRect(60, 300, CANVAS_W - 120, 40);
        ctx.fillStyle = "#f4f1ea";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const qLines = wrapText(ctx, q.question, CANVAS_W - 150);
        let qy = 320 - (qLines.length - 1) * 8;
        qLines.forEach(l => { ctx.fillText(l, CANVAS_W / 2, qy); qy += 16; });
        ctx.textBaseline = "alphabetic";

        // Options
        const n = q.options.length;
        const btnW = 220, btnH = 46, gap = 14;
        const totalW = n * btnW + (n - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        const y = 355;
        q.options.forEach((opt, i) => {
          const x = startX + i * (btnW + gap);
          const enabled = !questionLocked;
          drawButton({ x, y, w: btnW, h: btnH }, opt, enabled);
          clickRects.push({ x, y, w: btnW, h: btnH, onClick: () => onAnswerClick(i) });
        });

        // Bouton Combattre
        const canFight = attackCharge > 0 || defenseCharge > 0;
        const fightRect = { x: CANVAS_W / 2 - 90, y: 410, w: 180, h: 32 };
        drawButton(fightRect, "⚔️ Combattre !", canFight);
        if (canFight) clickRects.push({ ...fightRect, onClick: enterCombat });
      }

      function drawCombatUI() {
        const btnW = 170, btnH = 40, gap = 16;
        const y = 400;
        const totalW = 3 * btnW + 2 * gap;
        const startX = (CANVAS_W - totalW) / 2;

        const atkRect = { x: startX, y, w: btnW, h: btnH };
        const parRect = { x: startX + btnW + gap, y, w: btnW, h: btnH };
        const rechRect = { x: startX + 2 * (btnW + gap), y, w: btnW, h: btnH };

        const atkEnabled = !combatLocked && attackCharge > 0;
        const parEnabled = !combatLocked && defenseCharge > 0 && fireball.active;
        const rechEnabled = !combatLocked;

        drawButton(atkRect, `⚔️ Attaquer (${attackCharge})`, atkEnabled);
        drawButton(parRect, `🛡️ Parer (${defenseCharge})`, parEnabled);
        drawButton(rechRect, "🔄 Recharger", rechEnabled);

        if (atkEnabled) clickRects.push({ ...atkRect, onClick: onAttackClick });
        if (parEnabled) clickRects.push({ ...parRect, onClick: onParryClick });
        if (rechEnabled) clickRects.push({ ...rechRect, onClick: onRechargeClick });
      }

      function render() {
        clickRects = [];

        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        if (phase === "intro_transform") {
          drawImgBox(frollo.transformation, { x: CANVAS_W / 2 - 130, y: 40, w: 260, h: 340 }, false, false);
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 395, CANVAS_W, 40);
          ctx.fillStyle = "#e85fc4";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Frollo se tord de douleur... le Mal-Dit prend possession de lui !", CANVAS_W / 2, 419);
          return;
        }

        if (phase === "victory_transform" || phase === "victory_key") {
          drawImgBox(frollo.retransformation, { x: CANVAS_W / 2 - 130, y: 30, w: 260, h: 320 }, false, false);
          const img = esprit.victoire[Math.floor(phaseTimer / 20) % 2];
          drawImgBox(img, ESPRIT_BOX, false, true);
          if (phase === "victory_key" && cleImg) {
            const scale = Math.min(1, (70 - phaseTimer) / 20);
            const kw = 46 * scale, kh = 90 * scale;
            drawImgBox(cleImg, { x: ESPRIT_BOX.x + ESPRIT_BOX.w / 2 - kw / 2, y: ESPRIT_BOX.y - 30, w: kw, h: kh }, false, false);
          }
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 395, CANVAS_W, 40);
          ctx.fillStyle = "#e8c468";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            phase === "victory_transform" ? "Le sceau se brise... Frollo reprend forme humaine." : "Un signe scintille dans les airs, un instant...",
            CANVAS_W / 2, 419
          );
          return;
        }

        drawFrolloHealthBar();
        drawLives();
        drawCharges();

        drawImgBox(frollo.demon[frolloAnimFrame], FROLLO_BOX, frolloFlash > 0, false);
        drawImgBox(currentEspritImage(), ESPRIT_BOX, false, true);

        drawFireball();
        drawFeedback();

        if (phase === "training") drawTrainingUI();
        else drawCombatUI();
      }

      function loop() {
        update();
        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      loop();
    });
  }

  SceneManager.registerMinigame("construction_recit", "parchemin_hugo", {
    title: "Le Sceau du Mal-Dit",
    run
  });

})();
