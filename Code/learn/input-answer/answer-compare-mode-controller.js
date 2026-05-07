let currentModule = null;
let currentMode = localStorage.getItem("mode") || "smart";

/* ---------------- MODE SWITCH ---------------- */

export async function setMode(mode) {
  currentMode = mode;
  localStorage.setItem("mode", mode);

  if (mode === "strict") {
    currentModule = await import("./learning_input-answer_strict-answer-compare.js");
  }

  if (mode === "smart") {
    currentModule = await import("./learning_input-answer_smart-answer-compare.js");
  }

  currentModule.init?.();
  applyActive();
}

window.setMode = setMode;

/* ---------------- UI INIT ---------------- */

function initModeSwitch() {
  const buttons = document.querySelectorAll(".mode");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      setMode(btn.dataset.mode);
    });
  });

  applyActive();
}

/* ---------------- UI UPDATE ---------------- */

function applyActive() {
  const buttons = document.querySelectorAll(".mode");

  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === currentMode);
  });
}

/* ---------------- START ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  initModeSwitch();
  setMode(currentMode); // wichtig: UI + Module sync
});