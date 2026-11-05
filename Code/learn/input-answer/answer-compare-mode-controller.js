let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

let currentCard = null;
let lastCard = null;

let reverse = localStorage.getItem("reverse") === "true";
let cardReverse = reverse;

/* ---------------- IMPORTS ---------------- */

import { setConfidenceSmart } from "./learning_input-answer_smart-answer-compare.js?v=20261105b";
import { setConfidenceStrict } from "./learning_input-answer_strict-answer-compare.js?v=20261105b";

// Versions-Query bei allen eigenen Modulen: so liefert der Browser
// nach einem Update garantiert die neue Datei und nicht die alte
// HTTP-Cache-Version.
const MODULE_VERSION = "20261105b";

/* ---------------- MODE SWITCH ---------------- */

async function setMode(mode) {
  currentMode = mode;
  localStorage.setItem("mode", currentMode);

  if (currentMode === "smart") {
    currentModule = await import(
      `./learning_input-answer_smart-answer-compare.js?v=${MODULE_VERSION}`
    );
  }

  if (currentMode === "strict") {
    currentModule = await import(
      `./learning_input-answer_strict-answer-compare.js?v=${MODULE_VERSION}`
    );
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

  reverseBtn?.classList.toggle("active", reverse);

  reverseBtn?.addEventListener("click", () => {
    reverse = !reverse;
    localStorage.setItem("reverse", reverse);

    reverseBtn.classList.toggle("active", reverse);
    // wirksam erst ab nächster Karte: cardReverse bleibt
    // unverändert, damit Frage/korrekte Antwort der aktuellen Karte korrekt bleiben
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
  cardReverse = reverse;

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

function getCardKey(card) {
  if (!card) return null;
  return `${card.frage ?? ""}|||${card.antwort ?? ""}`;
}

function getWeightedCardSafe(cards, exclude = null) {
  if (!cards || cards.length === 0) return null;

  // Wie im self-compare mode: fertige Karten (sicherheit === 1) aussortieren
  const available = cards.filter(c => (c.sicherheit ?? 3) > 1);
  const source = available.length > 0 ? available : cards;

  if (source.length === 1) return source[0];

  const pool = [];

  for (const card of source) {
    const s = card.sicherheit ?? 3;
    const weight = Math.pow(2, s);

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return source[0] ?? null;

  const excludeKey = getCardKey(exclude);

  // Wenn es nur eine unterschiedliche Karte gibt, ist eine Wiederholung unvermeidbar
  if (excludeKey !== null) {
    const hasOther = source.some(c => getCardKey(c) !== excludeKey);
    if (!hasOther) return source[0];
  }

  let picked = null;
  let guard = 0;

  do {
    picked = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (
    excludeKey !== null &&
    getCardKey(picked) === excludeKey &&
    guard < 50
  );

  return picked;
}

/* ---------------- UI ---------------- */

function showCard() {

  if (!currentCard) return;

  const frage = cardReverse
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
    evaluation.style.display = "none";
  }
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

  btn.onclick = async () => {

    const level = Number(btn.dataset.level);

    if (!currentCard) return;

    const levelButtons = document.querySelectorAll("[data-level]");
    levelButtons.forEach(b => { b.disabled = true; });

    let failed = false;

    try {
      if (currentMode === "smart") {
        // Wichtig: awaiten, damit die Karte/Statistik erst nach der
        // Prüfung weitergeschaltet wird.
        await setConfidenceSmart(level, currentCard, cardReverse);
      }

      if (currentMode === "strict") {
        await setConfidenceStrict(level, currentCard, cardReverse);
      }
    } catch (err) {
      failed = true;
      console.error("Antwortprüfung fehlgeschlagen:", err);
    } finally {
      levelButtons.forEach(b => { b.disabled = false; });
    }

    if (failed) return;

    const confidenceBox = document.getElementById("confidenceBox");
    if (confidenceBox) confidenceBox.style.display = "none";

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.style.display = "block";

    updateFinishedCardsBar();
  };
});