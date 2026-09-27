/* =========================
   SYLVALEARN – IMPORT/EXPORT: IMPORTER
   Orchestriert den gesamten Importprozess.

   Pipeline:
     Datei -> Dateityp erkennen -> lesen ->
     Format erkennen -> Version prüfen ->
     validieren -> Migration -> Vorschau ->
     Benutzer bestätigt -> speichern.

   Es wird NIEMALS ungeprüft in localStorage
   geschrieben: Erst nach vollständiger Validierung
   ALLER Dateien und expliziter Bestätigung wird
   genau EINMAL atomar gespeichert. Bei Fehlern
   bleiben bestehende Lernsets unverändert.

   Import-Modi pro Duplikat:
     "skip"    – vorhandenes Set ignorieren
     "replace" – vorhandenes Set ersetzen
     "new"     – als neues Lernset (neue ID) anlegen
     "add"     – hinzufügen (nur für neue Sets)

   Plain script (kein Modul): window.SylvaImporter
   ========================= */

(function (global) {
  "use strict";

  function mig() { return global.SylvaMigrations; }
  function val() { return global.SylvaValidator; }

  /* ---------- DATEITYP ---------- */

  function detectFileType(fileName, contentStart) {
    var name = String(fileName || "").toLowerCase();
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
    // Fallback über Inhalt (z. B. falsche Endung)
    var head = String(contentStart || "").trim();
    if (head.charAt(0) === "{" || head.charAt(0) === "[") return "json";
    return "markdown";
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      try {
        if (file.text) {
          file.text().then(resolve, reject);
          return;
        }
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || "")); };
        reader.onerror = function () { reject(new Error("Datei konnte nicht gelesen werden.")); };
        reader.readAsText(file, "UTF-8");
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ---------- DUPLIKATERKENNUNG ----------
     Stabil über `id`, Fallback über Name
     (getrimmt, case-insensitive) für Alt-Daten
     ohne ID. */

  function getStoredSets() {
    try {
      var raw = global.localStorage.getItem("learnsets");
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function findDuplicate(internal, stored) {
    if (internal.id && mig().isValidId(internal.id)) {
      var byId = stored.find(function (s) { return s.id === internal.id; });
      if (byId) return { kind: "id", set: byId };
    }
    var wanted = String(internal.name || "").trim().toLowerCase();
    if (wanted) {
      var byName = stored.find(function (s) {
        return String(s.name || "").trim().toLowerCase() === wanted;
      });
      if (byName) return { kind: "name", set: byName };
    }
    return null;
  }

  function defaultAction(hasDuplicate) {
    return hasDuplicate ? "skip" : "add";
  }

  /* ---------- ANALYSE (ohne zu speichern) ----------
     fileList: FileList/Array aus Dialog oder Drag&Drop.
     Gibt Promise<Preview> zurück:
     { items: [{ source, kind, label, internal, cardCount,
        duplicate, errors, warnings, action }],
       fileErrors: [], isBackup, backupMeta } */

  // Eigentliche Analyse – bewusst sequentiell & lesbar:
  function analyze(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var preview = { items: [], fileErrors: [] };
    var chain = Promise.resolve();

    files.forEach(function (file) {
      chain = chain.then(function () {
        return readFileAsText(file).then(function (text) {
          parseOneFile(file.name, text, preview);
        }).catch(function (e) {
          console.error("SylvaLearn: Datei-Lesefehler:", file && file.name, e);
          preview.fileErrors.push({
            fileName: (file && file.name) || "Unbekannte Datei",
            message: "Datei konnte nicht gelesen werden.",
          });
        });
      });
    });

    return chain.then(function () {
      // Duplikaterkennung gegen gespeicherte Sets UND
      // gegen bereits analysierte Sets (gleicher Import).
      var stored = getStoredSets();
      var seenNames = {};
      preview.items.forEach(function (item) {
        if (!item.internal) return;
        var dup = findDuplicate(item.internal, stored);
        var lower = String(item.internal.name || "").trim().toLowerCase();
        if (!dup && seenNames[lower]) {
          dup = { kind: "import", set: { name: seenNames[lower] } };
        }
        seenNames[lower] = item.internal.name;
        item.duplicate = dup
          ? { kind: dup.kind, name: dup.set ? dup.set.name : item.internal.name }
          : null;
        item.action = defaultAction(!!dup);
        if (!dup) stored.push(item.internal);
      });
      return preview;
    });
  }

  function parseOneFile(fileName, text, preview) {
    var type = detectFileType(fileName, text.slice(0, 1024));
    try {
      if (type === "json") {
        parseJsonFile(fileName, text, preview);
      } else {
        parseMarkdownFile(fileName, text, preview);
      }
    } catch (e) {
      console.error("SylvaLearn: Import-Analysefehler:", fileName, e);
      preview.fileErrors.push({
        fileName: fileName,
        message: "Die ausgewählte Datei ist keine gültige SylvaLearn-Datei.",
      });
    }
  }

  function parseMarkdownFile(fileName, text, preview) {
    var parsed = global.SylvaMarkdown.markdownToLearnsets(text);
    parsed.errors.forEach(function (msg) {
      preview.fileErrors.push({ fileName: fileName, message: msg });
    });
    parsed.sets.forEach(function (raw, idx) {
      var label = raw.title && String(raw.title).trim()
        ? String(raw.title).trim()
        : fileName + (parsed.sets.length > 1 ? " (Teil " + (idx + 1) + ")" : "");
      var errors = val().validateMarkdownSet(raw, label).map(val().toDisplayError);
      var internal = null;
      if (errors.length === 0) {
        try {
          internal = mig().migrateLearnset(raw);
        } catch (e) {
          console.error("SylvaLearn: Migration fehlgeschlagen:", e);
          errors.push(e.message || "Dateiformat wird nicht unterstützt.");
        }
      }
      preview.items.push(makeItem(fileName, "learnset", label, internal, errors));
    });
    if (parsed.sets.length === 0 && parsed.errors.length === 0) {
      preview.fileErrors.push({ fileName: fileName, message: "Die Datei enthält kein Lernset." });
    }
  }

  function parseJsonFile(fileName, text, preview) {
    var res = global.SylvaBackupJson.parseBackupText(text);
    if (res.error) {
      preview.fileErrors.push({ fileName: fileName, message: res.error });
      return;
    }
    var backup = res.backup;
    var looksLikeBackup = backup && (backup.format === mig().FORMAT_BACKUP || (backup.data && backup.data.learnsets));
    if (!looksLikeBackup) {
      // Einzelnes Lernset als JSON? Nicht definiert -> verständlich ablehnen.
      preview.fileErrors.push({
        fileName: fileName,
        message: "Die ausgewählte Datei ist keine gültige SylvaLearn-Datei.",
      });
      return;
    }
    var errors = val().validateBackup(backup).map(val().toDisplayError);
    if (errors.length > 0) {
      preview.fileErrors.push({ fileName: fileName, message: errors[0] });
      // Einzelne Set-Fehler zusätzlich als Items aufführen, damit
      // der Nutzer sieht, WELCHES Set problematisch ist.
      ((backup.data && backup.data.learnsets) || []).forEach(function (set) {
        var label = (set && (set.name || set.title)) || fileName;
        var setErrors = val().validateLearnset(set, String(label)).map(val().toDisplayError);
        if (setErrors.length > 0) {
          preview.items.push(makeItem(fileName, "learnset", String(label), null, setErrors));
        }
      });
      return;
    }
    var migrated;
    try {
      migrated = mig().migrateBackup(backup);
    } catch (e) {
      console.error("SylvaLearn: Backup-Migration fehlgeschlagen:", e);
      preview.fileErrors.push({ fileName: fileName, message: e.message || "Backup-Version wird nicht unterstützt." });
      return;
    }
    // Backup-Metadaten merken (mehrere Dateien: letzte gewinnt).
    // Dazu gehört auch das Profilbild (settings.avatar), damit es auf
    // Wunsch wiederhergestellt und in der Vorschau angezeigt wird.
    var rawAvatar = backup.data && backup.data.settings ? backup.data.settings.avatar : undefined;
    var avatarWarning = (val().validateAvatar ? val().validateAvatar(rawAvatar) : null);
    preview.backupMeta = {
      settings: migrated.settings,
      progress: migrated.progress,
      statistics: migrated.statistics,
      hasAvatar: !!(migrated.settings && migrated.settings.avatar),
      avatarWarning: avatarWarning,
      exportedAt: backup.exportedAt || null,
      appVersion: backup.appVersion || null,
      sourceFile: fileName,
    };
    preview.isBackup = true;
    migrated.learnsets.forEach(function (set) {
      preview.items.push(makeItem(fileName, "learnset", set.name, set, []));
    });
    if (migrated.learnsets.length === 0) {
      preview.items.push(makeItem(fileName, "learnset", fileName + " (leeres Backup)", null,
        ["Das Backup enthält keine Lernsets."]));
    }
  }

  function makeItem(fileName, kind, label, internal, errors) {
    var warnings = [];
    if (internal && (!internal.qa || internal.qa.length === 0)) {
      warnings.push("Enthält keine Karten.");
    }
    return {
      source: fileName,
      kind: kind,
      label: label,
      internal: internal,
      cardCount: internal && internal.qa ? internal.qa.length : 0,
      duplicate: null, // wird in analyze() gesetzt
      errors: errors || [],
      warnings: warnings,
      action: "add",
    };
  }

  /* ---------- COMMIT (atomar) ----------
     Schreibt erst nach Bestätigung. Gibt { ok, imported,
     skipped, replaced, asNew, restoredAvatar, restoredMeta, error } zurück. */

  function commit(preview, restoreMeta) {
    var valid = preview.items.filter(function (it) { return it.internal && it.errors.length === 0; });
    if (valid.length === 0) {
      return { ok: false, error: "Nichts zu importieren." };
    }
    var current;
    try {
      current = getStoredSets();
    } catch (e) {
      return { ok: false, error: "Bestehende Daten konnten nicht gelesen werden." };
    }
    // Auf Kopie arbeiten – erst ganz am Ende speichern.
    var next = current.slice();
    var byId = {};
    var byName = {};
    next.forEach(function (s, i) {
      if (s.id) byId[s.id] = i;
      byName[String(s.name || "").trim().toLowerCase()] = i;
    });

    var stats = { imported: 0, skipped: 0, replaced: 0, asNew: 0 };
    var names = next.map(function (s) { return s.name; });

    try {
      valid.forEach(function (item) {
        var action = item.action || "add";
        // Sicherheitsnetz: Duplikat + "add" -> skip (nie IDs überschreiben)
        var dup = findDuplicateInMaps(item.internal, byId, byName, next);
        if (action === "add" && dup !== -1) action = "skip";

        if (action === "skip") { stats.skipped++; return; }
        if (action === "replace") {
          var pos = dup !== -1 ? dup : next.length;
          if (dup === -1) {
            next.push(item.internal);
            indexMaps(item.internal, next.length - 1, byId, byName);
            stats.imported++;
          } else {
            next[pos] = item.internal;
            indexMaps(item.internal, pos, byId, byName);
            stats.replaced++;
          }
          return;
        }
        if (action === "new") {
          var copy = Object.assign({}, item.internal, { id: mig().generateId() });
          copy.name = mig().uniqueName(item.internal.name, names);
          names.push(copy.name);
          next.push(copy);
          indexMaps(copy, next.length - 1, byId, byName);
          stats.asNew++;
          return;
        }
        // add (neues Set)
        var fresh = Object.assign({}, item.internal);
        if (!mig().isValidId(fresh.id)) fresh.id = mig().generateId();
        // Kollisionsschutz: gleiche ID -> neue ID + eigener Name
        if (byId[fresh.id] !== undefined) {
          fresh.id = mig().generateId();
          fresh.name = mig().uniqueName(fresh.name, names);
        } else if (byName[String(fresh.name || "").trim().toLowerCase()] !== undefined) {
          fresh.name = mig().uniqueName(fresh.name, names);
        }
        names.push(fresh.name);
        next.push(fresh);
        indexMaps(fresh, next.length - 1, byId, byName);
        stats.imported++;
      });
    } catch (e) {
      console.error("SylvaLearn: Import-Vorbereitung fehlgeschlagen:", e);
      return { ok: false, error: "Import fehlgeschlagen. Bestehende Daten wurden nicht verändert." };
    }

    try {
      global.localStorage.setItem("learnsets", JSON.stringify(next));
    } catch (e) {
      console.error("SylvaLearn: Import-Speichern fehlgeschlagen:", e);
      return { ok: false, error: "Speichern fehlgeschlagen (Speicher voll?). Bestehende Daten wurden nicht verändert." };
    }

    // Backup-Metadaten (Einstellungen/Fortschritt/Statistik) nur auf
    // Wunsch wiederherstellen – Lernsets sind bereits gesichert.
    // Das Profilbild (settings.avatar) zählt zu den Einstellungen.
    var restoredAvatar = false;
    var restoredMeta = false;
    if (restoreMeta !== false && preview.backupMeta) {
      restoredMeta = true;
      var groups = preview.backupMeta;
      ["settings", "progress", "statistics"].forEach(function (g) {
        var obj = groups[g] || {};
        Object.keys(obj).forEach(function (key) {
          try {
            global.localStorage.setItem(key, String(obj[key]));
            if (key === "avatar") restoredAvatar = true;
          } catch (e) {
            console.error("SylvaLearn: Meta-Key nicht wiederherstellbar:", key, e);
          }
        });
      });
      if (restoredAvatar) refreshAvatarImage(groups.settings && groups.settings.avatar);
    }

    return Object.assign({ ok: true, restoredAvatar: restoredAvatar, restoredMeta: restoredMeta }, stats);
  }

  /* Zeigt ein wiederhergestelltes Profilbild sofort an (ohne Reload).
     Kein Fehler, wenn kein Profil-UI vorhanden ist (z. B. Karten-Seite,
     Node-Tests). */
  function refreshAvatarImage(avatar) {
    try {
      if (!avatar || typeof document === "undefined" || !document.getElementById) return;
      var el = document.getElementById("avatarImg");
      if (el) el.src = avatar;
    } catch (e) { /* kein DOM – egal */ }
  }

  function findDuplicateInMaps(internal, byId, byName, next) {
    if (internal.id && byId[internal.id] !== undefined) return byId[internal.id];
    var key = String(internal.name || "").trim().toLowerCase();
    if (key && byName[key] !== undefined) return byName[key];
    return -1;
  }

  function indexMaps(set, i, byId, byName) {
    if (set.id) byId[set.id] = i;
    byName[String(set.name || "").trim().toLowerCase()] = i;
  }

  /* Öffentliche API: analyze() für die Vorschau,
     commit() erst nach Benutzer-Bestätigung. */
  var api = {
    detectFileType: detectFileType,
    readFileAsText: readFileAsText,
    analyze: analyze,
    analyzeFiles: analyze, // Alias
    commit: commit,
    findDuplicate: findDuplicate,
  };

  global.SylvaImporter = api;
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
