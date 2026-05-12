let dailyCards = JSON.parse(localStorage.getItem("dailyCards")) ?? 0;
let rightCards = JSON.parse(localStorage.getItem("rightCards")) ?? 0;

const KEY_HISTORY = "dailyCards_history";
const KEY_DATE = "dailyCards_date";

let history = JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];

let storedDate = localStorage.getItem(KEY_DATE);
let today = new Date().toDateString();

if (!storedDate) {
  storedDate = today;
  localStorage.setItem(KEY_DATE, today);
}

if (storedDate !== today) {
  const avg = dailyCards > 0 ? (rightCards / dailyCards) * 100 : 0;

  history.push({
    date: storedDate,
    value: { dailyCards, rightCards, average: avg }
  });

  dailyCards = 0;
  rightCards = 0;

  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  localStorage.setItem(KEY_DATE, today);
  localStorage.setItem("dailyCards", JSON.stringify(0));
  localStorage.setItem("rightCards", JSON.stringify(0));
}

function save() {
  localStorage.setItem("dailyCards", JSON.stringify(dailyCards));
  localStorage.setItem("rightCards", JSON.stringify(rightCards));
}

function rightAnswer() {
  rightCards += 1;
  dailyCards += 1;
  save();
}

function wrongAnswer() {
  dailyCards += 1;
  save();
}

function getAverageCards() {
  return dailyCards > 0 ? (rightCards / dailyCards) * 100 : 0;
}

/* -------------------- HYBRID EXPORT -------------------- */

// Module usage
export { rightAnswer, wrongAnswer, getAverageCards };

// Non-module usage (global API)
window.rightAnswer = rightAnswer;
window.wrongAnswer = wrongAnswer;
window.getAverageCards = getAverageCards;