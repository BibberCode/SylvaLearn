let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
let lastCard = null;

const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

/* ---------------- IMPORTS ---------------- */

import { setConfidenceSmart } from "./learning_input-answer_smart-answer-compare.js";
import { setConfidenceStrict } from "./learning_input-answer_strict-answer-compare.js";

/* ---------------- STATE ---------------- */

let reverse = localStorage.getItem("reverse") === "true";

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

  document.getElementById("smartBtn")
    .classList.toggle("active", currentMode === "smart");

  document.getElementById("strictBtn")
    .classList.toggle("active", currentMode === "strict");

  currentModule?.init?.();
}

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("smartBtn")
    .addEventListener("click", () => setMode("smart"));

  document.getElementById("strictBtn")
    .addEventListener("click", () => setMode("strict"));

  /* Reverse Button */
  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn.addEventListener("click", () => {
    reverse = !reverse;
    localStorage.setItem("reverse", reverse);

    reverseBtn.classList.toggle("active", reverse);
  });

  reverseBtn.classList.toggle("active", reverse);

  setMode(currentMode);
});

/* ---------------- NEXT CARD ---------------- */

let allFinished = null;

function nextCard() {
  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set || !Array.isArray(set.qa) || set.qa.length === 0) return;

  allFinished = set.qa.every(card => (card.sicherheit ?? 3) === 1);

  if (allFinished) {
    document.getElementById("question").textContent = "Alle Karten geschafft 🎉";

    document.getElementById("userAnswer").style.display = "none";
    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("evaluation").style.display = "none";
    document.getElementById("modeBtns").style.display = "none";

    const btn = document.getElementById("nextBtnButton");
    btn.textContent = "Zurück zur Übersicht";

    btn.onclick = () => {
      set.qa.forEach(card => (card.sicherheit = 3));
      localStorage.setItem("learnsets", JSON.stringify(learnsets));
      window.location.href = "../learn.html";
    };

    updateFinishedCardsBar();
    return;
  }

  const lastCard = currentCard
  currentCard = getWeightedCardSafe(set.qa);
  if (cards.length > 1 && lastCard === currentCard) {
    return nextCard();
  }

  document.getElementById("userAnswer").value = "";
  showCard();
}

/* ---------------- WEIGHTED ---------------- */

function getWeightedCardSafe(cards) {
  const pool = [];

  for (const card of cards) {
    const s = card.sicherheit ?? 3;
    const weight = Math.max(1, Math.pow(2, s));

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

  const frage = reverse
    ? currentCard.antwort
    : currentCard.frage;

  document.getElementById("question").textContent = frage;

  document.getElementById("evaluation").textContent = "";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("confidenceBox").style.display = "block";
}

/* ---------------- BAR ---------------- */

function updateFinishedCardsBar() {
  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  const bar = document.getElementById("finishedCardsBar");
  const text = document.getElementById("finishedCardsText");

  if (!set || !bar || !text) return;

  const total = set.qa.length;

  const finished = set.qa.filter(
    c => (c.sicherheit ?? 3) <= 1
  ).length;

  const percent = total ? (finished / total) * 100 : 0;

  bar.style.width = percent + "%";
  text.textContent = `${finished} / ${total} geschafft`;
}

/* ---------------- EVENTS ---------------- */

document.getElementById("nextBtn").onclick = nextCard;

setTimeout(() => {
  nextCard();
  updateFinishedCardsBar();
}, 0);

/* ---------------- CONFIDENCE ---------------- */

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.onclick = () => {
    const level = Number(btn.dataset.level);

    if (!currentCard) return;

    if (currentMode === "smart") {
      setConfidenceSmart(level, currentCard, reverse);
    }

    if (currentMode === "strict") {
      setConfidenceStrict(level, currentCard, reverse);
    }

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("nextBtn").style.display = "block";

    updateFinishedCardsBar();
  };
});

/* ---------------- RESET ---------------- */

function resetAllCards() {
  learnsets.forEach(set => {
    set.qa.forEach(card => {
      if (allFinished) {
        card.sicherheit = 3;
      }
    });
  });

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
}

window.addEventListener("beforeunload", resetAllCards);