/* ---------------- Antwort prüfen ---------------- */

let right = false;
function compareAnswer(userAnswer, currentCard, reverse) {
  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  const correctAnswer = reverse
    ? currentCard.frage
    : currentCard.antwort;

  userAnswer = (userAnswer || "").trim().toLowerCase();
  const correct = (correctAnswer || "").trim().toLowerCase();

  const isCorrect = userAnswer === correct;

  if (isCorrect) {
    evalBox.textContent = "Richtig!";
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