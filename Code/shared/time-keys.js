export const TimeKeys = {
  DAILY_MINUTES: "dailyMinutes",
  TOTAL_MINUTES: "totalMinutes",
  MAX_MINUTES: "maxMinutes",
  DATE: "date",
  DAILY_CARDS_HISTORY: "dailyCards_history",
  DAILY_CARDS_DATE: "dailyCards_date",
  DAILY_CARDS_ALL: "dailyCardsAll",
  RIGHT_CARDS_ALL: "rightCardsAll",
  DAILY_CARDS_ALONE: "dailyCardsAlone",
  RIGHT_CARDS_ALONE: "rightCardsAlone"
};

export function getToday() {
  return new Date().toLocaleDateString("sv-SE");
}

export function ensureDay(keys = TimeKeys) {
  const today = getToday();
  const saved = localStorage.getItem(keys.DATE);

  if (saved !== today) {
    localStorage.setItem(keys.DATE, today);
    localStorage.setItem(keys.DAILY_MINUTES, "0");
  }
}

export function safeRead(key, fallback = 0) {
  try {
    return Number(localStorage.getItem(key) || fallback);
  } catch {
    return fallback;
  }
}

export function safeWrite(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    console.error("Fehler beim Schreiben in localStorage:", e);
    return false;
  }
}