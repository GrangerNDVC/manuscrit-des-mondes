/* ============================================================
   LE MANUSCRIT DES MONDES — devPanel.js
   ============================================================
   Panneau de TEST UNIQUEMENT — à retirer avant une mise en
   production finale (ou à garder caché derrière un mot de
   passe, à décider plus tard).

   Rôle : permettre de marquer une étape (acte) d'un monde comme
   terminée en un clic, SANS jouer le QCM / VN / mini-jeu en
   entier. Utile pour tester la sauvegarde et la synchronisation
   Supabase sans refaire tout le jeu à chaque fois.

   ---- CORRECTION (session du 2 août 2026) ----
   Bug trouvé suite à un retour de Julie : "même en mode test, je
   n'ai pas accès à l'étape 2". Cause : le bouton marquait bien les
   4 sous-étapes de l'acte comme réussies (via GameState.setActStep),
   mais ne touchait JAMAIS à world.currentAct — la donnée que
   SceneManager.startWorld() regarde pour savoir quel acte lancer.
   Seul un vrai parcours de jeu (sceneManager.js/advanceAct(), appelé
   en fin d'acte réussi) faisait avancer currentAct. Résultat : marquer
   un acte "terminé" cochait des cases en interne, mais ne débloquait
   jamais l'accès à l'acte suivant en relançant le monde depuis la
   carte — currentAct restait bloqué sur l'acte en cours.

   Corrigé : le bouton fait maintenant explicitement avancer
   world.currentAct vers l'acte suivant (ou termine le monde et
   libère le compagnon si c'est le dernier acte), en reproduisant
   ce que sceneManager.js fait normalement en fin d'acte.

   Utilise GameState.setActStep(...) — exactement la même
   fonction que le vrai jeu utiliserait. Donc tout ce qui est
   branché dessus (sauvegarde locale, envoi Supabase) se
   déclenche normalement, comme si c'était un vrai élève qui
   avait terminé l'étape.
   ============================================================ */

const DevPanel = (() => {

  let panelBuilt = false;

  // Même correspondance que sceneManager.js/companionByWorld — dupliquée
  // ici car sceneManager.js ne vit que dans les pages /mondes/*.html,
  // jamais dans le hub (où vit devPanel.js).
  const COMPANION_BY_WORLD = {
    hugo: "gavroche",
    dumas: "dartagnan",
    verne: "nemo",
    shakespeare: "puck",
    christie: "marple",
    shelley: "creature",
    carroll: "alice",
    galland: "sheherazade"
  };

  function nomLisible(id) {
    // Transforme "ordre_des_mots" en "Ordre des mots", juste pour
    // que ce soit plus facile à lire dans le menu déroulant.
    return id.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
  }

  function construirePanel() {
    if (panelBuilt) return;
    panelBuilt = true;

    const panel = document.createElement("div");
    panel.id = "dev-panel";
    panel.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 9999;
      background: #1a1a1a; color: #fff; padding: 16px;
      border: 2px solid #ffb400; border-radius: 8px;
      font-family: sans-serif; font-size: 14px; width: 280px;
      display: none;
    `;

    panel.innerHTML = `
      <div style="font-weight:bold; margin-bottom:8px;">
        🛠️ Mode Test (à retirer plus tard)
      </div>
      <label style="display:block; margin-bottom:4px;">Monde :</label>
      <select id="dev-world" style="width:100%; margin-bottom:8px;"></select>

      <label style="display:block; margin-bottom:4px;">Étape :</label>
      <select id="dev-act" style="width:100%; margin-bottom:8px;"></select>

      <button id="dev-complete-btn" style="width:100%; padding:8px; margin-bottom:6px;">
        ✅ Marquer cette étape comme terminée
      </button>

      <div id="dev-status" style="font-size:12px; color:#aaa; min-height:16px;"></div>
    `;

    document.body.appendChild(panel);

    const worldSelect = panel.querySelector("#dev-world");
    const actSelect = panel.querySelector("#dev-act");
    const status = panel.querySelector("#dev-status");

    GameState.WORLD_IDS.forEach(worldId => {
      const opt = document.createElement("option");
      opt.value = worldId;
      opt.textContent = nomLisible(worldId);
      worldSelect.appendChild(opt);
    });

    GameState.ACT_IDS.forEach(actId => {
      const opt = document.createElement("option");
      opt.value = actId;
      opt.textContent = nomLisible(actId);
      actSelect.appendChild(opt);
    });

    panel.querySelector("#dev-complete-btn").addEventListener("click", async () => {
      const worldId = worldSelect.value;
      const actId = actSelect.value;

      // On force les 4 phases à "réussi" d'un coup, exactement comme
      // si l'élève avait vraiment terminé les 4, dans l'ordre.
      GameState.setActStep(worldId, actId, "qcm_passed", true);
      GameState.setActStep(worldId, actId, "vn_check_passed", true);
      GameState.setActStep(worldId, actId, "minigame_passed", true);
      GameState.setActStep(worldId, actId, "vn_transfer_passed", true);
      // ↑ c'est cette dernière ligne qui déclenche l'envoi vers Supabase

      // NOUVEAU (correctif débloquant l'acte suivant) : fait avancer
      // world.currentAct, exactement ce que sceneManager.js/advanceAct()
      // fait après un vrai parcours réussi. Sans cette étape, l'acte
      // suivant restait inaccessible même après avoir "marqué terminé".
      const idx = GameState.ACT_IDS.indexOf(actId);
      const w = GameState.get().worlds[worldId];
      if (idx < GameState.ACT_IDS.length - 1) {
        w.currentAct = idx + 1;
        GameState.save();
      } else {
        // Dernier acte du monde : simule la fin de monde (libère le
        // compagnon, obtient la clé), comme sceneManager.js/finishWorld().
        GameState.completeWorld(worldId, COMPANION_BY_WORLD[worldId]);
      }

      status.textContent = `Fait : ${nomLisible(worldId)} / ${nomLisible(actId)} — acte suivant débloqué. Vérifie Supabase.`;
    });

    document.getElementById("dev-panel").style.display = "block";
  }

  /**
   * Ouvre (ou construit puis ouvre) le panneau.
   */
  function ouvrir() {
    construirePanel();
    document.getElementById("dev-panel").style.display = "block";
  }

  function init() {
    // Le bouton "Mode Test" doit déjà exister dans index.html
    // (voir instructions), avec l'id "btn-dev-mode".
    const bouton = document.getElementById("btn-dev-mode");
    if (bouton) {
      bouton.addEventListener("click", ouvrir);
    }
  }

  return { init, ouvrir };

})();

document.addEventListener("DOMContentLoaded", () => {
  DevPanel.init();
});
