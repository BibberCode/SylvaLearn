function saveName() {
  const input = document.getElementById("nameInput");
  let name = input?.value || "";

  /* ---------------- BLOCKLIST ---------------- */

  const forbiddenNames = new Set([
    /* System / reserviert */
    "admin",
    "administrator",
    "root",
    "system",
    "moderator",
    "mod",
    "support",
    "help",
    "staff",
    "owner",
    "superuser",
    "user",
    "guest",
    "test",
    "null",
    "undefined",
    "api",
    "login",
    "register",
    "signup",
    "dashboard",
    "settings",
    "home",
    "profile",
    "account",
    "config",
    "console",

    /* Englisch toxisch */
    "idiot",
    "stupid",
    "dumb",
    "loser",
    "trash",
    "garbage",
    "moron",
    "asshole",
    "bitch",
    "shit",
    "fuck",
    "crap",

    /* Deutsch toxisch */
    "idiot",
    "dumm",
    "dummkopf",
    "verlierer",
    "versager",
    "arschloch",
    "scheisse",
    "scheiße",
    "mist",
    "trottel",
    "depp",
    "volldepp",
    "spinner",
    "opfer",

    /* Platzhalter für schwerere Inhalte */
    "hurensohn",
    "nigga",
    "bastard", 
    
    "bibber",
  ]);

  /* ---------------- NORMALIZE ---------------- */

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, ""); // alles raus
  }

  /* ---------------- ANTI BYPASS ---------------- */

  function cleanForCheck(str) {
    return normalize(str)
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/7/g, "t");
  }

  const cleanName = cleanForCheck(name);

  /* ---------------- CHECK ---------------- */

  if (forbiddenNames.has(cleanName)) {
    name = "Error404: NameNotFound";
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

  // NAME
  const savedName = localStorage.getItem("name");

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
  const dailyCards = localStorage.getItem("dailyCardsAll")
  const rightCards = localStorage.getItem("rightCardsAll")

  const avarage = Math.round((rightCards / dailyCards) * 100)
  document.getElementById("avarage").textContent = avarage + "%"
});


const sets = JSON.parse(localStorage.getItem("learnsets") || "[]");
const numberOfSets = sets.length;

const el = document.getElementById("numberOfSets");
if (el) el.textContent = numberOfSets;