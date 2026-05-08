/* ---------------- Antwort prüfen ---------------- */

let right = false;
function compareAnswer(userAnswer, correctAnswer) {
  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  userAnswer = (userAnswer || "");
  correctAnswer = (correctAnswer || "")

  const isCorrect = userAnswer === correctAnswer;

  if (isCorrect) {
    evalBox.textContent = "Richtig! Antwort: " + correctAnswer;
    evalBox.style.color = "green";
    right = true;
  } else {
    evalBox.textContent = "Falsch! Richtige Antwort: " + correctAnswer;
    evalBox.style.color = "red";
    right = false;
  }

  return isCorrect;
}

/* ---------------- CONFIDENCE ---------------- */

export function setConfidenceStrict(level, currentCard) {
  const userAnswer = document.getElementById("userAnswer").value;

  const isCorrect = compareAnswer(userAnswer, currentCard.antwort);

  const name = localStorage.getItem("currentSetName");
  const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
  const set = learnsets.find(
    s => (s.name || "").trim() === (name || "").trim()
  );

  if (set) {
    const card = set.qa.find(q => q.frage === currentCard.frage);

    if (card && isCorrect) {
      card.sicherheit = level;
    } else if (card) {
      card.sicherheit = 5;
    }

    localStorage.setItem("learnsets", JSON.stringify(learnsets));
  }
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

  if (pool.length === 0) {
    return cards[Math.floor(Math.random() * cards.length)];
  }

  let picked;

  do {
    picked = pool[Math.floor(Math.random() * pool.length)];
  } while (picked === lastCard && pool.length > 1);

  lastCard = picked;

  return picked;
}

function resetAllCards() {
  learnsets.forEach(set => {
    set.qa.forEach(card => {
      card.sicherheit = 3;
    });
  });
  localStorage.setItem("learnsets", JSON.stringify(learnsets));
}

window.addEventListener("beforeunload", resetAllCards);