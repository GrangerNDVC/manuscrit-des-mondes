/* ============================================================
   LE MANUSCRIT DES MONDES — gameState.js
   ============================================================
   Source unique de vérité pour la progression du joueur.
   Persisté en localStorage. Toute lecture/écriture de la
   progression passe par cet objet pour rester cohérente
   entre VN, mini-jeux et carte des mondes.

   ---- CORRECTION (session du 2 août 2026, bug n°2) ----
   Bug urgent signalé par Julie : en jouant avec le compte "juju"
   jusqu'à l'acte 2, puis en créant un second compte "juju2" pour
   tester le Mode Test, la progression de "juju" a été effacée —
   revenue au tout début en rechargeant "Continuer".

   Cause : la sauvegarde locale utilisait une clé localStorage
   FIXE et UNIQUE ("manuscrit_des_mondes_save"), jamais liée au
   compte connecté. Il n'existait donc qu'une seule case mémoire
   pour toute progression, quel que soit le compte. Créer un
   second compte appelle GameState.reset(), qui écrase cette même
   case unique — donc la progression du compte précédent, même si
   elle n'a techniquement rien à voir avec le nouveau compte.

   Corrigé : la clé de sauvegarde intègre maintenant le nom du
   compte actuellement connecté (lu directement depuis la session
   sauvegardée par authManager.js, sans avoir besoin que ce fichier
   soit chargé sur la page en cours — important car les pages de
   mondes, ex. /mondes/hugo.html, ne chargent pas authManager.js).
   Chaque compte a désormais sa propre case de sauvegarde, totalement
   indépendante des autres.

   ⚠️ Effet de bord attendu, à signaler à Julie : les anciennes
   sauvegardes stockées sous l'ancienne clé unique ne seront plus
   retrouvées automatiquement après ce correctif (le nouveau format
   de clé est différent). Vu que la progression de "juju" a de toute
   façon déjà été perdue par le bug lui-même, il n'y a normalement
   rien à récupérer — mais toute progression en cours au moment du
   déploiement de ce correctif devra être rejouée une dernière fois.
   ============================================================ */

const GameState = (() => {

  // Même clé que SESSION_KEY dans authManager.js — dupliquée ici
  // volontairement pour ne pas dépendre du chargement d'authManager.js
  // sur les pages qui n'en ont pas besoin par ailleurs (mondes/*.html).
  const SESSION_STORAGE_KEY = "manuscrit_des_mondes_session";
  const STORAGE_KEY_BASE = "manuscrit_des_mondes_save";

  /**
   * Lit l'identifiant du compte actuellement connecté (nom_lumiere),
   * directement depuis le localStorage de session — sans passer par
   * l'objet AuthManager, qui n'est pas forcément chargé sur cette page.
   * Renvoie null si personne n'est connecté (ex. tout premier écran).
   */
  function getActiveAccountId() {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session && session.nom_lumiere ? session.nom_lumiere : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Nettoie l'identifiant de compte pour en faire une clé localStorage
   * sûre (le nom d'être de lumière est saisi librement par l'élève,
   * peut contenir espaces/accents/caractères spéciaux).
   */
  function sanitizeAccountId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  }

  /**
   * Calcule la clé de sauvegarde à utiliser, propre au compte
   * actuellement connecté. "anonyme" sert uniquement de filet de
   * sécurité pour le tout premier chargement du hub, avant qu'un
   * compte ait été choisi (aucune vraie partie ne devrait rester
   * sous cette clé une fois connecté).
   */
  function getStorageKey() {
    const account = getActiveAccountId();
    return account
      ? `${STORAGE_KEY_BASE}__${sanitizeAccountId(account)}`
      : `${STORAGE_KEY_BASE}__anonyme`;
  }

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
   * Charge l'état depuis localStorage (case propre au compte connecté),
   * ou crée une nouvelle partie si rien n'existe encore pour ce compte.
   */
  function load() {
    try {
      const raw = localStorage.getItem(getStorageKey());
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
   * Sauvegarde l'état courant dans localStorage, sous la case propre
   * au compte actuellement connecté.
   */
  function save() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (e) {
      console.error("Impossible de sauvegarder la progression.", e);
    }
  }

  /**
   * Réinitialise complètement la progression (Nouvelle partie).
   * N'affecte que la case du compte actuellement connecté — ne touche
   * plus jamais à la progression d'un autre compte.
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
      // échoue (voir syncManager.js) — la sauvegarde locale ci-dessus
      // reste de toute façon la source de vérité immédiate.
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
