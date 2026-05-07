import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

let currentCard = null;
const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
let lastCard = null;

let extractor = null;
let aiReady = false;
let right = false;

/* ---------------- AI INIT ---------------- */

async function initAI() {
  extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  aiReady = true;
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

/* ---------------- NORMALISIERUNG ---------------- */

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ---------------- KI VERGLEICH ---------------- */

async function compareAnswer(userAnswer, correctAnswer) {
  if (!currentCard || !extractor || !aiReady) return;

  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  const userVec = await extractor(userAnswer, {
    pooling: "mean",
    normalize: true
  });

  const correctVec = await extractor(correctAnswer, {
    pooling: "mean",
    normalize: true
  });

  const sim = cosineSimilarity(userVec.data, correctVec.data);

  const THRESHOLD = 0.75;

  if (sim >= THRESHOLD) {
    evalBox.textContent = "Richtig! Antwort: " + currentCard.antwort;
    evalBox.style.color = "green";
    right = true;
  } else {
    evalBox.textContent = "Falsch! Richtige Antwort: " + currentCard.antwort;
    evalBox.style.color = "red";
    right = false;
  }
}

/* ---------------- CONFIDENCE ---------------- */

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.onclick = async () => {
    const level = Number(btn.dataset.level);
    const userAnswer = document.getElementById("userAnswer").value;

    await compareAnswer(userAnswer, currentCard.antwort);

    const name = localStorage.getItem("currentSetName");
    const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

    if (set) {
      const card = set.qa.find(q => q.frage === currentCard.frage);

      if (card && right) {
        card.sicherheit = level;
      } else if (card && !right) {
        card.sicherheit = 5;
      }

      localStorage.setItem("learnsets", JSON.stringify(learnsets));
    }

    updateFinishedCardsBar();

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("nextBtn").style.display = "block";
  };
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

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", async () => {
  updateFinishedCardsBar();

  await initAI();
  nextCard();
});

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nextBtnButton")
    .addEventListener("click", nextCard);
});