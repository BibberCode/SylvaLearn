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
   ADD LEARNSET
========================= */

function addLearnset() {
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("description");

  const title = titleEl.value.trim();
  let description = descEl.value;

  if (!title) {
    alert("Bitte gib einen Namen ein!")
    return;
  }

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
    name: title,
    emoji: "📘",
    description,
    qa: [{ frage: "Beispiel Frage", antwort: "Beispiel Antwort", sicherheit: 3 }],
    mode: "self-compare",
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

    card.onclick = () => {
      localStorage.setItem("currentSetName", set.name);
      window.location.href = "./editor.html";
    };

    container.appendChild(card);
  });
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