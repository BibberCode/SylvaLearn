import { rightAnswerAll, wrongAnswerAll } from "../../stats/avarageCardsAll.js";
import { rightAnswerAlone, wrongAnswerAlone } from "../../stats/avarageCardsAlone.js";

let currentCard = null;
let lastCard = null;

let allCards = 0;
let rightCards = 0;

let reverse = localStorage.getItem("reverse") === "true";
let level = 3;

/* ---------------- STORAGE HELPERS ---------------- */

function getLearnsets() {
  return JSON.parse(localStorage.getItem("learnsets")) || [];
}

function getSet() {
  const name = localStorage.getItem("currentSetName") || "";

  return getLearnsets().find(
    s => (s.name || "").trim() === name.trim()
  );
}

/* ---------------- INIT ---------------- */

function init() {
  const set = getSet();
  if (!set) return;

  allCards = set.allCardsAverage ?? 0;
  rightCards = set.rightCardsAverage ?? 0;

  updateFinishedCardsBar();
  nextCard();
}

window.addEventListener("DOMContentLoaded", () => {
  init();

  /* Reverse Button */
  const reverseBtn = document.getElementById("reverseBtn");

  reverseBtn.addEventListener("click", () => {
    reverse = !reverse;
    localStorage.setItem("reverse", reverse);

    reverseBtn.classList.toggle("active", reverse);
  });

  reverseBtn.classList.toggle("active", reverse);

  document.getElementById("userAnswerButton1").onclick = () => {
    compareAnswer("wrong");
  };

  document.getElementById("userAnswerButton2").onclick = () => {
    compareAnswer("right");
  };
});

/* ---------------- SAVE ---------------- */

function save() {
  const learnsets = getLearnsets();
  const set = getSet();

  if (!set) return;

  set.allCardsAverage = allCards;
  set.rightCardsAverage = rightCards;

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
}

/* ---------------- ANSWERS ---------------- */

function compareAnswer(answer) {
  if (answer === "right") {
    rightAnswerAll();
    rightAnswerAlone();
  } else {
    wrongAnswerAll();
    wrongAnswerAlone();
  }

  checkLevel();
}

/* ---------------- LEVEL CHECK ---------------- */

function checkLevel() {
  const learnsets = getLearnsets();
  const setName = localStorage.getItem("currentSetName") || "";

  const setIndex = learnsets.findIndex(
    s => (s.name || "").trim() === setName.trim()
  );

  if (setIndex === -1 || !currentCard) return;

  const set = learnsets[setIndex];

  const frage = reverse
    ? currentCard.antwort
    : currentCard.frage;

  const card = set.qa.find(q => q.frage === frage);

  if (card) {
    card.sicherheit = level ?? 3;

    localStorage.setItem(
      "learnsets",
      JSON.stringify(learnsets)
    );
  }

  updateFinishedCardsBar();
  nextCard();
}

/* ---------------- CONFIDENCE ---------------- */

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
    evalBox.textContent = "Antwort: " + antwort;
  };
});

/* ---------------- FINISHED BAR ---------------- */

function updateFinishedCardsBar() {
  const set = getSet();
  if (!set) return;

  const total = set.qa.length;
  const finished = set.qa.filter(
    c => (c.sicherheit ?? 3) === 1
  ).length;

  const percent = total ? (finished / total) * 100 : 0;

  document.getElementById("finishedCardsBar").style.width =
    percent + "%";

  document.getElementById("finishedCardsText").textContent =
    `${finished} / ${total} geschafft`;
}

/* ---------------- NEXT CARD ---------------- */

const learnsets = getLearnsets();

function nextCard() {
  const set = getSet();
  if (!set || !set.qa.length) return;

  const finished = set.qa.filter(
    c => (c.sicherheit ?? 3) === 1
  );

  if (finished.length === set.qa.length) {
    const question = document.getElementById("question");
    const input = document.getElementById("userAnswer");
    const confidence = document.getElementById("confidenceBox");
    const evaluation = document.getElementById("evaluation");
    const reverseBtn = document.getElementById("reverseBtn")
    const btn = document.getElementById("nextBtnButton");

    if (question) { question.textContent = "Alle Karten geschafft 🎉"; }

    if (input) input.style.display = "none";
    if (confidence) confidence.style.display = "none";
    if (evaluation) evaluation.style.display = "none";
    if (reverseBtn) reverseBtn.style.display = "none"

    if (btn) {
      btn.style.display = "block";

      btn.onclick = () => {

        learnsets.qa.forEach(card => {
          card.sicherheit = 3;
        });

        localStorage.setItem(
          "learnsets",
          JSON.stringify(learnsets)
        );

        window.location.href = "../learn.html";
      };
    }

    return;
  }

  currentCard = getWeightedCard(availableCards);

  const evalBox = document.getElementById("evaluation");
  evalBox.style.display = "none";

  showCard();
}

/* ---------------- WEIGHTED PICK ---------------- */

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