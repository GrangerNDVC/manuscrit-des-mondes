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

   Utilise GameState.setActStep(...) — exactement la même
   fonction que le vrai jeu utiliserait. Donc tout ce qui est
   branché dessus (sauvegarde locale, envoi Supabase) se
   déclenche normalement, comme si c'était un vrai élève qui
   avait terminé l'étape.
   ============================================================ */

const DevPanel = (() => {

  let panelBuilt = false;

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

      status.textContent = `Fait : ${nomLisible(worldId)} / ${nomLisible(actId)} — vérifie Supabase.`;
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
