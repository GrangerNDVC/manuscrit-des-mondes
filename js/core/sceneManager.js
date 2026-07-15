/* ============================================================
   LE MANUSCRIT DES MONDES — sceneManager.js
   ============================================================
   ⚠️ Ce fichier ne vit plus que dans les pages /mondes/*.html
   (ex. /mondes/hugo.html), plus dans le hub. Il gère :
   - l'affichage des 2 écrans propres à un monde (VN, mini-jeu)
   - la machine à états pédagogique d'un acte (inchangée)
   - le retour vers le hub (/index.html) une fois le monde fini

   Le nom "SceneManager" est conservé volontairement : tous les
   mini-jeux (mg-ponctuation.js, mg-ordre-mots.js, etc.) appellent
   SceneManager.registerMinigame(...) au chargement. Renommer
   l'objet aurait obligé à modifier ces 6 fichiers pour rien.

   Démarrage : chaque page de monde appelle, dans son propre
   petit script en bas de page :
       SceneManager.startWorld("hugo");
   ============================================================ */

const SceneManager = (() => {

  const screens = {
    vn: document.getElementById("screen-vn"),
    minigame: document.getElementById("screen-minigame")
  };

  const overlay = document.getElementById("transition-overlay");

  const minigameRegistry = {};

  function registerMinigame(notionId, variantId, moduleRef) {
    if (!minigameRegistry[notionId]) minigameRegistry[notionId] = {};
    minigameRegistry[notionId][variantId] = moduleRef;
  }

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

  function showScreen(name) {
    overlay.classList.add("active");
    setTimeout(() => {
      Object.values(screens).forEach(s => s && s.classList.remove("active"));
      if (screens[name]) screens[name].classList.add("active");
      overlay.classList.remove("active");
    }, 250);
  }

  function applyWorldTheme(worldId) {
    const index = GameState.WORLD_IDS.indexOf(worldId) + 1;
    document.body.className = document.body.className.replace(/world-\d/g, "").trim();
    if (index > 0) document.body.classList.add(`world-${index}`);
  }

  function goToHub() {
    // #map indique à hubManager.js d'atterrir directement sur la carte
    // plutôt que sur l'écran menu de départ (voir hubManager.js/init()).
    window.location.href = "/index.html#map";
  }

  /* ============================================================
     POINT D'ENTRÉE DE LA PAGE
     ============================================================ */

  /**
   * Démarre (ou reprend) un monde donné. À appeler une fois, au
   * chargement de la page /mondes/<worldId>.html.
   */
  function startWorld(worldId) {
    GameState.load();
    applyWorldTheme(worldId);
    GameState.get().currentWorld = worldId;
    GameState.save();

    const world = GameState.get().worlds[worldId];

    if (world.currentAct === -1) {
      // Monde déjà entièrement terminé : pour l'instant, retour au hub.
      // TODO : proposer un mode "libre" pour rejouer les actes sans impact
      // sur la progression (révision, plaisir de rejouer).
      goToHub();
      return;
    }

    showScreen("vn");
    startAct(worldId, world.currentAct);
  }

  /* ============================================================
     MACHINE À ÉTATS D'UN ACTE (inchangée)
     ============================================================ */

  async function startAct(worldId, actIndex) {
    const actId = GameState.ACT_IDS[actIndex];
    const actData = await VNParser.loadAct(worldId, actId);

    if (!actData) {
      console.error(`Données introuvables pour ${worldId}/${actId}. Vérifie /js/data/${worldId}_scenes.json.`);
      goToHub();
      return;
    }

    runActSequence(worldId, actId, actData);
  }

  async function runActSequence(worldId, actId, actData) {

    if (actData.intro && actData.intro.length) {
      await VNEngine.playScenes(actData.intro);
    }

    if (actData.qcm) {
      const qcmResult = await VNEngine.playQCM(actData.qcm);
      GameState.setActStep(worldId, actId, "qcm_passed", qcmResult.passed);
    }

    let formativeResult = await VNEngine.playFillBlank(actData.formative);
    GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);

    while (!formativeResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      formativeResult = await VNEngine.playFillBlank(actData.formative);
      GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);
    }

    const minigameResult = await playMinigameForNotion(worldId, actId, actData.minigame_notion, false);
    GameState.setActStep(worldId, actId, "minigame_passed", minigameResult.passed);

    if (!minigameResult.passed) {
      return runActSequence(worldId, actId, actData);
    }

    const transferResult = await VNEngine.playFillBlank(actData.transfer, { fixedText: true });
    GameState.setActStep(worldId, actId, "vn_transfer_passed", transferResult.passed);

    if (!transferResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      return runActSequence(worldId, actId, actData);
    }

    advanceAct(worldId, actId);
  }

  async function playMinigameForNotion(worldId, actId, notionId, isRemediation) {
    const picked = pickMinigameVariant(notionId);
    if (!picked || !picked.module) return { passed: true };
    const { variantId, module } = picked;

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
    return result;
  }

  function advanceAct(worldId, actId) {
    const w = GameState.get().worlds[worldId];
    const idx = GameState.ACT_IDS.indexOf(actId);

    if (idx < GameState.ACT_IDS.length - 1) {
      w.currentAct = idx + 1;
      GameState.save();
      startAct(worldId, w.currentAct);
    } else {
      finishWorld(worldId);
    }
  }

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

    const endData = await VNParser.loadWorldEnding(worldId);
    if (endData && endData.scenes) {
      await VNEngine.playScenes(endData.scenes);
    }

    GameState.completeWorld(worldId, companionId);

    if (GameState.get().towerUnlocked) {
      // TODO : déclencher la cinématique des 8 clés tournant simultanément
      console.log("Les 8 clés sont réunies : la Tour Finale est accessible !");
    }

    goToHub();
  }

  return {
    showScreen,
    startWorld,
    registerMinigame,
    pickMinigameVariant,
    goToHub
  };

})();
