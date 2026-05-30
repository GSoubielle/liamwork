const TOTAL_PER_SECTION = 20;
const STORAGE_KEY = "math-lab-progress-v1";

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
const practiceKicker = document.getElementById("practiceKicker");
const practiceTitle = document.getElementById("practiceTitle");
const sectionProgress = document.getElementById("sectionProgress");
const exerciseNumber = document.getElementById("exerciseNumber");
const correctionCount = document.getElementById("correctionCount");
const exercisePrompt = document.getElementById("exercisePrompt");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const nextButton = document.getElementById("nextButton");
const showAnswerButton = document.getElementById("showAnswerButton");

document.getElementById("statsButton").addEventListener("click", () => showView("stats"));
document.getElementById("backButton").addEventListener("click", () => showView("home"));
document.getElementById("statsBackButton").addEventListener("click", () => showView("home"));
document.getElementById("resetButton").addEventListener("click", resetProgress);
nextButton.addEventListener("click", nextExercise);
showAnswerButton.addEventListener("click", showAnswer);
answerForm.addEventListener("submit", checkAnswer);

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
  quickDone.textContent = `${totalDone} / ${sections.length * TOTAL_PER_SECTION}`;

  sectionGrid.innerHTML = "";
  sections.forEach((section) => {
    const stats = ensureSectionStats(section.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-card";
    button.style.background = section.color;
    button.innerHTML = `
      <span class="math-mark">${section.mark}</span>
      <strong>${section.title}</strong>
      <p>${section.description}</p>
      <span class="mini-progress">${Math.min(stats.solved, TOTAL_PER_SECTION)} / ${TOTAL_PER_SECTION}</span>
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
  currentExercise = {
    ...section.generator(),
    attempts: 0,
    solved: false,
    answerShown: false
  };
  answerInput.value = "";
  feedback.className = "feedback";
  feedback.textContent = "Entre ton resultat puis valide.";
  renderExercise();
  answerInput.focus();
}

function renderExercise() {
  const stats = ensureSectionStats(activeSectionId);
  exerciseNumber.textContent = `Exercice ${Math.min(stats.solved + 1, TOTAL_PER_SECTION)}`;
  correctionCount.textContent = `${currentExercise.attempts} correction${currentExercise.attempts > 1 ? "s" : ""}`;
  sectionProgress.textContent = `${Math.min(stats.solved, TOTAL_PER_SECTION)} / ${TOTAL_PER_SECTION}`;
  exercisePrompt.textContent = currentExercise.prompt;
  showAnswerButton.disabled = currentExercise.solved || currentExercise.attempts < 3 || currentExercise.answerShown;
  showAnswerButton.textContent = currentExercise.attempts < 3
    ? `Voir la reponse (${3 - currentExercise.attempts} erreur${3 - currentExercise.attempts > 1 ? "s" : ""} restante${3 - currentExercise.attempts > 1 ? "s" : ""})`
    : "Voir la reponse";
}

function checkAnswer(event) {
  event.preventDefault();
  if (!currentExercise || currentExercise.solved) return;

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
    if (currentExercise.attempts === 0) {
      stats.correctFirstTry += 1;
      feedback.textContent = "Juste du premier coup. Passe au suivant.";
    } else {
      feedback.textContent = `Juste apres ${currentExercise.attempts} correction${currentExercise.attempts > 1 ? "s" : ""}.`;
    }
    feedback.className = "feedback good";
    saveState();
  } else {
    currentExercise.attempts += 1;
    stats.corrections += 1;
    feedback.className = "feedback bad";
    feedback.textContent = hintFor(currentExercise.answer, value);
    saveState();
  }

  renderExercise();
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
  const totals = sections.reduce((acc, section) => {
    const stats = ensureSectionStats(section.id);
    acc.solved += stats.solved;
    acc.attempts += stats.attempts;
    acc.firstTry += stats.correctFirstTry;
    acc.corrections += stats.corrections;
    acc.answerReveals += stats.answerReveals;
    return acc;
  }, { solved: 0, attempts: 0, firstTry: 0, corrections: 0, answerReveals: 0 });

  document.getElementById("totalDone").textContent = totals.solved;
  document.getElementById("globalRate").textContent = rate(totals.firstTry, totals.solved);
  document.getElementById("totalCorrections").textContent = totals.corrections;
  document.getElementById("totalReveals").textContent = totals.answerReveals;

  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  sections.forEach((section) => {
    const stats = ensureSectionStats(section.id);
    const progress = Math.min(100, Math.round((stats.solved / TOTAL_PER_SECTION) * 100));
    const row = document.createElement("article");
    row.className = "stats-row";
    row.innerHTML = `
      <div>
        <strong>${section.title}</strong>
        <p>${stats.solved} / ${TOTAL_PER_SECTION} termines - ${rate(stats.correctFirstTry, stats.solved)} de reussite - ${stats.corrections} correction${stats.corrections > 1 ? "s" : ""} - ${stats.answerReveals} reponse${stats.answerReveals > 1 ? "s" : ""} affichee${stats.answerReveals > 1 ? "s" : ""}</p>
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

function signedExercise() {
  const a = randomInt(-95, 95);
  let b = randomInt(-95, 95);
  if (a === 0 && b === 0) b = 23;
  const op = Math.random() > 0.5 ? "+" : "-";
  const answer = op === "+" ? a + b : a - b;
  return { prompt: `(${a}) ${op} (${signed(b)})`, answer };
}

function priorityExercise() {
  const patterns = [
    () => {
      const a = randomInt(2, 5), b = randomInt(2, 5), c = randomInt(2, 5), d = randomInt(2, 5);
      return { prompt: `(${a} x ${b} + ${c}) x ${d}`, answer: (a * b + c) * d };
    },
    () => {
      const a = randomInt(3, 5), b = randomInt(2, 5), c = randomInt(2, 5), d = randomInt(2, 5);
      return { prompt: `${a} x ${b} + ${c} x ${d}`, answer: a * b + c * d };
    },
    () => {
      const a = randomInt(3, 5), b = randomInt(2, 5), c = randomInt(2, 5), d = randomInt(2, 5), e = randomInt(2, 5);
      return { prompt: `(${a} x ${b} + ${c}) x ${d} - ${e}`, answer: (a * b + c) * d - e };
    }
  ];
  return pick(patterns)();
}

function decimalExercise() {
  const patterns = [
    () => {
      const a = randomDecimal(12, 90, 1);
      const b = pick([0.2, 0.25, 0.5, 0.8]);
      return { prompt: `${formatNumber(a)} x ${formatNumber(b)}`, answer: round(a * b) };
    },
    () => {
      const a = randomDecimal(4, 85, 1);
      const b = randomDecimal(0.2, 9.9, 1);
      return { prompt: `${formatNumber(a)} + ${formatNumber(b)}`, answer: round(a + b) };
    },
    () => {
      const a = randomInt(12, 480);
      const b = pick([0.2, 0.25, 0.5]);
      return { prompt: `${a} : ${formatNumber(b)}`, answer: round(a / b) };
    }
  ];
  return pick(patterns)();
}

function complementExercise() {
  const target = pick([50, 100, 200, 1000]);
  const decimals = target <= 100;
  const a = decimals ? randomDecimal(0.01, target - 1, 2) : randomDecimal(1, target - 1, 2);
  return { prompt: `${formatNumber(a)} + ? = ${target}`, answer: round(target - a) };
}

function divisionExercise() {
  const divisors = [10, 5, 4, 2];
  const divisor = pick(divisors);
  const result = divisor === 10 ? randomDecimal(0.1, 99.9, 1) : randomInt(2, 120);
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
