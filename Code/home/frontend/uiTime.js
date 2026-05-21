function renderTimerUI() {
  const bar = document.getElementById("bar");
  const timer = document.getElementById("timer");
  const totalTime = document.getElementById("totalTime");
  const maxMinutes = document.getElementById("maxMinutes");


  if (!bar) return; // verhindert Fehler wenn DOM noch nicht ready

  const daily = Number(localStorage.getItem("dailyMinutes") || 0);
  const total = Number(localStorage.getItem("totalMinutes") || 0);
  const max = Number(localStorage.getItem("maxMinutes")) || 60;

  const percent = max > 0
    ? Math.min((daily / max) * 100, 100)
    : 0;

  bar.style.width = percent + "%";

  if (timer) timer.textContent = Math.floor(daily) + " min";
  if (totalTime) totalTime.textContent = Math.floor(total) + " min";
  if (maxMinutes) maxMinutes.textContent = Math.floor(max) + " min";
}


const KEY_DATE = "date";
const KEY_DAILY = "dailyMinutes";
const KEY_TOTAL = "totalMinutes";

function getToday() {
  return new Date().toLocaleDateString("sv-SE");
}

/* Tages-Reset */
function ensureDay() {
  const today = getToday();
  const saved = localStorage.getItem(KEY_DATE);

  if (saved !== today) {
    localStorage.setItem(KEY_DATE, today);
    localStorage.setItem(KEY_DAILY, "0");
  }
}

document.addEventListener("DOMContentLoaded", ensureDay) 

/* AUTO UI LOOP */
setInterval(renderTimerUI, 200);