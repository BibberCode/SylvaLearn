let running = false;
let lastUpdate = null;
let interval = null;

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

/* sichere Reads */
function read(key) {
  return Number(localStorage.getItem(key) || 0);
}

function write(key, value) {
  localStorage.setItem(key, String(value));
}

/* Zeitberechnung über echte Differenz */
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

  write(KEY_DAILY, read(KEY_DAILY) + diffMinutes);
  write(KEY_TOTAL, read(KEY_TOTAL) + diffMinutes);
}

/* Start */
function start() {
  if (running) return;

  running = true;
  lastUpdate = Date.now();
  ensureDay();

  interval = setInterval(() => {
    if (running) tick();
  }, 1000);
}

/* Stop (ohne Reset von lastUpdate) */
function stop() {
  if (!running) return;

  running = false;
  clearInterval(interval);
  interval = null;
}

/* Visibility steuert Zustand */
function updateState() {
  if (document.visibilityState === "visible") {
    start();
  } else {
    stop();
  }
}

/* INIT */
ensureDay();
updateState();

document.addEventListener("visibilitychange", updateState);