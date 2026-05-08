let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
let lastCard = null;

/* ---------------- MODE SWITCH ---------------- */

async function setMode(mode) {
  currentMode = mode;

  localStorage.setItem("mode", currentMode);

  if (currentMode === "smart") {
    currentModule = await import("./learning_input-answer_smart-answer-compare.js");
  }

  if (currentMode === "strict") {
    currentModule = await import("./learning_input-answer_strict-answer-compare.js");
  }

  document.getElementById("smartBtn").classList.toggle("active", currentMode === "smart");
  document.getElementById("strictBtn").classList.toggle("active", currentMode === "strict");

  currentModule?.init?.();
}

/* ---------------- INIT AFTER DOM ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("smartBtn").addEventListener("click", () => setMode("smart"));
  document.getElementById("strictBtn").addEventListener("click", () => setMode("strict"));

  setMode(currentMode); // initial laden
});


/* ---------------- NEXT CARD ---------------- */

function nextCard() {
  const name = localStorage.getItem("currentSetName");
  const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

  if (!set || !set.qa.length) return;

  const finishedCards = set.qa.filter(card => (card.sicherheit ?? 3) === 1);

  if (finishedCards.length === set.qa.length) {
    const question = document.getElementById("question");
    const input = document.getElementById("userAnswer");
    const box = document.getElementById("confidenceBox");
    const btn = document.getElementById("nextBtnButton");
    const evalBox = document.getElementById("evaluation");

    question.textContent = "Alle Karten geschafft 🎉";
    input.style.display = "none";
    box.style.display = "none";
    evalBox.style.display = "none";

    btn.textContent = "Zurück zur Übersicht";

    btn.onclick = () => {
      set.qa.forEach(card => card.sicherheit = 3);
      localStorage.setItem("learnsets", JSON.stringify(learnsets));
      window.location.href = "../learn.html";
    };

    return;
  }

  currentCard = getWeightedCard(set.qa);
  document.getElementById("userAnswer").value = "";

  showCard();
}

/* ---------------- WEIGHTED RANDOM ---------------- */

function getWeightedCard(cards) {
  const pool = [];

  for (const card of cards) {
    const s = card.sicherheit ?? 3;
    const weight = Math.pow(2, s);

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  let picked;

  do {
    picked = pool[Math.floor(Math.random() * pool.length)];
  } while (picked === lastCard && pool.length > 1);

  lastCard = picked;
  return picked;
}


/* ---------------- UI ---------------- */

function showCard() {
  if (!currentCard) return;

  document.getElementById("question").textContent = currentCard.frage;

  document.getElementById("evaluation").textContent = "";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("confidenceBox").style.display = "block";
}

function updateFinishedCardsBar() {
  const name = localStorage.getItem("currentSetName");
  const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

  if (!set || !set.qa.length) return;

  const total = set.qa.length;
  const finished = set.qa.filter(c => (c.sicherheit ?? 3) === 1).length;

  const percent = (finished / total) * 100;

  document.getElementById("finishedCardsBar").style.width = percent + "%";
  document.getElementById("finishedCardsText").textContent =
    `${finished} / ${total} geschafft`;
}

nextCard()