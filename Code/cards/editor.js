// ===============================
// STATE (nur EINMAL global)
// ===============================
let learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

const currentSetName = (localStorage.getItem("currentSetName") || "").trim();

let allowToExit = false;

// ===============================
// INIT
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  if (!currentSetName) return;

  loadSet(currentSetName);
  initModeSwitch();
  initEmojiPicker();
});

// ===============================
// SET LADEN
// ===============================
function loadSet(name) {
  learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === name.trim()
  );

  if (!set) return;

  const container = document.getElementById("cardContainer");
  if (!container) return;

  container.innerHTML = "";
  set.qa = set.qa || [];

  set.qa.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <button onclick="deleteCard(this)" style="background:transparent;border:none;">🗑️</button>

      <h4>Frage</h4>
      <input class="frage" value="${item.frage || ""}">

      <h4 style="margin-top:20px;">Antwort</h4>
      <input class="antwort" value="${item.antwort || ""}">
    `;

    container.appendChild(card);
  });

  document.getElementById("currentSetName").textContent = set.name || "Unbenannt";
  document.getElementById("description").textContent = set.description || "Keine Beschreibung";
  document.getElementById("emoji").textContent = set.emoji || "📘";

  setupEnterNavigation();
}

// ===============================
// KARTE HINZUFÜGEN
// ===============================
function addCard() {
  const container = document.getElementById("cardContainer");

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <button onclick="deleteCard(this)" style="background:transparent;border:none;">🗑️</button>

    <h4>Frage</h4>
    <input class="frage" placeholder="Frage">

    <h4 style="margin-top:20px;">Antwort</h4>
    <input class="antwort" placeholder="Antwort">
  `;

  container.appendChild(card);

  setupEnterNavigation(); // 🔥 wichtig
}

// ===============================
// KARTE LÖSCHEN
// ===============================
function deleteCard(btn) {
  if (!confirm("Bist du sicher?")) return;
  btn.parentElement.remove();
}

// ===============================
// SPEICHERN
// ===============================
function saveAll() {
  const name = currentSetName;
  if (!name) return;

  let learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === name
  );

  if (!set) return;

  const frageInputs = document.querySelectorAll(".frage");
  const antwortInputs = document.querySelectorAll(".antwort");

  set.qa = [];

  for (let i = 0; i < frageInputs.length; i++) {
    const f = frageInputs[i].value.trim();
    const a = antwortInputs[i].value.trim();

    if (f && a) {
      set.qa.push({
        frage: f,
        antwort: a,
        sicherheit: 3
      });
    }
  }

  localStorage.setItem("learnsets", JSON.stringify(learnsets));

  allowToExit = true;

  saveName(); 
  saveDescription();
}

function switchPage(){
  window.location.href = "./cards.html"
}

// ===============================
// Event Input Changes
// ===============================

document.addEventListener("focusout", (e) => {
    if (e.target.matches("input")) {
      saveAll();
    }
});

// ===============================
// SET NAME / DESCRIPTION
// ===============================
function saveName() {
  const input = document.getElementById("setName");
  const newName = input?.value.trim();

  if (!newName) return;

  let learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === currentSetName
  );

  if (!set) return;

  set.name = newName;

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
  localStorage.setItem("currentSetName", newName);

  document.getElementById("currentSetName").textContent = newName;
}

function saveDescription() {
  const input = document.getElementById("setDescription");
  const newDescription = input?.value;

  if (!newDescription) return;

  let learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const set = learnsets.find(
    s => (s.name || "").trim() === currentSetName
  );

  if (!set) return;

  set.description = newDescription;

  localStorage.setItem("learnsets", JSON.stringify(learnsets));
  document.getElementById("description").textContent = newDescription;
}

// ===============================
// DELETE SET
// ===============================
function deleteSet() {
  if (!confirm("Bist du sicher?")) return;

  let learnsets = JSON.parse(localStorage.getItem("learnsets")) || [];

  const newList = learnsets.filter(
    s => (s.name || "").trim() !== currentSetName
  );

  localStorage.setItem("learnsets", JSON.stringify(newList));
  localStorage.removeItem("currentSetName");

  allowToExit = true;
  window.location.href = "./cards.html";
}

// ===============================
// EMOJI
// ===============================
const emojis = [
  "📚","🧠","💡","🎯","🚀","📊",
  "➗","🧪","⚛️","🔬","🧬",
  "📝","📖","🎨","⚡","🏆",
  "🧩","💻"
];

let picker;
let emojiBtn;

function initEmojiPicker() {
  picker = document.getElementById("emojiPicker");
  emojiBtn = document.getElementById("emoji");

  if (!picker || !emojiBtn) return;

  picker.innerHTML = "";

  emojis.forEach(e => {
    const btn = document.createElement("button");
    btn.textContent = e;

    btn.onclick = () => selectEmoji(e);

    picker.appendChild(btn);
  });

  loadEmoji();
}

function toggleEmojiPicker() {
  picker?.classList.toggle("hidden");
}

function selectEmoji(emoji) {
  const set = learnsets.find(
    s => (s.name || "").trim() === currentSetName
  );

  if (!set) return;

  set.emoji = emoji;

  localStorage.setItem("learnsets", JSON.stringify(learnsets));

  emojiBtn.textContent = emoji;
  picker.classList.add("hidden");
}

function loadEmoji() {
  const set = learnsets.find(
    s => (s.name || "").trim() === currentSetName
  );

  emojiBtn.textContent = set?.emoji || "📘";
}

// ===============================
// MODE SWITCH (FIXED)
// ===============================
function initModeSwitch() {
  const buttons = document.querySelectorAll(".mode");

  const set = learnsets.find(
    s => (s.name || "").trim() === currentSetName
  );

  let mode = set?.mode || "self-compare";

  function applyActiveMode() {
    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  }

  applyActiveMode();

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;

      applyActiveMode();

      const set = learnsets.find(
        s => (s.name || "").trim() === currentSetName
      );

      if (!set) return;

      set.mode = mode;

      localStorage.setItem("learnsets", JSON.stringify(learnsets));
    });
  });
}

// ===============================
// Enter Navigation
// ===============================
function setupEnterNavigation() {
  const container = document.getElementById("cardContainer");
  if (!container) return;

  // wichtig: alte Listener vermeiden (clean approach)
  container.querySelectorAll("input").forEach(input => {
    input.onkeydown = null;

    input.addEventListener("keydown", handleEnter);
  });
}

function handleEnter(e) {
  if (e.key !== "Enter") return;

  e.preventDefault();

  const container = document.getElementById("cardContainer");

  const allInputs = Array.from(container.querySelectorAll("input"));
  const index = allInputs.indexOf(e.target);

  const next = allInputs[index + 1];

  if (next) {
    next.focus();
    return;
  }

  addCard();

  setTimeout(() => {
    const inputs = container.querySelectorAll("input");
    inputs[inputs.length - 2]?.focus();
  }, 0);
}

// ===============================
// EXIT GUARD
// ===============================
window.addEventListener("beforeunload", (e) => {
  if (allowToExit) return;

  e.preventDefault();
  e.returnValue = "";
});