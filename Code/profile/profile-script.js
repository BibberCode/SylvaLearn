function saveName() {
  const input = document.getElementById("nameInput");
  let name = (input?.value || "").trim().slice(0, 24);

  if (!name) return;

  /* ---------------- ZENTRALER FILTER (shared/name-filter.js) ---------------- */

  try {
    if (window.SylvaNameFilter && window.SylvaNameFilter.isForbiddenName(name).forbidden) {
      name = window.SylvaNameFilter.PROFILE_FALLBACK;
    }
  } catch {
    /* Filter nicht geladen – ohne Block speichern (Fail-open) */
  }

  /* ---------------- OUTPUT ---------------- */

  const nameEl = document.getElementById("name");
  if (nameEl) nameEl.textContent = name;

  localStorage.setItem("name", name);
}

function setMaxMinutes() {
  const input = document.getElementById("maxMinutesInput");
  const maxMinutes = Number(input?.value) || 60;

  const maxMinutesEl = document.getElementById("maxMinutes");
  if (maxMinutesEl) maxMinutesEl.textContent = maxMinutes;

  localStorage.setItem("maxMinutes", maxMinutes);
}

window.addEventListener("DOMContentLoaded", () => {

  // NAME (inkl. Migration bereits gespeicherter verbotener Namen)
  let savedName = "";
  try {
    if (window.SylvaNameFilter) {
      savedName = window.SylvaNameFilter.migrateStoredProfileName() || "";
    } else {
      savedName = localStorage.getItem("name") || "";
    }
  } catch {
    savedName = "";
  }

  const nameEl = document.getElementById("name");
  const nameInput = document.getElementById("nameInput");

  if (savedName) {
    if (nameEl) nameEl.textContent = savedName;
    if (nameInput) nameInput.value = savedName;
  }

  // MAX MINUTES
  const savedMaxMinutes = localStorage.getItem("maxMinutes") || "60";

  const maxMinutesEl = document.getElementById("maxMinutes");
  const maxMinutesInput = document.getElementById("maxMinutesInput");

  if (savedMaxMinutes) {
    if (maxMinutesEl) maxMinutesEl.textContent = savedMaxMinutes;
    if (maxMinutesInput) maxMinutesInput.value = savedMaxMinutes;
  }

  // AVATAR
  const input = document.getElementById("fileInput");
  const img = document.getElementById("avatarImg");

  const savedAvatar = localStorage.getItem("avatar");
  if (savedAvatar && img) {
    img.src = savedAvatar;
  }

  if (input) {
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result;

        if (img) img.src = dataUrl;
        localStorage.setItem("avatar", dataUrl);
      };

      reader.readAsDataURL(file);
    });
  }

  // Avarage
  const dailyCards = Number(localStorage.getItem("dailyCardsAll")) || 0;
  const rightCards = Number(localStorage.getItem("rightCardsAll")) || 0;

  const avarage = Math.round((rightCards / dailyCards) * 100);

  const avarageEl = document.getElementById("avarage");

  if (avarageEl) {
    if (!isNaN(avarage) && dailyCards > 0) {
      avarageEl.textContent = avarage + "%";
    } else {
      avarageEl.textContent = "0%";
    }
  }

  // Anzahl Lernsets (sicher nach DOM-Ready)
  const sets = JSON.parse(localStorage.getItem("learnsets") || "[]");
  const numberOfSets = sets.length;
  const numberEl = document.getElementById("numberOfSets");
  if (numberEl) numberEl.textContent = numberOfSets;

});

