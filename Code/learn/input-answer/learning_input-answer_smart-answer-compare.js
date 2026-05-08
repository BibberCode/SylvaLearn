import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

let extractor = null;
let aiReady = false;

/* ---------------- AI INIT ---------------- */

async function initAI() {
  extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  aiReady = true;
}

/* ---------------- COSINE SIM ---------------- */

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
  if (!extractor || !aiReady) return false;

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

  return sim >= THRESHOLD;
}

/* ---------------- CONFIDENCE ---------------- */

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.onclick = async () => {
    const level = Number(btn.dataset.level);
    const userAnswer = document.getElementById("userAnswer").value;

    const result = await compareAnswer(userAnswer, currentCard.antwort);

    const evalBox = document.getElementById("evaluation");
    evalBox.style.display = "block";

    if (result) {
      evalBox.textContent = "Richtig! Antwort: " + currentCard.antwort;
      evalBox.style.color = "green";
    } else {
      evalBox.textContent = "Falsch! Richtige Antwort: " + currentCard.antwort;
      evalBox.style.color = "red";
    }

    const name = localStorage.getItem("currentSetName");
    const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

    if (set) {
      const card = set.qa.find(q => q.frage === currentCard.frage);

      if (card && result) {
        card.sicherheit = level;
      } else if (card && !result) {
        card.sicherheit = 5;
      }

      localStorage.setItem("learnsets", JSON.stringify(learnsets));
    }

    updateFinishedCardsBar();

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("nextBtn").style.display = "block";
  };
});

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", async () => {
  updateFinishedCardsBar();

  document
    .getElementById("nextBtnButton")
    .addEventListener("click", nextCard);

  await initAI();
  nextCard();
});