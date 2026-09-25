/* =========================
   SYLVALEARN – GLOBALE TAGESZÄHLER (alle Sets)
   Fix: robust + dynamisch, gleiche API wie bisher.
   Keys: dailyCardsAll / rightCardsAll / dailyCards_date / dailyCards_history
   ========================= */

const KEY_ALL = "dailyCardsAll";
const KEY_RIGHT = "rightCardsAll";
const KEY_HISTORY = "dailyCards_history";
const KEY_DATE = "dailyCards_date";

/* ---------- SAFE READ ---------- */

function readNumber(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === "") return 0;
    // verträgt "5" und JSON-"5"
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    } catch {
      /* kein JSON – weiter mit Number() */
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function readHistory() {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ---------- DAY RESET ---------- */

function ensureDayRollover() {
  const today = new Date().toDateString();
  let storedDate = null;
  try {
    storedDate = localStorage.getItem(KEY_DATE);
  } catch {
    storedDate = null;
  }

  if (!storedDate) {
    try {
      localStorage.setItem(KEY_DATE, today);
    } catch {}
    return;
  }

  if (storedDate !== today) {
    const dailyCards = readNumber(KEY_ALL);
    const rightCards = readNumber(KEY_RIGHT);
    const history = readHistory();

    // Leere Tage nicht zumüllen – nur sichern wenn was gelernt wurde
    if (dailyCards > 0) {
      const average = Math.round((rightCards / dailyCards) * 100);
      history.push({
        date: storedDate,
        value: { dailyCards, rightCards, average },
      });
      if (history.length > 30) history.splice(0, history.length - 30);
      try {
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
      } catch {}
    }

    try {
      localStorage.setItem(KEY_ALL, JSON.stringify(0));
      localStorage.setItem(KEY_RIGHT, JSON.stringify(0));
      localStorage.setItem(KEY_DATE, today);
    } catch {}
  }
}

// beim Import (Lernseiten) sofort rollen
ensureDayRollover();

/* ---------- SAVE ---------- */

function save(all, right) {
  try {
    localStorage.setItem(KEY_ALL, JSON.stringify(all));
    localStorage.setItem(KEY_RIGHT, JSON.stringify(right));
  } catch {}
}

/* ---------- ANSWERS (frisch lesen statt Cache) ---------- */

function rightAnswerAll() {
  ensureDayRollover();
  const all = readNumber(KEY_ALL) + 1;
  const right = readNumber(KEY_RIGHT) + 1;
  save(all, right);
}

function wrongAnswerAll() {
  ensureDayRollover();
  const all = readNumber(KEY_ALL) + 1;
  const right = readNumber(KEY_RIGHT);
  save(all, right);
}

/* ---------- AVERAGE ---------- */

function getAverageCards() {
  ensureDayRollover();
  const all = readNumber(KEY_ALL);
  const right = readNumber(KEY_RIGHT);
  return all > 0 ? Math.round((right / all) * 100) : 0;
}

/* ---------------- EXPORT (API unverändert) ---------------- */

export { rightAnswerAll, wrongAnswerAll, getAverageCards, ensureDayRollover };

window.rightAnswerAll = rightAnswerAll;
window.wrongAnswerAll = wrongAnswerAll;
window.getAverageCards = getAverageCards;
window.ensureDayRolloverAll = ensureDayRollover;
