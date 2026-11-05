import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

import {
  analyzeLexical,
  decide,
  normalizeForEmbedding,
  normalizeForMatch,
  splitAlternatives,
} from "./smart-compare-core.js?v=20261105e";

import { rightAnswerAll, wrongAnswerAll } from "../../stats/avarageCardsAll.js";
import { rightAnswerAlone, wrongAnswerAlone } from "../../stats/avarageCardsAlone.js";

/* =========================
   SYLVALEARN – SMART ANSWER COMPARE
   - toleriert kleine Rechtschreibfehler (fuzzy Token-Matching)
   - akzeptiert freie Formulierungen/Paraphrasen (multilinguale Embeddings)
   - erkennt klare Widersprüche (Verneinung, Zahlen, Einheiten)
   ========================= */

// Multilinguales Paraphrase-Modell: für Deutsch deutlich besser
// als das bisherige englische all-MiniLM-L6-v2.
const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const MODEL_OPTIONS = { quantized: true };

const EMBEDDING_CACHE_LIMIT = 300;

let extractor = null;
let aiReady = false;
let initPromise = null;

const embeddingCache = new Map();

/* ---------------- INIT ---------------- */

export function init() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      extractor = await pipeline(
        "feature-extraction",
        MODEL_ID,
        MODEL_OPTIONS
      );

      aiReady = true;

      // Warm-up: der erste echte Vergleich soll nicht die Initialisierung zahlen.
      await extractor("test", { pooling: "mean", normalize: true });
    } catch (err) {
      console.error("AI Init Fehler:", err);
      aiReady = false;
      extractor = null;
    }

    return aiReady;
  })();

  return initPromise;
}

async function ensureModel() {
  if (aiReady) return true;
  await init();
  return aiReady;
}

/* ---------------- EMBEDDINGS ---------------- */

async function embed(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  const vector = output.data;

  if (embeddingCache.size >= EMBEDDING_CACHE_LIMIT) {
    const oldest = embeddingCache.keys().next().value;
    embeddingCache.delete(oldest);
  }

  embeddingCache.set(text, vector);
  return vector;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Das Modell ist case-sensitiv. Wir prüfen deshalb die Original-
// schreibweise und zusätzlich die Kleinschreibung und nehmen den
// besten Treffer. So funktionieren sowohl "Computer" als auch
// "computer" als Antwort auf "Rechner".
function caseVariants(text) {
  const lower = text.toLocaleLowerCase("de-DE");
  return lower === text ? [text] : [text, lower];
}

/* ---------------- VERGLEICH ---------------- */

async function gradeAgainst(userAnswer, correctAnswer) {
  const analysis = analyzeLexical(userAnswer, correctAnswer);

  let semantic = 0;
  let semanticAvailable = false;

  if (!analysis.exact && await ensureModel()) {
    try {
      const userText = normalizeForEmbedding(userAnswer);
      const correctText = normalizeForEmbedding(correctAnswer);

      if (userText && correctText) {
        const userVariants = caseVariants(userText);
        const correctVariants = caseVariants(correctText);

        const [userVectors, correctVectors] = await Promise.all([
          Promise.all(userVariants.map(embed)),
          Promise.all(correctVariants.map(embed)),
        ]);

        for (const u of userVectors) {
          for (const c of correctVectors) {
            semantic = Math.max(
              semantic,
              cosineSimilarity(u, c)
            );
          }
        }

        semanticAvailable = true;
      }
    } catch (err) {
      console.error("Smart-Vergleich fehlgeschlagen:", err);
    }
  }

  const result = decide(analysis, semantic, semanticAvailable);
  return { ...result, analysis };
}

async function gradeAnswer(userAnswer, correctAnswer) {
  // "unsicher, ungewiss" bedeutet: eine der beiden Antworten reicht.
  // Zuerst die vollständige Musterantwort prüfen, danach die einzelnen
  // Alternativen. Der beste Treffer gewinnt.
  const candidates = [
    correctAnswer,
    ...splitAlternatives(correctAnswer),
  ];

  let best = null;

  // Exakte Treffer auf eine Alternative sofort akzeptieren. Das
  // funktioniert auch dann, wenn das Sprachmodell noch lädt oder
  // gar nicht verfügbar ist.
  const userText = normalizeForMatch(userAnswer);
  const exactCandidate = userText
    ? candidates.find(candidate => normalizeForMatch(candidate) === userText)
    : null;

  if (exactCandidate) {
    best = {
      ...(await gradeAgainst(userAnswer, exactCandidate)),
      candidate: exactCandidate,
    };
  } else {
    for (const candidate of candidates) {
      const result = await gradeAgainst(userAnswer, candidate);
      result.candidate = candidate;

      if (!best) {
        best = result;
      } else if (result.correct && !best.correct) {
        best = result;
      } else if (
        result.correct === best.correct &&
        result.score > best.score
      ) {
        best = result;
      }

      if (result.correct) break;
    }
  }

  console.debug("SylvaLearn Smart:", {
    correct: best.correct,
    reason: best.reason,
    candidate: best.candidate,
    alternatives: candidates.length,
    score: Number((best.score ?? 0).toFixed(3)),
    semantic: best.semanticAvailable
      ? Number(best.semantic.toFixed(3))
      : null,
    fuzzy: Number(best.analysis.fuzzy.toFixed(3)),
    char: Number(best.analysis.char.toFixed(3)),
    penalty: best.analysis.penalty,
    negation: best.analysis.negationMismatch,
    number: best.analysis.numberMismatch,
    unit: best.analysis.unitMismatch,
  });

  return best;
}

/* ---------------- CONFIDENCE ---------------- */

export async function setConfidenceSmart(level, currentCard, reverse) {
  if (!currentCard) return;

  const input = document.getElementById("userAnswer");
  const evalBox = document.getElementById("evaluation");

  if (!input || !evalBox) return;

  const userAnswer = input.value;

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  evalBox.style.display = "block";
  evalBox.style.color = "";
  evalBox.textContent = aiReady
    ? "Prüfe Antwort…"
    : "Smart-Modus lädt Sprachmodell (einmalig)…";

  const result = await gradeAnswer(userAnswer, correctAnswer);
  const isCorrect = result.correct;

  evalBox.textContent = isCorrect
    ? "Richtig! Antwort: " + correctAnswer
    : "Falsch! Richtige Antwort: " + correctAnswer;

  evalBox.style.color = isCorrect ? "green" : "red";

  if (isCorrect) {
    rightAnswerAll();
    rightAnswerAlone();
  } else {
    wrongAnswerAll();
    wrongAnswerAlone();
  }

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

  const card =
    set.qa.find(
      q => q.frage === currentCard.frage && q.antwort === currentCard.antwort
    ) ?? set.qa.find(q => q.frage === currentCard.frage);

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
