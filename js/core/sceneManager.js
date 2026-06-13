/* ============================================================
   LE MANUSCRIT DES MONDES — sceneManager.js
   ============================================================
   Gère :
   - la navigation entre écrans (menu, intro, carte, VN, mini-jeu)
   - la machine à états pédagogique d'un acte :
       QCM (méchant) -> scène VN -> exercice "texte à trous"
         -> si échec : mini-jeu de remédiation (variante différente)
            -> retour à l'exercice "texte à trous" (même texte)
         -> si succès direct ou après mini-jeu : mini-jeu sommatif
            -> retour VN (texte fixe à compléter = transfert différé)
   - le déblocage des compagnons / clés / Tour Finale
   ============================================================ */

const SceneManager = (() => {

  const screens = {
    menu: document.getElementById("screen-menu"),
    intro: document.getElementById("screen-intro"),
    map: document.getElementById("screen-map"),
    vn: document.getElementById("screen-vn"),
    minigame: document.getElementById("screen-minigame")
  };

  const overlay = document.getElementById("transition-overlay");

  /**
   * Registre des mini-jeux disponibles, par notion.
   * Chaque entrée associe une notion pédagogique à la liste des
   * variantes (un fichier/module par variante), pour permettre
   * de piocher une variante non jouée lors d'une remédiation.
   *
   * Rempli au fur et à mesure par js/minigames/*.js via registerMinigame().
   */
  const minigameRegistry = {};

  function registerMinigame(notionId, variantId, moduleRef) {
    if (!minigameRegistry[notionId]) minigameRegistry[notionId] = {};
    minigameRegistry[notionId][variantId] = moduleRef;
  }

  /**
   * Choisit une variante de mini-jeu pour une notion donnée,
   * en évitant les variantes déjà jouées si possible.
   */
  function pickMinigameVariant(notionId) {
    const variants = minigameRegistry[notionId];
    if (!variants) {
      console.error(`Aucun mini-jeu enregistré pour la notion "${notionId}".`);
      return null;
    }
    const played = GameState.getPlayedVariants(notionId);
    const available = Object.keys(variants).filter(v => !played.includes(v));
    const pool = available.length > 0 ? available : Object.keys(variants);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return { variantId: chosen, module: variants[chosen] };
  }

  /**
   * Affiche un écran donné avec transition fondu.
   */
  function showScreen(name) {
    overlay.classList.add("active");
    setTimeout(() => {
      Object.values(screens).forEach(s => s.classList.remove("active"));
      screens[name].classList.add("active");
      GameState.get().currentScreen = name;
      GameState.save();
      overlay.classList.remove("active");
    }, 250);
  }

  /**
   * Applique le thème CSS du monde courant (couleur d'accent, etc.)
   * en posant une classe "world-N" sur <body>.
   */
  function applyWorldTheme(worldId) {
    const index = GameState.WORLD_IDS.indexOf(worldId) + 1;
    document.body.className = document.body.className
      .replace(/world-\d/g, "")
      .trim();
    if (index > 0) document.body.classList.add(`world-${index}`);
  }

  /* ============================================================
     NAVIGATION PRINCIPALE
     ============================================================ */

  function goToMenu() {
    showScreen("menu");
  }

  function goToIntro() {
    showScreen("intro");
  }

  function goToMap() {
    renderMap();
    showScreen("map");
  }

  /**
   * Construit dynamiquement la carte des 8 mondes + indicateurs de clés.
   */
  function renderMap() {
    const container = document.getElementById("map-worlds");
    const keysContainer = document.getElementById("map-keys");
    const state = GameState.get();
    container.innerHTML = "";
    keysContainer.innerHTML = "";

    GameState.WORLD_IDS.forEach((worldId, i) => {
      const w = state.worlds[worldId];
      const portal = document.createElement("div");
      portal.className = "world-portal" + (w.unlocked ? "" : " locked");
      const statusLabel = w.currentAct === -1 ? " ✓" : ` (acte ${w.currentAct + 1}/${GameState.ACT_IDS.length})`;
      portal.innerHTML = `<span>Monde ${i + 1}</span><strong>${worldId}</strong><small>${statusLabel}</small>`;
      if (w.unlocked) {
        portal.addEventListener("click", () => enterWorld(worldId));
      }
      container.appendChild(portal);
    });

    GameState.COMPANION_IDS.forEach(id => {
      const dot = document.createElement("div");
      dot.className = "key-icon" + (state.keys[id] ? " obtained" : "");
      dot.title = id;
      keysContainer.appendChild(dot);
    });

    // TODO : afficher un portail "Tour Finale" actif si state.towerUnlocked
  }

  /**
   * Entre dans un monde : charge ses scènes VN et lance la scène de
   * l'acte en cours (ou un acte spécifique si targetActIndex est fourni,
   * ce qui permettra plus tard une navigation par notion depuis la carte,
   * ex. "faire la ponctuation dans tous les mondes successivement").
   */
  function enterWorld(worldId, targetActIndex = null) {
    applyWorldTheme(worldId);
    GameState.get().currentWorld = worldId;
    GameState.save();

    const world = GameState.get().worlds[worldId];

    if (targetActIndex !== null) {
      startAct(worldId, targetActIndex);
      return;
    }

    if (world.currentAct === -1) {
      // Monde déjà entièrement terminé : pour l'instant, retour à la carte.
      // TODO : proposer un mode "libre" pour rejouer les actes sans impact
      // sur la progression (révision, plaisir de rejouer).
      goToMap();
      return;
    }

    startAct(worldId, world.currentAct);
  }

  /* ============================================================
     MACHINE À ÉTATS D'UN ACTE
     ============================================================ */

  /**
   * Démarre un acte donné : charge les données de scènes (VN + exercices)
   * pour ce monde/acte via VNParser, puis lance la séquence pédagogique.
   */
  async function startAct(worldId, actIndex) {
    const actId = GameState.ACT_IDS[actIndex];
    const actData = await VNParser.loadAct(worldId, actId);

    if (!actData) {
      console.error(`Données introuvables pour ${worldId}/${actId}.`);
      goToMap();
      return;
    }

    runActSequence(worldId, actId, actData);
  }

  /**
   * Orchestration de la séquence pédagogique d'un acte.
   * actData attend la forme :
   * {
   *   intro: [...scènes VN d'introduction...],
   *   qcm: {...},                // QCM du méchant (optionnel selon acte)
   *   formative: {...},          // scène VN avec texte à trous
   *   transfer: {...},           // scène VN de transfert différé (texte fixe)
   *   minigame_notion: "ponctuation" // notion ciblée par le mini-jeu sommatif
   * }
   */
  async function runActSequence(worldId, actId, actData) {

    // 1. Scènes d'introduction narrative
    if (actData.intro && actData.intro.length) {
      await VNEngine.playScenes(actData.intro);
    }

    // 2. QCM du "méchant" — pré-évaluation, faible enjeu
    if (actData.qcm) {
      const qcmResult = await VNEngine.playQCM(actData.qcm);
      GameState.setActStep(worldId, actId, "qcm_passed", qcmResult.passed);
      // Le résultat du QCM n'empêche pas la suite : il informe simplement
      // le joueur (et pourrait, plus tard, ajuster le niveau de difficulté
      // du mini-jeu ou ajouter un rappel de règle avant la suite).
    }

    // 3. Évaluation formative : scène VN "texte à trous"
    let formativeResult = await VNEngine.playFillBlank(actData.formative);
    GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);

    // 4. Si échec -> mini-jeu de remédiation, puis on retente le même
    //    texte à trous (texte identique, mais l'élève a maintenant
    //    pratiqué la notion isolément dans le mini-jeu)
    while (!formativeResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, /*isRemediation=*/true);
      formativeResult = await VNEngine.playFillBlank(actData.formative);
      GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);
    }

    // 5. Mini-jeu sommatif (évaluation principale de la notion)
    const minigameResult = await playMinigameForNotion(worldId, actId, actData.minigame_notion, /*isRemediation=*/false);
    GameState.setActStep(worldId, actId, "minigame_passed", minigameResult.passed);

    // Si échec au mini-jeu sommatif, on boucle : remédiation -> reformatif -> sommatif
    if (!minigameResult.passed) {
      return runActSequence(worldId, actId, actData); // relance la séquence complète de l'acte
      // NB: une version plus fine pourrait ne relancer qu'à partir de l'étape 4.
    }

    // 6. Transfert différé : scène VN avec texte fixe à compléter
    const transferResult = await VNEngine.playFillBlank(actData.transfer, { fixedText: true });
    GameState.setActStep(worldId, actId, "vn_transfer_passed", transferResult.passed);

    if (!transferResult.passed) {
      // Le transfert échoue : retour à une remédiation ciblée sans
      // repasser par le QCM/intro (évite la redondance narrative).
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      return runActSequence(worldId, actId, actData);
    }

    // 7. Acte terminé -> passage à l'acte suivant ou fin du monde
    advanceAct(worldId, actId);
  }

  /**
   * Lance un mini-jeu correspondant à une notion, en choisissant une
   * variante adaptée au monde courant (identité graphique) et non
   * répétée si remédiation.
   */
  async function playMinigameForNotion(worldId, actId, notionId, isRemediation) {
    const { variantId, module } = pickMinigameVariant(notionId);
    if (!module) return { passed: true }; // fallback si rien d'enregistré

    GameState.recordExerciseVariant(notionId, variantId);

    showScreen("minigame");
    document.getElementById("minigame-title").textContent = module.title || notionId;
    document.getElementById("minigame-objective").textContent =
      isRemediation ? "Entraînement" : "Évaluation";

    const result = await module.run({
      worldId,
      actId,
      canvas: document.getElementById("minigame-canvas"),
      uiContainer: document.getElementById("minigame-ui"),
      isRemediation
    });

    showScreen("vn");
    return result; // { passed: boolean, score: number, ... }
  }

  /**
   * Passe à l'acte suivant, ou termine le monde si c'était le dernier acte.
   */
  function advanceAct(worldId, actId) {
    const w = GameState.get().worlds[worldId];
    const idx = GameState.ACT_IDS.indexOf(actId);

    if (idx < GameState.ACT_IDS.length - 1) {
      w.currentAct = idx + 1;
      GameState.save();
      startAct(worldId, w.currentAct);
    } else {
      // Dernier acte terminé : scène de libération du compagnon/auteur
      finishWorld(worldId);
    }
  }

  /**
   * Séquence de fin de monde : libération du compagnon, scène
   * collective (sans libérer l'auteur seul — rappel : tous les
   * auteurs seront libérés ensemble à la Tour Finale via les 8 clés).
   *
   * companionMap et worldOrder sont définis ici de façon centralisée
   * pour rester cohérents avec gameState.COMPANION_IDS / WORLD_IDS.
   */
  const companionByWorld = {
    hugo: "gavroche",
    dumas: "dartagnan",
    verne: "nemo",
    shakespeare: "puck",
    christie: "marple",
    shelley: "creature",
    carroll: "alice",
    galland: "sheherazade"
  };

  async function finishWorld(worldId) {
    const companionId = companionByWorld[worldId];

    // Scène VN de fin de monde (à écrire ultérieurement, chargée via VNParser)
    const endData = await VNParser.loadWorldEnding(worldId);
    if (endData && endData.scenes) {
      await VNEngine.playScenes(endData.scenes);
    }

    GameState.completeWorld(worldId, companionId);

    if (GameState.get().towerUnlocked) {
      // TODO : déclencher la cinématique des 8 clés tournant simultanément
      // et débloquer l'accès à la Tour Finale depuis la carte centrale.
      console.log("Les 8 clés sont réunies : la Tour Finale est accessible !");
    }

    goToMap();
  }

  return {
    showScreen,
    goToMenu,
    goToIntro,
    goToMap,
    enterWorld,
    registerMinigame,
    pickMinigameVariant
  };

})();
