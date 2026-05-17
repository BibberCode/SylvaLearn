import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

let extractor = null;
let aiReady = false;

import { rightAnswerAll, wrongAnswerAll } from "../../stats/avarageCardsAll.js";
import { rightAnswerAlone, wrongAnswerAlone } from "../../stats/avarageCardsAlone.js";

/* ---------------- INIT ---------------- */

export async function init() {

  if (aiReady) return;

  try {
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );

    aiReady = true;

  } catch (err) {
    console.error("AI Init Fehler:", err);
    aiReady = false;
  }
}

/* ---------------- NORMALIZE ---------------- */

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Umlaute
    .replace(/[^a-z0-9\s]/gi, " ")    // alles außer Buchstaben/Zahlen
    .replace(/\s+/g, " ")             // doppelte Leerzeichen
    .trim();
}

/* ---------------- LEVENSHTEIN (Rechtschreibung) ---------------- */

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => []);

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  return matrix[b.length][a.length];
}

function spellingSimilarity(a, b) {
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - dist / max;
}

/* ---------------- TOKEN CHECK ---------------- */

function tokenSimilarity(user, correct) {

  const u = user.split(" ");
  const c = correct.split(" ");

  let matches = 0;

  for (const w of u) {
    if (c.includes(w)) matches++;
  }

  return matches / Math.max(c.length, 1);
}

/* ---------------- COSINE ---------------- */

function cosineSimilarity(a, b) {

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ---------------- COMPARE ---------------- */

async function compareAnswer(userAnswer, currentCard, reverse) {

  if (!currentCard) return false;

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  const userText = normalizeText(userAnswer);
  const correctText = normalizeText(correctAnswer);

  if (!userText) return false;

  /* ---------- EXAKT ---------- */
  if (userText === correctText) return true;

  /* ---------- LEVENSHTEIN (Rechtschreibfehler) ---------- */
  const spelling = spellingSimilarity(userText, correctText);
  if (spelling > 0.9) return true;

  /* ---------- TOKEN ---------- */
  const tokenScore = tokenSimilarity(userText, correctText);
  if (tokenScore >= 0.8) return true;

  /* ---------- TEILMATCH ---------- */
  if (correctText.includes(userText) && userText.length > 4) {
    return true;
  }

  /* ---------- FALLBACK OHNE KI ---------- */
  if (!aiReady || !extractor) {
    return tokenScore >= 0.6;
  }

  try {

    const [uVec, cVec] = await Promise.all([
      extractor(userText, { pooling: "mean", normalize: true }),
      extractor(correctText, { pooling: "mean", normalize: true })
    ]);

    if (!uVec?.data || !cVec?.data) return false;

    const similarity = cosineSimilarity(uVec.data, cVec.data);

    /* ---------- KOMBINIERTER SCORE ---------- */

    const finalScore =
      similarity * 0.6 +
      tokenScore * 0.2 +
      spelling * 0.2;

    /* ---------- DYNAMISCHER THRESHOLD ---------- */

    let threshold = 0.72;

    if (correctText.length < 10) threshold = 0.9;
    else if (correctText.length < 20) threshold = 0.84;
    else if (correctText.length > 80) threshold = 0.65;

    return finalScore >= threshold;

  } catch (err) {

    console.error("Compare Fehler:", err);

    return tokenScore >= 0.6;
  }
}

/* ---------------- CONFIDENCE ---------------- */

export async function setConfidenceSmart(level, currentCard, reverse) {

  if (!currentCard) return;

  const input = document.getElementById("userAnswer");
  const evalBox = document.getElementById("evaluation");

  if (!input || !evalBox) return;

  const userAnswer = input.value;

  const isCorrect = await compareAnswer(
    userAnswer,
    currentCard,
    reverse
  );

  evalBox.style.display = "block";

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  evalBox.textContent = isCorrect
    ? "Richtig! Antwort: " + correctAnswer
    : "Falsch! Richtige Antwort: " + correctAnswer;

  evalBox.style.color = isCorrect ? "green" : "red";

  if (isCorrect) { rightAnswerAll(); rightAnswerAlone(); } else { wrongAnswerAll(); rightAnswerAlone(); }

  const name = localStorage.getItem("currentSetName");

  let learnsets = [];

  try {
    learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
  } catch {
    learnsets = [];
  }

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set) return;

  const card = set.qa.find(
    q => q.frage === currentCard.frage
  );

  if (!card) return;

  if (isCorrect) {
    card.sicherheit = level;
  } else {
    card.sicherheit = Math.min(
      5,
      (card.sicherheit ?? 3) + 1
    );
  }

  localStorage.setItem(
    "learnsets",
    JSON.stringify(learnsets)
  );
}