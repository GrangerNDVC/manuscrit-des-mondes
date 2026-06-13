/* ============================================================
   LE MANUSCRIT DES MONDES — vnParser.js
   ============================================================
   Charge les données narratives (scènes, QCM, exercices) depuis
   des fichiers JSON dans js/data/. Un fichier par monde, structuré
   par acte, pour rester facile à éditer sans toucher au code.

   Convention de nommage attendue :
     js/data/<worldId>_scenes.json
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
      const res = await fetch(`js/data/${worldId}_scenes.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[worldId] = data;
      return data;
    } catch (e) {
      console.error(`Impossible de charger les données du monde "${worldId}".`, e);
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
