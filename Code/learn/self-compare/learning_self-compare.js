let currentCard = null;
const learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];
let lastCard = null;

let reverse = localStorage.getItem("reverse") === "true";

nextCard();

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  /* Reverse Button */
  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn.addEventListener("click", () => {
    reverse = !reverse;
    localStorage.setItem("reverse", reverse);

    reverseBtn.classList.toggle("active", reverse);
  });

  reverseBtn.classList.toggle("active", reverse);
});

/* ---------------- UI ---------------- */

function showCard() {
  if (!currentCard) return;

  const frage = reverse
    ? currentCard.antwort
    : currentCard.frage;

  document.getElementById("question").textContent = frage;

  document.getElementById("evaluation").textContent = "";
  document.getElementById("userAnswers").style.display = "none";
  document.getElementById("confidenceBox").style.display = "block";
}

function updateFinishedCardsBar() {
  const name = localStorage.getItem("currentSetName");
  const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

  if (!set || !set.qa.length) return;

  const total = set.qa.length;

  // Level 1 = fertig (nach deiner Änderung)
  const finished = set.qa.filter(c => (c.sicherheit ?? 3) === 1).length;

  const percent = (finished / total) * 100;

  document.getElementById("finishedCardsBar").style.width = percent + "%";
  document.getElementById("finishedCardsText").textContent =
    `${finished} / ${total} geschafft`;
}

window.addEventListener("DOMContentLoaded", () => {
  updateFinishedCardsBar();
});

/* ---------------- Antwort prüfen ---------------- */

let right = false;
function compareAnswer(answer) {
  if (answer === "right") {
    right = true;
  } else if (answer === "wrong") {
    right = false;
  }

  checkLevel();
}

function checkLevel() {
  const name = localStorage.getItem("currentSetName");
  const set = learnsets.find(s => (s.name || "").trim() === (name || "").trim());

  const frage = reverse
    ? currentCard.antwort
    : currentCard.frage;

  if (set) {
    const card = set.qa.find(q => q.frage === frage);

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
  nextCard();
}

/* ---------------- CONFIDENCE ---------------- */

let level = 3; // Standardwert
document.querySelectorAll("[data-level]").forEach(btn => {
  btn.onclick = () => {
    level = Number(btn.dataset.level);

    const antwort = reverse
    ? currentCard.frage
    : currentCard.antwort;

    document.getElementById("confidenceBox").style.display = "none";
    document.getElementById("userAnswers").style.display = "block";

    const evalBox = document.getElementById("evaluation");
    evalBox.style.display = "block";
    evalBox.textContent = "Antort: " + antwort;
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
    const userAnswers = document.getElementById("userAnswerBox");
    const answerBtn1 = document.getElementById("userAnswerButton1");
    const answerBtn2 = document.getElementById("userAnswerButton2");
    const box = document.getElementById("confidenceBox");
    const evalBox = document.getElementById("evaluation");

    question.textContent = "Alle Karten geschafft 🎉";
    box.style.display = "none";
    evalBox.style.display = "none";

    userAnswers.style.gridTemplateColumns = "1fr"; // auf eine Spalte ändern
    answerBtn1.style.display = "none";
    answerBtn2.textContent = "Zurück zur Übersicht";

    answerBtn2.onclick = () => {
      set.qa.forEach(card => {
        card.sicherheit = 3;
      });

      localStorage.setItem("learnsets", JSON.stringify(learnsets));

      window.location.href = "../learn.html";
    };

    return;
  }

  const lastCard = currentCard;
  currentCard = getWeightedCard(set.qa);
  if (cards.length > 1 && lastCard === currentCard) {
    return nextCard();
  }

  
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