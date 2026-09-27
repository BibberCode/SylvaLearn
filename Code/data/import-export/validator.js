/* =========================
   SYLVALEARN – IMPORT/EXPORT: VALIDIERUNG
   Zentrale Validierung für alle Importdaten.
   Schreibt NIE in localStorage, wirft keine
   technischen Stacktraces an die UI – stattdessen
   werden verständliche deutsche Fehlermeldungen
   als Array zurückgegeben.

   Plain script (kein Modul): window.SylvaValidator
   ========================= */

(function (global) {
  "use strict";

  function mig() {
    return global.SylvaMigrations;
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function err(path, message) {
    return { path: path, message: message };
  }

  /* ---------- EINZELNES LERNSET (Rohdaten) ----------
     Akzeptiert Titel aus `title` (Markdown/Export) oder
     `name` (Backup-Sets) und Karten aus `cards` (Export)
     oder `qa` (interne Backup-Sets mit frage/antwort). */

  function cardsOf(raw) {
    if (Array.isArray(raw.cards)) return raw.cards;
    if (Array.isArray(raw.qa)) return raw.qa;
    return null;
  }

  function validateLearnset(raw, label) {
    var errors = [];
    var name = label || "Lernset";

    if (!isPlainObject(raw)) {
      return [err(name, name + ": ungültige Daten (kein Objekt).")];
    }

    var title = raw.title != null ? raw.title : raw.name;
    if (typeof title !== "string" || !title.trim()) {
      errors.push(err(name + ".title", "Lernset „" + (name) + "“: Titel fehlt."));
    } else if (title.trim().length > 40) {
      errors.push(err(name + ".title", "Lernset „" + title.trim() + "“: Titel ist länger als 40 Zeichen."));
    }

    if (raw.description != null && typeof raw.description !== "string") {
      errors.push(err(name + ".description", "Lernset „" + (title || name) + "“: Beschreibung muss ein Text sein."));
    }

    if (raw.mode != null && mig().VALID_MODES.indexOf(raw.mode) === -1) {
      errors.push(err(name + ".mode", "Lernset „" + (title || name) + "“: unbekannter Lernmodus „" + raw.mode + "“."));
    }

    var cards = cardsOf(raw);
    if (cards === null) {
      errors.push(err(name + ".cards", "Lernset „" + (title || name) + "“: Kartenliste fehlt."));
      return errors;
    }
    if (!Array.isArray(cards)) {
      errors.push(err(name + ".cards", "Lernset „" + (title || name) + "“: Karten müssen eine Liste sein."));
      return errors;
    }

    cards.forEach(function (card, i) {
      var nr = i + 1;
      var display = "Lernset „" + (typeof title === "string" && title.trim() ? title.trim() : name) + "“";
      if (!isPlainObject(card)) {
        errors.push(err(name + ".cards[" + i + "]", display + ": Karte " + nr + " ist ungültig."));
        return;
      }
      var q = card.question != null ? card.question : card.frage;
      var a = card.answer != null ? card.answer : card.antwort;
      if (typeof q !== "string" || !q.trim()) {
        errors.push(err(name + ".cards[" + i + "].question", display + ": Karte " + nr + " besitzt keine Frage."));
      }
      if (typeof a !== "string" || !a.trim()) {
        errors.push(err(name + ".cards[" + i + "].answer", display + ": Karte " + nr + " besitzt keine Antwort."));
      }
    });

    return errors;
  }

  /* ---------- MARKDOWN-ROHDATEN ---------- */

  function validateMarkdownSet(raw, label) {
    var errors = [];
    var name = label || "Datei";

    if (!isPlainObject(raw)) {
      return [err(name, "Die Datei ist keine gültige SylvaLearn-Datei.")];
    }
    if (raw.format !== mig().FORMAT_MARKDOWN) {
      errors.push(err(name + ".format", "Unbekanntes Format „" + raw.format + "“. Erwartet: „" + mig().FORMAT_MARKDOWN + "“."));
    }
    if (mig().SUPPORTED_VERSIONS.indexOf(raw.version) === -1) {
      var shown = raw.version === undefined || raw.version === null || raw.version === ""
        ? "fehlt"
        : "„" + raw.version + "“";
      errors.push(err(
        name + ".version",
        "Unbekannte Version " + shown + ". Unterstützt: " +
        mig().SUPPORTED_VERSIONS.join(", ") + "."
      ));
    }
    errors = errors.concat(validateLearnset(raw, typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : name));
    return errors;
  }

  /* ---------- BACKUP-ROHDATEN ---------- */

  function validateBackup(raw) {
    var errors = [];

    if (!isPlainObject(raw)) {
      return [err("backup", "Die ausgewählte Datei ist keine gültige SylvaLearn-Datei.")];
    }
    if (raw.format !== mig().FORMAT_BACKUP) {
      errors.push(err("backup.format", "Unbekanntes Format „" + raw.format + "“. Erwartet: „" + mig().FORMAT_BACKUP + "“."));
    }
    if (mig().SUPPORTED_VERSIONS.indexOf(raw.version) === -1) {
      var shown = raw.version === undefined || raw.version === null || raw.version === ""
        ? "fehlt"
        : "„" + raw.version + "“";
      errors.push(err(
        "backup.version",
        "Unbekannte Backup-Version " + shown + ". Unterstützt: " +
        mig().SUPPORTED_VERSIONS.join(", ") + "."
      ));
    }
    if (!isPlainObject(raw.data)) {
      errors.push(err("backup.data", "Backup enthält keine Daten."));
      return errors;
    }
    if (!Array.isArray(raw.data.learnsets)) {
      errors.push(err("backup.data.learnsets", "Backup: „learnsets“ ist keine Liste."));
    } else {
      raw.data.learnsets.forEach(function (set, i) {
        var label = (set && (set.name || set.title)) || ("Lernset " + (i + 1));
        errors = errors.concat(validateLearnset(set, String(label)));
      });
    }
    ["settings", "progress", "statistics"].forEach(function (key) {
      var v = raw.data[key];
      if (v !== undefined && v !== null && !isPlainObject(v)) {
        errors.push(err("backup.data." + key, "Backup: „" + key + "“ muss ein Objekt sein."));
      }
    });

    return errors;
  }

  /* ---------- PROFILBILD (nicht blockierend) ----------
     Das Profilbild (`settings.avatar`, Data-URL) darf den Import der
     Lernsets niemals verhindern. Deshalb gibt es dafür nur einen
     Hinweis-Prüfer: null = ok oder nicht vorhanden, sonst deutsche
     Meldung für die Import-Vorschau. Kaputte Werte verwirft
     `SylvaMigrations.sanitizeSettings` beim Migrieren. */

  function validateAvatar(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || value.indexOf("data:image/") !== 0) {
      return "Das Profilbild im Backup ist beschädigt und wird nicht wiederhergestellt.";
    }
    return null;
  }

  /* ---------- ANZEIGE ---------- */

  function toDisplayError(e) {
    if (typeof e === "string") return e;
    if (e && e.message) return e.message;
    return "Unbekannter Fehler.";
  }

  var api = {
    validateLearnset: validateLearnset,
    validateMarkdownSet: validateMarkdownSet,
    validateBackup: validateBackup,
    validateAvatar: validateAvatar,
    toDisplayError: toDisplayError,
  };

  global.SylvaValidator = api;
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
