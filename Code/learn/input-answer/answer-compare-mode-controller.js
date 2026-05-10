let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
let lastCard = null;

import { setConfidenceSmart } from "./learning_input-answer_smart-answer-compare.js";
import { setConfidenceStrict } from "./learning_input-answer_strict-answer-compare.js";
import { reverse, reverseMode, modeSwitch } from "../shared.js";

function getLearnsets() {
  return JSON.parse(localStorage.getItem("learnsets")) || [];
}

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

  document.getElementById("reverseBtn").addEventListener("click", () => {
    modeSwitch();
    showCard();
  });

  reverseMode();
  setMode(currentMode);
});


/* ---------------- NEXT CARD ---------------- */

let allFinished = null
function nextCard() {
  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set || !Array.isArray(set.qa) || set.qa.length === 0) return;

  allFinished = set.qa.every(card => (card.sicherheit ?? 3) === 1);

  if (allFinished) {
    const question = document.getElementById("question");
    const input = document.getElementById("userAnswer");
    const box = document.getElementById("confidenceBox");
    const btn = document.getElementById("nextBtnButton");
    const evalBox = document.getElementById("evaluation");
    const modeBtns = document.getElementById("modeBtns")

    question.textContent = "Alle Karten geschafft 🎉";
    input.style.display = "none";
    box.style.display = "none";
    evalBox.style.display = "none";
    modeBtns.style.display = "none";

    btn.textContent = "Zurück zur Übersicht";

    btn.onclick = () => {
      set.qa.forEach(card => (card.sicherheit = 3));
      localStorage.setItem("learnsets", JSON.stringify(learnsets));
      window.location.href = "../learn.html";
    };

    updateFinishedCardsBar();

    return;
  }
  
  if (currentCard === getWeightedCardSafe(set.qa)) return nextCard();
  currentCard = getWeightedCardSafe(set.qa);

  if (!currentCard) return;

  document.getElementById("userAnswer").value = "";
  showCard();
}

/* ---------------- WEIGHTED RANDOM ---------------- */

function getWeightedCardSafe(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const pool = [];

  for (const card of cards) {
    const s = card.sicherheit ?? 3;
    const weight = Math.max(1, Math.pow(2, s));

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return cards[0];
  if (pool.length <= 1) return pool[0];

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

  let frage;

  if (reverse) {
    frage = currentCard.antwort;
  } else {
    frage = currentCard.frage;
  }

  document.getElementById("question").textContent = frage;

  document.getElementById("evaluation").textContent = "";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("confidenceBox").style.display = "block";
}

function updateFinishedCardsBar() {
  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  const bar = document.getElementById("finishedCardsBar");
  const text = document.getElementById("finishedCardsText");

  if (!set || !set.qa || !bar || !text) return;

  const total = set.qa.length;

  const finished = set.qa.filter(
    c => (c.sicherheit ?? 3) <= 1
  ).length;

  const percent = total ? (finished / total) * 100 : 0;

  bar.style.width = percent + "%";
  text.textContent = `${finished} / ${total} geschafft`;
}

document.getElementById("nextBtn").onclick = nextCard, updateFinishedCardsBar;

nextCard();
updateFinishedCardsBar();


/* --------Set Confidence---------*/

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.onclick = () => {
    const level = Number(btn.dataset.level);

    if (!currentCard) return; // ❗ wichtig

    if (currentMode === "smart") {
      setConfidenceSmart(level, currentCard);
    }

    if (currentMode === "strict") {
      setConfidenceStrict(level, currentCard);
    }

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("nextBtn").style.display = "block";

    updateFinishedCardsBar();
  };
});


/* --------Reset all cards--------- */
function resetAllCards() {
  learnsets.forEach(set => {
    set.qa.forEach(card => {
      if (allFinished) {
        card.sicherheit = 3;
        localStorage.setItem("learnsets", JSON.stringify(learnsets));
      }
    });
  });
}

window.addEventListener("beforeunload", resetAllCards);