/* ============================================================
   LE MANUSCRIT DES MONDES — mg-construction-recit.js (v7)
   ============================================================
   Mini-jeu "Le Sceau du Mal-Dit" (Monde 1 — Hugo, acte 6).

   ---- v7 : retour de test #2 — positionnement, marche, combo ----
   1. Personnages rapprochés et un peu remontés (ils étaient trop
      bas et trop éloignés pour "se toucher").
   2. NOUVELLE RÈGLE : une attaque au CLAVIER a deux formes.
      - MÊLÉE (Entrée, sans sauter) : ne touche Frollo que si
        l'Esprit s'est rapproché (voir MELEE_RANGE) — sinon rien ne
        se passe, la charge n'est pas perdue, juste un message
        invite à se rapprocher.
      - COMBO À DISTANCE (Entrée PENDANT un saut) : aura + tir
        d'énergie qui touche Frollo à n'importe quelle distance,
        aucune contrainte de position.
   3. Sprites de MARCHE ajoutés (esprit-combat-marche1/2/3), utilisés
      en cycle pendant le déplacement ; le sprite "combat" (idle,
      esprit-combat1) sert d'état immobile, et reste utilisé pour le
      swing d'attaque en mêlée.
   4. Saut plus haut (JUMP_HEIGHT augmenté) pour bien lire l'esquive.
      PARADE (↓, statique, esprit-defense2) et SAUT (↑/Espace,
      esprit-combat_esquive) sont maintenant deux actions distinctes
      — confirmé par Julie après le fichier de référence qu'elle a
      fourni (jeu-de-combat.html) : les deux permettent d'éviter une
      attaque de Frollo si une charge 🛡️ est disponible.
   5. Indices clavier plus lisibles (texte à l'écran agrandi, sur
      deux lignes, + rappel explicite dans l'overlay d'instructions).
   6. Correctif "fuite de réponse" : QUESTION_BANK avait presque
      toujours la bonne réponse en 1ère position — l'ordre des 3
      options est désormais mélangé à chaque question (même principe
      que le correctif historique de mg-ponctuation.js).

   ⚠️ Point encore PROVISOIRE, à confirmer par Julie (proposé en
   attendant : option A ci-dessous) : le déclencheur du tir à
   distance. Trois pistes proposées, inspirées de son jeu de combat
   (spécial déclenché par un enchaînement de touches précis) :
     A. Sauter PUIS Attaquer pendant le saut (RETENU pour l'instant).
     B. Touche dédiée, coûte 2 charges d'attaque au lieu d'1.
     C. Enchaînement de touches précis en moins de 2s (façon jeu de
        combat de Julie) — plus fidèle à sa référence, mais plus
        exigeant pour des élèves de 12 ans qui découvrent le jeu.
   Idem pour la fenêtre d'esquive au saut : ici valable pendant TOUT
   le saut (accessible) plutôt que seulement au sommet (exigeant,
   comme dans son jeu) — à confirmer aussi.

   ---- v6 (conservé) : gabarit, clavier, mise en page ----
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
  const FROLLO_ATTACK_INTERVAL = 200; // ~3.3s à 60fps — à distance
  const FROLLO_ATTACK_INTERVAL_CLOSE = 130; // ~2.2s — v7 : plus agressif au contact (risque/récompense de la mêlée)
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
      objective: "Frollo a enlevé Cosette. ENTRAÎNEMENT : réponds aux questions pour débloquer des charges ⚔️ Attaque ou 🛡️ Défense (au hasard, jusqu'à 4 de chaque), puis clique sur « Combattre ! ». COMBAT : les touches ci-dessous restent affichées en haut de l'écran pendant le combat.",
      html: `
        <ul style="text-align:left; line-height:1.7; margin:0; padding-left:1.2em;">
          <li><b>← →</b> : se déplacer</li>
          <li><b>↓</b> : Parer (statique, consomme une charge 🛡️)</li>
          <li><b>↑ / Espace</b> : Sauter (esquive, consomme une charge 🛡️)</li>
          <li><b>Entrée</b> : Attaquer — il faut être proche de Frollo pour le toucher</li>
          <li><b>Entrée pendant un saut</b> : tir à distance, touche de n'importe où</li>
          <li><b>🔄 Recharger</b> (bouton) : retour à l'entraînement pour regagner des charges</li>
        </ul>
      `
    });

    return new Promise(resolve => {

      // v8 : canevas en haute résolution (corrige le flou du texte
      // des questions signalé par Julie), même principe que
      // mg-coherence-paragraphe.js.
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      // --- Assets ---
      const bgImage = loadBg(BG_SRC);
      const cleImg = loadProp("cle-monde1.png");

      const esprit = {
        combat: [loadChar("esprit-combat1.png"), loadChar("esprit-combat2.png"), loadChar("esprit-combat3.png")],
        marche: [loadChar("esprit-combat-marche1.png"), loadChar("esprit-combat-marche2.png"), loadChar("esprit-combat-marche3.png")],
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
      // v8 : Cosette, captive de Frollo pendant tout le combat (les
      // enjeux narratifs du nouvel acte 6 — voir hugo_scenes.json) —
      // effrayée pendant le combat, soulagée une fois Frollo vaincu.
      const cosette = {
        captive: loadChar("cosette_pleure1.png"),
        libre: loadChar("cosette_contente1.png")
      };

      // --- Positions (v6 : personnages nettement réduits — l'Esprit
      // ~1cm à l'écran, Frollo exactement le double dans les deux
      // dimensions, mêmes proportions largeur/hauteur pour les
      // deux — et posés au sol (bas du canevas) plutôt qu'en
      // hauteur, pour rendre l'espace du haut à l'exercice. ---
      // v7 : personnages remontés et rapprochés (ils étaient trop bas
      // et trop éloignés pour se toucher). MELEE_RANGE définit à
      // partir de quelle distance (entre centres) l'Esprit est
      // considéré comme "au contact" pour une attaque en mêlée.
      const GROUND_Y = 400;
      const ESPRIT_W = 34, ESPRIT_H = 50;
      const FROLLO_W = 68, FROLLO_H = 100;
      const ESPRIT_BASE_X = 140;
      const ESPRIT_MOVE_MIN = 90, ESPRIT_MOVE_MAX = 430; // zone de déplacement au clavier
      const ESPRIT_BOX = { x: ESPRIT_BASE_X, y: GROUND_Y - ESPRIT_H, w: ESPRIT_W, h: ESPRIT_H };
      const FROLLO_BOX = { x: 480, y: GROUND_Y - FROLLO_H, w: FROLLO_W, h: FROLLO_H };
      const MELEE_RANGE = 95; // distance max (centre à centre) pour qu'un coup de mêlée touche
      // v8 : Cosette, légèrement derrière/à gauche de Frollo (dessinée
      // AVANT lui, donc partiellement cachée par sa silhouette).
      const COSETTE_BOX = { x: FROLLO_BOX.x - 6, y: FROLLO_BOX.y + FROLLO_H * 0.22, w: 26, h: 40 };

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
      const espritBolt = { active: false, x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, total: 1 }; // v7 : tir à distance du joueur
      let frolloAttackTimer = FROLLO_ATTACK_INTERVAL;
      let combatLocked = false; // vrai pendant une résolution (esquive/touché/attaque), bloque les actions

      // --- v6 : déplacement au clavier ---
      const WALK_SPEED = 2.6;
      const keysHeld = { left: false, right: false };
      let jumpTimer = 0; // >0 pendant le petit bond visuel du saut
      const JUMP_DURATION = 28; // v7 : un peu plus long, pour laisser une vraie fenêtre au combo saut+attaque
      const JUMP_HEIGHT = 42;   // v7 : nettement plus haut, pour bien lire l'esquive
      let walkAnimTimer = 0, walkFrame = 0; // v7 : cycle des sprites esprit-combat-marche1/2/3

      let feedback = "";
      let feedbackColor = "#f4f1ea";

      // --- Questions (entraînement) ---
      let questionQueue = shuffle(QUESTION_BANK.map((_, i) => i));
      let currentQuestion = null;
      let questionLocked = false; // pendant l'affichage du feedback

      function nextQuestion() {
        if (questionQueue.length === 0) questionQueue = shuffle(QUESTION_BANK.map((_, i) => i));
        const base = QUESTION_BANK[questionQueue.pop()];
        // v7 : correctif "fuite de réponse" — la bonne réponse était
        // presque toujours en 1ère position dans QUESTION_BANK. On
        // mélange désormais l'ordre d'affichage des options à chaque
        // question, en recalculant l'index correct en conséquence.
        const order = shuffle(base.options.map((_, i) => i));
        currentQuestion = {
          ...base,
          options: order.map(i => base.options[i]),
          correct: order.indexOf(base.correct)
        };
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

      // v7 : tir à distance du joueur (combo saut+attaque) — même
      // principe que la boule de feu de Frollo, mais dans l'autre sens.
      function launchEspritBolt() {
        const from = espritCenter(), to = frolloCenter();
        espritBolt.active = true;
        espritBolt.fromX = from.x; espritBolt.fromY = from.y;
        espritBolt.toX = to.x; espritBolt.toY = to.y;
        espritBolt.t = 0;
        espritBolt.total = 30;
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

      // --- Actions en combat (v7 : mêlée/distance + parade/saut distincts, clavier ET tactile) ---

      function espritFrolloDistance() {
        return Math.abs(espritCenter().x - frolloCenter().x);
      }

      /**
       * v7 (provisoire — option A du choix A/B/C proposé à Julie) :
       * ENTRÉE pendant un saut (jumpTimer > 0) = combo à distance,
       * touche Frollo quelle que soit la distance. ENTRÉE sans
       * sauter = mêlée, ne touche que si l'Esprit est assez proche
       * (MELEE_RANGE) — sinon rien ne se passe, charge non
       * consommée, juste une invite à se rapprocher.
       */
      function tryAttack() {
        if (combatLocked || phase !== "combat" || attackCharge <= 0) return;
        const ranged = jumpTimer > 0;

        if (!ranged && espritFrolloDistance() > MELEE_RANGE) {
          feedback = "✗ Trop loin ! Rapproche-toi de Frollo, ou saute en même temps pour un tir à distance.";
          feedbackColor = "#d9534f";
          return; // ne consomme pas la charge
        }

        attackCharge--;
        combatLocked = true;
        frolloHealth = Math.max(0, frolloHealth - 1);

        if (ranged) {
          espritSprite = { kind: "combat", frame: 0 };
          launchEspritBolt();
          feedback = "✓ Frappe à distance !";
          feedbackColor = "#6fcf97";
          goToPhase("combat_ranged", 40);
        } else {
          espritSprite = { kind: "combat", frame: 0 };
          frolloFlash = 18;
          feedback = "✓ Coup porté !";
          feedbackColor = "#6fcf97";
          goToPhase("combat_strike", 24);
        }
      }

      /**
       * v7 : SAUT — esquive uniquement (sprite esquive), fenêtre large
       * (tout le saut, pas seulement le sommet — choix fait pour
       * rester accessible ; à resserrer plus tard si Julie préfère
       * plus exigeant). Bond toujours visible, combo ou pas.
       */
      function tryJump() {
        if (combatLocked || phase !== "combat") return;
        jumpTimer = JUMP_DURATION;
        if (fireball.active && defenseCharge > 0) {
          defenseCharge--;
          espritSprite = { kind: "esquive" };
          fireball.active = false;
          feedback = "✓ Esquivé !";
          feedbackColor = "#6fcf97";
        }
      }

      /**
       * v7 : PARADE — nouvelle action distincte du saut, statique
       * (l'Esprit ne bouge pas), sprite esprit-defense2. Comme le
       * saut, elle esquive une boule de feu en vol si une charge de
       * défense est disponible ; sinon, immobilité sans effet.
       */
      function tryParry() {
        if (combatLocked || phase !== "combat") return;
        if (fireball.active && defenseCharge > 0) {
          defenseCharge--;
          combatLocked = true;
          espritSprite = { kind: "defense", frame: 1 }; // esprit-defense2
          fireball.active = false;
          feedback = "✓ Paré !";
          feedbackColor = "#6fcf97";
          goToPhase("combat_parry", 40);
        }
      }

      function tryRecharge() {
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

      // --- Interactions (clic canvas, hit-test manuel — questions & Recharger) ---
      let clickRects = [];

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        // v8 : canevas désormais en haute résolution (canvas.width =
        // CANVAS_W*dpr, voir plus haut) — le mapping doit rester en
        // coordonnées CSS (0..CANVAS_W), pas en pixels physiques,
        // sinon tous les clics tombent à côté.
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function onClick(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        for (const r of clickRects) {
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { r.onClick(); return; }
        }
      }
      canvas.addEventListener("click", onClick);

      // --- v6 : clavier temps réel (déplacement + saut/parade + attaque) ---
      function onKeyDown(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keysHeld.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysHeld.right = true;
        if ((e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") && !e.repeat) { tryJump(); e.preventDefault(); }
        if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && !e.repeat) { tryParry(); e.preventDefault(); }
        if (e.key === "Enter" && !e.repeat) tryAttack();
      }
      function onKeyUp(e) {
        if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q" || e.key === "a" || e.key === "A") keysHeld.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysHeld.right = false;
      }
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      // --- v7 : boutons tactiles, mêmes actions que le clavier (parité mobile) ---
      uiContainer.insertAdjacentHTML("beforeend", `
        <div class="touch-controls">
          <button class="touch-btn" id="btn-left">◀</button>
          <button class="touch-btn" id="btn-jump">⤴</button>
          <button class="touch-btn" id="btn-parry">🛡️</button>
          <button class="touch-btn" id="btn-right">▶</button>
          <button class="touch-btn" id="btn-attack">⚔️</button>
        </div>
      `);
      const btnLeft = document.getElementById("btn-left");
      const btnRight = document.getElementById("btn-right");
      ["mousedown", "touchstart"].forEach(evt => {
        btnLeft.addEventListener(evt, () => keysHeld.left = true);
        btnRight.addEventListener(evt, () => keysHeld.right = true);
      });
      ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(evt => {
        btnLeft.addEventListener(evt, () => keysHeld.left = false);
        btnRight.addEventListener(evt, () => keysHeld.right = false);
      });
      document.getElementById("btn-jump").addEventListener("click", tryJump);
      document.getElementById("btn-parry").addEventListener("click", tryParry);
      document.getElementById("btn-attack").addEventListener("click", tryAttack);

      function cleanup() {
        canvas.removeEventListener("click", onClick);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
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

        // v7 : déplacement au clavier, actif seulement en phase de
        // combat. Le sprite de l'Esprit (marche/idle/saut) est décidé
        // ICI, à chaque frame où aucune action ne le verrouille
        // (combatLocked) — c'est ce qui permet au saut/à la marche de
        // s'afficher immédiatement, sans dépendre de quelle touche a
        // déclenché quoi.
        if (phase === "combat") {
          if (keysHeld.left && !keysHeld.right) ESPRIT_BOX.x = Math.max(ESPRIT_MOVE_MIN, ESPRIT_BOX.x - WALK_SPEED);
          else if (keysHeld.right && !keysHeld.left) ESPRIT_BOX.x = Math.min(ESPRIT_MOVE_MAX, ESPRIT_BOX.x + WALK_SPEED);

          if (!combatLocked) {
            if (jumpTimer > 0) {
              espritSprite = { kind: "esquive" };
            } else if (keysHeld.left || keysHeld.right) {
              walkAnimTimer++;
              if (walkAnimTimer >= 7) { walkAnimTimer = 0; walkFrame = (walkFrame + 1) % esprit.marche.length; }
              espritSprite = { kind: "walk", frame: walkFrame };
            } else {
              espritSprite = { kind: "combat", frame: 0 };
            }
          }
        }
        if (jumpTimer > 0) jumpTimer--;

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
        if (espritBolt.active) {
          espritBolt.t++;
          const p = Math.min(1, espritBolt.t / espritBolt.total);
          espritBolt.x = espritBolt.fromX + (espritBolt.toX - espritBolt.fromX) * p;
          espritBolt.y = espritBolt.fromY + (espritBolt.toY - espritBolt.fromY) * p;
          if (espritBolt.t >= espritBolt.total) espritBolt.active = false;
        }

        if (phaseTimer > 0) phaseTimer--;

        switch (phase) {
          case "intro_transform":
            if (phaseTimer <= 0) enterTraining();
            break;

          case "combat":
            frolloAttackTimer--;
            if (frolloAttackTimer <= 0 && !fireball.active) {
              // v7 : Frollo attaque plus souvent quand l'Esprit est au
              // contact (mêlée) — moins de temps pour revenir sauter
              // ou parer, cohérent avec le risque/récompense décrit
              // par Julie. À distance, rythme normal (doux, Monde 1).
              const close = espritFrolloDistance() <= MELEE_RANGE;
              frolloAttackTimer = close ? FROLLO_ATTACK_INTERVAL_CLOSE : FROLLO_ATTACK_INTERVAL;
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

          case "combat_ranged":
            if (phaseTimer <= 0) {
              feedback = "";
              combatLocked = false;
              espritBolt.active = false;
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
      // v8 : correctif de proportions signalé par Julie (le KO, entre
      // autres, était étiré puisque toutes les images étaient forcées
      // dans le même cadre w×h quel que soit leur ratio d'origine).
      // On calcule maintenant un "contain" (comme object-fit: contain)
      // à partir des dimensions réelles de l'image, ancré au sol (bas
      // du cadre, centré horizontalement) pour que tous les sprites
      // — même de proportions différentes — gardent les pieds à la
      // même hauteur.
      function drawImgBox(img, box, flash, flip) {
        if (img && img.complete && img.naturalWidth > 0) {
          const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          const dx = box.x + (box.w - dw) / 2;
          const dy = box.y + box.h - dh;
          ctx.save();
          if (flash) ctx.filter = "brightness(1.8) saturate(0.3)";
          if (flip) {
            ctx.translate(dx + dw, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, dw, dh);
          } else {
            ctx.drawImage(img, dx, dy, dw, dh);
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
          case "walk": return esprit.marche[espritSprite.frame % esprit.marche.length];
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
        const segW = 44, segH = 10, gap = 5;
        const totalW = MAX_CHARGE * segW + (MAX_CHARGE - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        for (let i = 0; i < MAX_CHARGE; i++) {
          const x = startX + i * (segW + gap);
          ctx.fillStyle = i < frolloHealth ? "#d9534f" : "rgba(157,140,255,0.15)";
          ctx.fillRect(x, 8, segW, segH);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, 8, segW, segH);
        }
        ctx.fillStyle = "#c9c2e0";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Vie de Frollo", CANVAS_W / 2, 30);
      }

      function drawLives() {
        ctx.font = "13px sans-serif";
        ctx.textAlign = "left";
        let hearts = "";
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? "❤ " : "🖤 ";
        ctx.fillText(hearts, 12, 20);
      }

      function drawCharges() {
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = "#f4f1ea";
        ctx.fillText(`⚔️ ${attackCharge}/${MAX_CHARGE}  🛡️ ${defenseCharge}/${MAX_CHARGE}`, CANVAS_W - 12, 20);
      }

      function drawFeedback(y) {
        if (!feedback) return;
        ctx.fillStyle = "rgba(26,21,48,0.85)";
        ctx.fillRect(CANVAS_W / 2 - 280, y, 560, 24);
        ctx.fillStyle = feedbackColor;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(feedback.length > 120 ? feedback.slice(0, 118) + "…" : feedback, CANVAS_W / 2, y + 12);
        ctx.textBaseline = "alphabetic";
      }

      function drawFireball() {
        if (!fireball.active) return;
        const grad = ctx.createRadialGradient(fireball.x, fireball.y, 1, fireball.x, fireball.y, 11);
        grad.addColorStop(0, "#ffd6f0");
        grad.addColorStop(0.5, "#e85fc4");
        grad.addColorStop(1, "rgba(232,95,196,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // v7 : tir à distance du joueur — même principe que la boule de
      // feu de Frollo, en doré/blanc (couleur de l'Esprit) pour bien
      // le distinguer visuellement.
      function drawEspritBolt() {
        if (!espritBolt.active) return;
        const grad = ctx.createRadialGradient(espritBolt.x, espritBolt.y, 1, espritBolt.x, espritBolt.y, 11);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.5, "#e8c468");
        grad.addColorStop(1, "rgba(232,196,104,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(espritBolt.x, espritBolt.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // v7 : aura dorée autour de l'Esprit pendant le combo à distance.
      function drawAura() {
        const c = espritCenter();
        const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 40);
        grad.addColorStop(0, "rgba(232,196,104,0.55)");
        grad.addColorStop(1, "rgba(232,196,104,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawButton(rect, label, enabled) {
        ctx.fillStyle = enabled ? "#2b2347" : "rgba(43,35,71,0.4)";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = enabled ? "#e8c468" : "rgba(232,196,104,0.3)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = enabled ? "#f4f1ea" : "rgba(244,241,234,0.4)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.textBaseline = "alphabetic";
      }

      // v6 : toute la zone d'exercice (questions, jauges, boutons) est
      // remontée en haut de l'écran (juste sous la barre de vie de
      // Frollo), pour laisser le bas du canevas aux personnages, posés
      // au sol.
      const EXERCISE_TOP = 42;

      function drawTrainingUI() {
        if (!currentQuestion) return;
        const q = currentQuestion;

        ctx.fillStyle = "#2b2347";
        ctx.fillRect(50, EXERCISE_TOP, CANVAS_W - 100, 34);
        ctx.strokeStyle = "#9d8cff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(50, EXERCISE_TOP, CANVAS_W - 100, 34);
        ctx.fillStyle = "#f4f1ea";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const qLines = wrapText(ctx, q.question, CANVAS_W - 130).slice(0, 2);
        let qy = EXERCISE_TOP + 17 - (qLines.length - 1) * 7;
        qLines.forEach(l => { ctx.fillText(l, CANVAS_W / 2, qy); qy += 14; });
        ctx.textBaseline = "alphabetic";

        const n = q.options.length;
        const btnW = 165, btnH = 34, gap = 10;
        const totalW = n * btnW + (n - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        const y = EXERCISE_TOP + 42;
        q.options.forEach((opt, i) => {
          const x = startX + i * (btnW + gap);
          const enabled = !questionLocked;
          drawButton({ x, y, w: btnW, h: btnH }, opt, enabled);
          clickRects.push({ x, y, w: btnW, h: btnH, onClick: () => onAnswerClick(i) });
        });

        const canFight = attackCharge > 0 || defenseCharge > 0;
        const fightRect = { x: CANVAS_W / 2 - 75, y: EXERCISE_TOP + 84, w: 150, h: 26 };
        drawButton(fightRect, "⚔️ Combattre !", canFight);
        if (canFight) clickRects.push({ ...fightRect, onClick: enterCombat });

        drawFeedback(EXERCISE_TOP + 116);
      }

      function drawCombatUI() {
        // v7 : Attaquer/Parer/Sauter sont au clavier + boutons
        // tactiles — seul "Recharger" reste un bouton cliqué ici.
        // Rappel des touches sur DEUX lignes, plus lisible.
        ctx.fillStyle = "#e8c468";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("◀ ▶ bouger   ↓ parer   ↑/Espace sauter (esquive)", CANVAS_W / 2, EXERCISE_TOP + 12);
        ctx.fillStyle = "#c9c2e0";
        ctx.font = "10px sans-serif";
        ctx.fillText("Entrée : attaquer (proche de Frollo) — Entrée + saut : tir à distance", CANVAS_W / 2, EXERCISE_TOP + 27);

        const rechRect = { x: CANVAS_W / 2 - 70, y: EXERCISE_TOP + 38, w: 140, h: 26 };
        const rechEnabled = !combatLocked;
        drawButton(rechRect, "🔄 Recharger", rechEnabled);
        if (rechEnabled) clickRects.push({ ...rechRect, onClick: tryRecharge });

        drawFeedback(EXERCISE_TOP + 72);
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
          drawImgBox(frollo.transformation, { x: CANVAS_W / 2 - 90, y: 60, w: 180, h: 235 }, false, false);
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 405, CANVAS_W, 32);
          ctx.fillStyle = "#e85fc4";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Frollo se tord de douleur... le Mal-Dit prend possession de lui !", CANVAS_W / 2, 421);
          return;
        }

        if (phase === "victory_transform" || phase === "victory_key") {
          drawImgBox(frollo.retransformation, { x: CANVAS_W / 2 - 85, y: 70, w: 170, h: 220 }, false, false);
          // v8 : Cosette libérée, soulagée, aux côtés de l'Esprit.
          drawImgBox(cosette.libre, { x: ESPRIT_BOX.x + ESPRIT_BOX.w + 6, y: ESPRIT_BOX.y + 4, w: 28, h: 42 }, false, false);
          const img = esprit.victoire[Math.floor(phaseTimer / 20) % 2];
          drawImgBox(img, ESPRIT_BOX, false, true);
          if (phase === "victory_key" && cleImg) {
            const scale = Math.min(1, (70 - phaseTimer) / 20);
            const kw = 26 * scale, kh = 52 * scale;
            drawImgBox(cleImg, { x: ESPRIT_BOX.x + ESPRIT_BOX.w / 2 - kw / 2, y: ESPRIT_BOX.y - 20, w: kw, h: kh }, false, false);
          }
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 405, CANVAS_W, 32);
          ctx.fillStyle = "#e8c468";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            phase === "victory_transform" ? "Le sceau se brise... Cosette est libre, Frollo reprend forme humaine." : "Un signe scintille dans les airs, un instant...",
            CANVAS_W / 2, 421
          );
          return;
        }

        drawFrolloHealthBar();
        drawLives();
        drawCharges();

        // Personnages posés au sol — l'Esprit reçoit un petit bond
        // visuel pendant jumpTimer, sans affecter sa position de
        // référence (ESPRIT_BOX.y) utilisée pour viser la boule de feu.
        const jumpOffset = jumpTimer > 0 ? Math.sin((jumpTimer / JUMP_DURATION) * Math.PI) * JUMP_HEIGHT : 0;
        const espritDrawBox = { x: ESPRIT_BOX.x, y: ESPRIT_BOX.y - jumpOffset, w: ESPRIT_BOX.w, h: ESPRIT_BOX.h };

        if (phase === "combat_ranged") drawAura();

        // v8 : Cosette dessinée AVANT Frollo pour qu'il la cache
        // partiellement — captive derrière lui pendant tout le combat.
        drawImgBox(cosette.captive, COSETTE_BOX, false, false);
        drawImgBox(frollo.demon[frolloAnimFrame], FROLLO_BOX, frolloFlash > 0, false);
        drawImgBox(currentEspritImage(), espritDrawBox, false, true);

        drawFireball();
        drawEspritBolt();

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
