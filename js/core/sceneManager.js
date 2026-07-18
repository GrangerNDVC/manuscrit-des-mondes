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
      await runQcmLoop(worldId, actId, actData);
    }

    let formativeResult = await VNEngine.playFillBlank(actData.formative);
    GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);

    while (!formativeResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      formativeResult = await VNEngine.playFillBlank(actData.formative);
      GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);
    }

    const transferResult = await VNEngine.playFillBlank(actData.transfer, { fixedText: true });
    GameState.setActStep(worldId, actId, "vn_transfer_passed", transferResult.passed);

    if (!transferResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      return runActSequence(worldId, actId, actData);
    }

    advanceAct(worldId, actId);
  }

  /**
   * Boucle des "questions de cours" (QCM posé par le méchant de l'acte).
   *
   * Accepte actData.qcm sous deux formes :
   *   - un TABLEAU de questions (nouveau format — voir acte "ponctuation")
   *   - un objet UNIQUE (ancien format, encore utilisé par les 5 autres
   *     actes qui n'ont pas été mis à jour) — traité comme un tableau
   *     à une question, rétrocompatible sans rien changer côté données.
   *
   * Logique : les questions sont posées dans l'ordre. Une bonne réponse
   * passe à la suivante. Une mauvaise réponse déclenche IMMÉDIATEMENT
   * le mini-jeu en remédiation, puis relance TOUT le questionnaire
   * depuis la première question (y compris celles déjà réussies) — on
   * ne s'arrête que sur un passage complet et sans faute.
   *
   * ⚠️ CHANGEMENT DE COMPORTEMENT (cette session) : avant, le mini-jeu
   * se déclenchait une fois de toute façon après le texte à trous
   * formatif, indépendamment du résultat au QCM (qcm_passed était
   * enregistré mais ne changeait rien au déroulement — signalé comme
   * incohérent par Julie). Maintenant, le mini-jeu n'apparaît QUE si
   * une question de cours est ratée : réussite directe = pas de
   * mini-jeu imposé, échec = mini-jeu comme aide avant de retenter.
   * "minigame_passed" est marqué true une fois cette boucle terminée
   * (que le mini-jeu ait été nécessaire ou non).
   */
  async function runQcmLoop(worldId, actId, actData) {
    const qcmList = Array.isArray(actData.qcm) ? actData.qcm : [actData.qcm];

    let allPassed = false;
    while (!allPassed) {
      allPassed = true;
      for (let i = 0; i < qcmList.length; i++) {
        const qcmResult = await VNEngine.playQCM(qcmList[i]);
        if (!qcmResult.passed) {
          allPassed = false;
          GameState.setActStep(worldId, actId, "qcm_passed", false);
          await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
          break; // on ne continue pas les questions suivantes : on relance tout depuis le début
        }
      }
    }
    GameState.setActStep(worldId, actId, "qcm_passed", true);
    GameState.setActStep(worldId, actId, "minigame_passed", true);
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
