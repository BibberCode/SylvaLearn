import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

let extractor = null;
let aiReady = false;

/* ---------------- INIT ---------------- */

export async function init() {
  extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  aiReady = true;
}

/* ---------------- COSINE SIMILARITY ---------------- */

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ---------------- KI COMPARE ---------------- */

async function compareAnswer(userAnswer, currentCard, reverse) {
  if (!aiReady || !extractor) return false;

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  const normalizeText = (str) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const userText = normalizeText(userAnswer);
  const correctText = normalizeText(correctAnswer);

  if (userText === correctText) return true;

  try {
    const [userVec, correctVec] = await Promise.all([
      extractor(userText, { pooling: "mean", normalize: true }),
      extractor(correctText, { pooling: "mean", normalize: true })
    ]);

    if (!userVec?.data || !correctVec?.data) return false;

    const similarity = cosineSimilarity(userVec.data, correctVec.data);

    const THRESHOLD = 0.72;

    return similarity >= THRESHOLD;
  } catch {
    return false;
  }
}

/* ---------------- CONFIDENCE ---------------- */

export async function setConfidenceSmart(level, currentCard, reverse) {
  if (!currentCard) return;

  const userAnswer = document.getElementById("userAnswer").value;

  const isCorrect = await compareAnswer(
    userAnswer,
    currentCard,
    reverse
  );

  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  if (isCorrect) {
    evalBox.textContent = "Richtig!";
    evalBox.style.color = "green";
  } else {
    evalBox.textContent = "Falsch! Richtige Antwort: " + correctAnswer;
    evalBox.style.color = "red";
  }

  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set) return;

  const card = set.qa.find(q => q.frage === currentCard.frage);

  if (!card) return;

  card.sicherheit = isCorrect ? level : 5;

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
}