let running = false;
let lastUpdate = 0;
let interval = null;

function getToday() {
  return new Date().toLocaleDateString("sv-SE");
}

function checkNewDay() {
  const today = getToday();
  const savedDate = localStorage.getItem("date");

  if (savedDate !== today) {
    localStorage.setItem("date", today);
    localStorage.setItem("dailyMinutes", "0");
  }
}

function tick() {
  checkNewDay();

  const now = Date.now();
  const delta = (now - lastUpdate) / 1000 / 60;
  lastUpdate = now;

  let daily = Number(localStorage.getItem("dailyMinutes") || 0);
  let total = Number(localStorage.getItem("totalMinutes") || 0);

  daily += delta;
  total += delta;

  localStorage.setItem("dailyMinutes", daily.toFixed(4));
  localStorage.setItem("totalMinutes", total.toFixed(4));
}

function start() {
  if (running) return;

  running = true;
  lastUpdate = Date.now();

  checkNewDay();

  interval = setInterval(tick, 1000);
}

function stop() {
  if (!running) return;

  running = false;

  clearInterval(interval);
  interval = null;
}

function shouldRun() {
  return !document.hidden;
}

function updateState() {
  if (shouldRun()) start();
  else stop();
}

/* INIT */
checkNewDay();
updateState();

document.addEventListener("visibilitychange", updateState);
window.addEventListener("focus", updateState);
window.addEventListener("blur", updateState);