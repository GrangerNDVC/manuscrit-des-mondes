/* ============================================================
   LE MANUSCRIT DES MONDES — hubManager.js
   ============================================================
   Gère UNIQUEMENT le hub : menu principal, connexion, intro,
   carte des mondes. Ne connaît rien du déroulement d'un monde
   (VN, mini-jeux) — ça, c'est le rôle de worldRunner.js, chargé
   séparément dans chaque page /mondes/<worldId>.html.

   Navigation entre le hub et un monde = un vrai changement de
   page (window.location), pas un changement d'écran en JS.
   C'est plus robuste, plus simple à déboguer, et ça permet
   d'ajouter des mondes un par un sans jamais toucher au hub.
   ============================================================ */

const HubManager = (() => {

  const screens = {
    menu: document.getElementById("screen-menu"),
    login: document.getElementById("screen-login"),
    intro: document.getElementById("screen-intro"),
    map: document.getElementById("screen-map")
  };

  const overlay = document.getElementById("transition-overlay");

  // "signup" avant Nouvelle partie, "login" avant Continuer —
  // décide quelle action AuthManager appelle à la validation.
  let loginMode = "signup";

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

  /**
   * Position (en % de #map-worlds, verrouillé sur le ratio réel de
   * map-centrale.png) de chaque livre dans l'illustration. Mesuré
   * directement sur l'image ; à ajuster ici si l'image change.
   */
  const WORLD_HOTSPOTS = {
    hugo:        { left: 2,  top: 14, width: 22, height: 35 },
    dumas:       { left: 27, top: 14, width: 22, height: 35 },
    verne:       { left: 52, top: 14, width: 22, height: 35 },
    shakespeare: { left: 77, top: 14, width: 22, height: 35 },
    christie:    { left: 2,  top: 53, width: 22, height: 35 },
    shelley:     { left: 27, top: 53, width: 22, height: 35 },
    carroll:     { left: 52, top: 53, width: 22, height: 35 },
    galland:     { left: 77, top: 53, width: 22, height: 35 }
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

  /**
   * Ouvre l'écran de connexion. mode = "signup" (avant une
   * nouvelle partie) ou "login" (avant de continuer).
   */
  function goToLogin(mode) {
    loginMode = mode;
    document.getElementById("login-title").textContent =
      mode === "signup" ? "Choisis ton identité" : "Reconnexion";
    document.getElementById("login-error").hidden = true;
    document.getElementById("login-nom").value = "";
    document.getElementById("login-code").value = "";
    showScreen("login");
  }

  function afficherErreurLogin(message) {
    const err = document.getElementById("login-error");
    err.textContent = message;
    err.hidden = false;
  }

  /**
   * Appelée par le bouton Valider de l'écran de connexion.
   * Signup ou login selon loginMode, puis reprend exactement
   * ce que faisaient déjà btn-new-game / btn-continue avant.
   */
  async function validerLogin() {
    const nom = document.getElementById("login-nom").value.trim();
    const code = document.getElementById("login-code").value.trim();

    if (!nom || !code) {
      afficherErreurLogin("Merci de remplir le nom et le code.");
      return;
    }

    const bouton = document.getElementById("btn-login-submit");
    bouton.disabled = true;

    try {
      if (loginMode === "signup") {
        await AuthManager.signUp(nom, code);
        GameState.reset();
        if (GameState.get().introWatched) {
          goToMap();
        } else {
          goToIntro();
        }
      } else {
        await AuthManager.logIn(nom, code);
        GameState.load();
        goToMap();
      }
    } catch (err) {
      afficherErreurLogin(err.message);
    } finally {
      bouton.disabled = false;
    }
  }

  function renderMap() {
    const container = document.getElementById("map-worlds");
    const keysContainer = document.getElementById("map-keys");
    const state = GameState.get();
    container.innerHTML = "";
    keysContainer.innerHTML = "";

    GameState.WORLD_IDS.forEach((worldId) => {
      const w = state.worlds[worldId];
      const hasPage = !!WORLD_PAGES[worldId];
      const isPlayable = w.unlocked && hasPage;

      const portal = document.createElement("div");
      portal.className = "world-portal" + (isPlayable ? "" : " locked");

      const spot = WORLD_HOTSPOTS[worldId];
      if (spot) {
        portal.style.left = spot.left + "%";
        portal.style.top = spot.top + "%";
        portal.style.width = spot.width + "%";
        portal.style.height = spot.height + "%";
      }

      if (isPlayable) {
        // Seul un monde jouable affiche un petit badge (progression) —
        // l'illustration porte déjà le titre, pas besoin de le répéter.
        const statusLabel = w.currentAct === -1
          ? "✓ terminé"
          : `Acte ${w.currentAct + 1}/${GameState.ACT_IDS.length}`;
        portal.innerHTML = `<span class="portal-badge">${statusLabel}</span>`;
        portal.addEventListener("click", () => {
          window.location.href = WORLD_PAGES[worldId];
        });
      }
      // Mondes verrouillés/à venir : zone positionnée mais sans aucun
      // contenu visible — prête à s'activer le jour où ces mondes
      // seront développés, sans rien changer ici.

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
      goToLogin("signup");
    });

    document.getElementById("btn-continue").addEventListener("click", () => {
      goToLogin("login");
    });

    document.getElementById("btn-login-submit").addEventListener("click", validerLogin);
    document.getElementById("btn-login-cancel").addEventListener("click", goToMenu);

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
