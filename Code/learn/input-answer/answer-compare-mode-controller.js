let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
let lastCard = null;

const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

/* ---------------- IMPORTS ---------------- */

import { setConfidenceSmart } from "./learning_input-answer_smart-answer-compare.js";
import { setConfidenceStrict } from "./learning_input-answer_strict-answer-compare.js";

/* ---------------- STATE ---------------- */

// nur für die NÄCHSTE Karte
let reverseNext = false;
let currentReverse = false;

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

window.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("smartBtn")
    .addEventListener("click", () => setMode("smart"));

  document.getElementById("strictBtn")
    .addEventListener("click", () => setMode("strict"));

  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn.addEventListener("click", () => {
    reverseNext = !reverseNext;

    reverseBtn.classList.toggle("active", reverseNext);
  });

  await setMode(currentMode);

  nextCard();
  updateFinishedCardsBar();
});

/* ---------------- NEXT CARD ---------------- */

let allFinished = null;

function nextCard() {

  const name = localStorage.getItem("currentSetName");

  let sets = [];

  try {
    sets = JSON.parse(localStorage.getItem("learnsets")) || [];
  } catch {
    sets = [];
  }

  const set = sets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set || !set.qa?.length) return;

  allFinished = set.qa.every(
    card => (card.sicherheit ?? 3) === 1
  );

  /* ---------- FINISHED ---------- */

  if (allFinished) {

    const question = document.getElementById("question");
    const input = document.getElementById("userAnswer");
    const confidence = document.getElementById("confidenceBox");
    const evaluation = document.getElementById("evaluation");
    const compareModeBtns = document.getElementById("compareModeBtns");
    const reverseBtn = document.getElementById("reverseBtn")
    const btn = document.getElementById("nextBtnButton");

    if (question) {
      question.textContent = "Alle Karten geschafft 🎉";
    }

    if (input) input.style.display = "none";
    if (confidence) confidence.style.display = "none";
    if (evaluation) evaluation.style.display = "none";
    if (compareModeBtns) compareModeBtns.style.display = "none";
    if (reverseBtn) reverseBtn.style.display = "none"

    if (btn) {
      btn.textContent = "Zurück zur Übersicht";

      btn.onclick = () => {

        set.qa.forEach(card => {
          card.sicherheit = 3;
        });

        localStorage.setItem(
          "learnsets",
          JSON.stringify(sets)
        );

        window.location.href = "../learn.html";
      };
    }

    updateFinishedCardsBar();

    return;
  }

  /* ---------- CARD PICK ---------- */

  let newCard = getWeightedCardSafe(set.qa);

  let tries = 0;

  while (
    newCard?.frage === currentCard?.frage &&
    tries < 10
  ) {
    newCard = getWeightedCardSafe(set.qa);
    tries++;
  }

  lastCard = currentCard;
  currentCard = newCard;

  /* ---------- INPUT RESET ---------- */

  const input = document.getElementById("userAnswer");

  if (input) {
    input.value = "";
  }

  /* ---------- REVERSE ---------- */

  currentReverse = reverseNext;

  reverseNext = false;

  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn?.classList.remove("active");

  /* ---------- SHOW ---------- */

  showCard();
  updateFinishedCardsBar();
}

/* ---------------- WEIGHTED ---------------- */

function getWeightedCardSafe(cards, exclude = null) {

  const pool = [];

  for (const card of cards) {

    if (card === exclude) continue;

    const s = card.sicherheit ?? 3;

    let weight = 1;

    if (s === 5) weight = 8;
    if (s === 4) weight = 5;
    if (s === 3) weight = 3;
    if (s === 2) weight = 2;
    if (s === 1) weight = 1;

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return null;

  return pool[
    Math.floor(Math.random() * pool.length)
  ];
}

/* ---------------- UI ---------------- */

function showCard() {

  if (!currentCard) return;

  const frage = currentReverse
    ? currentCard.antwort
    : currentCard.frage;

  const question = document.getElementById("question");

  if (question) {
    question.textContent = frage;
  }

  const evaluation = document.getElementById("evaluation");
  const nextBtn = document.getElementById("nextBtn");
  const confidenceBox = document.getElementById("confidenceBox");

  if (evaluation) {
    evaluation.textContent = "";
  }

  if (nextBtn) {
    nextBtn.style.display = "none";
  }

  if (confidenceBox) {
    confidenceBox.style.display = "block";
  }
}

/* ---------------- BAR ---------------- */

function updateFinishedCardsBar() {

  const name = localStorage.getItem("currentSetName");

  let sets = [];

  try {
    sets = JSON.parse(localStorage.getItem("learnsets")) || [];
  } catch {
    sets = [];
  }

  const set = sets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  const bar = document.getElementById("finishedCardsBar");
  const text = document.getElementById("finishedCardsText");

  if (!set || !bar || !text) return;

  const total = set.qa.length;

  const finished = set.qa.filter(
    c => (c.sicherheit ?? 3) === 1
  ).length;

  const percent = total
    ? (finished / total) * 100
    : 0;

  bar.style.width = percent + "%";

  text.textContent =
    `${finished} / ${total} geschafft`;
}

/* ---------------- EVENTS ---------------- */

const nextBtn = document.getElementById("nextBtn");

if (nextBtn) {
  nextBtn.onclick = nextCard;
}

/* ---------------- CONFIDENCE ---------------- */

document.querySelectorAll("[data-level]").forEach(btn => {

  btn.onclick = () => {

    const level = Number(btn.dataset.level);

    if (!currentCard) return;

    if (currentMode === "smart") {
      setConfidenceSmart(
        level,
        currentCard,
        currentReverse
      );
    }

    if (currentMode === "strict") {
      setConfidenceStrict(
        level,
        currentCard,
        currentReverse
      );
    }

    const confidenceBox =
      document.getElementById("confidenceBox");

    const nextBtn =
      document.getElementById("nextBtn");

    if (confidenceBox) {
      confidenceBox.style.display = "none";
    }

    if (nextBtn) {
      nextBtn.style.display = "block";
    }

    updateFinishedCardsBar();
  };
});