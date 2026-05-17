let dailyCards = JSON.parse(localStorage.getItem("dailyCardsAll")) ?? 0;
let rightCards = JSON.parse(localStorage.getItem("rightCardsAll")) ?? 0;

const KEY_HISTORY = "dailyCards_history";
const KEY_DATE = "dailyCards_date";

let history = JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];

const today = new Date().toDateString();
let storedDate = localStorage.getItem(KEY_DATE);

/* ---------------- DAY RESET ---------------- */

if (!storedDate) {
  localStorage.setItem(KEY_DATE, today);
  storedDate = today;
}

if (storedDate !== today) {

  const average =
    dailyCards > 0
      ? Math.round((rightCards / dailyCards) * 100)
      : 0;

  history.push({
    date: storedDate,
    value: {
      dailyCards,
      rightCards,
      average
    }
  });

  // Optional: nur letzte 30 Tage behalten
  if (history.length > 30) {
    history.shift();
  }

  dailyCards = 0;
  rightCards = 0;

  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  localStorage.setItem(KEY_DATE, today);

  save();
}

/* ---------------- SAVE ---------------- */

function save() {
  localStorage.setItem(
    "dailyCardsAll",
    JSON.stringify(dailyCards)
  );

  localStorage.setItem(
    "rightCardsAll",
    JSON.stringify(rightCards)
  );
}

/* ---------------- ANSWERS ---------------- */

function rightAnswerAll() {
  rightCards++;
  dailyCards++;
  save();
}

function wrongAnswerAll() {
  dailyCards++;
  save();
}

/* ---------------- AVERAGE ---------------- */

function getAverageCards() {
  return dailyCards > 0
    ? Math.round((rightCards / dailyCards) * 100)
    : 0;
}

/* ---------------- EXPORT ---------------- */

export {
  rightAnswerAll,
  wrongAnswerAll,
  getAverageCards
};

window.rightAnswerAll = rightAnswerAll;
window.wrongAnswerAll = wrongAnswerAll;
window.getAverageCards = getAverageCards;