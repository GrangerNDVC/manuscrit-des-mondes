/* ============================================================
   LE MANUSCRIT DES MONDES — main.js
   ============================================================
   Point d'entrée. Initialise l'état du jeu et branche les
   boutons du menu principal.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  GameState.load();

  document.getElementById("btn-new-game").addEventListener("click", () => {
    GameState.reset();
    if (GameState.get().introWatched) {
      SceneManager.goToMap();
    } else {
      SceneManager.goToIntro();
    }
  });

  document.getElementById("btn-continue").addEventListener("click", () => {
    GameState.load();
    SceneManager.goToMap();
  });

  document.getElementById("btn-skip-intro").addEventListener("click", () => {
    GameState.get().introWatched = true;
    GameState.save();
    SceneManager.goToMap();
  });

  document.getElementById("intro-video").addEventListener("ended", () => {
    GameState.get().introWatched = true;
    GameState.save();
    SceneManager.goToMap();
  });

  SceneManager.goToMenu();
});
