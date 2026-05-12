if (window.__avarageCardsLoaded) {
  console.warn("avarageCards already loaded");
} else {
  window.__avarageCardsLoaded = true;

  // ALL your code here:
  let dailyCards = JSON.parse(localStorage.getItem("dailyCards")) ?? 0;
  let rightCards = JSON.parse(localStorage.getItem("rightCards")) ?? 0;

  const KEY_HISTORY = "dailyCards_history";
  const KEY_DATE = "dailyCards_date";

  let history = JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];

  let storedDate = localStorage.getItem(KEY_DATE);
  let today = new Date().toDateString();

  if (!storedDate) {
    localStorage.setItem(KEY_DATE, today);
    storedDate = today;
  }

  if (storedDate !== today) {
    history.push({
      date: storedDate,
      value: { dailyCards, rightCards }
    });

    dailyCards = 0;
    rightCards = 0;

    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    localStorage.setItem(KEY_DATE, today);
    localStorage.setItem("dailyCards", "0");
    localStorage.setItem("rightCards", "0");
  }

  function save() {
    localStorage.setItem("dailyCards", JSON.stringify(dailyCards));
    localStorage.setItem("rightCards", JSON.stringify(rightCards));
  }

  window.rightAnswer = function () {
    rightCards += 1;
    dailyCards += 1;
    save();
  };

  window.wrongAnswer = function () {
    dailyCards += 1;
    save();
  };
}