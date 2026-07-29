/* ============================================================
   LE MANUSCRIT DES MONDES — authManager.js
   ============================================================
   Gère UNIQUEMENT l'identité du joueur (nom d'être de lumière
   + code secret) et la session Supabase qui en découle.
   Ne connaît rien de la progression du jeu — ça reste le rôle
   de GameState. Ce module fournit juste :
     - un jeton (JWT) valide, à envoyer pour toute future
       requête Supabase protégée par RLS,
     - l'eleve_id et le nom_lumiere du joueur connecté.

   /!\ À COMPLÉTER : remplace SUPABASE_ANON_KEY ci-dessous par
   ta vraie clé Publishable (Settings → API Keys). C'est une
   clé faite pour être publique, sans risque de la mettre ici.
   ============================================================ */

const AuthManager = (() => {

  const SUPABASE_URL = "https://fnolygpbldytirfqlqmh.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_3O1UII8533Qj5ASNFIJt8A_s7B1AFXX";
  const FUNCTION_URL = SUPABASE_URL + "/functions/v1/connexion";
  const SESSION_KEY = "manuscrit_des_mondes_session";

  let session = null;

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      session = raw ? JSON.parse(raw) : null;
    } catch (e) {
      session = null;
    }
    return session;
  }

  function saveSession(data) {
    session = data;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Impossible de sauvegarder la session.", e);
    }
  }

  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    if (!session) loadSession();
    return session;
  }

  async function appeler(action, nomLumiere, code) {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, nom_lumiere: nomLumiere, code }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Réponse illisible du serveur.");
    }

    if (!res.ok) {
      throw new Error(data.error || "Erreur inconnue.");
    }

    saveSession({
      token: data.token,
      eleve_id: data.eleve_id,
      nom_lumiere: nomLumiere,
    });
    return session;
  }

  function signUp(nomLumiere, code) {
    return appeler("signup", nomLumiere, code);
  }

  function logIn(nomLumiere, code) {
    return appeler("login", nomLumiere, code);
  }

  return { getSession, signUp, logIn, clearSession };

})();
