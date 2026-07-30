/* ============================================================
   LE MANUSCRIT DES MONDES — syncManager.js
   ============================================================
   Rôle UNIQUE : envoyer vers Supabase le résumé de progression
   (calculé par ProgressionMapper) d'un élève connecté.

   Ne bloque jamais le jeu : si l'envoi échoue (pas de réseau,
   wifi de classe capricieux...), on note juste une erreur dans
   la console et on continue. La vraie progression reste de
   toute façon en sécurité dans localStorage via GameState.
   ============================================================ */

const SyncManager = (() => {

  // Même projet Supabase que authManager.js — à garder identique.
  const SUPABASE_URL = "https://fnolygpbldytirfqlqmh.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_3O1UII8533Qj5ASNFIJt8A_s7B1AFXX";
  const TABLE_URL = SUPABASE_URL + "/rest/v1/notions_progression";

  /**
   * Envoie le résumé de progression (toutes les notions) vers Supabase
   * pour l'élève actuellement connecté. Ne fait rien si personne n'est
   * connecté (ex. élève en train de jouer sans avoir validé de compte).
   */
  async function envoyerProgression() {
    const session = AuthManager.getSession();
    if (!session || !session.token || !session.eleve_id) {
      // Pas de session valide : on ne peut pas savoir à qui envoyer
      // ces données. On laisse simplement la sauvegarde locale faire
      // foi, sans bloquer le jeu.
      return;
    }

    const lignes = ProgressionMapper.construireResumeProgression().map(ligne => ({
      ...ligne,
      eleve_id: session.eleve_id,
    }));

    try {
      const res = await fetch(TABLE_URL, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + session.token,
          "Content-Type": "application/json",
          // Prefer merge-duplicates : met à jour la ligne existante
          // (même élève + même notion) au lieu de refuser un doublon.
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(lignes),
      });

      if (!res.ok) {
        const texte = await res.text();
        console.warn("Synchronisation Supabase refusée :", texte);
      }
    } catch (e) {
      // Erreur réseau (pas de wifi, coupure...) : pas grave, on
      // réessaiera à la prochaine étape terminée.
      console.warn("Synchronisation Supabase impossible pour le moment.", e);
    }
  }

  return { envoyerProgression };

})();
