function getLearnsets() {
  return JSON.parse(localStorage.getItem("learnsets")) || [];
}

function getAveragePercent() {
  const dailyCards =
    Number(localStorage.getItem("dailyCardsAlone")) || 0;

  const rightCards =
    Number(localStorage.getItem("rightCardsAlone")) || 0;

  if (dailyCards <= 0) return 0;

  return Math.round((rightCards / dailyCards) * 100);
}

function showEmptyMessage(container) {
  container.innerHTML = `
    <div class="small-card">
      <p>Keine Lernsets gefunden.</p>
    </div>
  `;
}

function createCard(set, extraContent = "") {
  const card = document.createElement("div");
  card.className = "small-card";

  const count = set.qa?.length || 0;

  card.innerHTML = `
    <h4>${set.emoji || "📚"} ${set.name}</h4>
    <p>${count} Karten</p>
    ${extraContent}
  `;

  return card;
}

/* ---------------- EDIT ---------------- */

function renderLearnsetsEdit() {
  const container = document.getElementById("learnsetListEdit");

  if (!container) return;

  container.innerHTML = "";

  const learnsets = getLearnsets();

  if (learnsets.length === 0) {
    showEmptyMessage(container);
    return;
  }

  const average = getAveragePercent();

  learnsets.forEach(set => {
    const card = createCard(
      set,
      `<p class="small-text" style="margin-top:8px;">
        ${average}%
      </p>`
    );

    card.onclick = () => {
      localStorage.setItem("currentSetName", set.name);
      window.location.href = "./Code/cards/editor.html";
    };

    container.appendChild(card);
  });
}

/* ---------------- LEARN ---------------- */

function renderLearnsetsLearn() {
  const container = document.getElementById("learnsetListLearn");

  if (!container) return;

  container.innerHTML = "";

  const learnsets = getLearnsets();

  if (learnsets.length === 0) {
    showEmptyMessage(container);
    return;
  }

  learnsets.forEach(set => {
    const card = createCard(
      set,
      `<p class="small-text" style="margin-top:8px;">
        ${set.description || ""}
      </p>`
    );

    card.onclick = () => {
      localStorage.setItem("currentSetName", set.name);

      switch (set.mode) {
        case "self-compare":
          window.location.href =
            "./Code/learn/self-compare/learning_self-compare.html";
          break;

        case "input-answer":
          window.location.href =
            "./Code/learn/input-answer/learning_input-answer.html";
          break;

        default:
          alert("Unbekannter Lernmodus");
      }
    };

    container.appendChild(card);
  });
}

/* ---------------- START ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  renderLearnsetsEdit();
  renderLearnsetsLearn();
});