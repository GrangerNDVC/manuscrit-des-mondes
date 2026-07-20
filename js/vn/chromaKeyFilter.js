/* ============================================================
   chromaKeyFilter.js
   ============================================================
   Détourage automatique du fond bleu utilisé sur les portraits de
   personnages (esprit, Gavroche, etc.), pour éviter de le faire à la
   main image par image dans un éditeur externe.

   Reprend le même algorithme (clé chromatique + décontamination du
   liseré bleu résiduel sur les bords) que celui utilisé manuellement
   sur les portraits déjà livrés — donc un résultat cohérent avec eux.

   UTILISATION DANS vnEngine.js
   -----------------------------
   Remplace le chargement d'image classique :

       const img = new Image();
       img.src = "/assets/sprites/characters/esprit-reflexion.png";
       // ... puis ctx.drawImage(img, x, y, w, h) une fois chargée

   par :

       const portrait = await ChromaKey.load("/assets/sprites/characters/esprit-reflexion.png");
       // portrait est un <canvas> détouré, utilisable direct :
       ctx.drawImage(portrait, x, y, w, h);

   Le résultat est mis en cache automatiquement (même URL = un seul
   traitement, même si tu l'affiches 50 fois dans la scène).

   Si un jour tes personnages sont détourés à la source (fond
   transparent dès l'export), il suffit de ne plus appeler
   ChromaKey.load() et d'utiliser une Image() normale : rien d'autre à
   changer côté moteur.
   ============================================================ */

const ChromaKey = (() => {
  const cache = new Map(); // url -> Promise<HTMLCanvasElement>

  /**
   * Détoure une image déjà chargée (HTMLImageElement) et renvoie un
   * canvas avec le fond bleu rendu transparent.
   *
   * @param {HTMLImageElement} img
   * @param {object} [opts]
   * @param {number} [opts.low=40]   distance en dessous de laquelle un pixel est considéré fond (100% transparent)
   * @param {number} [opts.high=140] distance au-dessus de laquelle un pixel est considéré personnage (100% opaque)
   * @param {number} [opts.blueExcessMin=5] écart minimal (bleu - max(rouge,vert)) pour qu'un pixel soit candidat "fond"
   * @param {number} [opts.spillSuppression=0.9] force de la correction du liseré bleu résiduel sur les bords semi-transparents
   */
  function process(img, opts = {}) {
    const low = opts.low ?? 40;
    const high = opts.high ?? 140;
    const blueExcessMin = opts.blueExcessMin ?? 5;
    const spillSuppression = opts.spillSuppression ?? 0.9;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Couleur de référence du fond : moyenne des 4 coins (robuste aux
    // légères variations de bleu d'un rendu à l'autre, contrairement à
    // une couleur codée en dur).
    const corners = [
      0,
      (canvas.width - 1) * 4,
      (canvas.height - 1) * canvas.width * 4,
      ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4
    ];
    let kr = 0, kg = 0, kb = 0;
    corners.forEach(i => { kr += data[i]; kg += data[i + 1]; kb += data[i + 2]; });
    kr /= 4; kg /= 4; kb /= 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
      const blueExcess = b - Math.max(r, g);

      if (blueExcess > blueExcessMin) {
        const alpha = Math.max(0, Math.min(1, (dist - low) / (high - low)));
        data[i + 3] = alpha * 255;
        // Décontamination : réduit le bleu qui a "déteint" sur les
        // pixels semi-transparents du bord, sinon un léger liseré bleu
        // reste visible autour du personnage une fois posé sur un autre
        // fond.
        const spillFactor = 1 - alpha;
        data[i + 2] = Math.max(0, b - spillFactor * Math.max(0, blueExcess) * spillSuppression);
      }
      // sinon : pixel du personnage, on ne touche à rien (opaque, couleur d'origine)
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Charge une image par URL et renvoie un <canvas> détouré (mis en
   * cache : un seul traitement par URL, même appelé plusieurs fois).
   * @param {string} url
   * @param {object} [opts] voir process()
   * @returns {Promise<HTMLCanvasElement>}
   */
  function load(url, opts) {
    const cacheKey = url + JSON.stringify(opts || {});
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // nécessaire si les assets sont un jour servis depuis un autre domaine/CDN
      img.onload = () => {
        try {
          resolve(process(img, opts));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = url;
    });

    cache.set(cacheKey, promise);
    return promise;
  }

  return { load, process };
})();

// Utilisable en <script src="chromaKeyFilter.js"> classique (objet
// global ChromaKey) ou en import ES module si ton build le permet :
// export default ChromaKey;
