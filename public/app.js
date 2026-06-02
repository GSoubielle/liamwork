const SERIES_SIZE = 20;
const LEVELS = [
  { id: "easy", label: "Facile", shortLabel: "Niv. 1", xp: 10 },
  { id: "medium", label: "Intermediaire", shortLabel: "Niv. 2", xp: 15 },
  { id: "hard", label: "Difficile", shortLabel: "Niv. 3", xp: 20 }
];
const STORAGE_KEY = "math-lab-progress-v1";

const badgeCatalog = [
  { id: "starter", name: "Premier pas", symbol: "01", color: "#246bfe", description: "Reussir le premier calcul.", rule: (totals) => totals.solved >= 1 },
  { id: "ten", name: "Echauffement", symbol: "10", color: "#f77f00", description: "Reussir 10 calculs.", rule: (totals) => totals.solved >= 10 },
  { id: "series", name: "Serie bouclee", symbol: "20", color: "#00a676", description: "Terminer une serie de 20.", rule: (totals) => totals.seriesCompleted >= 1 },
  { id: "level2", name: "Niveau 2", symbol: "L2", color: "#6c4bd8", description: "Atteindre le niveau intermediaire.", rule: (totals) => totals.mediumSections >= 1 },
  { id: "level3", name: "Niveau 3", symbol: "L3", color: "#132033", description: "Atteindre le niveau difficile.", rule: (totals) => totals.hardSections >= 1 },
  { id: "streak5", name: "Combo x5", symbol: "x5", color: "#ef476f", description: "Reussir 5 calculs d'affilee du premier coup.", rule: (totals) => totals.bestStreak >= 5 },
  { id: "streak10", name: "Combo x10", symbol: "x10", color: "#118ab2", description: "Reussir 10 calculs d'affilee du premier coup.", rule: (totals) => totals.bestStreak >= 10 },
  { id: "hundred", name: "100 calculs", symbol: "100", color: "#8a5a00", description: "Reussir 100 calculs.", rule: (totals) => totals.solved >= 100 }
];

const sections = [
  {
    id: "relatifs",
    title: "Nombres relatifs",
    description: "Additions et soustractions avec des nombres positifs et negatifs.",
    mark: "+-",
    color: "linear-gradient(135deg, #246bfe, #00a676)",
    generator: signedExercise
  },
  {
    id: "priorites",
    title: "Priorites de calcul",
    description: "Parentheses, multiplications et additions dans le bon ordre.",
    mark: "x+",
    color: "linear-gradient(135deg, #ef476f, #f77f00)",
    generator: priorityExercise
  },
  {
    id: "decimaux",
    title: "Calculs decimaux",
    description: "Multiplier, diviser et additionner des nombres decimaux.",
    mark: "0.5",
    color: "linear-gradient(135deg, #132033, #246bfe)",
    generator: decimalExercise
  },
  {
    id: "complements",
    title: "Complements rapides",
    description: "Trouver le nombre manquant pour atteindre 50, 100, 200 ou 1000.",
    mark: "?",
    color: "linear-gradient(135deg, #00a676, #ffd166)",
    generator: complementExercise
  },
  {
    id: "divisions",
    title: "Divisions utiles",
    description: "Diviser par 10, 5, 4 ou 2 comme sur les fiches.",
    mark: ":",
    color: "linear-gradient(135deg, #6c4bd8, #ef476f)",
    generator: divisionExercise
  }
];

let memoryState = null;
let state = loadState();
let activeSectionId = null;
let currentExercise = null;

const views = {
  home: document.getElementById("homeView"),
  practice: document.getElementById("practiceView"),
  stats: document.getElementById("statsView")
};

const sectionGrid = document.getElementById("sectionGrid");
const quickDone = document.getElementById("quickDone");
const rewardStrip = document.getElementById("rewardStrip");
const practiceKicker = document.getElementById("practiceKicker");
const practiceTitle = document.getElementById("practiceTitle");
const levelBadge = document.getElementById("levelBadge");
const streakBadge = document.getElementById("streakBadge");
const comboFill = document.getElementById("comboFill");
const sectionProgress = document.getElementById("sectionProgress");
const sectionProgressLabel = document.getElementById("sectionProgressLabel");
const exerciseNumber = document.getElementById("exerciseNumber");
const correctionCount = document.getElementById("correctionCount");
const exercisePrompt = document.getElementById("exercisePrompt");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const nextButton = document.getElementById("nextButton");
const showAnswerButton = document.getElementById("showAnswerButton");
const rewardOverlay = document.getElementById("rewardOverlay");
const rewardCloseButton = document.getElementById("rewardCloseButton");
const rewardIcon = document.getElementById("rewardIcon");
const rewardKicker = document.getElementById("rewardKicker");
const rewardTitle = document.getElementById("rewardTitle");
const rewardText = document.getElementById("rewardText");
const rewardChips = document.getElementById("rewardChips");

document.getElementById("statsButton").addEventListener("click", () => showView("stats"));
document.getElementById("backButton").addEventListener("click", () => showView("home"));
document.getElementById("statsBackButton").addEventListener("click", () => showView("home"));
document.getElementById("resetButton").addEventListener("click", resetProgress);
nextButton.addEventListener("click", nextExercise);
showAnswerButton.addEventListener("click", showAnswer);
answerForm.addEventListener("submit", checkAnswer);
rewardCloseButton.addEventListener("click", hideRewardOverlay);
rewardOverlay.addEventListener("click", (event) => {
  if (event.target === rewardOverlay) hideRewardOverlay();
});

renderHome();
renderStats();

function loadState() {
  try {
    const saved = JSON.parse(readSavedState());
    if (saved && saved.sections) return saved;
  } catch (error) {
    console.warn("Progression ignoree", error);
  }

  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    badges: [],
    sections: Object.fromEntries(sections.map((section) => [
      section.id,
      { solved: 0, attempts: 0, correctFirstTry: 0, corrections: 0, answerReveals: 0 }
    ]))
  };
}

function saveState() {
  writeSavedState(JSON.stringify(state));
  renderHome();
  renderStats();
}

function readSavedState() {
  if (typeof localStorage === "undefined") return memoryState;
  return localStorage.getItem(STORAGE_KEY);
}

function writeSavedState(value) {
  memoryState = value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, value);
  }
}

function ensureSectionStats(sectionId) {
  state.xp ||= 0;
  state.streak ||= 0;
  state.bestStreak ||= 0;
  state.badges ||= [];
  if (!state.sections[sectionId]) {
    state.sections[sectionId] = { solved: 0, attempts: 0, correctFirstTry: 0, corrections: 0, answerReveals: 0 };
  }
  state.sections[sectionId].answerReveals ||= 0;
  return state.sections[sectionId];
}

function showView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active"));
  views[name].classList.add("active");
  if (name === "stats") renderStats();
}

function renderHome() {
  const totalDone = sections.reduce((sum, section) => sum + ensureSectionStats(section.id).solved, 0);
  quickDone.textContent = totalDone;
  rewardStrip.innerHTML = `
    <button type="button" class="reward-tile" data-reward="xp">
      <strong>${state.xp || 0}</strong>
      <span>points XP</span>
    </button>
    <button type="button" class="reward-tile" data-reward="streak">
      <strong>${state.bestStreak || 0}</strong>
      <span>meilleure serie</span>
    </button>
    <button type="button" class="reward-tile" data-reward="badges">
      <strong>${state.badges?.length || 0}</strong>
      <span>badges</span>
    </button>
    <button type="button" class="reward-tile" data-reward="series">
      <strong>${sections.reduce((sum, section) => sum + getCompletedSeries(ensureSectionStats(section.id)), 0)}</strong>
      <span>series terminees</span>
    </button>
  `;
  rewardStrip.querySelectorAll(".reward-tile").forEach((tile) => {
    tile.addEventListener("click", () => showRewardInfo(tile.dataset.reward));
  });

  sectionGrid.innerHTML = "";
  sections.forEach((section) => {
    const stats = ensureSectionStats(section.id);
    const level = getCurrentLevel(stats);
    const progress = getSeriesProgress(stats);
    const series = getCurrentSeries(stats);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-card";
    button.style.background = section.color;
    button.innerHTML = `
      <span class="math-mark">${section.mark}</span>
      <strong>${section.title}</strong>
      <p>${section.description}</p>
      <span class="level-chip">${level.label}</span>
      <span class="mini-progress">Serie ${series} - ${progress} / ${SERIES_SIZE}</span>
    `;
    button.addEventListener("click", () => startSection(section.id));
    sectionGrid.appendChild(button);
  });
}

function startSection(sectionId) {
  activeSectionId = sectionId;
  const section = getSection(sectionId);
  practiceKicker.textContent = "Section";
  practiceTitle.textContent = section.title;
  showView("practice");
  nextExercise();
}

function nextExercise() {
  const section = getSection(activeSectionId);
  const stats = ensureSectionStats(activeSectionId);
  const level = getCurrentLevel(stats);
  currentExercise = {
    ...section.generator(level),
    level,
    attempts: 0,
    solved: false,
    answerShown: false,
    seriesComplete: false,
    unlockedBadges: []
  };
  answerInput.value = "";
  feedback.className = "feedback";
  feedback.textContent = "Entre ton resultat puis valide.";
  renderExercise();
  answerInput.focus();
}

function renderExercise() {
  const stats = ensureSectionStats(activeSectionId);
  const progress = currentExercise.seriesComplete ? SERIES_SIZE : getSeriesProgress(stats);
  const nextNumber = currentExercise.seriesComplete ? SERIES_SIZE : progress + 1;
  const series = currentExercise.seriesComplete ? getCompletedSeries(stats) : getCurrentSeries(stats);
  levelBadge.textContent = currentExercise.level.label;
  streakBadge.textContent = `Combo ${state.streak || 0}`;
  comboFill.style.width = `${Math.min(100, ((state.streak || 0) / 10) * 100)}%`;
  exerciseNumber.textContent = `Serie ${series} - exercice ${Math.min(nextNumber, SERIES_SIZE)}`;
  correctionCount.textContent = `${currentExercise.attempts} correction${currentExercise.attempts > 1 ? "s" : ""}`;
  sectionProgress.textContent = `${progress} / ${SERIES_SIZE}`;
  sectionProgressLabel.textContent = `${currentExercise.level.shortLabel} dans cette serie`;
  exercisePrompt.textContent = currentExercise.prompt;
  showAnswerButton.disabled = currentExercise.solved || currentExercise.attempts < 3 || currentExercise.answerShown;
  showAnswerButton.textContent = currentExercise.attempts < 3
    ? `Voir la reponse (${3 - currentExercise.attempts} erreur${3 - currentExercise.attempts > 1 ? "s" : ""} restante${3 - currentExercise.attempts > 1 ? "s" : ""})`
    : "Voir la reponse";
}

function checkAnswer(event) {
  event.preventDefault();
  if (!currentExercise || currentExercise.solved) return;
  let earnedReward = null;

  const value = parseFrenchNumber(answerInput.value);
  if (Number.isNaN(value)) {
    feedback.className = "feedback bad";
    feedback.textContent = "Entre seulement un nombre. Tu peux utiliser une virgule ou un point.";
    return;
  }

  const stats = ensureSectionStats(activeSectionId);
  stats.attempts += 1;

  if (sameNumber(value, currentExercise.answer)) {
    currentExercise.solved = true;
    stats.solved += 1;
    const xpWon = currentExercise.level.xp + Math.max(0, 3 - currentExercise.attempts) * 2;
    state.xp = (state.xp || 0) + xpWon;
    state.streak = currentExercise.attempts === 0 && !currentExercise.answerShown ? (state.streak || 0) + 1 : 0;
    state.bestStreak = Math.max(state.bestStreak || 0, state.streak || 0);
    currentExercise.seriesComplete = stats.solved % SERIES_SIZE === 0;
    currentExercise.unlockedBadges = unlockBadges();
    if (currentExercise.attempts === 0) {
      stats.correctFirstTry += 1;
      feedback.textContent = buildSuccessMessage(`Juste du premier coup. +${xpWon} XP`);
    } else {
      feedback.textContent = buildSuccessMessage(`Juste apres ${currentExercise.attempts} correction${currentExercise.attempts > 1 ? "s" : ""}. +${xpWon} XP`);
    }
    earnedReward = {
      xpWon,
      seriesComplete: currentExercise.seriesComplete,
      level: currentExercise.level,
      unlockedBadges: currentExercise.unlockedBadges,
      streak: state.streak || 0
    };
    feedback.className = "feedback good";
    saveState();
  } else {
    currentExercise.attempts += 1;
    stats.corrections += 1;
    state.streak = 0;
    feedback.className = "feedback bad";
    feedback.textContent = hintFor(currentExercise.answer, value);
    saveState();
  }

  renderExercise();
  if (earnedReward) showSuccessReward(earnedReward);
}

function showAnswer() {
  if (!currentExercise || currentExercise.solved || currentExercise.attempts < 3 || currentExercise.answerShown) return;
  const stats = ensureSectionStats(activeSectionId);
  currentExercise.answerShown = true;
  stats.answerReveals += 1;
  feedback.className = "feedback bad";
  feedback.textContent = `La reponse est ${formatNumber(currentExercise.answer)}. Recopie-la puis valide pour terminer.`;
  answerInput.value = formatNumber(currentExercise.answer);
  saveState();
  renderExercise();
}

function renderStats() {
  const totals = collectTotals();

  document.getElementById("totalDone").textContent = totals.solved;
  document.getElementById("globalRate").textContent = rate(totals.firstTry, totals.solved);
  document.getElementById("totalCorrections").textContent = totals.corrections;
  document.getElementById("totalReveals").textContent = totals.answerReveals;
  document.getElementById("totalXp").textContent = state.xp || 0;

  const badgeList = document.getElementById("badgeList");
  badgeList.innerHTML = badgeCatalog.map((badge) => renderBadgeCard(badge, state.badges?.includes(badge.id))).join("");
  badgeList.querySelectorAll(".badge-card").forEach((card) => {
    card.addEventListener("click", () => showBadgeDetail(card.dataset.badgeId));
  });

  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  sections.forEach((section) => {
    const stats = ensureSectionStats(section.id);
    const progress = Math.round((getSeriesProgress(stats) / SERIES_SIZE) * 100);
    const level = getCurrentLevel(stats);
    const seriesCompleted = getCompletedSeries(stats);
    const row = document.createElement("article");
    row.className = "stats-row";
    row.innerHTML = `
      <div>
        <strong>${section.title} - ${level.label}</strong>
        <p>${stats.solved} reussis - ${seriesCompleted} serie${seriesCompleted > 1 ? "s" : ""} terminee${seriesCompleted > 1 ? "s" : ""} - ${rate(stats.correctFirstTry, stats.solved)} de reussite - ${stats.corrections} correction${stats.corrections > 1 ? "s" : ""} - ${stats.answerReveals} reponse${stats.answerReveals > 1 ? "s" : ""} affichee${stats.answerReveals > 1 ? "s" : ""}</p>
      </div>
      <div class="bar" aria-label="Progression ${progress}%"><span style="width:${progress}%"></span></div>
    `;
    statsList.appendChild(row);
  });
}

function resetProgress() {
  if (!confirm("Remettre toute la progression a zero ?")) return;
  memoryState = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  state = loadState();
  renderHome();
  renderStats();
}

function signedExercise(level) {
  const ranges = [
    [-50, 50],
    [-120, 120],
    [-300, 300]
  ];
  const [min, max] = ranges[getLevelIndex(level)];
  const a = randomInt(min, max);
  let b = randomInt(min, max);
  if (a === 0 && b === 0) b = 23;
  const op = Math.random() > 0.5 ? "+" : "-";
  const answer = op === "+" ? a + b : a - b;
  return { prompt: `(${a}) ${op} (${signed(b)})`, answer };
}

function priorityExercise(level) {
  const levelIndex = getLevelIndex(level);
  const max = [5, 8, 12][levelIndex];
  const patterns = [
    () => {
      const a = randomInt(2, max), b = randomInt(2, max), c = randomInt(2, max), d = randomInt(2, max);
      return { prompt: `(${a} x ${b} + ${c}) x ${d}`, answer: (a * b + c) * d };
    },
    () => {
      const a = randomInt(3, max), b = randomInt(2, max), c = randomInt(2, max), d = randomInt(2, max);
      return { prompt: `${a} x ${b} + ${c} x ${d}`, answer: a * b + c * d };
    },
    () => {
      const a = randomInt(3, max), b = randomInt(2, max), c = randomInt(2, max), d = randomInt(2, max), e = randomInt(2, max);
      return { prompt: `(${a} x ${b} + ${c}) x ${d} - ${e}`, answer: (a * b + c) * d - e };
    },
    () => {
      const a = randomInt(2, max), b = randomInt(2, max), c = randomInt(2, max), d = randomInt(2, max), e = randomInt(2, max);
      return { prompt: `${a} x (${b} + ${c}) - ${d} x ${e}`, answer: a * (b + c) - d * e };
    }
  ];
  return pick(levelIndex === 0 ? patterns.slice(0, 3) : patterns)();
}

function decimalExercise(level) {
  const levelIndex = getLevelIndex(level);
  const digits = levelIndex === 2 ? 2 : 1;
  const max = [90, 180, 350][levelIndex];
  const patterns = [
    () => {
      const a = randomDecimal(12, max, digits);
      const b = pick(levelIndex === 0 ? [0.2, 0.25, 0.5, 0.8] : [0.2, 0.25, 0.5, 0.8, 1.5, 2.5]);
      return { prompt: `${formatNumber(a)} x ${formatNumber(b)}`, answer: round(a * b) };
    },
    () => {
      const a = randomDecimal(4, max, digits);
      const b = randomDecimal(0.2, levelIndex === 0 ? 9.9 : 49.9, digits);
      return { prompt: `${formatNumber(a)} + ${formatNumber(b)}`, answer: round(a + b) };
    },
    () => {
      const a = randomInt(12, levelIndex === 0 ? 480 : 1200);
      const b = pick(levelIndex === 2 ? [0.2, 0.25, 0.5, 0.8] : [0.2, 0.25, 0.5]);
      return { prompt: `${a} : ${formatNumber(b)}`, answer: round(a / b) };
    }
  ];
  return pick(patterns)();
}

function complementExercise(level) {
  const targets = [
    [50, 100],
    [100, 200, 500],
    [200, 1000, 2000]
  ];
  const target = pick(targets[getLevelIndex(level)]);
  const decimals = target <= 100;
  const a = decimals ? randomDecimal(0.01, target - 1, 2) : randomDecimal(1, target - 1, getLevelIndex(level) === 0 ? 1 : 2);
  return { prompt: `${formatNumber(a)} + ? = ${target}`, answer: round(target - a) };
}

function divisionExercise(level) {
  const divisors = [
    [10, 5, 4, 2],
    [10, 5, 4, 2, 20, 25],
    [10, 5, 4, 2, 20, 25, 50]
  ][getLevelIndex(level)];
  const divisor = pick(divisors);
  const result = divisor === 10 ? randomDecimal(0.1, 99.9, 1) : randomInt(2, getLevelIndex(level) === 0 ? 120 : 300);
  const start = round(result * divisor);
  return { prompt: `${formatNumber(start)} : ${divisor}`, answer: round(result) };
}

function hintFor(answer, value) {
  if (Math.abs(value - answer) < 1) return "Presque. Verifie le signe ou les chiffres apres la virgule.";
  if (value > answer) return "C'est trop grand. Corrige puis valide encore.";
  return "C'est trop petit. Corrige puis valide encore.";
}

function getSection(sectionId) {
  return sections.find((section) => section.id === sectionId);
}

function getLevelIndex(level) {
  return LEVELS.findIndex((candidate) => candidate.id === level.id);
}

function getCurrentLevel(stats) {
  return LEVELS[Math.min(getCompletedSeries(stats), LEVELS.length - 1)];
}

function getCompletedSeries(stats) {
  return Math.floor(stats.solved / SERIES_SIZE);
}

function getCurrentSeries(stats) {
  return getCompletedSeries(stats) + 1;
}

function getSeriesProgress(stats) {
  return stats.solved % SERIES_SIZE;
}

function collectTotals() {
  return sections.reduce((acc, section) => {
    const stats = ensureSectionStats(section.id);
    const completed = getCompletedSeries(stats);
    acc.solved += stats.solved;
    acc.attempts += stats.attempts;
    acc.firstTry += stats.correctFirstTry;
    acc.corrections += stats.corrections;
    acc.answerReveals += stats.answerReveals;
    acc.seriesCompleted += completed;
    if (completed >= 1) acc.mediumSections += 1;
    if (completed >= 2) acc.hardSections += 1;
    return acc;
  }, {
    solved: 0,
    attempts: 0,
    firstTry: 0,
    corrections: 0,
    answerReveals: 0,
    seriesCompleted: 0,
    mediumSections: 0,
    hardSections: 0,
    bestStreak: state.bestStreak || 0
  });
}

function unlockBadges() {
  const totals = collectTotals();
  const unlocked = [];
  badgeCatalog.forEach((badge) => {
    if (!state.badges.includes(badge.id) && badge.rule(totals)) {
      state.badges.push(badge.id);
      unlocked.push(badge);
    }
  });
  return unlocked;
}

function buildSuccessMessage(base) {
  const parts = [base];
  if (state.streak >= 5) parts.push(`Combo ${state.streak}`);
  if (currentExercise.seriesComplete) {
    const nextLevel = getCurrentLevel(ensureSectionStats(activeSectionId));
    parts.push(`Serie terminee. Prochain niveau: ${nextLevel.label}`);
  }
  if (currentExercise.unlockedBadges.length) {
    parts.push(`Badge: ${currentExercise.unlockedBadges.map((badge) => badge.name).join(", ")}`);
  }
  return parts.join(" - ");
}

function renderBadgeCard(badge, unlocked) {
  return `
    <button class="badge-card ${unlocked ? "unlocked" : "locked"}" type="button" data-badge-id="${badge.id}" style="--badge-color:${badge.color}">
      <span class="badge-art">${badge.symbol}</span>
      <span>
        <strong>${badge.name}</strong>
        <small>${unlocked ? "Debloque" : "A debloquer"}</small>
      </span>
    </button>
  `;
}

function showSuccessReward(reward) {
  const badge = reward.unlockedBadges[0];
  const comboMilestone = reward.streak >= 5 && reward.streak % 5 === 0;
  if (!reward.seriesComplete && !badge && !comboMilestone) {
    showXpPop(reward.xpWon);
    return;
  }

  const title = reward.seriesComplete
    ? "Serie terminee"
    : badge
      ? "Badge debloque"
      : comboMilestone
        ? "Combo en feu"
        : "XP gagne";
  const text = reward.seriesComplete
    ? `Tu as boucle 20 exercices. La prochaine serie passe au niveau ${getCurrentLevel(ensureSectionStats(activeSectionId)).label}.`
    : badge
      ? `${badge.name}: ${badge.description}`
      : comboMilestone
        ? `Tu as ${reward.streak} bonnes reponses d'affilee.`
        : "Continue comme ca pour debloquer les prochains badges.";

  showRewardOverlay({
    symbol: badge?.symbol || (reward.seriesComplete ? "20" : "XP"),
    color: badge?.color || (reward.seriesComplete ? "#00a676" : "#246bfe"),
    kicker: reward.seriesComplete ? "Nouvelle serie" : "Recompense",
    title,
    text,
    chips: [
      `+${reward.xpWon} XP`,
      reward.streak ? `Combo ${reward.streak}` : "Combo remis a zero",
      `${state.badges.length} badge${state.badges.length > 1 ? "s" : ""}`
    ]
  });
}

function showXpPop(xpWon) {
  const pop = document.createElement("span");
  pop.className = "xp-pop";
  pop.textContent = `+${xpWon} XP`;
  document.querySelector(".exercise-card").appendChild(pop);
  pop.addEventListener("animationend", () => pop.remove());
}

function showBadgeDetail(badgeId) {
  const badge = badgeCatalog.find((candidate) => candidate.id === badgeId);
  if (!badge) return;
  const unlocked = state.badges.includes(badge.id);
  showRewardOverlay({
    symbol: badge.symbol,
    color: badge.color,
    kicker: unlocked ? "Badge debloque" : "Badge verrouille",
    title: badge.name,
    text: badge.description,
    chips: [unlocked ? "Dans ta collection" : "Continue pour le gagner"]
  });
}

function showRewardInfo(type) {
  const totals = collectTotals();
  const content = {
    xp: {
      symbol: "XP",
      color: "#246bfe",
      title: `${state.xp || 0} XP`,
      text: "Les XP montent plus vite quand tu reussis sans correction."
    },
    streak: {
      symbol: "x",
      color: "#ef476f",
      title: `${state.bestStreak || 0} de meilleure serie`,
      text: "Le combo augmente avec les bonnes reponses du premier coup."
    },
    badges: {
      symbol: "BD",
      color: "#6c4bd8",
      title: `${state.badges.length} badges`,
      text: "Ouvre les statistiques pour voir toute la collection."
    },
    series: {
      symbol: "20",
      color: "#00a676",
      title: `${totals.seriesCompleted} series terminees`,
      text: "Chaque serie de 20 debloque un niveau plus difficile."
    }
  }[type];
  showRewardOverlay({ kicker: "Progression", chips: [], ...content });
}

function showRewardOverlay({ symbol, color, kicker, title, text, chips }) {
  rewardIcon.textContent = symbol;
  rewardIcon.style.setProperty("--reward-color", color);
  rewardKicker.textContent = kicker;
  rewardTitle.textContent = title;
  rewardText.textContent = text;
  rewardChips.innerHTML = chips.map((chip) => `<span>${chip}</span>`).join("");
  rewardOverlay.setAttribute("aria-hidden", "false");
  rewardOverlay.classList.remove("active");
  rewardOverlay.offsetHeight;
  rewardOverlay.classList.add("active");
  launchRewardBurst();
}

function hideRewardOverlay() {
  rewardOverlay.classList.remove("active");
  rewardOverlay.setAttribute("aria-hidden", "true");
}

function launchRewardBurst() {
  document.querySelectorAll(".burst-piece").forEach((piece) => piece.remove());
  const colors = ["#246bfe", "#00a676", "#ef476f", "#ffd166", "#f77f00"];
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement("span");
    piece.className = "burst-piece";
    piece.style.left = `${48 + randomInt(-18, 18)}%`;
    piece.style.setProperty("--burst-x", `${randomInt(-180, 180)}px`);
    piece.style.setProperty("--burst-y", `${randomInt(-180, -60)}px`);
    piece.style.setProperty("--burst-color", pick(colors));
    rewardOverlay.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max, digits) {
  const factor = 10 ** digits;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function signed(number) {
  return number >= 0 ? `+${number}` : `${number}`;
}

function parseFrenchNumber(value) {
  return Number(String(value).trim().replace(",", "."));
}

function sameNumber(a, b) {
  return Math.abs(a - b) < 0.0001;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNumber(value) {
  return String(round(value)).replace(".", ",");
}

function rate(correct, solved) {
  if (!solved) return "0%";
  return `${Math.round((correct / solved) * 100)}%`;
}
