/* ---------------- Antwort prüfen ---------------- */

let right = false;
function compareAnswer(userAnswer, correctAnswer) {
  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "block";

  userAnswer = (userAnswer || "").toLowerCase().trim().replace(/\s+/g, "");
  correctAnswer = (correctAnswer || "").toLowerCase().trim().replace(/\s+/g, "");

  if (userAnswer === correctAnswer) {
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
  btn.onclick = () => {
    const level = Number(btn.dataset.level);

    const userAnswer = document.getElementById("userAnswer").value;

    compareAnswer(userAnswer, currentCard.antwort);

    const name = localStorage.getItem("currentSetName");
    const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

    if (set) {
      const card = set.qa.find(q => q.frage === currentCard.frage);

      if (card && right) {
        card.sicherheit = level;
        localStorage.setItem("learnsets", JSON.stringify(learnsets));
      }
      else if (card && !right) {
        card.sicherheit = 5; // direkt auf "schlecht" setzen, wenn die Antwort falsch war
        localStorage.setItem("learnsets", JSON.stringify(learnsets));
      }
    }



    updateFinishedCardsBar();

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("nextBtn").style.display = "block";
  };
});

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