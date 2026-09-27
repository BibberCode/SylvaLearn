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

/* Verkleinert das Profilbild auf max. 256px (längste Seite) und
   speichert es als JPEG – sonst sprengen Handy-Fotos das
   localStorage-Limit und blähen das JSON-Backup auf mehrere MB auf.
   Fällt bei Fehlern auf das Original zurück (Fail-open). */
function downscaleAvatar(dataUrl, cb, maxSize) {
  const done = (out) => { try { cb(out); } catch { /* kein Bild – egal */ } };
  try {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      done(dataUrl);
      return;
    }
    const size = maxSize || 256;
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, size / Math.max(image.width || 1, image.height || 1));
        // Bereits klein genug und kein PNG-Riese? Original behalten.
        if (scale >= 1 && dataUrl.length < 200 * 1024) {
          done(dataUrl);
          return;
        }
        const w = Math.max(1, Math.round((image.width || size) * scale));
        const h = Math.max(1, Math.round((image.height || size) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(image, 0, 0, w, h);
        done(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        done(dataUrl);
      }
    };
    image.onerror = () => done(dataUrl);
    image.src = dataUrl;
  } catch {
    done(dataUrl);
  }
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
    // Alt-Bilder (vor der Verkleinerung gespeichert) einmalig nachholen,
    // damit sie nicht localStorage und Backup sprengen.
    if (savedAvatar.length > 500 * 1024 && savedAvatar.startsWith("data:image/")) {
      downscaleAvatar(savedAvatar, (small) => {
        if (small && small.length < savedAvatar.length) {
          try {
            localStorage.setItem("avatar", small);
          } catch { /* Speicher voll – altes Bild bleibt */ }
        }
      });
    }
  }

  if (input) {
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        downscaleAvatar(reader.result, (dataUrl) => {
          if (img) img.src = dataUrl;
          try {
            localStorage.setItem("avatar", dataUrl);
          } catch {
            /* Speicher voll (z. B. riesiges Bild) – Bild bleibt
               für die Sitzung sichtbar, wird aber nicht persistiert. */
          }
        });
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

