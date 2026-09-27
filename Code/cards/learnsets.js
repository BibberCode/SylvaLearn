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

/* Stabile ID für Duplikaterkennung (Import/Export).
   Alt-Sets ohne ID werden beim Öffnen der
   Profilseite nachgerüstet (siehe
   Code/data/import-export/migrations.js). */
function generateLearnsetId() {
  try {
    if (crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return (
    "sylva-" +
    Date.now().toString(36) +
    "-" +
    Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, "0")
  );
}


/* =========================
   ADD LEARNSET
========================= */

function addLearnset() {
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("description");

  const title = titleEl.value.trim().slice(0, 40);
  let description = descEl.value;

  if (!title) {
    alert("Bitte gib einen Namen ein!")
    return;
  }

  /* Verbotene Lernset-Namen (zentraler Filter) */
  try {
    if (window.SylvaNameFilter && window.SylvaNameFilter.isForbiddenName(title).forbidden) {
      alert("Dieser Lernset-Name ist nicht erlaubt.");
      return;
    }
  } catch {}

  if (!description) {
    description = "Keine Beschreibung vorhanden.";
  }

  let learnsets = getLearnsets();

  // Duplicate check (case-insensitive)
  if (
    learnsets.some(
      s => (s.name || "").trim().toLowerCase() === title.toLowerCase()
    )
  ) {
    alert("Ein Lernset mit diesem Namen existiert bereits.");
    return;
  }

  learnsets.push(
  {
    id: generateLearnsetId(),
    name: title,
    emoji: "📘",
    description,
    qa: [{ sicherheit: 3 }],
    mode: "self-compare",
    allCardsAverage: 0,
    rightCardsAverage: 0,
  }
  );

  saveLearnsets(learnsets);

  localStorage.setItem("currentSetName", title);

  // Input reset
  titleEl.value = "";
  descEl.value = "";

  window.location.href = "./editor.html";
}


/* =========================
   RENDER LEARNSETS
========================= */

function renderLearnsets() {
  const container = document.getElementById("learnsetList");
  if (!container) return;

  container.innerHTML = "";

  const learnsets = getLearnsets();

  if (learnsets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "small-card";
    empty.textContent = "Keine Lernsets gefunden.";
    container.appendChild(empty);
    return;
  }

  learnsets.forEach(set => {
    const card = document.createElement("div");
    card.className = "small-card";

    const title = document.createElement("h4");
    title.textContent = `${set.emoji || "📘"} ${set.name}`;

    const count = document.createElement("p");
    count.textContent = `${set.qa ? set.qa.length : 0} Karten`;

    const desc = document.createElement("p");
    desc.className = "small-text";
    desc.style.marginTop = "8px";
    desc.textContent = set.description || "";

    card.append(title, count, desc);

    const actions = document.createElement("div");
    actions.className = "sylva-card-actions";

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "sylva-export-btn";
    exportBtn.textContent = "📤 Exportieren";
    exportBtn.setAttribute("aria-label", "Lernset " + set.name + " als Markdown exportieren");

    exportBtn.onclick = (e) => {
      e.stopPropagation();
      exportSingleLearnset(set.name);
    };

    actions.appendChild(exportBtn);
    card.appendChild(actions);

    card.onclick = () => {
      localStorage.setItem("currentSetName", set.name);
      window.location.href = "./editor.html";
    };

    container.appendChild(card);
  });
}


/* =========================
   EXPORT (einzelnes Lernset als Markdown)
   Nutzt Code/data/import-export/exporter.js –
   ohne eigene Datenhaltung.
======================== */

function exportSingleLearnset(name) {
  try {
    if (!window.SylvaExporter) return;

    const res = window.SylvaExporter.exportLearnsets([name]);

    if (!res.ok) {
      alert(res.error || "Export fehlgeschlagen.");
    }
  } catch (e) {
    console.error("SylvaLearn: Export fehlgeschlagen:", e);
    alert("Export fehlgeschlagen.");
  }
}


/* =========================
   LOAD SET (SAFE HOOK)
========================= */

function loadSet(name) {
  const learnsets = getLearnsets();
  const set = learnsets.find(s => s.name === name);

  if (!set) return;

  console.log("Loaded set:", set);
}


/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
  renderLearnsets();
});