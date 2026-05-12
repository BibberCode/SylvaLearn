/* ---------------- Antwort prüfen ---------------- */

let right = false;
function compareAnswer(userAnswer, currentCard, reverse) {
  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  userAnswer = (userAnswer || "").trim();
  const correct = (correctAnswer || "").trim();

  const isCorrect = userAnswer === correct;

  if (isCorrect) {
    evalBox.textContent = "Richtig! Antwort: " + correctAnswer;
    evalBox.style.color = "green";
  } else {
    evalBox.textContent = "Falsch! Richtige Antwort: " + correctAnswer;
    evalBox.style.color = "red";
  }

  return isCorrect;
}
/* ---------------- CONFIDENCE ---------------- */

export function setConfidenceStrict(level, currentCard, reverse) {
  const userAnswer = document.getElementById("userAnswer").value;

  const isCorrect = compareAnswer(userAnswer, currentCard, reverse);

  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (!set) return;

  const card = set.qa.find(q => q.frage === currentCard.frage);

  if (!card) return;

  if (isCorrect) {
    card.sicherheit = level;
  } else {
    card.sicherheit = 5;
  }

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
}

/* ---------------- WEIGHTED RANDOM ---------------- */

function getWeightedCard(cards) {
  const pool = [];

  for (const card of cards) {
    const s = card.sicherheit ?? 3;
    const weight = Math.max(1, Math.pow(2, s));

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return cards[0];

  return pool[Math.floor(Math.random() * pool.length)];
}