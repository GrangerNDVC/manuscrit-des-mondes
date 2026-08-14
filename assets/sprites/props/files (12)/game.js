/* ============================================================
   GODZILLA : PROTOCOLE TITAN — moteur de jeu (v2)
   Homophones grammaticaux (leçons 1 et 3), racontés comme un
   affrontement du Monsterverse. Cette version intègre les apports
   de la v2 du jeu "Maître des Tables" (envoyée par Julie le
   10/08) : maîtrise progressive du mode Burning, apparition du
   Titan avant la fin du chapitre, séquence de victoire cinématique,
   Dossiers Monarch (chapitres déjà vécus, rejouables), réglages
   (chrono masquable), mise à l'échelle tablette — adaptés à la
   structure en 4 chapitres narratifs (pas 8 niveaux indépendants).

   Corrections apportées en portant ces fonctionnalités (voir
   README, section "Bugs corrigés") :
   - Écrans gérés par une fonction unique showScreen() : un seul
     écran visible à la fois, impossible de rester "coincé".
   - L'apparition du Titan (drawTitanLooming) est coupée pendant
     la séquence de victoire cinématique (drawBossDefeat), qui
     dessine déjà le même Titan en grand : les deux ne peuvent
     plus se superposer.
   ============================================================ */

// ======================= CONFIG NIVEAUX =======================
// Chaque niveau = un duo d'homophones + un chapitre de l'histoire.
// pairWords : les mots proposés sur les cristaux.
// sentences : phrases du combat, DANS L'ORDRE DU RÉCIT (jamais
// mélangées, sinon l'histoire perd son sens d'une phrase à l'autre).
// defeatCaption/defeatDetail : texte de la séquence cinématique
// affichée juste après la dernière bonne réponse du chapitre.
const LEVELS = [
    {
        kaiju: "rodan",
        nom: "Rodan",
        decor: "decors_rodan.jpg",
        palier: 1,
        pairWords: ["a", "à"],
        pairLabel: "à / a",
        astuce: "Remplace le mot par « avait » : si la phrase garde son sens, c'est a (le verbe avoir). Sinon, c'est à (la préposition, qui ne change jamais).",
        chapterTitle: "Une alerte sur l'archipel volcanique",
        chapterIntro: "Près d'un archipel volcanique isolé, un capteur sismique de Monarch s'affole en pleine nuit. Depuis des décennies, Rodan sommeille au fond de son cratère sans jamais en sortir — mais cette fois, quelque chose l'a réveillé, et ce n'est pas naturel. Monarch n'a qu'une solution : envoyer Godzilla avant que la panique n'atteigne les côtes habitées.",
        victoryBeat: "Le boîtier détruit, Rodan retrouve son calme et incline la tête devant Godzilla — un geste de soumission que Monarch connaît bien depuis leur premier affrontement. À terre, les techniciens récupèrent les restes de l'appareil : un numéro de série, à moitié fondu, mais lisible. L'enquête ne fait que commencer.",
        defeatCaption: "RODAN SE SOUMET !",
        defeatDetail: "Débarrassé du boîtier, Rodan retrouve ses esprits. MONARCH commence l'enquête sur l'appareil qui l'a manipulé.",
        statusLabel: "Libéré",
        retryVariants: [
            "Une explosion de cendres volcaniques aveugle Godzilla une seconde de trop : Rodan s'échappe dans la fumée et replonge dans son cratère. Il va falloir le retrouver.",
            "Le boîtier crépite encore et brouille les capteurs de Godzilla : Rodan, toujours sous influence, s'élève hors de portée. Le combat doit reprendre depuis le début.",
        ],
        sentences: [
            { before: "Un capteur sismique ", correct: "a", after: " enregistré une secousse inhabituelle près d'un archipel volcanique." },
            { before: "L'anomalie provient d'une caldeira ", correct: "à", after: " flanc du plus haut sommet, là où sommeille Rodan." },
            { before: "Or, le titan de feu n'", correct: "a", after: " plus quitté son cratère depuis des décennies." },
            { before: "Cette nuit, une lueur orangée ", correct: "a", after: " jailli du sommet, plus vive que d'habitude." },
            { before: "Pris d'une rage soudaine, Rodan fonce ", correct: "à", after: " tire-d'aile vers les installations côtières." },
            { before: "Monarch envoie aussitôt un message codé ", correct: "à", after: " Godzilla, seul assez puissant pour l'intercepter." },
            { before: "Il plonge sans hésiter et nage ", correct: "à", after: " pleine puissance vers l'archipel." },
            { before: "Sous la roche volcanique fendue, il découvre un boîtier qui n'", correct: "a", after: " rien de naturel." },
        ],
    },
    {
        kaiju: "anguirus",
        nom: "Anguirus",
        decor: "decors_anguirus.jpg",
        palier: 2,
        pairWords: ["ou", "où"],
        pairLabel: "ou / où",
        astuce: "Remplace le mot par « ou bien » : si la phrase garde son sens, c'est ou (qui relie deux choix). Sinon, c'est où (un lieu ou une question).",
        chapterTitle: "Deuxième signal, même méthode",
        chapterIntro: "Le numéro de série gravé sur le boîtier de Rodan renvoie à un fournisseur discret. Avant même que Monarch n'ait pu localiser son entrepôt, un second signal se déclenche à des milliers de kilomètres : dans une carrière rocheuse abandonnée, Anguirus — un Titan quadrupède que Monarch croyait inoffensif — se réveille en poussant un rugissement de rage. Même méthode, même mystère : quelqu'un réveille délibérément des Titans endormis, et personne ne sait encore pourquoi.",
        victoryBeat: "Anguirus, libéré de l'appareil, se calme aussitôt et retourne se terrer dans les rochers, comme si de rien n'était. Mais dans l'entrepôt repéré par Monarch, les agents découvrent des plans qui ne parlent plus de simples émetteurs : il est question d'« augmentation biomécanique ».",
        defeatCaption: "ANGUIRUS EST CALMÉ !",
        defeatDetail: "Libéré à son tour, Anguirus retourne se terrer dans les rochers. Dans l'entrepôt repéré, MONARCH découvre des plans inquiétants.",
        statusLabel: "Calmé",
        retryVariants: [
            "Un éboulis provoqué par Anguirus masque sa fuite : il s'enfonce dans un tunnel de la carrière avant que Godzilla ne puisse l'atteindre.",
            "Anguirus se roule en boule et dévale la pente rocheuse, hors de portée du rayon. Il faudra l'attirer à nouveau à découvert.",
        ],
        sentences: [
            { before: "Personne ne sait encore ", correct: "où", after: " Anguirus a établi son nouveau repaire depuis son réveil." },
            { before: "Est-ce dans cette carrière ", correct: "ou", after: " dans la forêt voisine qu'il s'est réfugié ?" },
            { before: "Les vibrations proviennent-elles d'un appareil ", correct: "ou", after: " d'un phénomène naturel ?" },
            { before: "Un analyste de Monarch cherche ", correct: "où", after: " le boîtier de Rodan a été fabriqué." },
            { before: "Le numéro de série mène à un entrepôt, mais ", correct: "où", after: " se trouve-t-il exactement ?" },
            { before: "Doit-il encercler Anguirus ", correct: "ou", after: " foncer directement dans la carrière ?" },
            { before: "Impossible de savoir ", correct: "où", after: " Anguirus va frapper ensuite." },
            { before: "Va-t-il falloir raisonner Anguirus ", correct: "ou", after: " le combattre de force ?" },
        ],
    },
    {
        kaiju: "gigan",
        nom: "Gigan",
        decor: "decors_gigan.jpg",
        palier: 3,
        pairWords: ["son", "sont"],
        pairLabel: "son / sont",
        astuce: "Remplace le mot par « étaient » : si la phrase garde son sens, c'est sont (le verbe être). Sinon, c'est son (comme sa ou ses), toujours suivi d'un nom.",
        chapterTitle: "Le prototype d'Apex",
        chapterIntro: "Le mot « augmentation » glace le sang des analystes de Monarch : ces plans ressemblent à ceux, classés secret-défense, du programme Mechagodzilla — officiellement enterré depuis le désastre de Hong Kong. Deux anciens ingénieurs d'Apex Cybernetics, disparus des radars depuis des années, semblent en être les auteurs. Leur premier « prototype » vient de surgir dans une métropole côtière : un titan bardé de lames et de plaques de métal que la presse surnomme déjà Gigan.",
        victoryBeat: "Gigan s'effondre parmi les décombres, ses systèmes hors service. En fouillant l'épave, un agent de Monarch découvre un détail troublant : les autorisations d'accès au site de test remontent... à l'intérieur même de Monarch. Quelqu'un, en interne, couvre les deux ingénieurs depuis le début.",
        defeatCaption: "GIGAN EST NEUTRALISÉ !",
        defeatDetail: "Ses systèmes hors service, Gigan s'effondre parmi les décombres. MONARCH capture l'épave pour l'étudier — et découvre une taupe en interne.",
        statusLabel: "Neutralisé",
        retryVariants: [
            "Ses lames rétractables tranchent un pan d'immeuble : Gigan s'enfuit dans le nuage de poussière avant que Godzilla ne referme la prise.",
            "Ses réacteurs dorsaux crachent un jet brûlant : Gigan s'échappe par les airs, laissant Godzilla les mains vides.",
        ],
        sentences: [
            { before: "Les analystes ", correct: "sont", after: " formels : les composants du boîtier viennent d'un ancien laboratoire Apex." },
            { before: "Gigan aiguise ", correct: "son", after: " dard rétractable contre la carcasse d'un cargo échoué." },
            { before: "Deux ex-employés d'Apex ", correct: "sont", after: " à l'origine du programme d'augmentation." },
            { before: "Le blindage de Gigan reflète ", correct: "son", after: " éclat métallique sous les projecteurs de la ville." },
            { before: "Les preuves ", correct: "sont", after: " accablantes : quelqu'un, au sein de Monarch, a couvert ces essais." },
            { before: "Godzilla évite de justesse ", correct: "son", after: " premier coup de faux et riposte aussitôt." },
            { before: "Les stabilisateurs de Gigan ", correct: "sont", after: " à bout de charge après ce combat prolongé." },
            { before: "Vaincu, Gigan replie ", correct: "son", after: " bras articulé et s'effondre sur les décombres." },
        ],
    },
    {
        kaiju: "mechagodzilla",
        nom: "Mechagodzilla",
        decor: "decors_mechagodzilla.jpg",
        palier: 4,
        pairWords: ["on", "ont", "on n'"],
        pairLabel: "on / ont",
        astuce: "Remplace le mot par « avaient » : si la phrase garde son sens, c'est ont (le verbe avoir). Sinon, c'est on (qu'on peut remplacer par il). Devant une négation qui commence par une voyelle, cela donne on n' — comme dans « on n'a pas vu ».",
        chapterTitle: "Le fantôme d'Apex",
        chapterIntro: "La taupe est démasquée à temps — mais trop tard pour empêcher l'inévitable. Sous une ancienne base futuriste d'Apex Cybernetics, un fragment du crâne de Ghidorah, cru détruit depuis des années, a servi de cœur à une nouvelle machine. Mechagodzilla se relève, plus silencieux et plus rapide que jamais. Depuis leurs derniers combats, Godzilla accumule de l'énergie dans ses écailles : cette fois, il ne pourra pas se contenter de briser un boîtier. Il va devoir puiser dans toutes ses forces.",
        victoryBeat: "Dans un dernier assaut incandescent, Godzilla perce le blindage de Mechagodzilla et met fin à des années de mensonges. La division fantôme d'Apex Cybernetics est démantelée, la taupe arrêtée. Sur l'île Infant, loin des caméras, Mothra observe le ciel s'éclaircir — et quelque chose dans son regard semble dire que cette histoire n'est pas tout à fait terminée.",
        defeatCaption: "MECHAGODZILLA EST DÉTRUIT !",
        defeatDetail: "Grâce à Godzilla, MONARCH met fin à la division fantôme d'Apex Cybernetics. Le Protocole Titan est officiellement clos.",
        statusLabel: "Détruit",
        retryVariants: [
            "Un bouclier d'urgence encaisse le coup final : Mechagodzilla recule dans l'ombre de la base, ses systèmes déjà en train de se réparer.",
            "Une décharge électromagnétique aveugle un instant les capteurs de Godzilla : Mechagodzilla profite de la confusion pour se replier plus profondément sous la base.",
        ],
        sentences: [
            { before: "Un rapport confidentiel confirme qu'", correct: "on", after: " détecte une signature thermique anormale sous l'ancien complexe Apex." },
            { before: "Les archives d'Apex ", correct: "ont", after: " été scellées après le scandale de Hong Kong." },
            { before: "D'après le dossier, ", correct: "on n'", after: "a jamais retrouvé les plans complets du prototype." },
            { before: "Deux ingénieurs ", correct: "ont", after: " repris en secret les recherches abandonnées." },
            { before: "Au sein de Monarch, ", correct: "on", after: " pensait le programme Mechagodzilla définitivement arrêté." },
            { before: "Les capteurs de Monarch ", correct: "ont", after: " localisé une activité électrique sous la base." },
            { before: "Jusqu'ici, ", correct: "on n'", after: "imaginait pas qu'un fragment du crâne de Ghidorah avait survécu." },
            { before: "Dans les couloirs de Monarch, ", correct: "on", after: " raconte que la machine s'est réveillée seule, sans commande humaine." },
        ],
    },
];

// Couleur du rayon / halo par palier (une couleur par chapitre)
const PALIER_TINT = {
    1: { glow: "#8fdcff", particle: [190, 60] },  // blanc-bleu
    2: { glow: "#4aa8ff", particle: [205, 70] },  // bleu intense
    3: { glow: "#a066ff", particle: [265, 70] },  // bleu-violet
    4: { glow: "#ff6a2e", particle: [15, 85] },   // rouge-orangé incandescent
};

// ======================= MODE BURNING (Godzilla Évolué) =======================
// Rose/magenta, comme dans Godzilla x Kong: The New Empire (2024) après
// absorption de radiations (couleur volontairement différente du rouge-
// orangé du palier 4, pour bien distinguer les deux). Fichiers optionnels :
// s'ils existent, ils remplacent le filtre rose appliqué en code.
const GODZILLA_BURNING_FILE = "assets/godzilla_burning.png";
const GODZILLA_BURNING_OUVERT_FILE = "assets/godzilla_burning_ouvert.png";
const RAYON_BURNING_FILE = "assets/rayon_burning.png";
const BURNING_TINT = { glow: "#ff2fb0", particle: [322, 90] };

// Le mode se déclenche quand plusieurs CHAPITRES sont enchaînés rapidement
// et sans faute (et non plus à la vitesse de chaque phrase individuelle).
const BURNING_TIME_THRESHOLD = 30;    // secondes : chapitre bouclé sous ce temps = "rapide"
const BURNING_STREAK_NEEDED = 2;      // nb de chapitres rapides/propres d'affilée pour activer le mode
const BURNING_GAP_BIG = 10;           // secondes d'écart sous le seuil pour obtenir le palier long
const BURNING_DURATION_SHORT = 10000; // ms (base, avant bonus de maîtrise)
const BURNING_DURATION_LONG = 20000;  // ms (base, avant bonus de maîtrise)
const BURNING_KILL_BONUS = 5;             // points bonus immédiats par cristal correct pendant le burning
const BURNING_LEVEL_BONUS_MULTIPLIER = 1.5; // multiplicateur sur le bonus de rapidité de fin de chapitre

// ======================= MAÎTRISE PROGRESSIVE DU MODE BURNING =======================
// Persistant via localStorage (indépendant d'une partie précise) : plus
// l'élève enchaîne de chapitres rapides et propres au fil des sessions,
// plus le mode devient facile à déclencher et plus il dure longtemps.
const MASTERY_STORAGE_KEY = "gpt_mastery_points_v1";
function loadMasteryPoints() {
    try { return parseInt(localStorage.getItem(MASTERY_STORAGE_KEY) || "0", 10) || 0; } catch (e) { return 0; }
}
function saveMasteryPoints() {
    try { localStorage.setItem(MASTERY_STORAGE_KEY, String(masteryPoints)); } catch (e) { /* stockage indisponible, tant pis */ }
    saveProgressToCloud();
}
let masteryPoints = loadMasteryPoints();

function getBurningStreakNeeded() {
    return masteryPoints >= 6 ? 1 : BURNING_STREAK_NEEDED;
}
function getBurningDuration(isLongGap) {
    const base = isLongGap ? BURNING_DURATION_LONG : BURNING_DURATION_SHORT;
    const bonus = Math.min(10000, Math.floor(masteryPoints / 3) * 2000);
    return base + bonus;
}

// ======================= RANGS DE GODZILLA (médailles) =======================
// Paliers basés sur masteryPoints (déjà persistant). Les noms sont ceux de
// diverses incarnations de Godzilla à travers les époques et continuités.
const MEDALS = [
    { name: "Godzilla",           threshold: 0,  glow: "rgba(120,170,255,0.5)",  grad: "radial-gradient(circle at 35% 30%, #7db8ff, #1c3a63)" },
    { name: "Godzilla Alpha",     threshold: 2,  glow: "rgba(90,150,255,0.55)",   grad: "radial-gradient(circle at 35% 30%, #5a9bff, #16305c)" },
    { name: "Godzilla Burning",   threshold: 5,  glow: "rgba(255,140,60,0.6)",    grad: "radial-gradient(circle at 35% 30%, #ffb15c, #7a2a0a)" },
    { name: "Shin Godzilla",      threshold: 8,  glow: "rgba(255,90,90,0.55)",    grad: "radial-gradient(circle at 35% 30%, #ff7a7a, #5c1414)" },
    { name: "Godzilla Earth",     threshold: 12, glow: "rgba(150,90,255,0.55)",   grad: "radial-gradient(circle at 35% 30%, #a888ff, #2a1a4a)" },
    { name: "Godzilla Ultima",    threshold: 16, glow: "rgba(255,214,102,0.6)",   grad: "radial-gradient(circle at 35% 30%, #ffe08a, #7a5a10)" },
    { name: "MechaGodzilla",      threshold: 21, glow: "rgba(160,220,255,0.6)",   grad: "radial-gradient(circle at 35% 30%, #cdeeff, #2c4a5c)" },
    { name: "SpaceGodzilla",      threshold: 27, glow: "rgba(200,120,255,0.6)",   grad: "radial-gradient(circle at 35% 30%, #d9a6ff, #3a1a4a)" },
    { name: "Godzilla Evolved",   threshold: 34, glow: "rgba(120,255,190,0.6)",   grad: "radial-gradient(circle at 35% 30%, #8affca, #124a38)" },
    { name: "Roi des Monstres",   threshold: 42, glow: "rgba(255,225,150,0.75)",  grad: "radial-gradient(circle at 35% 30%, #fff2c0, #a5731a)" },
];

function renderMedalsGallery() {
    const grid = document.getElementById("medal-grid");
    const progress = document.getElementById("medals-progress");
    if (!grid) return;
    grid.innerHTML = "";
    const pts = masteryPoints;
    const next = MEDALS.find((m) => pts < m.threshold);
    if (progress) {
        progress.textContent = next
            ? `🔥 Maîtrise actuelle : ${pts} pt(s) — encore ${next.threshold - pts} pt(s) pour débloquer « ${next.name} » !`
            : `🔥 Maîtrise actuelle : ${pts} pt(s) — tous les rangs sont débloqués, bravo !`;
    }
    MEDALS.forEach((m) => {
        const unlocked = pts >= m.threshold;
        const cell = document.createElement("div");
        cell.className = "medal-core " + (unlocked ? "unlocked" : "locked");
        const orb = document.createElement("div");
        orb.className = "medal-orb";
        orb.style.setProperty("--orb-grad", m.grad);
        orb.style.setProperty("--orb-glow", m.glow);
        orb.textContent = unlocked ? "🦖" : "🔒";
        const name = document.createElement("div");
        name.className = "medal-name";
        name.textContent = unlocked ? m.name : "???";
        const thresh = document.createElement("div");
        thresh.className = "medal-threshold";
        thresh.textContent = unlocked ? "Débloqué" : `${m.threshold} pt(s)`;
        cell.appendChild(orb); cell.appendChild(name); cell.appendChild(thresh);
        grid.appendChild(cell);
    });
}

const KAIJU_FILES = {
    rodan: "assets/kaiju_rodan.png",
    anguirus: "assets/kaiju_anguirus.png",
    mechagodzilla: "assets/kaiju_mechagodzilla.png",
    gigan: "assets/kaiju_gigan.png",
    spacegodzilla: "assets/kaiju_space_godzilla.png",
    biollante: "assets/kaiju_biollante.png",
    destroyah: "assets/kaiju_destroyah.png",
    ghidorah: "assets/kaiju_ghidorah.png",
};

// Mothra n'est PAS un adversaire : elle apparaît uniquement lors du combo
// bienveillant (voir registerCorrectForCombo / drawMothraFlyby). Chargée à
// part, comme dans ta référence — ce n'est plus un niveau à vaincre.
const MOTHRA_FILE = "assets/kaiju_mothra.png";

const DECOR_FALLBACK = "assets/decors_1_bis.jpg";
const DECOR_START = "assets/presentation.png"; // écran d'accueil (optionnel, retombe sur le décor du chapitre 1 si absent)

// ======================= PROGRESSION / TITANS INCONNUS =======================
// Un chapitre non encore atteint affiche "🔒" sur l'écran d'accueil. Une
// fois un chapitre terminé, il est révélé DÉFINITIVEMENT (persisté en
// local) et redevient rejouable librement depuis l'accueil ou les
// Dossiers Monarch pour améliorer son score, sans repasser par les
// chapitres précédents.
const DEFEATED_STORAGE_KEY = "gpt_defeated_levels_v1";
function loadDefeatedLevels() {
    try {
        const raw = localStorage.getItem(DEFEATED_STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
}
function saveDefeatedLevels() {
    try { localStorage.setItem(DEFEATED_STORAGE_KEY, JSON.stringify([...defeatedLevels])); } catch (e) { /* tant pis */ }
    saveProgressToCloud();
}
let defeatedLevels = loadDefeatedLevels();
function markLevelDefeated(idx) {
    if (!defeatedLevels.has(idx)) { defeatedLevels.add(idx); saveDefeatedLevels(); }
}
function getFrontierLevelIndex() {
    for (let i = 0; i < LEVELS.length; i++) if (!defeatedLevels.has(i)) return i;
    return LEVELS.length - 1;
}

// ======================= SAUVEGARDE EN LIGNE (Firebase, optionnelle) =======================
// Remplace ces valeurs par celles de TON propre projet Firebase (gratuit) :
// console.firebase.google.com -> créer un projet -> Firestore Database ->
// créer une base -> ⚙️ Paramètres du projet -> "Ajouter une application
// Web" -> copie l'objet de config affiché là-bas ici. Étapes détaillées et
// règles de sécurité Firestore à coller : voir le README.
// Tant que ces valeurs restent inchangées, le jeu fonctionne normalement
// avec la sauvegarde locale uniquement (aucune erreur, juste pas de sync).
const FIREBASE_CONFIG = {
    apiKey: "COLLE_TA_CLE_API_ICI",
    authDomain: "TON-PROJET.firebaseapp.com",
    projectId: "TON-PROJET",
    storageBucket: "TON-PROJET.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
};

const PLAYER_CODE_KEY = "gpt_player_code_v1";
let playerCode = null;
let cloudDb = null;
let cloudReady = false;

function isFirebaseConfigured() {
    return !!FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("COLLE_TA_CLE") === -1;
}

function setCloudStatus(text) {
    const el = document.getElementById("cloud-status");
    if (el) el.textContent = text;
}

// Appelée une fois, au chargement de la page (voir window.onload). Ne
// bloque jamais le jeu : si Firebase n'est pas configuré, pas chargé
// (réseau bloqué, extension anti-pub...), ou en erreur, on retombe
// silencieusement sur la sauvegarde locale déjà en place.
function initCloudSync() {
    if (!isFirebaseConfigured()) {
        setCloudStatus("Sauvegarde en ligne non configurée — progression gardée sur cet appareil uniquement. (Voir le README pour l'activer.)");
        return;
    }
    if (typeof firebase === "undefined") {
        setCloudStatus("Firebase n'a pas pu se charger (connexion ?) — progression sur cet appareil uniquement.");
        return;
    }
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        cloudDb = firebase.firestore();
        cloudReady = true;
        try { playerCode = localStorage.getItem(PLAYER_CODE_KEY) || null; } catch (e) { playerCode = null; }
        const input = document.getElementById("player-code-input");
        if (playerCode && input) input.value = playerCode;
        if (playerCode) loadProgressFromCloud();
        else setCloudStatus("Entre un code élève ci-dessus pour activer la sauvegarde en ligne.");
    } catch (e) {
        console.warn("Firebase indisponible :", e);
        cloudReady = false;
        setCloudStatus("Sauvegarde en ligne indisponible pour le moment — progression sur cet appareil uniquement.");
    }
}

function setPlayerCode(code) {
    code = (code || "").trim();
    if (!code) return;
    playerCode = code;
    try { localStorage.setItem(PLAYER_CODE_KEY, code); } catch (e) { /* tant pis */ }
    if (cloudReady) loadProgressFromCloud();
    else setCloudStatus("Code enregistré, mais la sauvegarde en ligne n'est pas configurée (voir le README).");
}

// Fusionne systématiquement plutôt que d'écraser : passer d'un appareil à
// l'autre ne fait jamais perdre un chapitre déjà débloqué (union des
// chapitres vaincus, maximum des points de maîtrise).
function loadProgressFromCloud() {
    if (!cloudReady || !playerCode) return;
    setCloudStatus("☁️ Synchronisation...");
    cloudDb.collection("progress").doc(playerCode).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data() || {};
                (Array.isArray(data.defeatedLevels) ? data.defeatedLevels : []).forEach((i) => defeatedLevels.add(i));
                masteryPoints = Math.max(masteryPoints, data.masteryPoints || 0);
                saveDefeatedLevels(); saveMasteryPoints();
                renderLevelsTrack(); updateStartButtonLabel();
            }
            setCloudStatus(`☁️ Synchronisé (code : ${playerCode})`);
            saveProgressToCloud(); // repousse l'état fusionné, y compris vers un doc qui n'existait pas encore
        })
        .catch((e) => {
            console.warn("Lecture cloud impossible :", e);
            setCloudStatus("☁️ Erreur de synchronisation — nouvel essai à la prochaine victoire.");
        });
}

function saveProgressToCloud() {
    if (!cloudReady || !playerCode) return;
    cloudDb.collection("progress").doc(playerCode).set({
        defeatedLevels: [...defeatedLevels],
        masteryPoints: masteryPoints,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).then(() => {
        setCloudStatus(`☁️ Synchronisé (code : ${playerCode})`);
    }).catch((e) => {
        console.warn("Écriture cloud impossible :", e);
        setCloudStatus("☁️ Erreur de synchronisation — nouvel essai à la prochaine victoire.");
    });
}

// ======================= CHARGEMENT + CHROMA KEY =======================
// Toutes les images "personnages" sont sur fond bleu pur #0000FF.
function loadAndKeyImage(src, onReady) {
    const img = new Image();
    // Sécurité : onReady() ne doit JAMAIS pouvoir rester sans appel — sinon
    // le chargement reste bloqué indéfiniment et le bouton "Affronter" reste
    // grisé pour toujours. tout le traitement (pas seulement le détourage)
    // est donc protégé par un seul et même try/catch.
    img.onload = () => {
        try {
            const off = document.createElement("canvas");
            off.width = img.naturalWidth;
            off.height = img.naturalHeight;
            const octx = off.getContext("2d");
            octx.drawImage(img, 0, 0);
            const data = octx.getImageData(0, 0, off.width, off.height);
            const px = data.data;
            for (let i = 0; i < px.length; i += 4) {
                const r = px[i], g = px[i + 1], b = px[i + 2];
                const blueness = b - Math.max(r, g);
                if (b > 140 && blueness > 60) {
                    const alpha = Math.max(0, 1 - blueness / 170);
                    px[i + 3] = Math.min(px[i + 3], Math.round(alpha * 255));
                    if (px[i + 3] > 0) px[i + 2] = Math.min(b, Math.max(r, g) + 25);
                }
            }
            octx.putImageData(data, 0, 0);
            // toDataURL() peut lever une SecurityError sur certains navigateurs en
            // file:// (double-clic sans serveur) même quand getImageData a réussi.
            const keyed = new Image();
            keyed.onload = () => onReady(keyed);
            keyed.onerror = () => onReady(img); // repli : image non détourée mais visible
            keyed.src = off.toDataURL();
        } catch (e) {
            console.warn("Chroma-key impossible pour", src, "— image utilisée telle quelle.", e);
            onReady(img);
        }
    };
    img.onerror = () => { console.warn("Image manquante :", src); onReady(null); };
    img.src = src;
}

function loadPlainImage(src, onReady, fallbackSrc) {
    const img = new Image();
    img.onload = () => onReady(img);
    img.onerror = () => {
        if (fallbackSrc) {
            const fb = new Image();
            fb.onload = () => onReady(fb);
            fb.onerror = () => onReady(null);
            fb.src = fallbackSrc;
        } else {
            onReady(null);
        }
    };
    img.src = src;
}

const ASSETS = {
    godzilla: null,
    godzillaOuvert: null,
    godzillaBurning: null,       // optionnel
    godzillaBurningOuvert: null, // optionnel
    rayon: null,
    rayonBurning: null,          // optionnel
    decorStart: null,
    mothra: null,                // gardienne, chargée à part (voir MOTHRA_FILE)
    kaiju: {},
    decors: {},
    ready: false,
};

function preloadAllAssets(onAllReady) {
    let pending = 0;
    let done = 0;
    let finished = false;
    function finish() {
        if (finished) return;
        finished = true;
        ASSETS.ready = true;
        onAllReady();
    }
    function tick() { done++; if (done >= pending) finish(); }

    pending++; loadAndKeyImage("assets/godzilla.png", (img) => { ASSETS.godzilla = img; tick(); });
    pending++; loadAndKeyImage("assets/godzilla_ouvert.png", (img) => { ASSETS.godzillaOuvert = img; tick(); });
    pending++; loadAndKeyImage("assets/rayon.png", (img) => { ASSETS.rayon = img; tick(); });
    pending++; loadAndKeyImage(MOTHRA_FILE, (img) => { ASSETS.mothra = img; tick(); });
    // assets "burning" optionnels : pas d'erreur si absents, juste null -> filtre rose de secours
    pending++; loadAndKeyImage(GODZILLA_BURNING_FILE, (img) => { ASSETS.godzillaBurning = img; tick(); });
    pending++; loadAndKeyImage(GODZILLA_BURNING_OUVERT_FILE, (img) => { ASSETS.godzillaBurningOuvert = img; tick(); });
    pending++; loadAndKeyImage(RAYON_BURNING_FILE, (img) => { ASSETS.rayonBurning = img; tick(); });

    const neededKaiju = new Set(LEVELS.map((l) => l.kaiju));
    neededKaiju.forEach((key) => {
        const file = KAIJU_FILES[key];
        pending++;
        if (!file) { ASSETS.kaiju[key] = null; tick(); return; }
        loadAndKeyImage(file, (img) => { ASSETS.kaiju[key] = img; tick(); });
    });

    LEVELS.forEach((lvl, idx) => {
        pending++;
        loadPlainImage("assets/" + lvl.decor.replace(/^assets\//, ""), (img) => {
            ASSETS.decors[idx] = img; tick();
        }, DECOR_FALLBACK);
    });
    pending++; loadPlainImage(DECOR_FALLBACK, (img) => { ASSETS.decors.bis = img; tick(); });
    pending++; loadPlainImage(DECOR_START, (img) => { ASSETS.decorStart = img; tick(); }, DECOR_FALLBACK);

    // Filet de sécurité : si un chargement reste bloqué pour une raison
    // imprévue (navigateur/réseau), le jeu démarre quand même après 8s au
    // lieu de laisser le bouton "Affronter" grisé indéfiniment.
    setTimeout(() => {
        if (!finished) { console.warn("Chargement des images incomplet après 8s — démarrage quand même."); finish(); }
    }, 8000);
}

// ======================= OUTILS =======================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ======================= AUDIO (synthétisé, ton "impact kaiju") =======================
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); }

function playImpactSound() {
    initAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
}

function playCrumbleSound() {
    initAudio();
    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 1400;
    noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    noise.start();
}

function playBeamSound() {
    initAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.28);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.start(now); osc.stop(now + 0.32);
}

function playFanfare() {
    initAudio();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = f; osc.type = "triangle";
        const t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
    });
}

function playVictory() {
    initAudio();
    const melody = [523, 587, 659, 784, 880, 1047, 1319];
    melody.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = f; osc.type = "sine";
        const t = audioCtx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        osc.start(t); osc.stop(t + 0.7);
    });
}

function playComboChime() {
    initAudio();
    const notes = [784, 988, 1245];
    notes.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = f; osc.type = "sine";
        const t = audioCtx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
    });
}

// ======================= CANVAS / ÉTAT GLOBAL =======================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const SAFE_TOP = 170;
const SAFE_BOTTOM = 100;

let currentLevelIndex = 0;
let currentScore = 0;
let errors = 0;
let gameActive = false;
let animationId = null;
let cristaux = [];
let particles = [];
let fireworks = [];
let floatingTexts = [];
let currentSentenceIndex = 0;
let currentFact = null;
let mouseXPos = 550, mouseYPos = 400;
let levelStartTime = 0, currentLevelTime = 0, totalTimeBonus = 0;
let chronoInterval = null;
let victoryFireworks = false;
let activeCard = null;
let cardTimeout = null;
let shotLock = false;
let pendingVictoryBonus = 0;
let chapterScreenMode = "intro"; // "intro" | "victory"
let retryAttempts = {};

// combo Mothra
let comboTimestamps = [];
let mothraFlyby = null; // { start, duration } survol bienveillant

// mode Burning (chapitres rapides/propres enchaînés, voir plus haut)
let burningStreak = 0;
let burningMode = false;
let burningExpiresAt = 0;

// apparition du Titan avant la fin du chapitre (voir loadCurrentSentence)
let titanRevealed = false;
let forcedBurning = false;
const TITAN_REVEAL_REMAINING = 3; // nb de phrases restantes (dont la courante)

// beam animation state
let beam = null;
let godzillaMouthOpen = false;

// séquence cinématique de victoire de chapitre
let bossDefeat = null; // { kaijuKey, start, duration }

// ======================= PARTICULES =======================
class Particle {
    constructor(x, y, hue) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 9;
        this.vy = (Math.random() - 0.5) * 9 - 3;
        this.life = 1;
        this.color = `hsl(${hue}, 80%, 62%)`;
        this.size = Math.random() * 7 + 3;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.2; this.life -= 0.02; return this.life > 0; }
    draw() { ctx.fillStyle = this.color; ctx.globalAlpha = this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}

class DustParticle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6 - 2;
        this.life = 1;
        this.size = Math.random() * 5 + 2;
        this.rot = Math.random() * Math.PI * 2;
        this.vrot = (Math.random() - 0.5) * 0.3;
        this.gray = 90 + Math.random() * 60;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.22; this.rot += this.vrot; this.life -= 0.025; return this.life > 0; }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = `rgb(${this.gray},${this.gray - 10},${this.gray - 15})`;
        ctx.beginPath();
        ctx.moveTo(-this.size, -this.size * 0.6);
        ctx.lineTo(this.size, -this.size * 0.3);
        ctx.lineTo(this.size * 0.6, this.size);
        ctx.lineTo(-this.size * 0.8, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

class Firework {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.particles = [];
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: `hsl(${Math.random() * 360}, 85%, 65%)`, size: Math.random() * 5 + 2 });
        }
    }
    update() {
        let alive = false;
        for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.02; if (p.life > 0) alive = true; }
        return alive;
    }
    draw() { for (const p of this.particles) { ctx.fillStyle = p.color; ctx.globalAlpha = p.life * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
}

// petit texte flottant "+5🔥" au point d'impact pendant le mode Burning
class FloatingText {
    constructor(x, y, text) { this.x = x; this.y = y; this.text = text; this.life = 1; }
    update() { this.y -= 1.1; this.life -= 0.018; return this.life > 0; }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = "bold 24px 'Bebas Neue', sans-serif";
        ctx.fillStyle = "#ff6fc7";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 6;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
function spawnBurningBonusPopup(x, y) { floatingTexts.push(new FloatingText(x, y, `+${BURNING_KILL_BONUS} 🔥`)); }

// ======================= CRISTAL DE CAMOUFLAGE =======================
class Cristal {
    constructor(value, isCorrect, kaijuKey, variant = null) {
        this.value = value;
        this.isCorrect = isCorrect;
        this.kaijuKey = kaijuKey;
        this.radius = 58;
        this.state = "idle";
        this.stateT = 0;
        this.hue = 185 + Math.random() * 110;
        this.facets = this.generateFacets();
        this.fontSize = this.computeFontSize();

        let side = variant !== null ? variant : Math.floor(Math.random() * 4);
        if (side === 0) { this.x = this.radius + 5; this.y = rand(SAFE_TOP + this.radius, canvas.height - this.radius - SAFE_BOTTOM); this.vx = rand(1.0, 2.2); this.vy = rand(-0.8, 0.8); }
        else if (side === 1) { this.x = canvas.width - this.radius - 5; this.y = rand(SAFE_TOP + this.radius, canvas.height - this.radius - SAFE_BOTTOM); this.vx = -rand(1.0, 2.2); this.vy = rand(-0.8, 0.8); }
        else if (side === 2) { this.x = rand(this.radius, canvas.width - this.radius); this.y = SAFE_TOP + this.radius + 5; this.vx = rand(-0.9, 0.9); this.vy = rand(0.8, 1.4); }
        else { this.x = rand(this.radius, canvas.width - this.radius); this.y = canvas.height - this.radius - SAFE_BOTTOM - 5; this.vx = rand(-0.9, 0.9); this.vy = -rand(0.8, 1.4); }

        this.floatAngle = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.02 + Math.random() * 0.015;
    }

    computeFontSize() {
        const text = String(this.value);
        const maxWidth = this.radius * 1.5;
        let size = 30;
        ctx.save();
        while (size > 14) {
            ctx.font = `bold ${size}px 'Bebas Neue', sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        }
        ctx.restore();
        return size;
    }

    generateFacets() {
        const pts = [];
        const n = 8;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const r = this.radius * (0.78 + Math.random() * 0.28);
            pts.push({ a, r });
        }
        return pts;
    }

    update() {
        if (this.state === "idle") {
            this.x += this.vx; this.y += this.vy;
            this.floatAngle += this.floatSpeed;
            this.y += Math.sin(this.floatAngle) * 0.5;
            const top = SAFE_TOP + this.radius, bottom = canvas.height - this.radius - SAFE_BOTTOM;
            if (this.x - this.radius < 5) { this.x = this.radius + 5; this.vx = Math.abs(this.vx) * 0.97; }
            if (this.x + this.radius > canvas.width - 5) { this.x = canvas.width - this.radius - 5; this.vx = -Math.abs(this.vx) * 0.97; }
            if (this.y < top) { this.y = top; this.vy = Math.abs(this.vy) * 0.97; }
            if (this.y > bottom) { this.y = bottom; this.vy = -Math.abs(this.vy) * 0.97; }
            const maxSpeed = 2.6;
            if (Math.abs(this.vx) > maxSpeed) this.vx = Math.sign(this.vx) * maxSpeed;
            if (Math.abs(this.vy) > maxSpeed) this.vy = Math.sign(this.vy) * maxSpeed;
        } else {
            this.stateT += 1 / 60;
        }
        return this.state !== "dead";
    }

    clipPath() {
        ctx.beginPath();
        this.facets.forEach((p, i) => {
            const px = this.x + Math.cos(p.a) * p.r;
            const py = this.y + Math.sin(p.a) * p.r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
    }

    drawRock(alpha) {
        ctx.save();
        this.clipPath();
        const grad = ctx.createRadialGradient(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsla(${this.hue}, 70%, 72%, ${0.55 * alpha})`);
        grad.addColorStop(0.6, `hsla(${this.hue}, 65%, 48%, ${0.42 * alpha})`);
        grad.addColorStop(1, `hsla(${this.hue}, 60%, 30%, ${0.38 * alpha})`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 82%, ${0.8 * alpha})`;
        ctx.shadowColor = `hsla(${this.hue}, 90%, 65%, ${0.6 * alpha})`;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        this.clipPath(); ctx.clip();
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 90%, ${0.25 * alpha})`;
        ctx.lineWidth = 1;
        this.facets.forEach((p) => {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(p.a) * p.r, this.y + Math.sin(p.a) * p.r);
            ctx.stroke();
        });
        ctx.restore();
    }

    drawKaijuInside(revealT) {
        ctx.save();
        this.clipPath(); ctx.clip();
        const img = ASSETS.kaiju[this.kaijuKey];
        const size = this.radius * 2.3;
        if (img) {
            ctx.globalAlpha = revealT;
            ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size * (img.height / img.width));
        } else {
            drawKaijuSilhouette(this.x, this.y, size, revealT);
        }
        // teinte rouge "touché" légère, pour ne pas cacher le kaiju
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = `rgba(255,40,30,${0.22 * revealT})`;
        ctx.fillRect(this.x - size, this.y - size, size * 2, size * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    draw() {
        if (this.state === "idle") {
            this.drawRock(1);
            ctx.save();
            ctx.font = `bold ${this.fontSize}px 'Bebas Neue', sans-serif`;
            ctx.fillStyle = "#f4fbff";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4;
            ctx.fillText(String(this.value), this.x, this.y + 1);
            ctx.restore();
        } else if (this.state === "cracking") {
            const t = Math.min(1, this.stateT / 0.22);
            this.drawRock(1 - t * 0.5);
            this.drawCracks(t);
        } else if (this.state === "revealing") {
            const t = Math.min(1, this.stateT / 0.5);
            this.drawKaijuInside(t);
            this.drawRock(0.1);
            this.drawCracks(1);
        }
    }

    drawCracks(t) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * t})`;
        ctx.lineWidth = 1.5;
        const seed = hashString(String(this.value));
        for (let i = 0; i < 5; i++) {
            const a = (seed * 13 + i * 71) % 360 * Math.PI / 180;
            const len = this.radius * (0.5 + (i % 3) * 0.15) * t;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(a) * len, this.y + Math.sin(a) * len);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function rand(a, b) { return a + Math.random() * (b - a); }

function drawKaijuSilhouette(x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#1a1420";
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.12, size * 0.34, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - size * 0.12, y - size * 0.28, size * 0.22, size * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4433";
    ctx.beginPath(); ctx.arc(x - size * 0.18, y - size * 0.3, size * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
}

// silhouette de secours (contexte 2D quelconque, ex. mini-vignettes des Dossiers Monarch)
function drawMysterySilhouette(pctx, x, y, size) {
    pctx.save();
    pctx.globalAlpha = 0.85;
    pctx.fillStyle = "#0d0a12";
    pctx.beginPath();
    pctx.ellipse(x, y + size * 0.12, size * 0.3, size * 0.36, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.beginPath();
    pctx.ellipse(x - size * 0.1, y - size * 0.26, size * 0.2, size * 0.18, -0.3, 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();
    pctx.font = `bold ${Math.floor(size * 0.32)}px 'Bebas Neue', sans-serif`;
    pctx.fillStyle = "#ffb347";
    pctx.textAlign = "center"; pctx.textBaseline = "middle";
    pctx.fillText("?", x, y);
}

// ======================= DÉCOR (cover-fit) =======================
function drawBackground() {
    const img = ASSETS.decors[currentLevelIndex] || ASSETS.decors.bis;
    if (img) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale, h = img.height * scale;
        const dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
        ctx.drawImage(img, dx, dy, w, h);
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "rgba(0,0,0,0.35)");
        grad.addColorStop(0.25, "rgba(0,0,0,0.05)");
        grad.addColorStop(0.8, "rgba(0,0,0,0.05)");
        grad.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#0a0e18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawStartScreenBackdrop() {
    const img = ASSETS.decorStart;
    if (img) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    } else {
        ctx.fillStyle = "#0a0e18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ======================= APPARITION DU TITAN (3 phrases restantes) =======================
// Le Titan du chapitre apparaît partiellement derrière des rochers, en fond
// à droite de l'écran, pour prévenir que la fin du chapitre approche — en
// plus du passage automatique en mode Burning (voir loadCurrentSentence).
// IMPORTANT (correction de bug) : n'est appelée que si !bossDefeat côté
// gameLoop, pour ne jamais se superposer à la séquence de victoire qui
// affiche déjà ce même Titan en grand.
function drawTitanLooming() {
    if (!titanRevealed) return;
    const img = ASSETS.kaiju[LEVELS[currentLevelIndex].kaiju];
    const cx = canvas.width - 175, cy = SAFE_TOP + 150;
    const size = 260;
    ctx.save();
    ctx.globalAlpha = 0.92;
    if (img) {
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size * (img.height / img.width));
    } else {
        drawKaijuSilhouette(cx, cy, size, 1);
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#14100e";
    const rockY = cy + size * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.62, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.2, rockY);
    ctx.lineTo(cx + size * 0.05, cy + size * 0.42);
    ctx.lineTo(cx + size * 0.35, rockY + 10);
    ctx.lineTo(cx + size * 0.65, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.68, cy + size * 0.62);
    ctx.lineTo(cx - size * 0.65, cy + size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
}

// ======================= GODZILLA + RAYON =======================
const GODZILLA_DRAW_WIDTH = 430;
const GODZILLA_ANCHOR = { x: 170, y: canvas.height - 60 };
// Recalibré sur les fichiers godzilla.png / godzilla_ouvert.png de la v2
// (Godzilla fait maintenant face à DROITE, vers l'arène, au lieu de
// gauche). Mesuré par Julie par détection des pixels de la bouche.
const GODZILLA_MOUTH_REL = { x: 0.788, y: 0.153 };

function godzillaDrawRect() {
    let img;
    if (burningMode && godzillaMouthOpen && ASSETS.godzillaBurningOuvert) img = ASSETS.godzillaBurningOuvert;
    else if (burningMode && !godzillaMouthOpen && ASSETS.godzillaBurning) img = ASSETS.godzillaBurning;
    else img = godzillaMouthOpen ? ASSETS.godzillaOuvert : ASSETS.godzilla;
    if (!img) return null;
    const w = GODZILLA_DRAW_WIDTH;
    const h = w * (img.height / img.width);
    const x = GODZILLA_ANCHOR.x - w / 2;
    const y = GODZILLA_ANCHOR.y - h;
    return { img, x, y, w, h };
}

function getMouthPosition() {
    const rect = godzillaDrawRect();
    if (!rect) return { x: GODZILLA_ANCHOR.x, y: GODZILLA_ANCHOR.y - 220 };
    return { x: rect.x + rect.w * GODZILLA_MOUTH_REL.x, y: rect.y + rect.h * GODZILLA_MOUTH_REL.y };
}

// true si on utilise le filtre rose de secours (pas d'image "burning" fournie)
function usingBurningFallback() {
    return burningMode && !((godzillaMouthOpen && ASSETS.godzillaBurningOuvert) || (!godzillaMouthOpen && ASSETS.godzillaBurning));
}

function drawGodzilla() {
    const rect = godzillaDrawRect();
    if (!rect) return;
    const safeIdx = Math.min(currentLevelIndex, LEVELS.length - 1);
    const palier = LEVELS[safeIdx].palier;
    const tint = burningMode ? BURNING_TINT : PALIER_TINT[palier];
    const pulse = burningMode ? 8 * Math.sin(Date.now() / 80) : 0;
    ctx.save();
    ctx.shadowColor = tint.glow;
    ctx.shadowBlur = (godzillaMouthOpen ? 26 : 10) + (burningMode ? 14 + pulse : 0);
    ctx.drawImage(rect.img, rect.x, rect.y, rect.w, rect.h);
    if (usingBurningFallback()) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(255,47,176,0.38)";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
}

function drawMothraFlyby() {
    const img = ASSETS.mothra;
    if (!mothraFlyby || !img) return;
    const elapsed = performance.now() - mothraFlyby.start;
    const t = elapsed / mothraFlyby.duration;
    if (t >= 1) { mothraFlyby = null; return; }
    const w = 260, h = w * (img.height / img.width);
    const x = -w + t * (canvas.width + w * 2);
    const y = SAFE_TOP + 40 + Math.sin(t * Math.PI * 3) * 30;
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.min(t, 1) * Math.PI);
    ctx.shadowColor = "#ffe08a";
    ctx.shadowBlur = 25;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
}

function drawBeam() {
    if (!beam) return;
    const { x1, y1, x2, y2, progress, hue } = beam;
    const cx = x1 + (x2 - x1) * progress;
    const cy = y1 + (y2 - y1) * progress;
    const dist = Math.hypot(cx - x1, cy - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const img = (burningMode && ASSETS.rayonBurning) ? ASSETS.rayonBurning : ASSETS.rayon;
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    const thickness = 38;
    ctx.globalCompositeOperation = "lighter";
    if (img && dist > 4) {
        ctx.drawImage(img, 0, -thickness / 2, dist, thickness);
        ctx.fillStyle = `hsla(${hue}, 100%, 65%, 0.35)`;
        ctx.fillRect(0, -thickness / 2, dist, thickness);
    } else if (dist > 4) {
        const g = ctx.createLinearGradient(0, 0, dist, 0);
        g.addColorStop(0, `hsla(${hue},100%,90%,0.95)`);
        g.addColorStop(1, `hsla(${hue},100%,70%,0.15)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, -thickness / 2, dist, thickness);
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
}

// ======================= UI HELPERS =======================
function updateUI() {
    const lvl = LEVELS[currentLevelIndex];
    document.getElementById("lbl-level").innerText = currentLevelIndex + 1;
    document.getElementById("lbl-score").innerText = currentScore;
    document.getElementById("lbl-score-max").innerText = "/" + lvl.sentences.length;
    document.getElementById("lbl-points").innerText = totalTimeBonus;
    document.getElementById("lbl-errors").innerText = errors;
    document.getElementById("lbl-table").innerText = lvl.pairLabel;
    document.getElementById("lbl-kaiju").innerText = lvl.nom;
    document.getElementById("burning-badge").classList.toggle("hidden", !burningMode);
}

function renderSentence(fact) {
    document.getElementById("phrase-card").innerHTML =
        escapeHtml(fact.before) + '<span class="blank-gap">?</span>' + escapeHtml(fact.after);
}

function showCelebration(emojiSet) {
    const container = document.getElementById("game-container");
    for (let i = 0; i < 26; i++) {
        const div = document.createElement("div");
        div.innerHTML = emojiSet;
        div.style.position = "absolute";
        div.style.left = Math.random() * 100 + "%";
        div.style.top = "0px";
        div.style.fontSize = (14 + Math.random() * 22) + "px";
        div.style.animation = "confetti 1s ease-out forwards";
        div.style.pointerEvents = "none";
        div.style.zIndex = "200";
        container.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }
}

function flashPalier() {
    const el = document.getElementById("palier-flash");
    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");
}

// ======================= CARTE "LEÇON EXPRESS" =======================
function showHelpCard(fact, wrongVal) {
    if (activeCard) { if (cardTimeout) clearTimeout(cardTimeout); activeCard.remove(); activeCard = null; }
    const correction = escapeHtml(fact.before) + "<u>" + escapeHtml(fact.correct) + "</u>" + escapeHtml(fact.after);
    const explanation = `Tu as choisi « ${escapeHtml(wrongVal)} », ce n'est pas le bon mot ici.`;
    const rule = LEVELS[currentLevelIndex].astuce;

    const card = document.createElement("div");
    card.className = "help-card";
    card.style.right = "-420px";
    card.innerHTML = `
        <div class="card-header">
            <span>📖 Leçon express</span>
            <div class="close-card">✖</div>
        </div>
        <div class="card-body">
            <div class="correction">✅ ${correction}</div>
            <div class="explanation">${explanation}</div>
            <div class="rule">💡 ${rule}</div>
        </div>
        <div class="card-footer">Cliquez pour fermer · disparaît dans 7s</div>
    `;
    document.getElementById("game-container").appendChild(card);
    activeCard = card;
    setTimeout(() => { if (card) card.style.right = "25px"; }, 10);

    const closeCard = (e) => {
        e.stopPropagation();
        if (card && card.parentNode) card.remove();
        if (activeCard === card) activeCard = null;
        if (cardTimeout) clearTimeout(cardTimeout);
        document.removeEventListener("click", closeCard);
    };
    card.querySelector(".close-card").addEventListener("click", closeCard);
    card.addEventListener("click", closeCard);
    cardTimeout = setTimeout(() => { if (card && card.parentNode) card.remove(); if (activeCard === card) activeCard = null; }, 7000);
}

// ======================= COMBO MOTHRA =======================
function registerCorrectForCombo() {
    const now = Date.now();
    comboTimestamps.push(now);
    if (comboTimestamps.length > 3) comboTimestamps.shift();
    if (comboTimestamps.length === 3 && (now - comboTimestamps[0]) <= 10000) {
        comboTimestamps = [];
        if (errors > 0) {
            errors--;
            updateUI();
            playComboChime();
            const el = document.getElementById("combo-indicator");
            el.textContent = "🦋 MOTHRA VEILLE SUR TOI ! −1 FAUTE";
            el.classList.add("show");
            setTimeout(() => el.classList.remove("show"), 1800);
            mothraFlyby = { start: performance.now(), duration: 2200 };
        }
    }
}
function registerWrongForCombo() { comboTimestamps = []; }

// ======================= BOUCLE DE JEU =======================
function loadCurrentSentence() {
    if (!gameActive) return;
    const lvl = LEVELS[currentLevelIndex];
    if (currentSentenceIndex >= lvl.sentences.length) {
        finishLevel();
        return;
    }
    currentFact = lvl.sentences[currentSentenceIndex];
    renderSentence(currentFact);
    const opts = shuffle(lvl.pairWords.map((w) => ({ val: w, correct: w === currentFact.correct })));
    cristaux = opts.map((o) => new Cristal(o.val, o.correct, lvl.kaiju, Math.floor(Math.random() * 4)));

    // il ne reste plus que TITAN_REVEAL_REMAINING phrases (celle-ci incluse) :
    // le Titan apparaît derrière les rochers et Godzilla passe automatiquement
    // (et reste) en mode Burning jusqu'à la fin du chapitre.
    const remaining = lvl.sentences.length - currentSentenceIndex;
    if (!titanRevealed && remaining <= TITAN_REVEAL_REMAINING) {
        titanRevealed = true;
        forcedBurning = true;
        burningMode = true;
        updateUI();
    }
}

function finishLevel() {
    pendingVictoryBonus = stopLevelTimerAndComputeBonus();
    markLevelDefeated(currentLevelIndex);
    playBossDefeatSequence(() => {
        showCelebration("✨💥🦖");
        showChapterVictory();
    });
}

// Grand écran cinématique : le Titan du chapitre apparaît en entier,
// bascule et s'écroule (ou s'envole libéré, selon le chapitre).
function playBossDefeatSequence(onDone) {
    shotLock = true;
    cristaux = [];
    initAudio();
    playImpactSound();
    const kaijuKey = LEVELS[currentLevelIndex].kaiju;
    const duration = 2800;
    bossDefeat = { kaijuKey, start: performance.now(), duration };
    setTimeout(() => { bossDefeat = null; shotLock = false; onDone(); }, duration);
}

function drawBossDefeat() {
    if (!bossDefeat) return;
    const elapsed = performance.now() - bossDefeat.start;
    const t = Math.min(1, elapsed / bossDefeat.duration);
    const img = ASSETS.kaiju[bossDefeat.kaijuKey];
    const cx = canvas.width / 2, baseY = canvas.height / 2 - 20;
    const rot = t * Math.PI;
    const fall = t * 90;
    const alpha = 1 - Math.max(0, t - 0.65) / 0.35;

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - t * 0.5)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(cx, baseY + fall);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.max(0, alpha);
    const size = 460;
    if (img) {
        ctx.drawImage(img, -size / 2, -size * (img.height / img.width) / 2, size, size * (img.height / img.width));
    } else {
        drawKaijuSilhouette(0, 0, size, 1);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    const lvl = LEVELS[currentLevelIndex];
    ctx.save();
    ctx.fillStyle = "#ffd966";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.globalAlpha = Math.min(1, t * 3);
    if (t < 0.55) {
        ctx.font = "bold 30px 'Bebas Neue', sans-serif";
        ctx.fillText(lvl.defeatCaption, cx, 60);
    } else {
        ctx.font = "bold 26px 'Bebas Neue', sans-serif";
        wrapCanvasText(lvl.defeatDetail, cx, 60, 780, 32);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

// retour à la ligne d'un texte trop long dans le canvas
function wrapCanvasText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let ly = y;
    for (let i = 0; i < words.length; i++) {
        const test = line + words[i] + " ";
        if (ctx.measureText(test).width > maxWidth && line !== "") {
            ctx.fillText(line, x, ly);
            line = words[i] + " ";
            ly += lineHeight;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, ly);
}

function handleShot(x, y) {
    if (!gameActive || shotLock) return;
    for (let i = cristaux.length - 1; i >= 0; i--) {
        const c = cristaux[i];
        if (c.state !== "idle") continue;
        const dist = Math.hypot(x - c.x, y - c.y);
        if (dist < c.radius) {
            if (c.isCorrect) fireAtCristal(c); else missCristal(c);
            return;
        }
    }
}

function missCristal(c) {
    initAudio();
    playCrumbleSound();
    for (let p = 0; p < 18; p++) particles.push(new DustParticle(c.x, c.y));
    c.state = "dead";
    cristaux = cristaux.filter((cr) => cr !== c);

    errors++;
    registerWrongForCombo();
    updateUI();
    showHelpCard(currentFact, String(c.value));

    if (errors >= 5) {
        stopLevelTimerAndComputeBonus();
        gameActive = false;
        showGameOver();
    } else {
        // La même phrase revient : l'histoire n'avance pas tant
        // qu'elle n'est pas résolue correctement.
        loadCurrentSentence();
    }
}

function fireAtCristal(c) {
    shotLock = true;
    initAudio();
    playBeamSound();
    godzillaMouthOpen = true;

    const mouth = getMouthPosition();
    const palier = LEVELS[currentLevelIndex].palier;
    const hue = burningMode ? BURNING_TINT.particle[0] : PALIER_TINT[palier].particle[0];
    beam = { x1: mouth.x, y1: mouth.y, x2: c.x, y2: c.y, progress: 0, hue };

    const beamDuration = 260;
    const start = performance.now();
    function animateBeam(t) {
        const p = Math.min(1, (t - start) / beamDuration);
        beam.progress = easeOutQuad(p);
        if (p < 1) {
            requestAnimationFrame(animateBeam);
        } else {
            impactCristal(c, hue);
        }
    }
    requestAnimationFrame(animateBeam);
}

function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

function impactCristal(c, hue) {
    playImpactSound();
    c.state = "cracking"; c.stateT = 0;
    for (let p = 0; p < 14; p++) particles.push(new Particle(c.x, c.y, hue));
    setTimeout(() => {
        if (c.state === "dead") return;
        c.state = "revealing"; c.stateT = 0;
        setTimeout(() => {
            for (let p = 0; p < 30; p++) particles.push(new Particle(c.x, c.y, hue));
            c.state = "dead";
            cristaux = cristaux.filter((cr) => cr !== c);
            beam = null;
            godzillaMouthOpen = false;
            shotLock = false;

            currentScore++;
            currentSentenceIndex++;
            if (burningMode) { totalTimeBonus += BURNING_KILL_BONUS; spawnBurningBonusPopup(c.x, c.y); }
            registerCorrectForCombo();
            updateUI();
            loadCurrentSentence();
        }, 550);
    }, 220);
}

// ======================= CHRONO / BONUS =======================
function startLevelTimer() {
    if (chronoInterval) clearInterval(chronoInterval);
    levelStartTime = Date.now();
    chronoInterval = setInterval(() => {
        if (gameActive && currentSentenceIndex < LEVELS[currentLevelIndex].sentences.length) {
            currentLevelTime = (Date.now() - levelStartTime) / 1000;
            document.getElementById("chrono-box").innerHTML = `⏱️ ${currentLevelTime.toFixed(1)}s`;
        }
    }, 100);
}

function stopLevelTimerAndComputeBonus() {
    if (chronoInterval) clearInterval(chronoInterval);
    const finalTime = currentLevelTime;
    const bonus = finalTime <= 25 ? 100 : finalTime <= 35 ? 70 : finalTime <= 50 ? 45 : finalTime <= 70 ? 25 : 10;
    const penalty = errors * 5;
    let levelBonus = Math.max(0, bonus - penalty);
    if (burningMode) levelBonus = Math.round(levelBonus * BURNING_LEVEL_BONUS_MULTIPLIER);
    totalTimeBonus += levelBonus;
    updateUI();

    // chapitres rapides/propres enchaînés -> mode Burning (voir plus haut)
    if (finalTime <= BURNING_TIME_THRESHOLD && errors === 0) {
        burningStreak++;
        masteryPoints++; saveMasteryPoints();
        if (burningStreak >= getBurningStreakNeeded()) {
            const gap = BURNING_TIME_THRESHOLD - finalTime;
            const duration = getBurningDuration(gap >= BURNING_GAP_BIG);
            burningMode = true;
            burningExpiresAt = performance.now() + duration;
        }
    } else {
        burningStreak = 0;
    }
    return levelBonus;
}

function updateBurningTimeout() {
    if (burningMode && !forcedBurning && performance.now() >= burningExpiresAt) {
        burningMode = false;
        const badge = document.getElementById("burning-badge");
        if (badge) badge.classList.add("hidden");
    }
}

// ======================= ÉCRANS (gestion centralisée) =======================
// Une seule fonction pour afficher un écran : masque tous les autres
// d'abord. Corrige la classe de bug "écran bloqué, impossible de revenir
// en arrière" (deux écrans pouvaient rester visibles en même temps quand
// chaque bouton gérait ses propres show/hide séparément).
const SCREEN_IDS = ["start-screen", "chapter-screen", "end-screen", "codex-screen", "rules-screen", "medals-screen"];
function showScreen(id) {
    SCREEN_IDS.forEach((sid) => {
        const el = document.getElementById(sid);
        if (el) el.classList.toggle("hidden", sid !== id);
    });
    // dès qu'un écran de menu est visible, on repasse au curseur normal —
    // le viseur en croix ne doit apparaître que pendant le combat actif
    document.body.classList.remove("aiming");
}
// Combat actif : plus aucun écran affiché (juste le canvas). Utilisé au
// moment précis où on quitte l'écran de chapitre pour de vrai.
function hideAllScreens() {
    SCREEN_IDS.forEach((sid) => {
        const el = document.getElementById(sid);
        if (el) el.classList.add("hidden");
    });
}

// ======================= CHAPITRES / NIVEAUX =======================
function showChapterIntro() {
    const lvl = LEVELS[currentLevelIndex];
    chapterScreenMode = "intro";
    document.getElementById("chapter-eyebrow").innerText = `Chapitre ${currentLevelIndex + 1} · ${lvl.nom}`;
    document.getElementById("chapter-title").innerText = lvl.chapterTitle;
    document.getElementById("chapter-text").innerText = defeatedLevels.has(currentLevelIndex)
        ? `Tu affrontes à nouveau ce chapitre pour améliorer ton score. ${lvl.retryVariants[0]}`
        : lvl.chapterIntro;
    document.getElementById("btn-chapter-continue").innerText = "⚔️ Affronter " + lvl.nom;
    document.getElementById("btn-chapter-continue").classList.remove("hidden");
    document.getElementById("btn-chapter-retry").classList.add("hidden");
    // Le bouton menu reste disponible même sur l'écran d'introduction : on
    // doit pouvoir refuser un combat proposé depuis les Dossiers Monarch
    // sans être forcé de le lancer.
    document.getElementById("btn-chapter-menu").classList.remove("hidden");
    document.getElementById("btn-chapter-menu").innerText = "↩️ Retour au menu";
    document.getElementById("btn-chapter-continue").onclick = onChapterIntroContinue;
    document.getElementById("btn-chapter-menu").onclick = goToMenu;
    showScreen("chapter-screen");
}

function showChapterVictory() {
    const lvl = LEVELS[currentLevelIndex];
    const isLast = currentLevelIndex >= LEVELS.length - 1;

    if (isLast) {
        // Dernier chapitre : l'épilogue s'affiche directement sur l'écran
        // de victoire finale, pas besoin d'écran intermédiaire.
        levelUp();
        return;
    }

    chapterScreenMode = "victory";
    document.getElementById("chapter-eyebrow").innerText = `${lvl.nom} : ${lvl.statusLabel} !`;
    document.getElementById("chapter-title").innerText = "L'enquête continue...";
    document.getElementById("chapter-text").innerText =
        `${lvl.victoryBeat}\n\nBonus de ce chapitre : +${pendingVictoryBonus} points ⚡`;
    document.getElementById("btn-chapter-continue").innerText = "➡️ Chapitre suivant";
    document.getElementById("btn-chapter-continue").classList.remove("hidden");
    document.getElementById("btn-chapter-retry").classList.remove("hidden");
    document.getElementById("btn-chapter-menu").classList.remove("hidden");
    document.getElementById("btn-chapter-menu").innerText = "🏠 Menu";
    document.getElementById("btn-chapter-continue").onclick = () => levelUp();
    document.getElementById("btn-chapter-retry").onclick = () => playSpecificLevel(currentLevelIndex);
    document.getElementById("btn-chapter-menu").onclick = goToMenu;
    showScreen("chapter-screen");
}

function onChapterIntroContinue() {
    hideAllScreens();
    document.body.classList.add("aiming");
    startLevelTimer();
    loadCurrentSentence();
}

function levelUp() {
    const bonus = pendingVictoryBonus;
    showCelebration(`+${bonus}pts !`);
    currentLevelIndex++;
    if (currentLevelIndex >= LEVELS.length) {
        gameActive = false;
        showVictory();
        return;
    }
    currentScore = 0; errors = 0; comboTimestamps = [];
    forcedBurning = false; titanRevealed = false;
    playFanfare();
    flashPalier();
    gameActive = true;
    initLevel();
}

function initLevel() {
    currentSentenceIndex = 0;
    currentLevelTime = 0;
    cristaux = [];
    beam = null;
    godzillaMouthOpen = false;
    shotLock = false;
    titanRevealed = false;
    forcedBurning = false;
    updateUI();
    showChapterIntro();
}

function retryCurrentLevel() {
    if (activeCard) { activeCard.remove(); activeCard = null; }
    if (cardTimeout) clearTimeout(cardTimeout);
    currentScore = 0; errors = 0; comboTimestamps = [];
    gameActive = true;
    victoryFireworks = false; fireworks = []; particles = []; floatingTexts = [];
    initLevel();
}

function restartFromLevel1() {
    playSpecificLevel(0);
}

// Lance directement un chapitre déjà terminé (rejouable depuis l'accueil
// ou les Dossiers Monarch pour améliorer son score), sans repasser par
// les chapitres précédents.
function playSpecificLevel(idx) {
    if (idx < 0 || idx >= LEVELS.length) return;
    if (activeCard) { activeCard.remove(); activeCard = null; }
    if (cardTimeout) clearTimeout(cardTimeout);
    currentLevelIndex = idx;
    currentScore = 0; errors = 0; comboTimestamps = [];
    // le mode Burning ne se transporte pas d'une session de rejeu à l'autre
    burningStreak = 0; burningMode = false; burningExpiresAt = 0; forcedBurning = false; titanRevealed = false;
    victoryFireworks = false; fireworks = []; particles = []; floatingTexts = [];
    gameActive = true;
    updateUI();
    initLevel();
    if (!animationId) animationId = requestAnimationFrame(gameLoop);
}

function goToMenu() {
    gameActive = false;
    renderLevelsTrack();
    updateStartButtonLabel();
    showScreen("start-screen");
}

// Quitter vers le menu à tout moment, y compris en pleine partie (demandé
// par Julie) : nettoie proprement tout ce qui pourrait être en cours
// (chrono, rayon, cristaux, carte d'aide) avant de revenir à l'accueil.
// Le chapitre en cours n'est PAS marqué comme terminé — on pourra le
// reprendre depuis le début plus tard.
function quitToMenu() {
    if (chronoInterval) clearInterval(chronoInterval);
    gameActive = false;
    shotLock = false;
    beam = null;
    godzillaMouthOpen = false;
    bossDefeat = null;
    cristaux = [];
    if (activeCard) { activeCard.remove(); activeCard = null; }
    if (cardTimeout) clearTimeout(cardTimeout);
    document.getElementById("settings-panel").classList.add("hidden");
    goToMenu();
}

function updateStartButtonLabel() {
    const btn = document.getElementById("btn-start");
    if (!btn) return;
    const frontier = getFrontierLevelIndex();
    btn.textContent = defeatedLevels.size === 0
        ? "🦖 Commencer le chapitre 1"
        : `🦖 Continuer — chapitre ${frontier + 1}`;
    btn.dataset.frontier = frontier;
}

// Construit les pastilles de chapitre de l'écran d'accueil : verrouillée
// pour les chapitres pas encore atteints, jouable pour le prochain défi,
// nom + vignette pour les chapitres déjà terminés (cliquables pour rejouer).
function renderLevelsTrack() {
    const track = document.getElementById("levels-track");
    if (!track) return;
    track.innerHTML = "";
    const frontier = getFrontierLevelIndex();
    LEVELS.forEach((lvl, i) => {
        const known = defeatedLevels.has(i);
        const isNext = i === frontier;
        const isLocked = !known && !isNext;
        const chip = document.createElement("div");
        chip.className = "level-chip" + (known ? " known" : isLocked ? " locked" : " next");

        const thumb = document.createElement("div");
        thumb.className = "chip-thumb";
        if (known && ASSETS.ready && ASSETS.kaiju[lvl.kaiju]) {
            const mini = document.createElement("canvas");
            mini.width = 56; mini.height = 56;
            const mctx = mini.getContext("2d");
            const img = ASSETS.kaiju[lvl.kaiju];
            const s = Math.max(56 / img.width, 56 / img.height);
            const w = img.width * s, h = img.height * s;
            mctx.drawImage(img, (56 - w) / 2, (56 - h) / 2, w, h);
            thumb.appendChild(mini);
        } else {
            thumb.textContent = isLocked ? "🔒" : "❓";
        }

        const label = document.createElement("div");
        label.className = "chip-label";
        label.textContent = known
            ? `${i + 1}. ${lvl.pairLabel} — ${lvl.nom}`
            : isLocked
                ? `${i + 1}. ${lvl.pairLabel} — verrouillé`
                : `${i + 1}. ${lvl.pairLabel} — ???`;

        chip.appendChild(thumb);
        chip.appendChild(label);

        if (known || isNext) {
            chip.title = known ? `Rejouer le chapitre ${i + 1} pour améliorer ton score` : "Prochain chapitre — clique ici ou sur le bouton pour l'affronter";
            chip.addEventListener("click", () => playSpecificLevel(i));
        } else {
            chip.title = `Verrouillé — termine le chapitre ${i} pour débloquer celui-ci`;
        }
        track.appendChild(chip);
    });
}

// ======================= DOSSIERS MONARCH (chapitres rencontrés) =======================
// Remplace le "Parc des Kaijus" par un principe de dossiers d'enquête,
// plus cohérent avec l'histoire (Mothra et Rodan sont libérés, pas
// emprisonnés : les montrer derrière des barreaux aurait contredit le
// récit). Pas de vue "zoom" séparée (voir README, correction de bug) :
// tout est visible directement dans la grille pour éviter la navigation
// à plusieurs écrans qui posait problème dans la version précédente.
function renderCodexScreen() {
    const grid = document.getElementById("codex-grid");
    if (!grid) return;
    grid.innerHTML = "";
    LEVELS.forEach((lvl, i) => {
        const known = defeatedLevels.has(i);
        const cell = document.createElement("div");
        cell.className = "codex-cell" + (known ? " known clickable" : " locked");

        const thumb = document.createElement("div");
        thumb.className = "codex-thumb";
        const mini = document.createElement("canvas");
        mini.width = 220; mini.height = 160;
        const mctx = mini.getContext("2d");
        mctx.fillStyle = "#0c0a10";
        mctx.fillRect(0, 0, 220, 160);
        if (known && ASSETS.kaiju[lvl.kaiju]) {
            const img = ASSETS.kaiju[lvl.kaiju];
            const s = Math.min(220 / img.width, 160 / img.height) * 0.85;
            const w = img.width * s, h = img.height * s;
            mctx.drawImage(img, (220 - w) / 2, (160 - h) / 2, w, h);
        } else {
            drawMysterySilhouette(mctx, 110, 80, 100);
            // tampon "dossier classifié" dessiné en code (pas d'image requise)
            mctx.save();
            mctx.translate(110, 128);
            mctx.rotate(-0.12);
            mctx.font = "bold 15px 'Bebas Neue', sans-serif";
            mctx.fillStyle = "rgba(255,90,70,0.85)";
            mctx.textAlign = "center";
            mctx.strokeStyle = "rgba(255,90,70,0.85)";
            mctx.lineWidth = 2;
            mctx.strokeRect(-72, -13, 144, 24);
            mctx.fillText("DOSSIER CLASSIFIÉ", 0, 4);
            mctx.restore();
        }
        thumb.appendChild(mini);

        const name = document.createElement("div");
        name.className = "codex-name";
        name.textContent = known ? lvl.nom : "???";

        const status = document.createElement("div");
        status.className = "codex-status";
        status.textContent = known ? `${lvl.pairLabel} · ${lvl.statusLabel}` : `Chapitre ${i + 1} non atteint`;

        cell.appendChild(thumb);
        cell.appendChild(name);
        cell.appendChild(status);
        if (known) {
            cell.title = `Rejouer ${lvl.nom}`;
            cell.addEventListener("click", () => playSpecificLevel(i));
        }
        grid.appendChild(cell);
    });
}

// ======================= ÉCRANS =======================
function showGameOver() {
    const lvl = LEVELS[currentLevelIndex];
    const idx = currentLevelIndex;
    retryAttempts[idx] = retryAttempts[idx] || 0;
    const variant = lvl.retryVariants[retryAttempts[idx] % lvl.retryVariants.length];
    retryAttempts[idx]++;

    document.getElementById("end-title").innerHTML = "💥 " + lvl.nom.toUpperCase() + " S'ÉCHAPPE";
    document.getElementById("end-desc").innerHTML =
        `${variant}<br><br>Bonus cumulé : ${totalTimeBonus} points ⚡<br>Retente ce chapitre, Godzilla compte sur toi.`;
    document.getElementById("btn-retry-level").classList.remove("hidden");
    document.getElementById("btn-restart-all").classList.remove("hidden");
    document.getElementById("btn-play-again").classList.add("hidden");
    document.getElementById("btn-menu").classList.remove("hidden");
    showScreen("end-screen");
}

function showVictory() {
    victoryFireworks = true;
    playVictory();
    for (let i = 0; i < 18; i++) {
        setTimeout(() => fireworks.push(new Firework(Math.random() * canvas.width, Math.random() * (canvas.height - 150) + 100)), i * 180);
    }
    showCelebration("🏆🦖✨");
    const lastLevel = LEVELS[LEVELS.length - 1];
    document.getElementById("end-title").innerHTML = "🏆 PROTOCOLE TITAN ACCOMPLI";
    document.getElementById("end-desc").innerHTML =
        `${lastLevel.victoryBeat}<br><br>Bonus rapidité cumulé : ${totalTimeBonus} points ! 🏆`;
    document.getElementById("btn-retry-level").classList.add("hidden");
    document.getElementById("btn-restart-all").classList.add("hidden");
    document.getElementById("btn-play-again").classList.remove("hidden");
    document.getElementById("btn-menu").classList.remove("hidden");
    showScreen("end-screen");
}

function startGame() {
    if (activeCard) { activeCard.remove(); activeCard = null; }
    if (cardTimeout) clearTimeout(cardTimeout);
    currentLevelIndex = getFrontierLevelIndex();
    currentScore = 0; errors = 0; totalTimeBonus = 0; comboTimestamps = [];
    burningStreak = 0; burningMode = false; burningExpiresAt = 0; forcedBurning = false; titanRevealed = false;
    victoryFireworks = false; fireworks = []; particles = []; floatingTexts = [];
    gameActive = true;
    updateUI();
    initLevel();
    if (!animationId) animationId = requestAnimationFrame(gameLoop);
}

// ======================= RÉGLAGES (chrono affiché ou non) =======================
const CHRONO_VISIBLE_KEY = "gpt_chrono_visible_v1";
function loadChronoVisible() { try { return localStorage.getItem(CHRONO_VISIBLE_KEY) === "1"; } catch (e) { return false; } }
function saveChronoVisible(v) { try { localStorage.setItem(CHRONO_VISIBLE_KEY, v ? "1" : "0"); } catch (e) { /* tant pis */ } }
function applyChronoVisible(v) { document.getElementById("chrono-box").classList.toggle("hidden-by-setting", !v); }
let chronoVisible = loadChronoVisible();

function resetAllProgress() {
    try { localStorage.removeItem(DEFEATED_STORAGE_KEY); localStorage.removeItem(MASTERY_STORAGE_KEY); } catch (e) { /* tant pis */ }
    defeatedLevels = new Set();
    masteryPoints = 0;
    renderLevelsTrack();
    updateStartButtonLabel();
    // Sans ça, la prochaine synchronisation restaurerait l'ancienne
    // progression depuis le cloud.
    saveProgressToCloud();
}

// ======================= BOUCLE DE RENDU =======================
function gameLoop() {
    updateBurningTimeout();
    drawBackground();
    // correction de bug : le Titan qui "guette" derrière les rochers ne
    // doit jamais s'afficher pendant la séquence de victoire (qui montre
    // déjà ce même Titan en grand) — sinon les deux se superposent.
    if (gameActive && !bossDefeat) drawTitanLooming();

    if (gameActive || cristaux.length) {
        for (const c of cristaux) { if (gameActive) c.update(); c.draw(); }
    }

    drawGodzilla();
    if (beam) drawBeam();
    if (mothraFlyby) drawMothraFlyby();
    if (bossDefeat) drawBossDefeat();

    if (victoryFireworks && fireworks.length) {
        for (let i = fireworks.length - 1; i >= 0; i--) if (!fireworks[i].update()) fireworks.splice(i, 1); else fireworks[i].draw();
    }
    for (let i = particles.length - 1; i >= 0; i--) if (!particles[i].update()) particles.splice(i, 1); else particles[i].draw();
    for (let i = floatingTexts.length - 1; i >= 0; i--) if (!floatingTexts[i].update()) floatingTexts.splice(i, 1); else floatingTexts[i].draw();

    ctx.beginPath(); ctx.arc(mouseXPos, mouseYPos, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,120,60,0.7)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(mouseXPos, mouseYPos, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,120,60,0.2)"; ctx.fill();

    animationId = requestAnimationFrame(gameLoop);
}

// ======================= ÉVÉNEMENTS =======================
const cursorDiv = document.getElementById("custom-cursor");
document.addEventListener("mousemove", (e) => {
    if (cursorDiv) { cursorDiv.style.left = e.clientX + "px"; cursorDiv.style.top = e.clientY + "px"; }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    mouseXPos = (e.clientX - rect.left) * scaleX;
    mouseYPos = (e.clientY - rect.top) * scaleY;
});
document.body.style.cursor = "none";

canvas.addEventListener("mousedown", (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    let mx = (e.clientX - rect.left) * scaleX;
    let my = (e.clientY - rect.top) * scaleY;
    mx = Math.min(Math.max(5, mx), canvas.width - 5);
    my = Math.min(Math.max(SAFE_TOP + 10, my), canvas.height - 5);
    handleShot(mx, my);
});

// Tablette / smartphone : même logique que mousedown, à partir du premier
// point de contact. preventDefault() empêche le navigateur d'interpréter le
// tap comme un défilement/zoom pendant la partie.
canvas.addEventListener("touchstart", (e) => {
    if (!gameActive) return;
    if (!e.touches || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    let mx = (touch.clientX - rect.left) * scaleX;
    let my = (touch.clientY - rect.top) * scaleY;
    mx = Math.min(Math.max(5, mx), canvas.width - 5);
    my = Math.min(Math.max(SAFE_TOP + 10, my), canvas.height - 5);
    handleShot(mx, my);
}, { passive: false });

applyChronoVisible(chronoVisible);
document.getElementById("chk-show-chrono").checked = chronoVisible;
document.getElementById("chk-show-chrono").addEventListener("change", (e) => {
    chronoVisible = e.target.checked;
    saveChronoVisible(chronoVisible);
    applyChronoVisible(chronoVisible);
});
document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings-panel").classList.toggle("hidden");
});
document.getElementById("btn-quit-menu").addEventListener("click", quitToMenu);
document.getElementById("btn-reset-progress").addEventListener("click", () => {
    if (confirm("Effacer la progression enregistrée sur cet appareil (chapitres débloqués, rang de maîtrise) ? Cette action ne peut pas être annulée.")) {
        resetAllProgress();
        document.getElementById("settings-panel").classList.add("hidden");
    }
});
document.getElementById("btn-save-code").addEventListener("click", () => {
    setPlayerCode(document.getElementById("player-code-input").value);
});
document.getElementById("player-code-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") setPlayerCode(e.target.value);
});

document.getElementById("btn-codex").addEventListener("click", () => { renderCodexScreen(); showScreen("codex-screen"); });
document.getElementById("btn-codex-back").addEventListener("click", () => showScreen("start-screen"));
document.getElementById("btn-rules").addEventListener("click", () => showScreen("rules-screen"));
document.getElementById("btn-rules-back").addEventListener("click", () => showScreen("start-screen"));
document.getElementById("btn-medals").addEventListener("click", () => { renderMedalsGallery(); showScreen("medals-screen"); });
document.getElementById("btn-medals-back").addEventListener("click", () => showScreen("start-screen"));

// ======================= MISE À L'ÉCHELLE (iPad / Surface / tablettes) =======================
function fitGameToViewport() {
    const wrapper = document.getElementById("game-wrapper");
    const container = document.getElementById("game-container");
    if (!wrapper || !container) return;
    const margin = 24;
    const availW = window.innerWidth - margin;
    const availH = window.innerHeight - margin;
    const scale = Math.min(availW / 1100, availH / 700, 1);
    container.style.transform = `scale(${scale})`;
    wrapper.style.width = Math.round(1100 * scale + 16) + "px";
    wrapper.style.height = Math.round(700 * scale + 16) + "px";
}
window.addEventListener("resize", fitGameToViewport);
window.addEventListener("orientationchange", () => setTimeout(fitGameToViewport, 250));
if (window.visualViewport) window.visualViewport.addEventListener("resize", fitGameToViewport);
fitGameToViewport();

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-retry-level").addEventListener("click", retryCurrentLevel);
document.getElementById("btn-restart-all").addEventListener("click", restartFromLevel1);
document.getElementById("btn-play-again").addEventListener("click", restartFromLevel1);
document.getElementById("btn-menu").addEventListener("click", goToMenu);

// ======================= INIT =======================
window.onload = () => {
    const loadingLabel = document.getElementById("loading-label");
    currentLevelIndex = getFrontierLevelIndex();
    renderLevelsTrack();
    updateStartButtonLabel();
    showScreen("start-screen");
    initCloudSync();
    preloadAllAssets(() => {
        if (loadingLabel) loadingLabel.classList.add("hidden");
        document.getElementById("btn-start").disabled = false;
        drawStartScreenBackdrop();
        renderLevelsTrack();
    });
};
