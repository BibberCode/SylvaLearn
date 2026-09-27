/* =========================
   SYLVALEARN – IMPORT/EXPORT: MARKDOWN
   Lernset <-> Markdown (menschenlesbar, in VS Code
   bearbeitbar, deterministisch, UTF-8).

   Format v1:
     ---
     format: sylvalearn
     version: 1
     title: ...
     description: ...
     [emoji: ...]   (optional)
     [mode: ...]    (optional)
     [id: ...]      (optional, für Duplikaterkennung)
     ---
     ## Frage
     Antwort
     ...

   Trennung Frage/Antwort: `## ` leitet eine Frage
   ein, alle folgenden Zeilen bis zur nächsten
   `## `-Überschrift (oder Dateiende) sind die Antwort.
   Interne Zähler (allCardsAverage …) und
   Karten-Sicherheit werden bewusst NICHT exportiert –
   sie sind kein bearbeitbarer Lerninhalt.

   Plain script (kein Modul): window.SylvaMarkdown
   ========================= */

(function (global) {
  "use strict";

  function mig() {
    return global.SylvaMigrations;
  }

  /* ---------- YAML-ähnliche Header-Zeile ---------- */

  function escapeHeaderValue(value) {
    var s = String(value == null ? "" : value).replace(/\r?\n/g, " ").trim();
    // Anführungszeichen nur wenn nötig (enthält ":" am Zeilenanfang-relevanter Stelle, "#" oder führende Spezialzeichen)
    if (s === "" || /^[#\-?:\[\]{}|>*!%@`'"]/.test(s) || /:\s/.test(s) || /[#]/.test(s) || /^\s|\s$/.test(String(value))) {
      return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function unescapeHeaderValue(value) {
    var s = String(value == null ? "" : value).trim();
    if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
      return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (s.length >= 2 && s.charAt(0) === "'" && s.charAt(s.length - 1) === "'") {
      return s.slice(1, -1).replace(/''/g, "'");
    }
    return s;
  }

  /* ---------- EXPORT: Lernset -> Markdown ---------- */

  function singleLine(text) {
    return String(text == null ? "" : text).replace(/\r?\n/g, " ").trim();
  }

  function learnsetToMarkdown(set) {
    var M = mig();
    var title = singleLine(set.name || set.title) || "Unbenannt";
    var description = singleLine(
      set.description != null ? set.description : "Keine Beschreibung vorhanden."
    );
    var lines = [];
    lines.push("---");
    lines.push("format: " + M.FORMAT_MARKDOWN);
    lines.push("version: " + M.FORMAT_VERSION);
    lines.push("title: " + escapeHeaderValue(title));
    lines.push("description: " + escapeHeaderValue(description));
    if (set.emoji) lines.push("emoji: " + escapeHeaderValue(singleLine(set.emoji)));
    if (set.mode && M.VALID_MODES.indexOf(set.mode) !== -1) {
      lines.push("mode: " + escapeHeaderValue(set.mode));
    }
    if (set.id && M.isValidId(set.id)) {
      lines.push("id: " + escapeHeaderValue(String(set.id).trim()));
    }
    lines.push("---");
    lines.push("");

    var cards = Array.isArray(set.qa) ? set.qa : Array.isArray(set.cards) ? set.cards : [];
    // Platzhalter-Karten ohne Frage/Antwort (z. B. [{ sicherheit: 3 }])
    // werden nicht exportiert.
    cards.forEach(function (card) {
      var q = singleLine(card.frage != null ? card.frage : card.question);
      var a = String(card.antwort != null ? card.antwort : card.answer != null ? card.answer : "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(function (l) { return l.replace(/[ \t]+$/g, ""); })
        .join("\n")
        .replace(/^\n+/, "")
        .replace(/\n+$/, "");
      if (!q || !a) return;
      lines.push("## " + q);
      lines.push("");
      lines.push(a);
      lines.push("");
    });

    // Leeres Lernset: nur Header (zulässig, wird in Vorschau markiert).
    return lines.join("\n").replace(/\n+$/, "\n");
  }

  /* Mehrere Lernsets -> EINE gemeinsame Markdown-Datei
     (Fallback, da keine ZIP-Library im Projekt ist).
     Dokumente werden einfach aneinandergehängt – der
     Parser erkennt mehrere Frontmatter-Blöcke. */
  function learnsetsToMarkdown(sets) {
    return (sets || []).map(learnsetToMarkdown).join("\n");
  }

  /* ---------- IMPORT: Markdown -> Roh-Lernsets ---------- */

  function parseHeader(headerText, docLabel) {
    var data = {};
    var lines = String(headerText).split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === "#") continue;
      var idx = line.indexOf(":");
      if (idx === -1) {
        throw new Error(
          "Ungültige Kopfzeile in " + docLabel + ": „" + lines[i].trim() + "“."
        );
      }
      var key = line.slice(0, idx).trim();
      var value = unescapeHeaderValue(line.slice(idx + 1));
      data[key] = value;
    }
    // version als Zahl normalisieren ("1" -> 1)
    if (data.version !== undefined && data.version !== null && data.version !== "") {
      var n = Number(data.version);
      data.version = Number.isFinite(n) && String(data.version).trim() !== "" ? n : data.version;
    }
    return data;
  }

  function parseBodyCards(bodyText) {
    var cards = [];
    var text = String(bodyText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = text.split("\n");
    var currentQ = null;
    var currentA = [];

    function flush() {
      if (currentQ === null) return;
      cards.push({
        question: currentQ.trim(),
        answer: currentA.join("\n").replace(/^\n+/, "").replace(/\s+$/, ""),
      });
      currentQ = null;
      currentA = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var heading = line.match(/^##\s+(.*)$/);
      if (heading) {
        flush();
        currentQ = heading[1].replace(/\s+$/, "");
      } else if (currentQ !== null) {
        currentA.push(line);
      } else if (line.trim() !== "") {
        // Text außerhalb einer Karte (z. B. Intro) wird ignoriert,
        // damit freundlich formatierte Dateien nicht hart scheitern.
      }
    }
    flush();
    return cards;
  }

  /* Zerlegt Text in Dokumente mit je eigenem Frontmatter.
     Auch eine Datei mit genau einem Set funktioniert. */
  function splitDocuments(text) {
    var normalized = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    if (!normalized.trim()) return [];
    var lines = normalized.split("\n");
    var docs = [];
    var i = 0;

    function isDelim(line) {
      return line.trim() === "---";
    }

    // Führende Leerzeilen überspringen
    while (i < lines.length && lines[i].trim() === "") i++;

    // Ohne Frontmatter am Anfang -> kein gültiges Dokument
    if (i >= lines.length || !isDelim(lines[i])) {
      throw new Error("Markdown ohne Header: Frontmatter mit „---“ am Dateianfang fehlt.");
    }

    while (i < lines.length) {
      if (!isDelim(lines[i])) {
        // Nach einem Dokument darf nur noch Whitespace oder direkt
        // das nächste Dokument folgen – sonst ist die Datei beschädigt.
        var rest = lines.slice(i).join("\n").trim();
        if (rest !== "") {
          throw new Error("Markdown ist beschädigt: Text außerhalb eines Lernsets gefunden.");
        }
        break;
      }
      var headerStart = i + 1;
      var headerEnd = -1;
      for (var j = headerStart; j < lines.length; j++) {
        if (isDelim(lines[j])) { headerEnd = j; break; }
      }
      if (headerEnd === -1) {
        throw new Error("Markdown ohne Header: schließendes „---“ fehlt.");
      }
      var header = lines.slice(headerStart, headerEnd).join("\n");
      var bodyStart = headerEnd + 1;
      var bodyEnd = lines.length;
      for (var k = bodyStart; k < lines.length; k++) {
        // Nächster Frontmatter-Block beginnt, wenn auf "---" ein
        // Block mit "format:"-Schlüssel folgt. Das verhindert, dass
        // "---"-Trennlinien oder "Hinweis: ..."-Zeilen innerhalb von
        // Antworten fälschlich als neues Dokument erkannt werden.
        if (isDelim(lines[k])) {
          var hasFormat = false;
          for (var p = k + 1; p < lines.length; p++) {
            var t = lines[p].trim();
            if (t === "---" || /^##\s/.test(t)) break;
            if (/^format\s*:/.test(t)) { hasFormat = true; break; }
          }
          if (hasFormat) {
            bodyEnd = k;
            break;
          }
        }
      }
      docs.push({
        header: header,
        body: lines.slice(bodyStart, bodyEnd).join("\n"),
      });
      i = bodyEnd;
      while (i < lines.length && lines[i].trim() === "") i++;
    }
    return docs;
  }

  /* Gibt { sets: [Rohdaten], errors: [] } zurück.
     Rohdaten: { format, version, title, description,
     emoji?, mode?, id?, cards: [{question, answer}] }. */
  function markdownToLearnsets(text) {
    if (text === null || text === undefined || String(text).trim() === "") {
      return { sets: [], errors: ["Die Datei ist leer."] };
    }
    var docs;
    try {
      docs = splitDocuments(text);
    } catch (e) {
      return { sets: [], errors: [e.message || "Die Datei konnte nicht gelesen werden."] };
    }
    if (docs.length === 0) {
      return { sets: [], errors: ["Die Datei enthält kein Lernset."] };
    }
    var sets = [];
    var errors = [];
    docs.forEach(function (doc, idx) {
      var label = "Dokument " + (idx + 1);
      var header;
      try {
        header = parseHeader(doc.header, label);
      } catch (e) {
        errors.push(e.message);
        return;
      }
      var cards = parseBodyCards(doc.body);
      sets.push({
        format: header.format,
        version: header.version,
        title: header.title,
        description: header.description,
        emoji: header.emoji,
        mode: header.mode,
        id: header.id,
        cards: cards,
      });
    });
    return { sets: sets, errors: errors };
  }

  var api = {
    learnsetToMarkdown: learnsetToMarkdown,
    learnsetsToMarkdown: learnsetsToMarkdown,
    markdownToLearnsets: markdownToLearnsets,
    parseHeader: parseHeader,
  };

  global.SylvaMarkdown = api;
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (e) { /* Browser: kein module */ }
})(typeof window !== "undefined" ? window : globalThis);
