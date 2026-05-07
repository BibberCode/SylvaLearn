/* =========================
   INIT / SAFE LOAD
========================= */

function getLearnsets() {
  try {
    return JSON.parse(localStorage.getItem("learnsets")) || [];
  } catch {
    return [];
  }
}

function saveLearnsets(data) {
  localStorage.setItem("learnsets", JSON.stringify(data));
}


/* =========================
   ROUTES
========================= */

const routes = {
  "self-compare": "./self-compare/learning_self-compare.html",
  "input-answer": "./input-answer/learning_input-answer.html"
};


/* =========================
   RENDER LEARNSETS
========================= */

function renderLearnsets() {
  const container = document.getElementById("learnsetList");

  if (!container) return;

  container.innerHTML = "";

  const learnsets = getLearnsets();

  // Keine Lernsets vorhanden
  if (learnsets.length === 0) {
    const card = document.createElement("div");
    card.className = "small-card";

    card.innerHTML = `
      <h4>📚 Keine Lernsets</h4>
      <p>Erstelle zuerst ein Lernset.</p>
    `;

    container.appendChild(card);
    return;
  }

  // Lernsets anzeigen
  learnsets.forEach(set => {
    const card = document.createElement("div");
    card.className = "small-card";

    const count = Array.isArray(set.qa) ? set.qa.length : 0;

    card.innerHTML = `
      <h4>${set.emoji || "📚"} ${set.name || "Unbenannt"}</h4>
      <p>${count} Karten</p>

      <p class="small-text" style="margin-top:8px;">
        ${set.description || ""}
      </p>
    `;

    card.onclick = () => {
      const route = routes[set.mode];

      if (!route) {
        console.warn("Unbekannter Modus:", set.mode);
        return;
      }

      localStorage.setItem("currentSetName", set.name);
      window.location.href = route;
    };

    container.appendChild(card);
  });
}


/* =========================
   LOAD SET
========================= */

function loadSet(name) {
  const learnsets = getLearnsets();

  const set = learnsets.find(s => s.name === name);

  if (!set) {
    console.warn("Lernset nicht gefunden:", name);
    return null;
  }

  console.log("Loaded set:", set);

  return set;
}


/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
  renderLearnsets();
});