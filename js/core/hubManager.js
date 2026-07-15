/* ============================================================
   LE MANUSCRIT DES MONDES — hubManager.js
   ============================================================
   Gère UNIQUEMENT le hub : menu principal, intro, carte des
   mondes. Ne connaît rien du déroulement d'un monde (VN,
   mini-jeux) — ça, c'est le rôle de worldRunner.js, chargé
   séparément dans chaque page /mondes/<worldId>.html.

   Navigation entre le hub et un monde = un vrai changement de
   page (window.location), pas un changement d'écran en JS.
   C'est plus robuste, plus simple à déboguer, et ça permet
   d'ajouter des mondes un par un sans jamais toucher au hub.
   ============================================================ */

const HubManager = (() => {

  const screens = {
    menu: document.getElementById("screen-menu"),
    intro: document.getElementById("screen-intro"),
    map: document.getElementById("screen-map")
  };

  const overlay = document.getElementById("transition-overlay");

  /**
   * Chemin de la page de chaque monde. À compléter au fur et à
   * mesure que de nouveaux mondes sont développés (Phase 2, 3...).
   */
  const WORLD_PAGES = {
    hugo: "/mondes/hugo.html"
    // dumas: "/mondes/dumas.html",
    // verne: "/mondes/verne.html",
    // ...
  };

  function showScreen(name) {
    overlay.classList.add("active");
    setTimeout(() => {
      Object.values(screens).forEach(s => s && s.classList.remove("active"));
      if (screens[name]) screens[name].classList.add("active");
      overlay.classList.remove("active");
    }, 250);
  }

  function goToMenu() { showScreen("menu"); }
  function goToIntro() { showScreen("intro"); }

  function goToMap() {
    renderMap();
    showScreen("map");
  }

  function renderMap() {
    const container = document.getElementById("map-worlds");
    const keysContainer = document.getElementById("map-keys");
    const state = GameState.get();
    container.innerHTML = "";
    keysContainer.innerHTML = "";

    GameState.WORLD_IDS.forEach((worldId, i) => {
      const w = state.worlds[worldId];
      const hasPage = !!WORLD_PAGES[worldId];
      const portal = document.createElement("div");
      portal.className = "world-portal" + (w.unlocked && hasPage ? "" : " locked");
      const statusLabel = !hasPage
        ? " (à venir)"
        : (w.currentAct === -1 ? " ✓" : ` (acte ${w.currentAct + 1}/${GameState.ACT_IDS.length})`);
      portal.innerHTML = `<span>Monde ${i + 1}</span><strong>${worldId}</strong><small>${statusLabel}</small>`;
      if (w.unlocked && hasPage) {
        portal.addEventListener("click", () => {
          window.location.href = WORLD_PAGES[worldId];
        });
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

  function init() {
    GameState.load();

    document.getElementById("btn-new-game").addEventListener("click", () => {
      GameState.reset();
      if (GameState.get().introWatched) {
        goToMap();
      } else {
        goToIntro();
      }
    });

    document.getElementById("btn-continue").addEventListener("click", () => {
      GameState.load();
      goToMap();
    });

    document.getElementById("btn-skip-intro").addEventListener("click", () => {
      GameState.get().introWatched = true;
      GameState.save();
      goToMap();
    });

    const introVideo = document.getElementById("intro-video");
    if (introVideo) {
      introVideo.addEventListener("ended", () => {
        GameState.get().introWatched = true;
        GameState.save();
        goToMap();
      });
    }

    // Retour depuis un monde (bouton "◀ Bibliothèque" ou fin de monde,
    // voir sceneManager.js/goToHub) : on atterrit directement sur la
    // carte, pas sur l'écran menu de départ.
    if (window.location.hash === "#map") {
      history.replaceState(null, "", window.location.pathname);
      goToMap();
    } else {
      goToMenu();
    }
  }

  return { init, goToMenu, goToIntro, goToMap };

})();

document.addEventListener("DOMContentLoaded", () => {
  try {
    HubManager.init();
  } catch (err) {
    // Filet de sécurité : si une erreur survient malgré tout,
    // on la voit clairement dans la console plutôt que d'avoir
    // une page qui semble "morte" sans aucune explication.
    console.error("Erreur au démarrage du hub :", err);
  }
});
