/* =========================
   SYLVALEARN – IMPORT/EXPORT: JSON-BACKUP
   Vollständiges Backup <-> JSON. Verwendet die
   tatsächlichen vorhandenen Datenstrukturen –
   keine erfundenen Felder.

   Enthaltene localStorage-Keys:
   - learnsets (+ currentSetName, reverse)
   - Einstellungen: name, maxMinutes, sylva-theme,
     loadingScreen, avatar
     (Avatar ist ein Data-URL-Bild und kann groß
     sein – es gehört trotzdem zum Backup, damit
     eine Wiederherstellung vollständig ist.)
   - Lernzeit/Streak: date, dailyMinutes,
     totalMinutes, streak, dateStreak
   - Statistik: dailyCardsAll, rightCardsAll,
     dailyCards_date, dailyCards_history,
     dailyCardsAlone, rightCardsAlone (Alt-Key,
     wird nur gelesen/fortgeschrieben)

   Absichtlich NICHT enthalten: Session-Daten
   (sessionStorage) und Service-Worker-Cache.

   Plain script (kein Modul): window.SylvaBackupJson
   ========================= */

(function (global) {
  "use strict";

  function mig() {
    return global.SylvaMigrations;
  }

  var SETTING_KEYS = ["name", "maxMinutes", "sylva-theme", "loadingScreen", "avatar"];
  var AVATAR_KEY = "avatar";
  // ~1,9 MB Binärdaten als Data-URL. Größere Alt-Bilder werden trotzdem
  // exportiert (kein stiller Datenverlust), aber beim Import gewarnt.
  var AVATAR_WARN_LENGTH = 2500000;
  var PROGRESS_KEYS = ["currentSetName", "reverse", "date", "dailyMinutes", "totalMinutes", "streak", "dateStreak"];
  var STAT_KEYS = [
    "dailyCardsAll",
    "rightCardsAll",
    "dailyCards_date",
    "dailyCards_history",
    "dailyCardsAlone",
    "rightCardsAlone",
  ];

  function readRaw(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function pick(keys) {
    var out = {};
    keys.forEach(function (key) {
      var v = readRaw(key);
      if (v !== null && v !== undefined) out[key] = v;
    });
    return out;
  }

  function getLearnsets() {
    try {
      var raw = global.localStorage.getItem("learnsets");
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("SylvaLearn: learnsets konnten nicht gelesen werden:", e);
      return [];
    }
  }

  function appVersion() {
    try {
      var meta = document.querySelector('meta[name="version"]');
      return (meta && meta.content) || null;
    } catch (e) {
      return null;
    }
  }

  function isValidAvatar(value) {
    return typeof value === "string" &&
      value.startsWith("data:image/") &&
      value.indexOf(";base64,") !== -1;
  }

  /* ---------- EXPORT ---------- */

  function createBackup() {
    var M = mig();
    // IDs sicherstellen, damit Duplikaterkennung stabil bleibt
    var sets = M.withEnsuredIds(getLearnsets()).sets;
    var settings = pick(SETTING_KEYS);
    // Profilbild gehört zum Backup: nur eindeutig kaputte Werte
    // (kein Bild, kein Data-URL-Format) werden aussortiert –
    // große, aber gültige Bilder bleiben erhalten.
    if (settings[AVATAR_KEY] !== undefined && !isValidAvatar(settings[AVATAR_KEY])) {
      try {
        console.warn("SylvaLearn: Profilbild im Backup ist beschädigt und wird übersprungen.");
      } catch (e) { /* Logging optional */ }
      delete settings[AVATAR_KEY];
    } else if (settings[AVATAR_KEY] !== undefined && settings[AVATAR_KEY].length > AVATAR_WARN_LENGTH) {
      try {
        console.warn("SylvaLearn: Profilbild ist sehr groß – das Backup kann mehrere MB umfassen.");
      } catch (e) { /* Logging optional */ }
    }
    var backup = {
      format: M.FORMAT_BACKUP,
      version: M.FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        learnsets: sets,
        settings: settings,
        progress: pick(PROGRESS_KEYS),
        statistics: pick(STAT_KEYS),
      },
    };
    var v = appVersion();
    if (v) backup.appVersion = v;
    return backup;
  }

  function stringifyBackup(backup) {
    return JSON.stringify(backup, null, 2) + "\n";
  }

  /* ---------- IMPORT ---------- */

  /* Parst JSON-Text. Gibt { backup } oder { error } zurück.
     error ist bereits eine verständliche Meldung. */
  function parseBackupText(text) {
    if (text === null || text === undefined || String(text).trim() === "") {
      return { error: "Die Datei ist leer." };
    }
    try {
      var parsed = JSON.parse(text);
      return { backup: parsed };
    } catch (e) {
      console.error("SylvaLearn: ungültiges Backup-JSON:", e);
      return { error: "Die Datei enthält kein gültiges JSON." };
    }
  }

  var api = {
    SETTING_KEYS: SETTING_KEYS,
    AVATAR_KEY: AVATAR_KEY,
    AVATAR_WARN_LENGTH: AVATAR_WARN_LENGTH,
    isValidAvatar: isValidAvatar,
    PROGRESS_KEYS: PROGRESS_KEYS,
    STAT_KEYS: STAT_KEYS,
    createBackup: createBackup,
    stringifyBackup: stringifyBackup,
    parseBackupText: parseBackupText,
  };

  global.SylvaBackupJson = api;
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
