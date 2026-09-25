/* =========================
   SYLVALEARN – PRO-SET ZÄHLER (einzelnes Lernset)
   Fix: Set-Name dynamisch + trim-Match, gleiche API wie bisher.
   Felder: learnsets[].allCardsAverage / rightCardsAverage
   ========================= */

function getLearnsets() {
  try {
    return JSON.parse(localStorage.getItem("learnsets")) || [];
  } catch {
    return [];
  }
}

function getCurrentSetName() {
  try {
    return (localStorage.getItem("currentSetName") || "").trim();
  } catch {
    return "";
  }
}

function findSet(learnsets, name) {
  const wanted = (name || "").trim();
  return learnsets.find((s) => (s.name || "").trim() === wanted);
}

/* SAVE – liest frisch, damit mehrere Module nicht mit Cache kollidieren */
function save(nextAll, nextRight) {
  const name = getCurrentSetName();
  if (!name) return;
  const learnsets = getLearnsets();
  const set = findSet(learnsets, name);
  if (!set) return;
  set.allCardsAverage = nextAll;
  set.rightCardsAverage = nextRight;
  try {
    localStorage.setItem("learnsets", JSON.stringify(learnsets));
  } catch {}
}

function readCounters() {
  const name = getCurrentSetName();
  if (!name) return { all: 0, right: 0 };
  const set = findSet(getLearnsets(), name);
  if (!set) return { all: 0, right: 0 };
  return {
    all: Number(set.allCardsAverage) || 0,
    right: Number(set.rightCardsAverage) || 0,
  };
}

/* ANSWERS */

function rightAnswerAlone() {
  const { all, right } = readCounters();
  save(all + 1, right + 1);
}

function wrongAnswerAlone() {
  const { all, right } = readCounters();
  save(all + 1, right);
}

/* MIGRATION – stellt sicher dass alle Sets die Felder haben */

function ensureFields() {
  let learnsets = getLearnsets();
  let changed = false;
  for (const set of learnsets) {
    if (typeof set.allCardsAverage !== "number") {
      set.allCardsAverage = Number(set.allCardsAverage) || 0;
      changed = true;
    }
    if (typeof set.rightCardsAverage !== "number") {
      set.rightCardsAverage = Number(set.rightCardsAverage) || 0;
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem("learnsets", JSON.stringify(learnsets));
    } catch {}
  }
}

/* EXPORT (API unverändert) */
export { rightAnswerAlone, wrongAnswerAlone };

window.rightAnswerAlone = rightAnswerAlone;
window.wrongAnswerAlone = wrongAnswerAlone;

/* INIT */
window.addEventListener("DOMContentLoaded", ensureFields);
