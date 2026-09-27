/* =========================
   SYLVALEARN – IMPORT/EXPORT: MIGRATIONEN & BASIS
   Zentrale Stelle für Format-Versionierung und
   Normalisierung. Hier (und nur hier) werden alte
   Exportformate auf die aktuelle interne Struktur
   migriert – keine verstreuten Versionschecks.

   Aktuell: FORMAT_VERSION = 1 für Markdown
   ("sylvalearn") und JSON-Backup ("sylvalearn-backup").

   Interne Lernset-Struktur (bestehend, unverändert):
   { id?, name, emoji, description, qa: [{ frage,
     antwort, sicherheit }], mode, allCardsAverage,
     rightCardsAverage }
   Die `id` wurde mit dem Import-/Export-System
   eingeführt (stabile ID für Duplikaterkennung,
   siehe ensureLearnsetIds). Ältere Sets ohne id
   werden non-destruktiv nachgerüstet; der Name
   (getrimmt, case-insensitive) bleibt Fallback-
   Identität für Alt-Daten.
   Plain script (kein Modul): window.SylvaMigrations
   ========================= */

(function (global) {
  "use strict";

  var FORMAT_MARKDOWN = "sylvalearn";
  var FORMAT_BACKUP = "sylvalearn-backup";
  var FORMAT_VERSION = 1;

  var SUPPORTED_VERSIONS = [1];

  var DEFAULT_EMOJI = "📘";
  var DEFAULT_MODE = "self-compare";
  var VALID_MODES = ["self-compare", "input-answer"];

  /* ---------- IDs ---------- */

  function generateId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function") {
        return global.crypto.randomUUID();
      }
    } catch (e) { /* Fallback unten */ }
    return (
      "sylva-" +
      Date.now().toString(36) +
      "-" +
      Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, "0")
    );
  }

  function isValidId(id) {
    return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
  }

  /* Rüstet fehlende/ungültige IDs nach. Gibt { sets, changed }
     zurück und mutiert die übergebenen Objekte NICHT. */
  function withEnsuredIds(sets) {
    var changed = false;
    var seen = {};
    var next = (Array.isArray(sets) ? sets : []).map(function (set) {
      var copy = Object.assign({}, set);
      if (!isValidId(copy.id) || seen[copy.id]) {
        copy.id = generateId();
        changed = true;
      }
      seen[copy.id] = true;
      return copy;
    });
    return { sets: next, changed: changed };
  }

  /* Backfill für bereits gespeicherte Sets. Schreibt nur,
     wenn mindestens ein Set keine (eindeutige) ID hat. */
  function ensureLearnsetIds() {
    var raw = null;
    try {
      raw = global.localStorage.getItem("learnsets");
    } catch (e) {
      return [];
    }
    var sets = [];
    try {
      sets = (raw ? JSON.parse(raw) : []) || [];
    } catch (e) {
      return [];
    }
    if (!Array.isArray(sets)) return [];
    var result = withEnsuredIds(sets);
    if (result.changed) {
      try {
        global.localStorage.setItem("learnsets", JSON.stringify(result.sets));
      } catch (e) {
        console.error("SylvaLearn: IDs konnten nicht gespeichert werden:", e);
      }
    }
    return result.sets;
  }

  /* ---------- NORMALISIERUNG (v1 -> intern) ---------- */

  function normalizeCard(card) {
    return {
      frage: String(card.frage != null ? card.frage : card.question != null ? card.question : ""),
      antwort: String(card.antwort != null ? card.antwort : card.answer != null ? card.answer : ""),
      sicherheit: 3,
    };
  }

  /* Baut aus validierten Rohdaten ein internes Lernset.
     Füllt Defaults auf (emoji, mode, Zähler, id),
     fasst overlange Namen auf 40 Zeichen (wie learnsets.js). */
  function toInternalLearnset(raw) {
    var qa = (Array.isArray(raw.cards) ? raw.cards : []).map(normalizeCard);
    return {
      id: isValidId(raw.id) ? String(raw.id).trim() : generateId(),
      name: String(raw.title != null ? raw.title : raw.name || "").trim().slice(0, 40),
      emoji: raw.emoji ? String(raw.emoji).slice(0, 8) : DEFAULT_EMOJI,
      description: raw.description != null ? String(raw.description) : "Keine Beschreibung vorhanden.",
      qa: qa,
      mode: VALID_MODES.indexOf(raw.mode) !== -1 ? raw.mode : DEFAULT_MODE,
      allCardsAverage: 0,
      rightCardsAverage: 0,
    };
  }

  /* Migrationseinstieg: Rohdaten einer unterstützten Version
     -> aktuelle interne Struktur. Wirft bei unbekannter
     Version einen Fehler mit lesbarer Meldung. */
  function migrateLearnset(raw) {
    var version = raw && raw.version;
    if (SUPPORTED_VERSIONS.indexOf(version) === -1) {
      throw new Error(
        "Unbekannte Version: " + JSON.stringify(version) +
        ". Unterstützt: " + SUPPORTED_VERSIONS.join(", ") + "."
      );
    }
    // v1 == aktuelle Struktur: nur normalisieren.
    return toInternalLearnset(raw);
  }

  function migrateBackup(raw) {
    var version = raw && raw.version;
    if (SUPPORTED_VERSIONS.indexOf(version) === -1) {
      throw new Error(
        "Unbekannte Backup-Version: " + JSON.stringify(version) +
        ". Unterstützt: " + SUPPORTED_VERSIONS.join(", ") + "."
      );
    }    // v1 == aktuelle Struktur: Sets einzeln migrieren.
    var data = (raw && raw.data) || {};
    var sets = Array.isArray(data.learnsets) ? data.learnsets : [];
    return {
      learnsets: sets.map(function (s) {
        // Backup-Sets sind bereits intern; nur sanft normalisieren
        // (IDs sichern, fehlende Felder ergänzen, Zähler erhalten).
        var base = Object.assign({}, s);
        if (!isValidId(base.id)) base.id = generateId();
        if (!base.name) base.name = "Unbenannt";
        base.name = String(base.name).trim().slice(0, 40);
        if (!base.emoji) base.emoji = DEFAULT_EMOJI;
        if (base.description == null) base.description = "Keine Beschreibung vorhanden.";
        if (!Array.isArray(base.qa)) base.qa = [];
        base.qa = base.qa.map(function (c) {
          return {
            frage: String(c.frage != null ? c.frage : ""),
            antwort: String(c.antwort != null ? c.antwort : ""),
            sicherheit: Number(c.sicherheit) === 1 ? 1 : 3,
          };
        });
        if (VALID_MODES.indexOf(base.mode) === -1) base.mode = DEFAULT_MODE;
        if (typeof base.allCardsAverage !== "number") base.allCardsAverage = Number(base.allCardsAverage) || 0;
        if (typeof base.rightCardsAverage !== "number") base.rightCardsAverage = Number(base.rightCardsAverage) || 0;
        return base;
      }),
      settings: sanitizeSettings(data.settings),
      progress: data.progress && typeof data.progress === "object" ? data.progress : {},
      statistics: data.statistics && typeof data.statistics === "object" ? data.statistics : {},
    };
  }

  /* Einstellungen sanft normalisieren. Das Profilbild (Data-URL unter
     `avatar`) bleibt erhalten; eindeutig kaputte Werte (kein String,
     kein data:image-Format) werden verworfen, damit ein beschädigtes
     Bild niemals den Import der Lernsets blockiert. */
  function sanitizeSettings(raw) {
    var out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (k) { out[k] = raw[k]; });
    }
    if (out.avatar !== undefined &&
        (typeof out.avatar !== "string" || out.avatar.indexOf("data:image/") !== 0)) {
      delete out.avatar;
    }
    return out;
  }

  /* ---------- Eindeutiger Name für "Als neues Lernset" ---------- */

  function uniqueName(wanted, existingNames) {
    var base = String(wanted || "Unbenannt").trim().slice(0, 40) || "Unbenannt";
    var lower = {};
    (existingNames || []).forEach(function (n) {
      lower[String(n || "").trim().toLowerCase()] = true;
    });
    if (!lower[base.toLowerCase()]) return base;
    for (var i = 2; i < 1000; i++) {
      var suffix = " (" + i + ")";
      var candidate = (base.slice(0, 40 - suffix.length) + suffix).trim();
      if (!lower[candidate.toLowerCase()]) return candidate;
    }
    return base.slice(0, 30) + " (" + Date.now().toString(36) + ")";
  }

  var api = {
    FORMAT_MARKDOWN: FORMAT_MARKDOWN,
    FORMAT_BACKUP: FORMAT_BACKUP,
    FORMAT_VERSION: FORMAT_VERSION,
    SUPPORTED_VERSIONS: SUPPORTED_VERSIONS,
    DEFAULT_EMOJI: DEFAULT_EMOJI,
    DEFAULT_MODE: DEFAULT_MODE,
    VALID_MODES: VALID_MODES,
    generateId: generateId,
    isValidId: isValidId,
    withEnsuredIds: withEnsuredIds,
    ensureLearnsetIds: ensureLearnsetIds,
    toInternalLearnset: toInternalLearnset,
    migrateLearnset: migrateLearnset,
    migrateBackup: migrateBackup,
    sanitizeSettings: sanitizeSettings,
    uniqueName: uniqueName,
  };

  global.SylvaMigrations = api;
  /* Node-Testbarkeit (scripts/test-import-export.mjs) */
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
