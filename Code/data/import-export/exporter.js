/* =========================
   SYLVALEARN – IMPORT/EXPORT: EXPORTER
   Verantwortlich für: Export auswählen, Daten
   vorbereiten, Datei erzeugen, Download starten.

   Mehrere Lernsets werden in EINE gemeinsame
   Markdown-Datei geschrieben (Fallback laut Konzept,
   da keine ZIP-Library im Projekt ist und eine neue
   Dependency dafür unverhältnismäßig wäre).

   Plain script (kein Modul): window.SylvaExporter
   ========================= */

(function (global) {
  "use strict";

  /* ---------- DATEINAMEN ---------- */

  // Entfernt unsichere Zeichen (/ \ : * ? " < > | + Steuerzeichen),
  // Unicode (z. B. Umlaute, Emoji) bleibt erhalten.
  function sanitizeFileNamePart(name, maxLen) {
    var s = String(name == null ? "" : name)
      .replace(/[\/\\:\*\?"<>\|\x00-\x1f\x7f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[.\s]+|[.\s]+$/g, "");
    if (!s) s = "Lernset";
    return s.slice(0, maxLen || 80);
  }

  function dateStamp(date) {
    var d = date instanceof Date ? date : new Date();
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function singleSetFileName(set) {
    var title = sanitizeFileNamePart(set.name || set.title || "Lernset", 60);
    // Leerzeichen -> Bindestrich, wie im Konzept (SylvaLearn-Biologie-Zelle.md)
    title = title.replace(/\s+/g, "-");
    return "SylvaLearn-" + (title || "Lernset") + ".md";
  }

  function multiSetFileName(count) {
    return "SylvaLearn-Export-" + dateStamp() + "-" + count + "-Sets.md";
  }

  function backupFileName() {
    return "SylvaLearn-Backup-" + dateStamp() + ".json";
  }

  /* ---------- DOWNLOAD ---------- */

  function downloadTextFile(fileName, text, mimeType) {
    var blob;
    try {
      blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    } catch (e) {
      console.error("SylvaLearn: Datei konnte nicht erzeugt werden:", e);
      return false;
    }
    var url = null;
    try {
      url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      // Für Screenreader + No-JS-Fallback unsichtbar einhängen
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      return true;
    } catch (e) {
      console.error("SylvaLearn: Download fehlgeschlagen:", e);
      if (url) { try { URL.revokeObjectURL(url); } catch (e2) {} }
      return false;
    }
  }

  /* ---------- DATEN LESEN (wie bestehende Module) ---------- */

  function getLearnsets() {
    try {
      return JSON.parse(global.localStorage.getItem("learnsets")) || [];
    } catch (e) {
      return [];
    }
  }

  function findSetsByNames(names) {
    var all = getLearnsets();
    return (names || []).map(function (name) {
      return all.find(function (s) {
        return (s.name || "").trim() === String(name || "").trim();
      });
    }).filter(Boolean);
  }

  /* ---------- EXPORT ---------- */

  // Exportiert 1..n Lernsets (per Namen gewählt).
  // 1 Set  -> einzelne .md-Datei, n Sets -> gemeinsame .md-Datei.
  // Gibt { ok, fileName } zurück.
  function exportLearnsets(names) {
    var sets = findSetsByNames(names);
    if (sets.length === 0) {
      return { ok: false, error: "Keine Lernsets zum Exportieren ausgewählt." };
    }
    var text, fileName;
    if (sets.length === 1) {
      text = global.SylvaMarkdown.learnsetToMarkdown(sets[0]);
      fileName = singleSetFileName(sets[0]);
    } else {
      text = global.SylvaMarkdown.learnsetsToMarkdown(sets);
      fileName = multiSetFileName(sets.length);
    }
    var ok = downloadTextFile(fileName, text, "text/markdown;charset=utf-8");
    return ok
      ? { ok: true, fileName: fileName, count: sets.length }
      : { ok: false, error: "Download fehlgeschlagen." };
  }

  function exportBackup() {
    var backup = global.SylvaBackupJson.createBackup();
    var text = global.SylvaBackupJson.stringifyBackup(backup);
    var fileName = backupFileName();
    var ok = downloadTextFile(fileName, text, "application/json;charset=utf-8");
    return ok
      ? { ok: true, fileName: fileName, count: backup.data.learnsets.length }
      : { ok: false, error: "Download fehlgeschlagen." };
  }

  var api = {
    sanitizeFileNamePart: sanitizeFileNamePart,
    singleSetFileName: singleSetFileName,
    multiSetFileName: multiSetFileName,
    backupFileName: backupFileName,
    downloadTextFile: downloadTextFile,
    getLearnsets: getLearnsets,
    exportLearnsets: exportLearnsets,
    exportBackup: exportBackup,
  };

  global.SylvaExporter = api;
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
