/* =========================
   SYLVALEARN – NAMENSFILTER (zentral)
   Eine Quelle für Profil-Name + Lernset-Namen.
   Blockt Systemnamen, Beleidigungen (DE/EN),
   NS-/Extremismus-Begriffe, Slurs und sexuelle
   Begriffe – inkl. Leet-/Sonderzeichen-Bypass.
   Plain script (kein Modul), lädt vor den
   Verbrauchern: window.SylvaNameFilter
   ========================= */

(function () {
  "use strict";

  /* ---------- EXAKT-MATCH (vollständiger Name) ---------- */

  const FORBIDDEN_EXACT = new Set([
    // System / reserviert
    "admin", "administrator", "root", "system", "moderator", "mod",
    "support", "help", "staff", "owner", "superuser", "supervisor",
    "user", "users", "guest", "test", "tester", "null", "undefined",
    "api", "login", "register", "signup", "dashboard", "settings",
    "home", "profile", "account", "config", "console", "bot", "botaccount",
    "anonymous", "unknown", "deleted", "removed", "fake", "official",
    "sylvalearn", "sylva", "developer", "dev",

    // Bestehende Einträge (Kompatibilität)
    "bibber",

    // Englisch – Beleidigungen
    "idiot", "stupid", "dumb", "dumbass", "loser", "trash", "garbage",
    "moron", "asshole", "bitch", "shit", "fuck", "fucker", "fucking",
    "crap", "dick", "dickhead", "prick", "jerk", "creep", "weirdo",
    "bastard", "whore", "slut", "pussy", "cunt", "wanker", "twat",
    "retard", "retarded", "downsyndrom",

    // Deutsch – Beleidigungen
    "dumm", "dummkopf", "dummschwaetzer", "verlierer", "versager",
    "arschloch", "arsch", "scheisse", "scheise", "mist", "mistkerl",
    "trottel", "depp", "volldepp", "vollidiot", "spinner", "spast",
    "spasti", "opfer", "hurensohn", "hure", "fotze", "wichser",
    "wichsen", "pisser", "pissen", "kacke", "kacken", "kotzen",
    "hundesohn", "missgeburt", "schlampe", "nutte", "fick", "ficken",
    "ficker", "homo", "schwuchtel",

    // Slurs (als Name verboten)
    "nigga", "nigger", "neger", "faggot", "fag", "kike", "chink",
    "gook", "spic", "coon", "tranny",

    // NS / Extremismus (exakt)
    "hitler", "adolfhitler", "adolf", "himmler", "goebbels",
    "goering", "goring", "hess", "mengele", "eichmann", "heydrich",
    "nazi", "neonazi", "nsdap", "gestapo", "ssmann",
    "hakenkreuz", "siegheil", "heilhitler", "hitlergruss",
    "holocaustleugner", "isis", "is", "taliban", "alqaida", "alqaeda",
    "hamas", "boko", "hakenkreuzler",

    // Sexuell / explizit
    "porn", "porno", "pornhub", "sex", "sexy", "hentai", "onlyfans",
    "escort", "bordell", "dildo", "vibrator",

    // Gewalt / Drohung
    "killer", "murder", "morder", "terrorist", "amok", "schoolshooter",
    "hitman",
  ]);

  /* ---------- SUBSTRING-MATCH (nur schwere Begriffe, min. 5 Zeichen) ----------
     Greift auch bei "HitlerFan123" oder "xx_hurensohn_xx".
     Kurze Wörter (mod, test, isis, hess …) stehen bewusst NICHT hier,
     sonst gäbe es False Positives ("Contest", "Crisis", "Chess"). */

  const FORBIDDEN_SUBSTRINGS = [
    "hitler", "himmler", "goebbels", "goering", "mengele",
    "eichmann", "heydrich", "neonazi", "gestapo", "hakenkreuz",
    "siegheil", "heilhitler", "holocaustleugner", "taliban",
    "alqaida", "alqaeda", "nigger", "faggot", "hurensohn",
    "hundesohn", "missgeburt", "pornhub", "onlyfans", "hentai",
    "schoolshooter",
  ];

  /* ---------- NORMALIZE + LEET ---------- */

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function cleanForCheck(str) {
    // WICHTIG: Leet-Ersetzung VOR dem Strippen – sonst wird "@" erst
    // gelöscht und "@dmin" würde als "dmin" durchgehen.
    let s = (str || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/@/g, "a")
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/!/g, "i")
      .replace(/2/g, "z")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/\$/g, "s")
      .replace(/7/g, "t")
      .replace(/\+/g, "t")
      .replace(/8/g, "b")
      .replace(/6/g, "g")
      .replace(/9/g, "g");
    return s.replace(/[^a-z0-9]/g, "");
  }

  function isForbiddenName(name) {
    const clean = cleanForCheck(name);
    if (!clean) return { forbidden: false, clean, reason: "" };
    if (FORBIDDEN_EXACT.has(clean)) {
      return { forbidden: true, clean, reason: "exact" };
    }
    for (const part of FORBIDDEN_SUBSTRINGS) {
      if (clean.includes(part)) {
        return { forbidden: true, clean, reason: "contains:" + part };
      }
    }
    return { forbidden: false, clean, reason: "" };
  }

  const PROFILE_FALLBACK = "Error404: NameNotFound";

  function sanitizeProfileName(name, fallback) {
    const raw = (name || "").trim().slice(0, 24);
    if (!raw) return { ok: false, value: fallback || "" };
    if (isForbiddenName(raw).forbidden) {
      return { ok: false, value: fallback || PROFILE_FALLBACK };
    }
    return { ok: true, value: raw };
  }

  /* Bereits gespeicherte Profilnamen nachträglich heilen.
     (Für Lernsets wird NICHT auto-umbenannt – keine stillen Datenverluste.) */
  function migrateStoredProfileName() {
    try {
      const stored = localStorage.getItem("name") || "";
      if (!stored) return stored;
      if (isForbiddenName(stored).forbidden) {
        localStorage.setItem("name", PROFILE_FALLBACK);
        return PROFILE_FALLBACK;
      }
      return stored;
    } catch {
      return "";
    }
  }

  window.SylvaNameFilter = {
    FORBIDDEN_EXACT,
    FORBIDDEN_SUBSTRINGS,
    normalize,
    cleanForCheck,
    isForbiddenName,
    sanitizeProfileName,
    migrateStoredProfileName,
    PROFILE_FALLBACK,
    MAX_PROFILE_LEN: 24,
    MAX_SET_LEN: 40,
  };
})();
