let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
let lastCard = null;

let reverse = localStorage.getItem("reverse") === "true";

/* ---------------- IMPORTS ---------------- */

import { setConfidenceSmart } from "./learning_input-answer_smart-answer-compare.js";
import { setConfidenceStrict } from "./learning_input-answer_strict-answer-compare.js";

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
    ?.classList.toggle("active", currentMode === "smart");

  document.getElementById("strictBtn")
    ?.classList.toggle("active", currentMode === "strict");

  currentModule?.init?.();
}

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("smartBtn")
    ?.addEventListener("click", () => setMode("smart"));

  document.getElementById("strictBtn")
    ?.addEventListener("click", () => setMode("strict"));

  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn?.addEventListener("click", () => {
    reverse = !reverse;
    localStorage.setItem("reverse", reverse);

    reverseBtn.classList.toggle("active", reverse);
  });

  await setMode(currentMode);

  nextCard();
  updateFinishedCardsBar();
});

/* ---------------- NEXT CARD ---------------- */

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

  const allFinished = set.qa.every(
    card => (card.sicherheit ?? 3) === 1
  );

  /* ---------- FINISHED ---------- */

  if (allFinished) {

    const question = document.getElementById("question");
    const input = document.getElementById("userAnswer");
    const confidence = document.getElementById("confidenceBox");
    const evaluation = document.getElementById("evaluation");
    const compareModeBtns = document.getElementById("compareModeBtns");
    const reverseBtn = document.getElementById("reverseBtn");
    const btn = document.getElementById("nextBtnButton");

    if (question) question.textContent = "Alle Karten geschafft 🎉";

    if (input) input.style.display = "none";
    if (confidence) confidence.style.display = "none";
    if (evaluation) evaluation.style.display = "none";
    if (compareModeBtns) compareModeBtns.style.display = "none";
    if (reverseBtn) reverseBtn.style.display = "none";

    if (btn) {
      btn.textContent = "Zurück zur Übersicht";

      btn.onclick = () => {

        const allSets = JSON.parse(localStorage.getItem("learnsets")) || [];

        const setIndex = allSets.findIndex(
          s => (s.name || "").trim() === (name || "").trim()
        );

        if (setIndex !== -1) {
          allSets[setIndex].qa.forEach(card => {
            card.sicherheit = 3;
          });

          localStorage.setItem("learnsets", JSON.stringify(allSets));
        }

        window.location.href = "../learn.html";
      };
    }

    updateFinishedCardsBar();
    return;
  }

  /* ---------- CARD PICK ---------- */

  const newCard = getWeightedCardSafe(set.qa, currentCard);

  lastCard = currentCard;
  currentCard = newCard;

  /* ---------- INPUT RESET ---------- */

  const input = document.getElementById("userAnswer");
  if (input) input.value = "";

  /* ---------- REVERSE UI ---------- */

  const reverseBtn = document.getElementById("reverseBtn");
  reverseBtn?.classList.toggle("active", reverse);

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
    else if (s === 4) weight = 5;
    else if (s === 3) weight = 3;
    else if (s === 2) weight = 2;
    else if (s === 1) weight = 1;

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return null;

  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------------- UI ---------------- */

function showCard() {

  if (!currentCard) return;

  const frage = reverse
    ? currentCard.antwort
    : currentCard.frage;

  const question = document.getElementById("question");

  if (question) {
    question.textContent = frage;
  }

  const evaluation = document.getElementById("evaluation");
  const nextBtn = document.getElementById("nextBtn");
  const confidenceBox = document.getElementById("confidenceBox");

  if (evaluation) evaluation.textContent = "";
  if (nextBtn) nextBtn.style.display = "none";
  if (confidenceBox) confidenceBox.style.display = "block";
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

  const percent = total ? (finished / total) * 100 : 0;

  bar.style.width = percent + "%";
  text.textContent = `${finished} / ${total} geschafft`;
}

/* ---------------- EVENTS ---------------- */

document.getElementById("nextBtn")
  ?.addEventListener("click", nextCard);

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

    const confidenceBox = document.getElementById("confidenceBox");
    if (confidenceBox) confidenceBox.style.display = "none";

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.style.display = "block";

    updateFinishedCardsBar();
  };
});