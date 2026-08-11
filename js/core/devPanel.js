/* ============================================================
   LE MANUSCRIT DES MONDES — devPanel.js (v2)
   ============================================================
   Outil de TEST/DEBUG uniquement.

   ---- REFONTE (session en cours) ----
   L'ancienne version n'était accessible QUE depuis le hub
   (bouton "🛠️ Mode Test" visible sur l'écran menu), ce qui obligeait
   à quitter le monde en cours pour tester/sauter une étape, puis à y
   retourner manuellement — signalé comme très pénible par Julie.

   Nouvelle version : un petit repère quasiment invisible, injecté en
   bas à gauche de N'IMPORTE QUELLE page (hub ET pages de monde), sur
   lequel cliquer demande un code. Une fois le bon code entré, un
   panneau de débogage s'ouvre avec deux actions :
     - "Aller directement à cet acte" : modifie l'état ET navigue
       tout de suite vers la page du monde choisi, à l'acte choisi —
       fonctionne depuis le hub OU depuis un autre monde, sans étape
       intermédiaire.
     - "Marquer cette étape terminée" (comportement de l'ancienne
       version, conservé) : coche les 4 sous-étapes d'un acte sans
       y jouer, utile pour tester la sauvegarde/Supabase.

   Ce script doit être chargé sur TOUTES les pages (index.html ET
   chaque page /mondes/<id>.html) pour fonctionner partout. La table
   WORLD_PAGES est dupliquée ici volontairement (comme dans
   hubManager.js) : ce fichier ne doit dépendre de rien d'autre que
   gameState.js, qui lui est déjà chargé partout.
   ============================================================ */

const DevPanel = (() => {

  // Code de déverrouillage — insensible à la casse et aux espaces
  // superflus. Change-le ici si besoin.
  const UNLOCK_CODE = "granger-debug";

  let unlocked = false;
  let panelBuilt = false;

  // Même table que WORLD_PAGES dans hubManager.js — à tenir à jour au
  // fur et à mesure que de nouveaux mondes sont développés.
  const WORLD_PAGES = {
    hugo: "/mondes/hugo.html"
    // dumas: "/mondes/dumas.html",
    // galland: "/mondes/galland.html",
    // ...
  };

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
    return id.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
  }

  /**
   * Petit repère discret, présent sur toutes les pages. Très faible
   * opacité au repos (quasi invisible), un peu plus visible au survol
   * (pratique en développement sur ordinateur ; sur tablette/mobile,
   * il reste cliquable même sans "survol" visible au préalable).
   */
  function buildTrigger() {
    if (document.getElementById("dev-trigger")) return;
    const icon = document.createElement("div");
    icon.id = "dev-trigger";
    icon.textContent = "✶";
    icon.style.cssText = `
      position: fixed; bottom: 6px; left: 6px; z-index: 9998;
      width: 26px; height: 26px; line-height: 26px; text-align: center;
      font-size: 15px; color: rgba(255,255,255,0.10);
      cursor: pointer; user-select: none; font-family: sans-serif;
      transition: color 0.2s;
    `;
    icon.addEventListener("mouseenter", () => { icon.style.color = "rgba(255,255,255,0.55)"; });
    icon.addEventListener("mouseleave", () => { icon.style.color = "rgba(255,255,255,0.10)"; });
    icon.addEventListener("click", onTriggerClick);
    document.body.appendChild(icon);
  }

  function onTriggerClick() {
    if (unlocked) {
      ouvrirPanel();
      return;
    }
    const entered = window.prompt("Code :");
    if (entered !== null && entered.trim().toLowerCase() === UNLOCK_CODE) {
      unlocked = true;
      ouvrirPanel();
    }
  }

  function construirePanel() {
    if (panelBuilt) return;
    panelBuilt = true;

    const panel = document.createElement("div");
    panel.id = "dev-panel";
    panel.style.cssText = `
      position: fixed; bottom: 40px; left: 6px; z-index: 9999;
      background: #1a1a1a; color: #fff; padding: 16px;
      border: 2px solid #ffb400; border-radius: 8px;
      font-family: sans-serif; font-size: 14px; width: 280px;
      display: none;
    `;

    panel.innerHTML = `
      <div style="font-weight:bold; margin-bottom:8px;">🛠️ Debug — Le Manuscrit des Mondes</div>

      <label style="display:block; margin-bottom:4px;">Monde :</label>
      <select id="dev-world" style="width:100%; margin-bottom:8px;"></select>

      <label style="display:block; margin-bottom:4px;">Acte :</label>
      <select id="dev-act" style="width:100%; margin-bottom:10px;"></select>

      <button id="dev-goto-btn" style="width:100%; padding:8px; margin-bottom:6px; cursor:pointer;">
        ▶ Aller directement à cet acte
      </button>
      <button id="dev-complete-btn" style="width:100%; padding:8px; margin-bottom:6px; cursor:pointer;">
        ✅ Marquer cette étape terminée (sans y jouer)
      </button>
      <button id="dev-close-btn" style="width:100%; padding:6px; background:#333; color:#fff; cursor:pointer;">
        Fermer
      </button>

      <div id="dev-status" style="font-size:12px; color:#aaa; min-height:16px; margin-top:8px;"></div>
    `;

    document.body.appendChild(panel);

    const worldSelect = panel.querySelector("#dev-world");
    const actSelect = panel.querySelector("#dev-act");
    const status = panel.querySelector("#dev-status");

    GameState.WORLD_IDS.forEach(worldId => {
      const opt = document.createElement("option");
      opt.value = worldId;
      opt.textContent = nomLisible(worldId) + (WORLD_PAGES[worldId] ? "" : " (pas encore de page)");
      worldSelect.appendChild(opt);
    });

    GameState.ACT_IDS.forEach(actId => {
      const opt = document.createElement("option");
      opt.value = actId;
      opt.textContent = nomLisible(actId);
      actSelect.appendChild(opt);
    });

    panel.querySelector("#dev-goto-btn").addEventListener("click", () => {
      const worldId = worldSelect.value;
      const actId = actSelect.value;
      const actIdx = GameState.ACT_IDS.indexOf(actId);

      const page = WORLD_PAGES[worldId];
      if (!page) {
        status.textContent = `Pas encore de page pour "${nomLisible(worldId)}" — rien à faire.`;
        return;
      }

      GameState.load();
      const w = GameState.get().worlds[worldId];
      w.currentAct = actIdx;
      GameState.save();

      // Navigation immédiate — fonctionne aussi bien depuis le hub
      // que depuis un autre monde, sans étape intermédiaire.
      window.location.href = page;
    });

    panel.querySelector("#dev-complete-btn").addEventListener("click", () => {
      const worldId = worldSelect.value;
      const actId = actSelect.value;

      GameState.load();
      GameState.setActStep(worldId, actId, "qcm_passed", true);
      GameState.setActStep(worldId, actId, "vn_check_passed", true);
      GameState.setActStep(worldId, actId, "minigame_passed", true);
      GameState.setActStep(worldId, actId, "vn_transfer_passed", true);

      const idx = GameState.ACT_IDS.indexOf(actId);
      const w = GameState.get().worlds[worldId];
      if (idx < GameState.ACT_IDS.length - 1) {
        w.currentAct = idx + 1;
        GameState.save();
      } else {
        GameState.completeWorld(worldId, COMPANION_BY_WORLD[worldId]);
      }

      status.textContent = `Fait : ${nomLisible(worldId)} / ${nomLisible(actId)} marqué terminé.`;
    });

    panel.querySelector("#dev-close-btn").addEventListener("click", () => {
      panel.style.display = "none";
    });
  }

  function ouvrirPanel() {
    construirePanel();
    document.getElementById("dev-panel").style.display = "block";
  }

  function init() {
    buildTrigger();
  }

  return { init };

})();

document.addEventListener("DOMContentLoaded", () => {
  try {
    DevPanel.init();
  } catch (err) {
    console.error("Erreur au démarrage de DevPanel :", err);
  }
});
