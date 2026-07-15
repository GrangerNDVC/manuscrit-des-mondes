/* ============================================================
   LE MANUSCRIT DES MONDES — mg-shared.js
   ============================================================
   Utilitaires communs à tous les mini-jeux :
   - showInstructions() : overlay affiché AVANT le jeu, avec un
     titre, l'objectif, et un bouton "Commencer". Résout une
     Promise quand le joueur clique.
   - showResult() : overlay affiché APRÈS le jeu (succès/échec),
     réutilise les classes .minigame-result déjà définies dans
     minigames.css. Affiche un message explicite (notamment la
     bonne réponse en cas d'échec) et attend un clic "Continuer"
     avant de résoudre.

   Les deux overlays sont injectés directement dans #screen-minigame
   (qui a déjà position:relative dans minigames.css).

   Chaque mg-*.js doit :
     1. await MinigameUI.showInstructions({ title, objective, html })
        AVANT de démarrer sa boucle de jeu.
     2. await MinigameUI.showResult({ passed, message })
        APRÈS avoir déterminé le résultat, puis SEULEMENT ENSUITE
        resolve() la Promise du run().
   ============================================================ */

const MinigameUI = (() => {

  function showInstructions({ title, objective, html }) {
    return new Promise(resolve => {
      const screen = document.getElementById("screen-minigame");
      const overlay = document.createElement("div");
      overlay.className = "minigame-result"; // réutilise le style existant
      overlay.innerHTML = `
        <h2 style="color: var(--color-accent-gold);">${title}</h2>
        <p style="max-width: 560px; font-size: 1.05rem; line-height:1.6;">${objective}</p>
        ${html ? `<div style="max-width:560px;">${html}</div>` : ""}
        <button id="mg-start-btn" class="btn-primary">Commencer</button>
      `;
      screen.appendChild(overlay);

      document.getElementById("mg-start-btn").addEventListener("click", () => {
        overlay.remove();
        resolve();
      });
    });
  }

  function showResult({ passed, message }) {
    return new Promise(resolve => {
      const screen = document.getElementById("screen-minigame");
      const overlay = document.createElement("div");
      overlay.className = "minigame-result " + (passed ? "success" : "failure");
      overlay.innerHTML = `
        <h2>${passed ? "Bravo !" : "Pas tout à fait..."}</h2>
        <p style="max-width: 560px; font-size: 1.05rem; line-height:1.6;">${message || ""}</p>
        <button id="mg-continue-btn" class="btn-primary">
          ${passed ? "Continuer" : "Réessayer"}
        </button>
      `;
      screen.appendChild(overlay);

      document.getElementById("mg-continue-btn").addEventListener("click", () => {
        overlay.remove();
        resolve();
      });
    });
  }

  return { showInstructions, showResult };

})();
