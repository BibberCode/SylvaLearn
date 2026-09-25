/* =========================
   SYLVALEARN – STATS STORE (Basis)
   Zentrale Lese-Schicht für die Statistik-Seite.

   Nutzt ausschließlich bereits vorhandene Keys:
   - dailyCardsAll / rightCardsAll (+ dailyCards_date)
   - dailyCards_history: [{ date, value: { dailyCards, rightCards, average } }]
   - learnsets[].allCardsAverage / rightCardsAverage / qa[].sicherheit
   - dailyMinutes / totalMinutes / maxMinutes
   - streak
   Schreibt NIE – nur avarageCardsAll.js / countingTime.js schreiben.
   ========================= */

(function () {
  "use strict";

  function safeJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === "") return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function safeNumber(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === "") return fallback;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
      } catch {
        /* kein JSON – weiter */
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }

  /* ---------- DAY ROLLOVER (auch ohne Lernseite, z.B. direkt auf Stats) ---------- */

  function ensureDayRollover() {
    try {
      const today = new Date().toDateString();
      let stored = null;
      try {
        stored = localStorage.getItem("dailyCards_date");
      } catch {
        stored = null;
      }
      if (!stored) {
        try {
          localStorage.setItem("dailyCards_date", today);
        } catch {}
        return;
      }
      if (stored !== today) {
        const daily = safeNumber("dailyCardsAll", 0);
        const right = safeNumber("rightCardsAll", 0);
        if (daily > 0) {
          let history = [];
          try {
            const raw = localStorage.getItem("dailyCards_history");
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) history = parsed;
          } catch {
            history = [];
          }
          history.push({
            date: stored,
            value: {
              dailyCards: daily,
              rightCards: right,
              average: Math.round((right / daily) * 100),
            },
          });
          if (history.length > 30) history.splice(0, history.length - 30);
          try {
            localStorage.setItem("dailyCards_history", JSON.stringify(history));
          } catch {}
        }
        try {
          localStorage.setItem("dailyCardsAll", JSON.stringify(0));
          localStorage.setItem("rightCardsAll", JSON.stringify(0));
          localStorage.setItem("dailyCards_date", today);
        } catch {}
      }
    } catch {}
  }

  ensureDayRollover();

  function getLearnsets() {
    const sets = safeJSON("learnsets", []);
    return Array.isArray(sets) ? sets : [];
  }

  /* ---------- HEUTE (live Zähler) ---------- */

  function getTodayCards() {
    const total = safeNumber("dailyCardsAll", 0);
    const right = safeNumber("rightCardsAll", 0);
    const quote = total > 0 ? Math.round((right / total) * 100) : 0;
    return { total, right, quote };
  }

  /* ---------- HISTORY (Tagesabschlüsse) ---------- */

  function getHistory() {
    const raw = safeJSON("dailyCards_history", []);
    if (!Array.isArray(raw)) return [];
    // Normalisieren – alte Einträge können leicht abweichen
    return raw
      .map((entry) => {
        const v = entry && entry.value ? entry.value : {};
        return {
          date: entry ? entry.date : "",
          dailyCards: Number(v.dailyCards) || 0,
          rightCards: Number(v.rightCards) || 0,
          average: Number(v.average) || 0,
        };
      })
      .filter((e) => e.date);
  }

  function sumHistory(entries) {
    return entries.reduce(
      (acc, e) => {
        acc.daily += e.dailyCards;
        acc.right += e.rightCards;
        return acc;
      },
      { daily: 0, right: 0 }
    );
  }

  /* ---------- WOCHENAKTIVITÄT (Mo–So der aktuellen Woche) ----------
     Quelle: history + heutiger Live-Zähler.
     History-Dates sind toDateString() (z.B. "Fri Sep 25 2026"),
     deshalb Matching über Date-Objekte statt String-Vergleich. */

  function startOfWeekMonday(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // Mo=0 … So=6
    d.setDate(d.getDate() - day);
    return d;
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getWeekActivity(now) {
    const today = now || new Date();
    const monday = startOfWeekMonday(today);
    const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const history = getHistory();
    const live = getTodayCards();

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const isToday = sameDay(date, today);

      let value = 0;
      if (isToday) {
        value = live.total;
      } else {
        const hit = history.find((h) => {
          const hd = new Date(h.date);
          return !isNaN(hd) && sameDay(hd, date);
        });
        value = hit ? hit.dailyCards : 0;
      }

      days.push({
        label: labels[i],
        value,
        isToday,
        date,
      });
    }

    const max = Math.max(1, ...days.map((d) => d.value));
    return { days, max };
  }

  /* ---------- PRO LERNSET (Fächer) ---------- */

  function getSetsStats() {
    return getLearnsets().map((set) => {
      const all = Number(set.allCardsAverage) || 0;
      const right = Number(set.rightCardsAverage) || 0;
      const quote = all > 0 ? Math.round((right / all) * 100) : 0;
      const qa = Array.isArray(set.qa) ? set.qa : [];
      const finished = qa.filter((c) => (c.sicherheit ?? 3) === 1).length;
      return {
        name: set.name || "Unbenannt",
        emoji: set.emoji || "📚",
        description: set.description || "",
        cardCount: qa.length,
        finished,
        learned: all,
        right,
        quote,
      };
    });
  }

  /* ---------- ZEIT & STREAK ---------- */

  function getTime() {
    return {
      daily: safeNumber("dailyMinutes", 0),
      total: safeNumber("totalMinutes", 0),
      max: safeNumber("maxMinutes", 60) || 60,
    };
  }

  function getStreak() {
    return safeNumber("streak", 0);
  }

  /* ---------- OVERVIEW / ACTIVITY ---------- */

  function getOverview() {
    const today = getTodayCards();
    const history = getHistory();
    const sum = sumHistory(history);
    const allTime = sum.daily + today.total;
    const allRight = sum.right + today.right;
    const time = getTime();
    return {
      today,
      allTimeCards: allTime,
      allTimeQuote: allTime > 0 ? Math.round((allRight / allTime) * 100) : 0,
      time,
      streak: getStreak(),
      setCount: getLearnsets().length,
    };
  }

  function getActivity() {
    const today = getTodayCards();
    const history = getHistory();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const yesterdayEntry = history.find((h) => {
      const hd = new Date(h.date);
      return !isNaN(hd) && sameDay(hd, yesterdayDate);
    });

    const week = getWeekActivity();
    const weekSum = week.days.reduce((s, d) => s + d.value, 0);

    return {
      today: today.total,
      yesterday: yesterdayEntry ? yesterdayEntry.dailyCards : 0,
      week: weekSum,
    };
  }

  /* ---------- FORMAT ---------- */

  function formatMinutes(min) {
    const m = Math.floor(Number(min) || 0);
    if (m < 60) return m + " min";
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest > 0 ? h + "h " + rest + "m" : h + "h";
  }

  /* ---------- EXPORT ---------- */

  window.SylvaStats = {
    getTodayCards,
    getHistory,
    getWeekActivity,
    getSetsStats,
    getTime,
    getStreak,
    getOverview,
    getActivity,
    formatMinutes,
    ensureDayRollover,
  };
})();
