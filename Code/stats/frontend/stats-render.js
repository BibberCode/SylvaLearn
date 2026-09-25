/* =========================
   SYLVALEARN – STATS RENDER (Basis)
   Rendert SylvaStats-Daten in die bestehende
   stats.html-Struktur (card / grid / small-card).
   ========================= */

(function () {
  "use strict";

  function el(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------- OVERVIEW ---------- */

  function renderOverview() {
    const S = window.SylvaStats;
    if (!S) return;
    const o = S.getOverview();

    const learnedEl = el("statLearned");
    const learnedSub = el("statLearnedSub");
    const quoteEl = el("statQuote");
    const quoteSub = el("statQuoteSub");
    const timeEl = el("statTime");
    const timeSub = el("statTimeSub");

    if (learnedEl) learnedEl.textContent = o.today.total;
    if (learnedSub)
      learnedSub.textContent =
        o.allTimeCards > 0
          ? o.allTimeCards + " insgesamt"
          : "Heute noch nichts gelernt";
    if (quoteEl) quoteEl.textContent = o.today.quote + "%";
    if (quoteSub)
      quoteSub.textContent =
        o.today.total > 0
          ? o.today.right + " von " + o.today.total + " richtig"
          : "Noch keine Antworten heute";
    if (timeEl) timeEl.textContent = S.formatMinutes(o.time.total);
    if (timeSub)
      timeSub.textContent =
        "Heute " + S.formatMinutes(o.time.daily) + " gelernt";
  }

  /* ---------- WOCHENAKTIVITÄT ---------- */

  function renderWeek() {
    const S = window.SylvaStats;
    const box = el("weekChart");
    if (!S || !box) return;

    const { days, max } = S.getWeekActivity();
    box.innerHTML = "";

    days.forEach((d) => {
      const pct = max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2) : 2;

      const col = document.createElement("div");
      col.className = "bar" + (d.isToday ? " today" : "");

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = pct + "%";
      fill.title = d.value + " Karten";
      track.appendChild(fill);

      const count = document.createElement("small");
      count.textContent = d.value;

      const label = document.createElement("span");
      label.textContent = d.label;

      col.append(track, count, label);
      box.appendChild(col);
    });
  }

  /* ---------- LERNSETS / FÄCHER ---------- */

  function renderSets() {
    const S = window.SylvaStats;
    const box = el("setsStats");
    if (!S || !box) return;

    const sets = S.getSetsStats();
    box.innerHTML = "";

    if (sets.length === 0) {
      box.innerHTML =
        '<div class="small-card"><p>Noch keine Lernsets – erstelle dein erstes Set.</p></div>';
      return;
    }

    sets.forEach((s) => {
      const card = document.createElement("div");
      card.className = "small-card";
      card.innerHTML =
        '<div class="set-row"><h4>' +
        esc(s.emoji) +
        " " +
        esc(s.name) +
        "</h4><p>" +
        s.learned +
        " gelernt</p></div>" +
        '<p class="small-text">' +
        s.cardCount +
        " Karten im Set" +
        (s.description ? " · " + esc(s.description) : "") +
        "</p>" +
        '<div class="progress-bar" style="margin-top:10px;"><div class="progress" style="width:' +
        s.quote +
        '%;"></div></div>' +
        '<p class="small-text">' +
        s.quote +
        "% richtig beantwortet</p>";
      box.appendChild(card);
    });
  }

  /* ---------- ACHIEVEMENTS (Basis-Regeln) ---------- */

  function renderAchievements() {
    const S = window.SylvaStats;
    const box = el("achievementGrid");
    if (!S || !box) return;

    const o = S.getOverview();
    const act = S.getActivity();

    const defs = [
      {
        icon: "🔥",
        title: o.streak >= 7 ? "7 Tage" : o.streak + " / 7 Tage",
        text: "Streak erreicht",
        reached: o.streak >= 7,
      },
      {
        icon: "🧠",
        title: o.allTimeCards >= 100 ? "100 Karten" : o.allTimeCards + " / 100",
        text: "Gelernt",
        reached: o.allTimeCards >= 100,
      },
      {
        icon: "⚡",
        title: act.today >= 20 ? "Schnell" : act.today + " / 20 heute",
        text: "20 Karten an einem Tag",
        reached: act.today >= 20,
      },
    ];

    box.innerHTML = "";
    defs.forEach((a) => {
      const card = document.createElement("div");
      card.className = "small-card achievement " + (a.reached ? "unlocked" : "locked");
      card.innerHTML =
        "<h4>" + esc(a.icon) + " " + esc(a.title) + "</h4><p>" + esc(a.text) + "</p>";
      box.appendChild(card);
    });
  }

  /* ---------- LETZTE AKTIVITÄT ---------- */

  function renderActivity() {
    const S = window.SylvaStats;
    if (!S) return;
    const a = S.getActivity();

    const t = el("activityToday");
    const y = el("activityYesterday");
    const w = el("activityWeek");
    if (t) t.textContent = a.today + " Karten gelernt";
    if (y) y.textContent = a.yesterday + " Karten gelernt";
    if (w) w.textContent = a.week + " Karten gelernt";
  }

  /* ---------- INIT ---------- */

  function renderAll() {
    if (window.SylvaStats && window.SylvaStats.ensureDayRollover) {
      try {
        window.SylvaStats.ensureDayRollover();
      } catch {}
    }
    renderOverview();
    renderWeek();
    renderSets();
    renderAchievements();
    renderActivity();
  }

  window.addEventListener("DOMContentLoaded", function () {
    renderAll();
    // Live-Tick (Lernzeit läuft weiter, Zähler aus anderem Tab kommen an)
    try {
      setInterval(renderAll, 1000);
    } catch {}
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") renderAll();
  });
  // Live-Update falls Zähler in anderem Tab steigen
  window.addEventListener("storage", function (e) {
    if (!e.key) return;
    if (
      e.key === "dailyCardsAll" ||
      e.key === "rightCardsAll" ||
      e.key === "dailyCards_history" ||
      e.key === "learnsets" ||
      e.key === "dailyMinutes" ||
      e.key === "totalMinutes" ||
      e.key === "streak"
    ) {
      renderAll();
    }
  });

  window.SylvaStatsRender = { renderAll };
})();
