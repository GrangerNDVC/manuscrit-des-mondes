/* ============================================================
   LE MANUSCRIT DES MONDES — progressionMapper.js
   ============================================================
   Calcule un résumé simple (remplissage % + étoiles) par notion,
   à partir de la progression détaillée de GameState, pour la
   synchronisation vers Supabase (table notions_progression).

   Ce fichier ne parle jamais directement à Supabase — c'est le
   rôle de syncManager.js. Ici, on ne fait QUE le calcul.
   ============================================================ */

const ProgressionMapper = (() => {

  const SOUS_ETAPES = [
    "qcm_passed",
    "vn_check_passed",
    "minigame_passed",
    "vn_transfer_passed"
  ];

  /**
   * Remplissage + étoiles d'une notion (actId), agrégés sur les 8 mondes.
   */
  function calculerResumeNotion(actId) {
    const state = GameState.get();
    const totalPossible = GameState.WORLD_IDS.length * SOUS_ETAPES.length; // 32

    let totalValide = 0;

    GameState.WORLD_IDS.forEach(worldId => {
      const acte = state.worlds[worldId].acts[actId];
      SOUS_ETAPES.forEach(step => {
        if (acte[step] === true) totalValide++;
      });
    });

    const remplissage = Math.round((totalValide / totalPossible) * 100);
    const etoiles = calculerEtoiles(remplissage);

    return { remplissage, etoiles };
  }

  /**
   * Barème étoiles — seuils à ajuster selon ce que Julie veut afficher.
   */
  function calculerEtoiles(remplissage) {
    if (remplissage >= 90) return 3;
    if (remplissage >= 60) return 2;
    if (remplissage >= 25) return 1;
    return 0;
  }

  /**
   * Tableau complet des 6 notions, prêt pour un envoi vers
   * notions_progression (une ligne par notion pour l'élève courant).
   */
  function construireResumeProgression() {
    return GameState.ACT_IDS.map(actId => {
      const { remplissage, etoiles } = calculerResumeNotion(actId);
      return {
        notion_id: actId,
        remplissage,
        etoiles,
        updated_at: new Date().toISOString()
      };
    });
  }

  return { calculerResumeNotion, construireResumeProgression };

})();
