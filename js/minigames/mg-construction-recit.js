/* ============================================================
   LE MANUSCRIT DES MONDES — mg-construction-recit.js (v4)
   ============================================================
   Mini-jeu "Le Sceau du Mal-Dit" (Monde 1 — Hugo, acte 6).
   Notion : construction d'une histoire (schéma narratif en
   5 étapes). REMPLACE ENTIÈREMENT la v3 ("Le Récit de Gavroche",
   point-and-click sur un parchemin) par un combat de boss façon
   JRPG rétro, validé avec Julie via
   CAHIER_DES_CHARGES_combat-mal-dit-construction-recit.md.

   ---- Personnage joueur (précision apportée cette session) ----
   Les sprites fournis sont tous préfixés "esprit-" (convention
   déjà utilisée partout ailleurs pour L'Esprit de la Littérature,
   ex. esprit-marche.png, esprit-neutre.png...) : c'est donc
   L'ESPRIT qui mène ce combat, et non Gavroche seul comme
   envisagé initialement dans le cahier des charges. Gavroche
   rejoint l'équipe comme compagnon APRÈS la victoire (scène de
   fin), cohérent avec « Gavroche décide de venir AVEC LUI ».

   ---- Déroulé (5 rounds, un par étape du schéma narratif) ----
   Cinématique d'intro : Frollo (humain) se transforme sous nos
   yeux, possédé par le Mal-Dit (frolo-transformation-demon.jfif),
   puis le combat commence.

   Par round :
   1. PHASE ATTAQUE : les phrases restantes de l'histoire du jour
      sont affichées mélangées. Il faut cliquer sur celle qui vient
      chronologiquement en premier parmi celles pas encore
      utilisées. Bonne réponse → l'Esprit frappe (cycle
      esprit-combat1/2/3). Mauvaise réponse → Frollo riposte
      aussitôt d'une boule de feu rose, l'Esprit est touché.
   2. PHASE DÉFENSE (seulement si l'attaque a réussi) : Frollo
      envoie une boule de feu rose ; il faut identifier l'étape du
      schéma narratif de la phrase qu'on vient de jouer, parmi les
      5 toujours affichées. Bonne réponse → l'Esprit esquive ou se
      défend (esprit-combat_esquive / esprit-defense1 / defense2,
      tirés au sort pour varier). Mauvaise réponse → touché
      (esprit-touche-critique, plus sévère qu'en phase attaque
      puisque la parade a échoué).

   Toute erreur (attaque OU défense) fait perdre UNE VIE sur 3 et
   relance l'intégralité de la tentative (round 1) avec une AUTRE
   histoire piochée dans la banque — jamais deux fois la même à la
   suite. 3 vies perdues = échec du mini-jeu (esprit-KO.png),
   retour au VN pour remédiation classique. 5 rounds réussis sur
   une même tentative, sans la moindre erreur = victoire : Frollo
   se re-transforme en humain vaincu
   (frolo-vaincu-retransformation-humain.jfif), l'Esprit savoure sa
   victoire (esprit-victoire1/2 en alternance) et reçoit la
   première clé du jeu (cle-monde1.png).

   Frollo (frolodemon1/2/3) tourne en boucle en permanence pendant
   le combat, qu'il attaque ou non — l'animation d'idle ne s'arrête
   jamais tant qu'il n'est pas vaincu.

   ⚠️ Assets requis, chemins à respecter dans le dépôt :
     /assets/sprites/characters/esprit-combat1.png
     /assets/sprites/characters/esprit-combat2.png
     /assets/sprites/characters/esprit-combat3.png
     /assets/sprites/characters/esprit-combat_esquive.png
     /assets/sprites/characters/esprit-defense1.png
     /assets/sprites/characters/esprit-defense2.png
     /assets/sprites/characters/esprit-touche.png
     /assets/sprites/characters/esprit-touche-critique.png
     /assets/sprites/characters/esprit-KO.png
     /assets/sprites/characters/esprit-victoire1.png
     /assets/sprites/characters/esprit-victoire2.png
     /assets/sprites/characters/frolodemon1.png
     /assets/sprites/characters/frolodemon2.png
     /assets/sprites/characters/frolodemon3.png
     /assets/sprites/characters/frolo-transformation-demon.jfif
     /assets/sprites/characters/frolo-vaincu-retransformation-humain.jfif
     /assets/sprites/props/cle-monde1.png
     /assets/backgrounds/decors_combat_maldit_hugo.jfif   (À GÉNÉRER,
       voir le prompt donné à Julie en session — pas encore fourni,
       filet de sécurité couleur uni en attendant)

   ⚠️ Point noté pour plus tard (hors périmètre du Monde 1) : à
   partir du Monde 2, il faudra un choix de personnage jouable
   (Esprit / Gavroche / autres compagnons gagnés) pour ce type de
   mini-jeu, plus un "mode indice" activable en VN grâce aux
   compagnons débloqués. Non traité ici — voir mémoire du projet.

   Variante enregistrée INCHANGÉE ("construction_recit" /
   "parchemin_hugo") — même principe que pour les refontes
   précédentes (barricades_hugo, egouts_hugo, vitraux_hugo) : le
   nom historique est conservé pour ne rien avoir à changer
   ailleurs dans le code, même s'il ne décrit plus vraiment ce
   mini-jeu.
   ============================================================ */

(function registerSceauDuMalDitHugo() {

  const CANVAS_W = 800;
  const CANVAS_H = 450;

  const CHAR_DIR = "/assets/sprites/characters/";
  const PROPS_DIR = "/assets/sprites/props/";
  const BG_SRC = "/assets/backgrounds/decors_combat_maldit_hugo.jfif";

  const MAX_LIVES = 3;
  const ROUND_COUNT = 5;

  const STAGE_ORDER = [
    "situation_initiale",
    "element_declencheur",
    "peripeties",
    "resolution",
    "situation_finale"
  ];
  const STAGE_LABELS = {
    situation_initiale: "Situation initiale",
    element_declencheur: "Élément déclencheur",
    peripeties: "Péripéties",
    resolution: "Résolution",
    situation_finale: "Situation finale"
  };

  // Banque reprise telle quelle de la version précédente (contenu déjà
  // validé — voir section 6 du cahier des charges : aucune réécriture
  // nécessaire, seule la présentation change).
  const STORY_BANK = [
    [
      { stage: "situation_initiale", text: "Gavroche dormait sur les pavés." },
      { stage: "element_declencheur", text: "Un bruit de pas le réveilla en sursaut." },
      { stage: "peripeties", text: "Il se cacha et observa la silhouette approcher." },
      { stage: "resolution", text: "Il reconnut un ami et sortit de sa cachette." },
      { stage: "situation_finale", text: "Ils repartirent ensemble vers les barricades." }
    ],
    [
      { stage: "situation_initiale", text: "L'Esprit explorait calmement Notre-Dame." },
      { stage: "element_declencheur", text: "Un vitrail se brisa soudainement au sol." },
      { stage: "peripeties", text: "Casimodo et l'Esprit ramassèrent les morceaux ensemble." },
      { stage: "resolution", text: "Le vitrail reprit forme sous leurs mains." },
      { stage: "situation_finale", text: "La lumière à travers le vitrail éclaira toute la nef." }
    ],
    [
      { stage: "situation_initiale", text: "Jean Valjean marchait seul sur la route." },
      { stage: "element_declencheur", text: "La pluie commença à tomber violemment." },
      { stage: "peripeties", text: "Il chercha un abri sous un grand arbre." },
      { stage: "resolution", text: "Il aperçut enfin une maison éclairée." },
      { stage: "situation_finale", text: "Il s'y dirigea, trempé mais soulagé." }
    ],
    [
      { stage: "situation_initiale", text: "Esmeralda dansait tranquillement sur le parvis." },
      { stage: "element_declencheur", text: "Frollo surgit et voulut l'arrêter." },
      { stage: "peripeties", text: "Quasimodo descendit à toute vitesse pour s'interposer." },
      { stage: "resolution", text: "Frollo recula, surpris par cette résistance." },
      { stage: "situation_finale", text: "Esmeralda remercia Quasimodo d'un simple regard." }
    ],
    [
      { stage: "situation_initiale", text: "Gavroche gardait précieusement un vieux plan de Paris." },
      { stage: "element_declencheur", text: "Le plan lui fut arraché par un garde en pleine rue." },
      { stage: "peripeties", text: "Il le poursuivit à travers les ruelles, sans jamais le perdre de vue." },
      { stage: "resolution", text: "Il récupéra le plan au détour d'une impasse." },
      { stage: "situation_finale", text: "Il le cacha désormais dans une poche cousue exprès." }
    ]
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickStory(excludeIndex) {
    let idx;
    do {
      idx = Math.floor(Math.random() * STORY_BANK.length);
    } while (STORY_BANK.length > 1 && idx === excludeIndex);
    return idx;
  }

  function loadChar(name) { const img = new Image(); img.src = CHAR_DIR + name; return img; }
  function loadProp(name) { const img = new Image(); img.src = PROPS_DIR + name; return img; }
  function loadBg(src) { const img = new Image(); img.src = src; return img; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach(word => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  async function run({ canvas, uiContainer, isRemediation }) {

    await MinigameUI.showInstructions({
      title: "Le Sceau du Mal-Dit",
      objective: "Frollo se dresse devant vous, possédé par le Mal-Dit. ATTAQUE : parmi les phrases mélangées, clique sur celle qui vient chronologiquement en premier dans l'histoire. DÉFENSE : indique ensuite à quelle étape du schéma narratif elle correspond, pour esquiver la riposte de Frollo. La moindre erreur — en attaque comme en défense — te coûte une vie et relance le combat avec une autre histoire. Tu as 3 vies pour briser le sceau."
    });

    return new Promise(resolve => {

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      // --- Assets ---
      const bgImage = loadBg(BG_SRC);
      const cleImg = loadProp("cle-monde1.png");

      const esprit = {
        combat: [loadChar("esprit-combat1.png"), loadChar("esprit-combat2.png"), loadChar("esprit-combat3.png")],
        esquive: loadChar("esprit-combat_esquive.png"),
        defense: [loadChar("esprit-defense1.png"), loadChar("esprit-defense2.png")],
        touche: loadChar("esprit-touche.png"),
        toucheCritique: loadChar("esprit-touche-critique.png"),
        ko: loadChar("esprit-KO.png"),
        victoire: [loadChar("esprit-victoire1.png"), loadChar("esprit-victoire2.png")]
      };
      const frollo = {
        demon: [loadChar("frolodemon1.png"), loadChar("frolodemon2.png"), loadChar("frolodemon3.png")],
        transformation: loadChar("frolo-transformation-demon.jfif"),
        retransformation: loadChar("frolo-vaincu-retransformation-humain.jfif")
      };

      // --- Positions ---
      const ESPRIT_BOX = { x: 70, y: 90, w: 170, h: 220 };
      const FROLLO_BOX = { x: 540, y: 40, w: 210, h: 270 };

      // --- État de partie ---
      let lives = MAX_LIVES;
      let round = 0; // 0..4, round courant de la tentative en cours
      let storyIndex = pickStory(-1);
      let story = STORY_BANK[storyIndex];
      let pool = shuffle(story.map((_, i) => i)); // indices de phrases restant à jouer, affichage mélangé

      let currentSentenceIdx = null; // phrase en cours de défense

      // phase: intro_transform | attack | esprit_strike | frollo_attack_travel |
      //        defense | dodge_resolve | hit_resolve | round_pause |
      //        victory_transform | victory_key | defeat | done
      let phase = "intro_transform";
      let phaseTimer = 110; // laisse le temps de voir la transformation avant le 1er round

      let espritSprite = { kind: "combat", frame: 0 };
      let frolloAnimTimer = 0, frolloAnimFrame = 0;
      let frolloFlash = 0; // >0 = flash rouge (touché)

      const fireball = { active: false, x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, total: 1 };

      let feedback = "";
      let feedbackColor = "#f4f1ea";

      let resultGiven = false;

      uiContainer.innerHTML = `
        <div class="hud-item">${isRemediation ? "Entraînement" : "Évaluation"} — Le Sceau du Mal-Dit</div>
        <div class="hud-item">Manche <span id="mg-round">1</span> / ${ROUND_COUNT}</div>
      `;

      function updateHud() {
        const el = document.getElementById("mg-round");
        if (el) el.textContent = Math.min(round + 1, ROUND_COUNT);
      }

      function espritCenter() {
        return { x: ESPRIT_BOX.x + ESPRIT_BOX.w / 2, y: ESPRIT_BOX.y + ESPRIT_BOX.h * 0.4 };
      }
      function frolloCenter() {
        return { x: FROLLO_BOX.x + FROLLO_BOX.w / 2, y: FROLLO_BOX.y + FROLLO_BOX.h * 0.4 };
      }

      function launchFireball(totalFrames) {
        const from = frolloCenter(), to = espritCenter();
        fireball.active = true;
        fireball.fromX = from.x; fireball.fromY = from.y;
        fireball.toX = to.x; fireball.toY = to.y;
        fireball.t = 0;
        fireball.total = totalFrames;
      }

      function goToPhase(next, timer) {
        phase = next;
        phaseTimer = timer || 0;
      }

      function startAttempt(newStoryIndex) {
        storyIndex = newStoryIndex;
        story = STORY_BANK[storyIndex];
        pool = shuffle(story.map((_, i) => i));
        round = 0;
        currentSentenceIdx = null;
        espritSprite = { kind: "combat", frame: 0 };
        updateHud();
        goToPhase("attack", 0);
      }

      function onWrongAttack() {
        feedback = "✗ Ce n'est pas la phrase suivante dans l'histoire...";
        feedbackColor = "#d9534f";
        launchFireball(20);
        goToPhase("frollo_attack_travel", 20);
      }

      function onCorrectAttack(sentenceIdx) {
        pool = pool.filter(i => i !== sentenceIdx);
        currentSentenceIdx = sentenceIdx;
        feedback = "✓ Coup porté !";
        feedbackColor = "#6fcf97";
        frolloFlash = 18;
        espritSprite = { kind: "combat", frame: 0 };
        goToPhase("esprit_strike", 24);
      }

      function onWrongDefense() {
        feedback = "✗ Mauvaise parade — le Mal-Dit trouve une faille !";
        feedbackColor = "#d9534f";
        goToPhase("hit_resolve", 1); // la boule de feu est déjà en vol (frollo_attack_travel a précédé)
      }

      function onCorrectDefense(stageClicked) {
        const style = pick(["esquive", "defense1", "defense2"]);
        espritSprite = style === "esquive" ? { kind: "esquive" } : { kind: "defense", frame: style === "defense1" ? 0 : 1 };
        feedback = "✓ Esquivé !";
        feedbackColor = "#6fcf97";
        fireball.active = false;
        goToPhase("dodge_resolve", 40);
      }

      function loseLife(critical) {
        lives--;
        espritSprite = critical ? { kind: "toucheCritique" } : { kind: "touche" };
        fireball.active = false;
        if (lives <= 0) {
          espritSprite = { kind: "ko" };
          goToPhase("defeat", 90);
        } else {
          goToPhase("round_pause", 90);
        }
      }

      function onRoundCleared() {
        round++;
        updateHud();
        if (round >= ROUND_COUNT) {
          goToPhase("victory_transform", 100);
        } else {
          espritSprite = { kind: "combat", frame: 0 };
          feedback = "";
          goToPhase("attack", 0);
        }
      }

      // --- Interactions (clic canvas, hit-test manuel) ---
      let clickRects = []; // { x,y,w,h, onClick }

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function onClick(e) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        for (const r of clickRects) {
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { r.onClick(); return; }
        }
      }
      canvas.addEventListener("click", onClick);

      function cleanup() {
        canvas.removeEventListener("click", onClick);
        cancelAnimationFrame(rafId);
      }

      async function endVictory() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: true,
          message: "Le sceau se brise ! Frollo reprend forme humaine, vaincu et hagard. L'Esprit recueille la première clé du Manuscrit... et Gavroche annonce qu'il l'accompagnera désormais dans ses prochaines aventures."
        });
        resolve({ passed: true, score: ROUND_COUNT, total: ROUND_COUNT });
      }

      async function endDefeat() {
        if (resultGiven) return;
        resultGiven = true;
        cleanup();
        await MinigameUI.showResult({
          passed: false,
          message: "Le Mal-Dit est trop puissant, cette fois. L'Esprit doit reprendre des forces avant de retenter l'assaut."
        });
        resolve({ passed: false, score: round, total: ROUND_COUNT });
      }

      // --- Boucle principale ---
      let rafId;

      function update() {
        // Idle de Frollo : tourne en boucle en permanence, sauf pendant
        // les cinématiques dédiées de transformation/re-transformation.
        if (phase !== "intro_transform" && phase !== "victory_transform" && phase !== "victory_key") {
          frolloAnimTimer++;
          if (frolloAnimTimer >= 18) { frolloAnimTimer = 0; frolloAnimFrame = (frolloAnimFrame + 1) % frollo.demon.length; }
        }
        if (frolloFlash > 0) frolloFlash--;

        if (fireball.active) {
          fireball.t++;
          const p = Math.min(1, fireball.t / fireball.total);
          fireball.x = fireball.fromX + (fireball.toX - fireball.fromX) * p;
          fireball.y = fireball.fromY + (fireball.toY - fireball.fromY) * p;
        }

        if (phaseTimer > 0) phaseTimer--;

        switch (phase) {
          case "intro_transform":
            if (phaseTimer <= 0) startAttempt(storyIndex);
            break;
          case "esprit_strike":
            espritSprite.frame = Math.floor((24 - phaseTimer) / 8) % esprit.combat.length;
            if (phaseTimer <= 0) {
              launchFireball(35);
              goToPhase("frollo_attack_travel", 35);
            }
            break;
          case "frollo_attack_travel":
            if (phaseTimer <= 0) {
              // Si on vient d'une mauvaise attaque, currentSentenceIdx est
              // resté celui du round en cours (pas encore résolu) : dans ce
              // cas on inflige directement le coup. Sinon (attaque réussie),
              // c'est la phase défense qui doit trancher — mais comme le
              // joueur a déjà pu cliquer sur une étiquette pendant le vol de
              // la boule, on ne bascule ici que si aucune défense n'a
              // encore été résolue.
              if (phase === "frollo_attack_travel" && currentSentenceIdx === null) {
                loseLife(false);
              }
            }
            break;
          case "round_pause":
            if (phaseTimer <= 0) {
              const nextStory = pickStory(storyIndex);
              startAttempt(nextStory);
            }
            break;
          case "hit_resolve":
            if (phaseTimer <= 0) {
              loseLife(true);
            }
            break;
          case "dodge_resolve":
            if (phaseTimer <= 0) {
              currentSentenceIdx = null;
              onRoundCleared();
            }
            break;
          case "victory_transform":
            if (phaseTimer <= 0) goToPhase("victory_key", 70);
            break;
          case "victory_key":
            if (phaseTimer <= 0) endVictory();
            break;
          case "defeat":
            if (phaseTimer <= 0) endDefeat();
            break;
        }

        if (espritSprite.kind === "victoire") {
          espritSprite.timer = (espritSprite.timer || 0) + 1;
          if (espritSprite.timer % 24 === 0) espritSprite.frame = 1 - (espritSprite.frame || 0);
        }
      }

      // --- Rendu ---
      function drawImgBox(img, box, flash) {
        if (img && img.complete && img.naturalWidth > 0) {
          if (flash) {
            ctx.save();
            ctx.filter = "brightness(1.8) saturate(0.3)";
            ctx.drawImage(img, box.x, box.y, box.w, box.h);
            ctx.restore();
          } else {
            ctx.drawImage(img, box.x, box.y, box.w, box.h);
          }
        } else {
          ctx.fillStyle = "#3a2a55";
          ctx.fillRect(box.x, box.y, box.w, box.h);
        }
      }

      function currentEspritImage() {
        switch (espritSprite.kind) {
          case "combat": return esprit.combat[espritSprite.frame % esprit.combat.length];
          case "esquive": return esprit.esquive;
          case "defense": return esprit.defense[espritSprite.frame];
          case "touche": return esprit.touche;
          case "toucheCritique": return esprit.toucheCritique;
          case "ko": return esprit.ko;
          case "victoire": return esprit.victoire[espritSprite.frame || 0];
          default: return esprit.combat[0];
        }
      }

      function drawHealthBar() {
        const segW = 60, segH = 14, gap = 6;
        const totalW = ROUND_COUNT * segW + (ROUND_COUNT - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        for (let i = 0; i < ROUND_COUNT; i++) {
          const x = startX + i * (segW + gap);
          ctx.fillStyle = i < round ? "#6fcf97" : "rgba(157,140,255,0.15)";
          ctx.fillRect(x, 10, segW, segH);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, 10, segW, segH);
        }
        ctx.fillStyle = "#c9c2e0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Sceau du Mal-Dit", CANVAS_W / 2, 40);
      }

      function drawLives() {
        ctx.font = "18px sans-serif";
        ctx.textAlign = "left";
        let hearts = "";
        for (let i = 0; i < MAX_LIVES; i++) hearts += i < lives ? "❤ " : "🖤 ";
        ctx.fillText(hearts, 16, 28);
      }

      function drawFeedback() {
        if (!feedback) return;
        ctx.fillStyle = "rgba(26,21,48,0.85)";
        ctx.fillRect(CANVAS_W / 2 - 300, 262, 600, 30);
        ctx.fillStyle = feedbackColor;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(feedback, CANVAS_W / 2, 277);
        ctx.textBaseline = "alphabetic";
      }

      function drawFireball() {
        if (!fireball.active) return;
        const grad = ctx.createRadialGradient(fireball.x, fireball.y, 1, fireball.x, fireball.y, 14);
        grad.addColorStop(0, "#ffd6f0");
        grad.addColorStop(0.5, "#e85fc4");
        grad.addColorStop(1, "rgba(232,95,196,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawAttackCards() {
        const items = pool;
        const n = items.length;
        const cardW = 145, cardH = 70, gap = 10;
        const totalW = n * cardW + (n - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        const y = 310;
        ctx.font = "12px sans-serif";
        items.forEach((sentenceIdx, i) => {
          const x = startX + i * (cardW + gap);
          ctx.fillStyle = "#2b2347";
          ctx.fillRect(x, y, cardW, cardH);
          ctx.strokeStyle = "#9d8cff";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cardW, cardH);

          ctx.fillStyle = "#f4f1ea";
          const lines = wrapText(ctx, story[sentenceIdx].text, cardW - 16);
          const lh = 15;
          let ty = y + cardH / 2 - (lines.length - 1) * lh / 2;
          ctx.textAlign = "center";
          lines.forEach(line => { ctx.fillText(line, x + cardW / 2, ty); ty += lh; });

          clickRects.push({
            x, y, w: cardW, h: cardH,
            onClick: () => {
              if (phase !== "attack") return;
              if (sentenceIdx === round) onCorrectAttack(sentenceIdx);
              else onWrongAttack();
            }
          });
        });
      }

      function drawDefenseButtons() {
        const n = STAGE_ORDER.length;
        const btnW = 145, btnH = 46, gap = 10;
        const totalW = n * btnW + (n - 1) * gap;
        const startX = (CANVAS_W - totalW) / 2;
        const y = 330;
        ctx.font = "12px sans-serif";
        STAGE_ORDER.forEach((stage, i) => {
          const x = startX + i * (btnW + gap);
          ctx.fillStyle = "#2b2347";
          ctx.fillRect(x, y, btnW, btnH);
          ctx.strokeStyle = "#e8c468";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, btnW, btnH);
          ctx.fillStyle = "#f4f1ea";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(STAGE_LABELS[stage], x + btnW / 2, y + btnH / 2);
          ctx.textBaseline = "alphabetic";

          clickRects.push({
            x, y, w: btnW, h: btnH,
            onClick: () => {
              if (phase !== "frollo_attack_travel" && phase !== "defense") return;
              if (currentSentenceIdx === null) return;
              const correctStage = story[currentSentenceIdx].stage;
              if (stage === correctStage) onCorrectDefense(stage);
              else onWrongDefense();
            }
          });
        });
      }

      function render() {
        clickRects = [];

        if (bgImage.complete && bgImage.naturalWidth > 0) {
          ctx.drawImage(bgImage, 0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = "#1a1530";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        if (phase === "intro_transform") {
          drawImgBox(frollo.transformation, { x: CANVAS_W / 2 - 130, y: 40, w: 260, h: 340 }, false);
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 395, CANVAS_W, 40);
          ctx.fillStyle = "#e85fc4";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Frollo se tord de douleur... le Mal-Dit prend possession de lui !", CANVAS_W / 2, 419);
          return;
        }

        if (phase === "victory_transform" || phase === "victory_key") {
          drawImgBox(frollo.retransformation, { x: CANVAS_W / 2 - 130, y: 30, w: 260, h: 320 }, false);
          const img = esprit.victoire[Math.floor(phaseTimer / 20) % 2];
          drawImgBox(img, ESPRIT_BOX, false);
          if (phase === "victory_key" && cleImg) {
            const scale = Math.min(1, (70 - phaseTimer) / 20);
            const kw = 46 * scale, kh = 90 * scale;
            drawImgBox(cleImg, { x: ESPRIT_BOX.x + ESPRIT_BOX.w / 2 - kw / 2, y: ESPRIT_BOX.y - 30, w: kw, h: kh }, false);
          }
          ctx.fillStyle = "rgba(26,21,48,0.75)";
          ctx.fillRect(0, 395, CANVAS_W, 40);
          ctx.fillStyle = "#e8c468";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            phase === "victory_transform" ? "Le sceau se brise... Frollo reprend forme humaine." : "L'Esprit recueille la première clé !",
            CANVAS_W / 2, 419
          );
          return;
        }

        drawHealthBar();
        drawLives();

        drawImgBox(frollo.demon[frolloAnimFrame], FROLLO_BOX, frolloFlash > 0);
        drawImgBox(currentEspritImage(), ESPRIT_BOX, false);

        drawFireball();
        drawFeedback();

        if (phase === "attack") {
          drawAttackCards();
        } else if (phase === "frollo_attack_travel" || phase === "defense") {
          if (currentSentenceIdx !== null) drawDefenseButtons();
        }

      }


      function loop() {
        update();
        render();
        if (!resultGiven) rafId = requestAnimationFrame(loop);
      }

      loop();
    });
  }

  SceneManager.registerMinigame("construction_recit", "parchemin_hugo", {
    title: "Le Sceau du Mal-Dit",
    run
  });

})();
