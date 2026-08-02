/* ============================================================
   LE MANUSCRIT DES MONDES — gameState.js
   ============================================================
   Source unique de vérité pour la progression du joueur.
   Persisté en localStorage. Toute lecture/écriture de la
   progression passe par cet objet pour rester cohérente
   entre VN, mini-jeux et carte des mondes.

   ---- CORRECTION (session du 2 août 2026) ----
   Bug trouvé suite à un retour de Julie : l'écran restait figé
   après avoir réellement terminé l'acte 1 en jouant (pas via le
   Mode Test). Cause identifiée dans la console :
       Uncaught (in promise) TypeError:
       SyncManager.envoyerProgression is not a function
   L'appel avait lieu ici, dans setActStep(), au moment précis où
   le transfert différé (vn_transfer_passed) est validé — c'est-à-
   dire exactement à la fin de l'acte 1, juste avant que
   sceneManager.js n'appelle advanceAct(). Comme setActStep() est
   appelée de façon synchrone à l'intérieur d'une fonction async
   (runActSequence) et que rien n'attrapait l'erreur, toute la
   suite de la chaîne asynchrone s'arrêtait net : advanceAct()
   n'était jamais atteinte, d'où l'écran figé.

   Corrigé : l'appel à SyncManager est maintenant entouré d'un
   try/catch ET vérifie que envoyerProgression est bien une
   fonction avant de l'appeler (pas seulement que SyncManager est
   défini). Si la synchronisation échoue pour n'importe quelle
   raison, un avertissement est loggé en console mais LE JEU
   CONTINUE — cohérent avec la philosophie déjà affichée dans
   syncManager.js lui-même ("Ne bloque jamais le jeu").

   ⚠️ Cette correction traite le SYMPTÔME (le jeu ne doit plus
   jamais se figer à cause d'un souci de synchronisation). Elle ne
   dit pas pourquoi SyncManager.envoyerProgression n'était pas une
   fonction ce jour-là (version différente de syncManager.js
   servie en ligne ? cache navigateur ?) — à vérifier si le
   problème de sync Supabase lui-même persiste après ce correctif
   (le jeu progressera normalement, mais peut-être sans
   synchronisation réelle vers Supabase tant que la cause profonde
   n'est pas identifiée).
   ============================================================ */

const GameState = (() => {

  const STORAGE_KEY = "manuscrit_des_mondes_save";

  /**
   * IDs des 8 mondes (alignés sur les auteurs).
   * Chaque monde possède exactement 6 actes (notions).
   */
  const WORLD_IDS = [
    "hugo", "dumas", "verne", "shakespeare",
    "christie", "shelley", "carroll", "galland"
  ];

  /**
   * Les 6 actes pédagogiques, identiques dans chaque monde.
   * "notion" est l'identifiant utilisé par les mini-jeux et
   * les exercices VN pour savoir quelle compétence est visée.
   */
  const ACT_IDS = [
    "ponctuation",        // Acte 1
    "ordre_des_mots",     // Acte 2
    "subordonnees",       // Acte 3
    "coherence_paragraphe", // Acte 4
    "selection_info",     // Acte 5
    "construction_recit"  // Acte 6
  ];

  /**
   * Compagnons : un par monde, possède chacun une des 8 clés.
   */
  const COMPANION_IDS = [
    "esprit",      // joueur — toujours présent, possède aussi une clé symbolique
    "gavroche",    // hugo
    "dartagnan",   // dumas
    "nemo",        // verne
    "puck",        // shakespeare
    "marple",      // christie
    "creature",    // shelley
    "alice",       // carroll
    "sheherazade"  // galland
  ];

  /**
   * Structure par défaut d'une nouvelle partie.
   */
  function createDefaultState() {
    const acts = {};
    ACT_IDS.forEach(actId => {
      acts[actId] = {
        // Statut de chaque sous-étape pédagogique de l'acte
        qcm_passed: false,        // QCM du méchant (pré-évaluation)
        vn_check_passed: false,   // texte à trous VN (évaluation formative)
        minigame_passed: false,   // mini-jeu (évaluation sommative)
        vn_transfer_passed: false,// retour VN texte fixe (transfert différé)
        attempts: 0,              // nb de tentatives (sert à varier les occurrences)
        completed: false
      };
    });

    const worlds = {};
    WORLD_IDS.forEach(worldId => {
      worlds[worldId] = {
        unlocked: true, // accès libre dès le départ : le joueur navigue comme il veut
        currentAct: 0,           // index dans ACT_IDS, -1 = monde terminé
        acts: JSON.parse(JSON.stringify(acts)),
        companionFreed: false,
        authorFreed: false,
        keyObtained: false
      };
    });

    const companions = {};
    COMPANION_IDS.forEach(id => {
      companions[id] = { unlocked: id === "esprit" }; // l'Esprit est jouable d'emblée
    });

    return {
      version: 1,
      currentScreen: "menu",
      introWatched: false,
      currentWorld: null,
      currentSceneId: null,
      worlds,
      companions,
      keys: COMPANION_IDS.reduce((acc, id) => {
        acc[id] = (id === "esprit"); // clé symbolique de l'Esprit déjà "acquise"
        return acc;
      }, {}),
      towerUnlocked: false,
      // Historique des variantes déjà jouées par notion, pour ne jamais
      // répéter la même occurrence de mini-jeu/QCM lors d'une remédiation
      exerciseHistory: {}
    };
  }

  let state = null;

  /**
   * Charge l'état depuis localStorage, ou crée une nouvelle partie.
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        return state;
      }
    } catch (e) {
      console.warn("Sauvegarde illisible, création d'une nouvelle partie.", e);
    }
    state = createDefaultState();
    return state;
  }

  /**
   * Sauvegarde l'état courant dans localStorage.
   */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Impossible de sauvegarder la progression.", e);
    }
  }

  /**
   * Réinitialise complètement la progression (Nouvelle partie).
   */
  function reset() {
    state = createDefaultState();
    save();
    return state;
  }

  function get() {
    if (!state) load();
    return state;
  }

  /**
   * Marque une sous-étape d'un acte comme réussie/échouée.
   * step ∈ "qcm_passed" | "vn_check_passed" | "minigame_passed" | "vn_transfer_passed"
   */
  function setActStep(worldId, actId, step, passed) {
    const act = get().worlds[worldId].acts[actId];
    act[step] = passed;
    if (!passed) {
      act.attempts += 1;
    }
    // Un acte est "completed" quand le transfert différé est réussi
    if (step === "vn_transfer_passed" && passed) {
      act.completed = true;
      // L'étape entière vient d'être terminée : on envoie le résumé
      // de progression vers Supabase. Ne bloque JAMAIS le jeu si ça
      // échoue (voir syncManager.js) — la sauvegarde locale ci-dessous
      // reste de toute façon la source de vérité immédiate.
      //
      // CORRECTIF : avant, seul `typeof SyncManager !== "undefined"`
      // était vérifié. Si SyncManager existait mais sans la méthode
      // envoyerProgression (ex. version différente chargée, script
      // corrompu...), l'appel plantait avec une erreur non rattrapée
      // en plein milieu d'une chaîne async (setActStep est appelée de
      // façon synchrone depuis runActSequence dans sceneManager.js) —
      // ce qui arrêtait tout net la suite du parcours (l'acte suivant
      // n'était jamais lancé, écran figé). On vérifie maintenant aussi
      // que c'est bien une fonction, ET on entoure l'appel d'un
      // try/catch : quoi qu'il arrive, la partie continue.
      try {
        if (typeof SyncManager !== "undefined" && typeof SyncManager.envoyerProgression === "function") {
          SyncManager.envoyerProgression();
        }
      } catch (e) {
        console.warn("Synchronisation Supabase impossible (setActStep) — la progression locale n'est pas affectée.", e);
      }
    }
    save();
  }

  /**
   * Enregistre quelle variante d'exercice a déjà été jouée pour une notion,
   * afin que sceneManager / mini-jeux puissent piocher une variante non jouée
   * lors d'une remédiation (jamais deux fois la même occurrence).
   */
  function recordExerciseVariant(notionId, variantId) {
    const hist = get().exerciseHistory;
    if (!hist[notionId]) hist[notionId] = [];
    if (!hist[notionId].includes(variantId)) {
      hist[notionId].push(variantId);
    }
    save();
  }

  function getPlayedVariants(notionId) {
    return get().exerciseHistory[notionId] || [];
  }

  /**
   * Termine un monde : libère le compagnon, l'auteur reste prisonnier
   * (collectivement, avec tous les autres) jusqu'à la Tour Finale, et
   * obtient la clé correspondante. Tous les mondes étant accessibles
   * librement dès le départ, il n'y a pas de "monde suivant" à
   * déverrouiller : seule l'obtention des 8 clés ouvre la Tour Finale.
   */
  function completeWorld(worldId, companionId) {
    const w = get().worlds[worldId];
    w.companionFreed = true;
    w.keyObtained = true;
    w.currentAct = -1;

    get().companions[companionId].unlocked = true;
    get().keys[companionId] = true;

    // Vérifie si les 8 clés sont obtenues -> Tour Finale
    const allKeys = Object.values(get().keys).every(v => v === true);
    if (allKeys) {
      get().towerUnlocked = true;
    }

    save();
  }

  return {
    WORLD_IDS,
    ACT_IDS,
    COMPANION_IDS,
    load,
    save,
    reset,
    get,
    setActStep,
    recordExerciseVariant,
    getPlayedVariants,
    completeWorld
  };

})();
