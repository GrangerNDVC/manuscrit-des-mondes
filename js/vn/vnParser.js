/* ============================================================
   LE MANUSCRIT DES MONDES — vnParser.js
   ============================================================
   Charge les données narratives (scènes, QCM, exercices) depuis
   des fichiers JSON dans js/data/. Un fichier par monde, structuré
   par acte, pour rester facile à éditer sans toucher au code.

   IMPORTANT : le chemin est ABSOLU depuis la racine du site
   (commence par "/"). C'est volontaire : ce fichier est utilisé
   aussi bien par les pages à la racine que par les pages du
   dossier /mondes/, et un chemin relatif casserait selon la
   page appelante. Le chemin absolu fonctionne partout, à
   condition que le site tourne via un vrai serveur HTTP
   (Live Server, Netlify) et non en ouvrant le fichier avec
   file:// directement dans le navigateur.

   Convention de nommage attendue :
     /js/data/<worldId>_scenes.json
   contenant :
     {
       "acts": {
         "ponctuation": { intro: [...], qcm: {...}, formative: {...},
                           transfer: {...}, minigame_notion: "ponctuation" },
         "ordre_des_mots": { ... },
         ...
       },
       "ending": { scenes: [...] }   // scène(s) de fin de monde
     }
   ============================================================ */

const VNParser = (() => {

  const cache = {};

  async function loadWorldData(worldId) {
    if (cache[worldId]) return cache[worldId];
    try {
      const res = await fetch(`/js/data/${worldId}_scenes.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[worldId] = data;
      return data;
    } catch (e) {
      console.error(`Impossible de charger les données du monde "${worldId}". Vérifie que le fichier /js/data/${worldId}_scenes.json existe bien.`, e);
      return null;
    }
  }

  async function loadAct(worldId, actId) {
    const data = await loadWorldData(worldId);
    if (!data || !data.acts || !data.acts[actId]) return null;
    return data.acts[actId];
  }

  async function loadWorldEnding(worldId) {
    const data = await loadWorldData(worldId);
    if (!data || !data.ending) return null;
    return data.ending;
  }

  return {
    loadWorldData,
    loadAct,
    loadWorldEnding
  };

})();
