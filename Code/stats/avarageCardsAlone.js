const currentSetName =
  localStorage.getItem("currentSetName") || "";

let allCards = 0;
let rightCards = 0;

function getLearnsets() {
  return JSON.parse(localStorage.getItem("learnsets")) || [];
}

function getSet() {
  const learnsets = getLearnsets();

  return learnsets.find(
    s => s.name === currentSetName
  );
}

/* INIT */
function init() {
  const set = getSet();

  if (!set) return;

  allCards = set.allCardsAverage ?? 0;
  rightCards = set.rightCardsAverage ?? 0;
}

/* SAVE */
function save() {
  const learnsets = getLearnsets();

  const set = learnsets.find(
    s => s.name === currentSetName
  );

  if (!set) return;

  set.allCardsAverage = allCards;
  set.rightCardsAverage = rightCards;

  localStorage.setItem(
    "learnsets",
    JSON.stringify(learnsets)
  );
}

/* ANSWERS */
function rightAnswerAlone() {
  allCards++;
  rightCards++;
  save();
}

function wrongAnswerAlone() {
  allCards++;
  save();
}

/* EXPORT */
export { rightAnswerAlone, wrongAnswerAlone };

window.rightAnswerAlone = rightAnswerAlone;
window.wrongAnswerAlone = wrongAnswerAlone;

/* INIT */
window.addEventListener("DOMContentLoaded", init);

window.addEventListener("storage", (e) => {
  console.log("STORAGE CHANGE:", e.key, e.newValue);
});