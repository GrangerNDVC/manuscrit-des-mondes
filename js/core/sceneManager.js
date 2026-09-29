/* ============================================================
   LE MANUSCRIT DES MONDES — sceneManager.js
   ============================================================
   ⚠️ Ce fichier ne vit plus que dans les pages /mondes/*.html
   (ex. /mondes/hugo.html), plus dans le hub. Il gère :
   - l'affichage des 2 écrans propres à un monde (VN, mini-jeu)
   - la machine à états pédagogique d'un acte
   - le retour vers le hub (/index.html) une fois le monde fini

   Le nom "SceneManager" est conservé volontairement : tous les
   mini-jeux (mg-ponctuation.js, mg-ordre-mots.js, etc.) appellent
   SceneManager.registerMinigame(...) au chargement. Renommer
   l'objet aurait obligé à modifier ces 6 fichiers pour rien.

   ---- CHANGEMENTS (session "Sceau du Mal-Dit obligatoire") ----
   1. NOUVEAU : un acte peut porter le champ JSON
      `"mandatory_minigame": true` (voir hugo_scenes.json,
      "construction_recit"). Dans ce cas, après l'intro et le QCM,
      l'acte saute ENTIÈREMENT l'ancien enchaînement formative →
      [remédiation] → transfer → [remédiation] : le mini-jeu associé
      à `minigame_notion` est joué directement, en boucle jusqu'à
      réussite (isRemediation: false, car ce n'est plus une
      remédiation mais l'évaluation elle-même), puis l'acte avance.
      Les 4 sous-étapes de progression (qcm/vn_check/minigame/
      vn_transfer) sont toutes marquées réussies d'un coup à la
      victoire, pour rester cohérentes avec progressionMapper.js
      sans qu'il ait besoin d'être modifié. Comportement des AUTRES
      actes strictement inchangé (ce champ est absent chez eux).
   2. CORRECTIF (bug préexistant, découvert en touchant ce fichier) :
      `actData.qcmOutro` — des scènes narratives ajoutées dans
      hugo_scenes.json après plusieurs QCM (ex. la défaite de
      Thénardier, la réaction de Gavroche) — n'était JAMAIS joué :
      rien dans runQcmLoop() ne le lisait. Corrigé : une fois le QCM
      réussi sans faute, `actData.qcmOutro` (si présent) est joué
      avant de continuer.

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
     MACHINE À ÉTATS D'UN ACTE
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

    // ---- Acte à mini-jeu OBLIGATOIRE (ex. le combat final d'un
    // monde) : plus de formative/transfer VN, le mini-jeu lui-même
    // est l'évaluation, rejoué jusqu'à réussite. ----
    if (actData.mandatory_minigame) {
      let passed = false;
      while (!passed) {
        const result = await playMinigameForNotion(worldId, actId, actData.minigame_notion, false);
        passed = result.passed;
      }
      GameState.setActStep(worldId, actId, "vn_check_passed", true);
      GameState.setActStep(worldId, actId, "minigame_passed", true);
      GameState.setActStep(worldId, actId, "vn_transfer_passed", true);
      advanceAct(worldId, actId);
      return;
    }

    let formativeResult = await VNEngine.playFillBlank(actData.formative);
    GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);

    while (!formativeResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      formativeResult = await VNEngine.playFillBlank(actData.formative);
      GameState.setActStep(worldId, actId, "vn_check_passed", formativeResult.passed);
    }

    let transferResult = await VNEngine.playFillBlank(actData.transfer, { fixedText: true });
    GameState.setActStep(worldId, actId, "vn_transfer_passed", transferResult.passed);

    while (!transferResult.passed) {
      await playMinigameForNotion(worldId, actId, actData.minigame_notion, true);
      transferResult = await VNEngine.playFillBlank(actData.transfer, { fixedText: true });
      GameState.setActStep(worldId, actId, "vn_transfer_passed", transferResult.passed);
    }

    advanceAct(worldId, actId);
  }

  /**
   * Boucle des "questions de cours" (QCM posé par le méchant de l'acte).
   *
   * Accepte actData.qcm sous deux formes :
   *   - un TABLEAU de questions (nouveau format)
   *   - un objet UNIQUE (ancien format)
   *
   * Logique : les questions sont posées dans l'ordre. Une bonne réponse
   * passe à la suivante. Une mauvaise réponse déclenche IMMÉDIATEMENT
   * le mini-jeu en remédiation, puis relance TOUT le questionnaire
   * depuis la première question. Une fois le passage réussi sans
   * faute, `actData.qcmOutro` (scènes narratives optionnelles, ex.
   * réaction du méchant vaincu) est joué s'il existe.
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

    if (actData.qcmOutro && actData.qcmOutro.length) {
      await VNEngine.playScenes(actData.qcmOutro);
    }
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
