let running = false;
let lastUpdate = null;
let interval = null;

const KEY_DATE = "date";
const KEY_DAILY = "dailyMinutes";
const KEY_TOTAL = "totalMinutes";

function getToday() {
  return new Date().toLocaleDateString("sv-SE");
}

/* sauberer Reset nur 1x pro Tag */
function ensureDay() {
  const today = getToday();
  const saved = localStorage.getItem(KEY_DATE);

  if (saved !== today) {
    localStorage.setItem(KEY_DATE, today);
    localStorage.setItem(KEY_DAILY, "0");
  }
}

/* sichere Number-Read Funktion */
function read(key) {
  return Number(localStorage.getItem(key) || 0);
}

function write(key, value) {
  localStorage.setItem(key, String(value));
}

/* Tick basiert nur auf echter Zeitdifferenz */
function tick() {
  ensureDay();

  const now = Date.now();

  if (lastUpdate === null) {
    lastUpdate = now;
    return;
  }

  const diffMinutes = (now - lastUpdate) / 60000;
  lastUpdate = now;

  if (diffMinutes <= 0) return;

  const daily = read(KEY_DAILY) + diffMinutes;
  const total = read(KEY_TOTAL) + diffMinutes;

  write(KEY_DAILY, daily);
  write(KEY_TOTAL, total);
}

/* Start/Stop stabilisiert */
function start() {
  if (running) return;

  running = true;
  lastUpdate = Date.now();
  ensureDay();

  interval = setInterval(tick, 1000);
}

function stop() {
  if (!running) return;

  running = false;
  clearInterval(interval);
  interval = null;
  lastUpdate = null;
}

/* nur laufen wenn sichtbar */
function shouldRun() {
  return document.visibilityState === "visible";
}

function updateState() {
  if (shouldRun()) start();
  else stop();
}

/* INIT */
ensureDay();
updateState();

document.addEventListener("visibilitychange", updateState);
window.addEventListener("focus", updateState);
window.addEventListener("blur", updateState);