# SylvaLearn – Lernset-Schema für KI-Erstellung

**Zweck:** Diese Datei ist eine vollständige, eindeutige Arbeitsanweisung für eine andere KI.
Wenn du (die KI) diese Datei erhältst, erzeuge damit importierbare SylvaLearn-Lernsets.
Sie beschreibt **genau ein Ausgabeformat**: das Markdown-Format `sylvalearn`, Version `1`.

- Gültig für: SylvaLearn Import/Export, Format-Version **1**
- Stand: 2026-11-04
- Referenzimplementierung: `Code/data/import-export/` (`markdown.js`, `validator.js`, `migrations.js`)
- Die Angaben hier sind aus dem tatsächlichen Parser/Validator abgeleitet, nicht aus einer Wunschvorstellung.

> **Wichtig:** Ein Lernset wird als **Markdown-Datei** (`.md`) erzeugt, **nicht** als JSON.
> JSON akzeptiert SylvaLearn nur als vollständiges App-Backup (`sylvalearn-backup`).
> Ein einzelnes Lernset als JSON wird beim Import abgelehnt.

---

## 1. Harte Regeln (MUST / MUST NOT)

Diese Regeln sind nicht optional. Ein Verstoß führt dazu, dass der Import fehlschlägt oder Inhalte falsch zugeordnet werden.

1. **MUST** gib ausschließlich den Dateiinhalt aus. Keine Einleitung, keine Erklärung, keine Zusammenfassung, keine Code-Fences, kein BOM.
2. **MUST** beginne die Datei mit der Zeile `---` (exakt drei Bindestriche, keine Leerzeichen davor).
3. **MUST** schließe den Kopfbereich (Frontmatter) mit einer zweiten Zeile `---` ab.
4. **MUST** setze `format: sylvalearn` (klein geschrieben, exakt so).
5. **MUST** setze `version: 1` (Zahl, nicht `"1"`, nicht `v1`).
6. **MUST** setze genau einen `title` mit 1–40 Zeichen (nach Trimmen).
7. **MUST** setze genau eine `description` als einzeiligen Text.
8. **MUST** verwende für jede Karte genau eine Zeile, die mit `## ` beginnt (zwei Rauten + **ein** Leerzeichen), gefolgt von der Frage.
9. **MUST** schreibe die Antwort in die Zeilen **nach** der Frage, bis zur nächsten `## `-Zeile oder bis zum Dateiende.
10. **MUST** halte Fragen und Antworten nicht leer (auch nicht nur Leerzeichen).
11. **MUST NOT** verwende in einer Antwort eine Zeile, die mit `## ` beginnt. Sie würde als neue Karte gelesen.
12. **MUST NOT** verwende in einer Antwort eine Zeile, die mit `---` beginnt. Sie könnte als neues Dokument gelesen werden.
13. **MUST NOT** verwende echte YAML-Features: keine Listen (`- …`), keine mehrzeiligen Werte (`|`, `>`), keine verschachtelten Objekte.
14. **MUST NOT** erfinde Felder. Erlaubt sind nur die in Abschnitt 3 genannten Schlüssel.
15. **MUST NOT** schreibe interne Felder (`qa`, `sicherheit`, `allCardsAverage`, `rightCardsAverage`) in die Datei.
16. **MUST** halte Titel innerhalb einer Datei eindeutig (Groß-/Kleinschreibung und Leerzeichen am Rand zählen nicht).
17. **MUST** verwende UTF-8. Zeilenumbrüche dürfen LF oder CRLF sein; empfohlen ist LF.
18. **MUST** liefere mindestens **1 Karte** pro Lernset (die App toleriert 0, das Schema nicht).

Wenn eine Angabe fehlt oder mehrdeutig ist (Thema, Sprache, Zielgruppe, Kartenzahl), **frage nach**, statt zu raten.

---

## 2. Aufbau der Datei

Dateiendung: `.md` (UTF-8). Empfohlener Dateiname: `SylvaLearn-<Titel-mit-Bindestrichen>.md`.

```
---                         ← Start Frontmatter (Pflicht, Zeile 1)
format: sylvalearn          ← Pflicht
version: 1                  ← Pflicht
title: "…"                  ← Pflicht
description: "…"            ← Pflicht
emoji: 🧬                   ← optional
mode: self-compare          ← optional
id: sylva-thema-001         ← optional
---                         ← Ende Frontmatter (Pflicht)
                            ← Leerzeile (empfohlen)
## Frage 1?                 ← Karte beginnt
Antwort 1                   ← Antwort (eine oder mehrere Zeilen)
                            ← Leerzeile (empfohlen)
## Frage 2?
Antwort 2
```

### 2.1 Kopfbereich (Frontmatter)

- Zwischen den beiden `---`-Zeilen steht **pro Zeile genau ein** `schlüssel: wert`.
- Der Schlüssel endet am **ersten** Doppelpunkt. Der Wert darf Doppelpunkte enthalten.
- Werte werden getrimmt; führende/abschließende Leerzeichen gehen verloren.
- Eine Zeile, die mit `#` beginnt, wird übersprungen → **nicht verwenden**.
- Eine Kopfzeile ohne Doppelpunkt ist ein **Fehler** und bricht den Import ab.
- Doppelte Schlüssel sind verboten (der letzte gewinnt, das ist mehrdeutig).
- Reihenfolge: `format`, `version`, `title`, `description`, `emoji`, `mode`, `id`.

### 2.2 Karten

- **Frage:** Der Text nach `## ` in derselben Zeile. Fragen sind **immer einzeilig**.
- **Antwort:** Alle folgenden Zeilen bis zur nächsten `## `-Zeile. Mehrzeilig erlaubt, aber siehe Empfehlung unten.
- Leerzeilen zwischen Karten sind erlaubt und werden ignoriert.
- Text **vor** der ersten `## `-Zeile wird von der App stillschweigend ignoriert → **nicht verwenden**.
- Die Reihenfolge der Karten in der Datei ist die Lernreihenfolge.

### 2.3 Mehrere Lernsets in einer Datei

Erlaubt, aber nur wenn ausdrücklich verlangt. Jedes Lernset beginnt erneut mit `---` und hat einen eigenen Kopfbereich. Zwischen zwei Lernsets steht mindestens eine Leerzeile. **Empfohlen: eine Datei = ein Lernset.**

---

## 3. Feldreferenz

| Schlüssel     | Pflicht | Typ    | Regel                                                                 | Default in der App |
|---------------|---------|--------|-----------------------------------------------------------------------|--------------------|
| `format`      | ja      | Text   | exakt `sylvalearn`                                                    | –                  |
| `version`     | ja      | Zahl   | exakt `1`                                                             | –                  |
| `title`       | ja      | Text   | 1–40 Zeichen nach Trimmen; einzeilig; eindeutig                       | –                  |
| `description` | ja      | Text   | einzeilig; empfohlen 20–200 Zeichen                                   | „Keine Beschreibung vorhanden.“ |
| `emoji`       | nein    | Text   | genau **ein** Emoji, max. 8 UTF-16-Einheiten                          | `📘`               |
| `mode`        | nein    | Text   | `self-compare` oder `input-answer`                                    | `self-compare`     |
| `id`          | nein    | Text   | 1–128 Zeichen, empfohlen `sylva-<thema>-<3-stellig>`, ASCII, eindeutig | wird automatisch erzeugt |

**Modi:**

- `self-compare` – Lernende vergleichen ihre Antwort selbst mit der Musterantwort (Default).
- `input-answer` – Lernende tippen die Antwort, die App vergleicht sie (streng oder smart).

**Titel-Länge:** SylvaLearn misst mit JavaScript `.length` (UTF-16). Emoji und einige Sonderzeichen zählen doppelt. Sicherheitshalber **maximal 36 sichtbare Zeichen** verwenden.

**ID-Regel:** Wenn du ein **bestehendes** Lernset aktualisierst, übernimm dessen vorhandene `id`. Wenn du ein **neues** Lernset erzeugst und die ID nicht kennst, lass `id` weg – die App generiert dann eine. Erfinde keine zufälligen UUIDs, die du nicht wiederfindest.

**Duplikaterkennung:** Beim Import prüft die App zuerst die `id`, dann den `title` (getrimmt, ohne Groß-/Kleinschreibung). Gleiche Titel gelten als Duplikat.

---

## 4. Escaping- und Zeichenregeln

Der Kopfbereich ist **kein echtes YAML**, sondern ein einfacher `key: value`-Parser.

- Werte mit `: ` (Doppelpunkt + Leerzeichen), `#`, führendem Sonderzeichen oder Anführungszeichen **in doppelte Anführungszeichen** setzen.
- In Anführungszeichen: `\` als `\\` schreiben und `"` als `\"`.
- Einfache Anführungszeichen werden zwar unterstützt, aber **nicht verwenden**.
- Mehrzeilige Werte sind verboten; Zeilenumbrüche in Titel und Beschreibung werden beim Export zu Leerzeichen.
- **Empfohlen:** `title` und `description` immer in doppelte Anführungszeichen setzen, `format`, `version`, `emoji`, `mode`, `id` ohne Anführungszeichen.

Beispiele:

```text
title: "Biologie – Die Zelle"
description: "Aufbau und Funktion: Membran, Zellkern und Organellen."
title: "Was bedeutet \"homolog\"?"
```

**App-Einschränkung (Empfehlung, kein Validierungsfehler):**
Der Karten-Editor setzt Frage/Antwort unescaped in HTML-Attribute ein. Vermeide daher in Karten `"` und `<`, wenn die Karten später im Editor bearbeitet werden sollen. Nutze stattdessen deutsche typografische Anführungszeichen `„…“`. Im Lernmodus werden Antworten als reiner Text angezeigt.

**Antworten einzeilig halten:** Der Editor verwendet einzeilige Eingabefelder und entfernt Zeilenumbrüche beim Speichern. Mehrzeilige Antworten werden zwar importiert und angezeigt, gehen aber bei einer Bearbeitung im Editor verloren. Standard: **eine Zeile pro Antwort**.

---

## 5. Formale Grammatik

```ebnf
datei        = dokument, { leerzeilen, dokument }, [ leerzeilen ] ;
dokument     = "---", zeilenende, frontmatter, "---", zeilenende,
               { leerzeile }, karte, { leerzeile, karte } ;
frontmatter  = { headerzeile } ;
headerzeile  = schluessel, ":", leerzeichen, wert, zeilenende ;
karte        = "## ", frage, zeilenende, { antwortzeile, zeilenende } ;

schluessel   = "format" | "version" | "title" | "description"
             | "emoji" | "mode" | "id" ;
```

Zusätzliche Bedingungen:

- `frage` ist nicht leer und enthält keinen Zeilenumbruch.
- Die Antwort besteht aus mindestens einer nicht-leeren Zeile.
- Keine Antwortzeile beginnt mit `## ` oder `---`.

---

## 6. Inhaltliche Qualitätsregeln (für gute Lernsets)

Diese Regeln sind keine Parser-Regeln, aber Teil des Auftrags:

1. **Eine Karte = ein prüfbarer Fakt.** Keine Sammelfragen mit fünf Teilantworten.
2. **Frage eindeutig formulieren.** Kein „Was ist das?“ ohne Kontext.
3. **Antwort kanonisch und vollständig.** Sie muss ohne Rückfrage verständlich sein; kein „siehe oben“.
4. **Keine Ja/Nein-Fragen**, außer die Begründung ist Teil der Antwort.
5. **Keine Duplikate** und keine Karte, deren Antwort in einer anderen Frage schon steht.
6. **Sprache konsistent.** Fachbegriffe in der Sprache des Lernsets, keine gemischte Formatierung.
7. **Keine Nummerierung** in der Frage („1. …“); die Reihenfolge ergibt sich aus der Datei.
8. **Keine Meta-Texte** wie „Frage:“, „Antwort:“, „Karte 3“.
9. **Keine Markdown-Formatierung** als Inhalt vortäuschen: `**fett**` wird im Lernmodus wörtlich angezeigt.
10. **Umfang:** empfohlen 10–50 Karten pro Lernset. Mehr ist technisch möglich, aber didaktisch selten sinnvoll.
11. **Titel** beschreibt das Thema, nicht die Aktion („Zellbiologie“ statt „Lernen“).
12. **Beschreibung** sagt in einem Satz, was das Set abdeckt.

---

## 7. Vorlagen

### 7.1 Leere Vorlage zum Ausfüllen

Alle `{{…}}`-Platzhalter ersetzen. Die Zeilen mit `emoji`, `mode` und `id` sind optional und dürfen komplett entfallen.

```markdown
---
format: sylvalearn
version: 1
title: "{{TITEL}}"
description: "{{BESCHREIBUNG}}"
emoji: {{EMOJI}}
mode: {{self-compare | input-answer}}
id: {{sylva-thema-001}}
---

## {{FRAGE 1}}

{{ANTWORT 1}}

## {{FRAGE 2}}

{{ANTWORT 2}}
```

### 7.2 Vollständiges Beispiel (gültig und importierbar)

````markdown
---
format: sylvalearn
version: 1
title: "Biologie – Die Zelle"
description: "Aufbau und Funktion der Zelle: Membran, Zellkern und Organellen."
emoji: 🧬
mode: self-compare
id: sylva-biologie-zelle-001
---

## Was ist die Hauptaufgabe der Zellmembran?

Sie grenzt die Zelle von ihrer Umgebung ab und reguliert den Stoffaustausch.

## Welche Funktion hat der Zellkern?

Er enthält die DNA und steuert die meisten Vorgänge der Zelle.

## Was sind Ribosomen?

Ribosomen sind die Orte der Proteinbiosynthese in der Zelle.

## Warum haben Mitochondrien eine eigene DNA?

Sie stammen evolutionär von eigenständigen Bakterien ab (Endosymbiontentheorie).
````

Dateiname (Empfehlung, nicht Pflicht): `SylvaLearn-Biologie-Die-Zelle.md`.

---

## 8. Häufige Fehler – falsch / richtig

| Falsch | Warum es scheitert | Richtig |
|--------|--------------------|---------|
| Datei in Code-Fences gewickelt | Erste Zeile ist nicht `---` | Nur Rohinhalt ausgeben |
| `Title: "…"` | Schlüssel ist groß geschrieben, `title` fehlt | `title: "…"` |
| `version: "1"` | Wird zwar normalisiert, ist aber nicht schema-konform | `version: 1` |
| `##Frage?` | Kein Leerzeichen nach `##` → keine Karte | `## Frage?` |
| `# Frage?` | Eine Raute → kein Kartenkopf | `## Frage?` |
| Frage über zwei Zeilen | Zweite Zeile wird Teil der Antwort | Frage in eine Zeile |
| Leere Antwort | Validierungsfehler | Antwort ergänzen |
| `---` in einer Antwort | Kann ein neues Dokument einleiten | Trennlinie weglassen |
| `## ` in einer Antwort | Wird als neue Karte gelesen | Zeile so umformulieren, dass sie nicht mit `## ` beginnt |
| YAML-Liste unter `description:` | Zeile ohne Doppelpunkt → Importfehler | Einzeiliger Text |
| Einzelnes Lernset als JSON | Wird als ungültige Datei abgelehnt | Markdown-Format verwenden |
| Interne Felder (`qa`, `sicherheit`) | Werden nicht gelesen / sind kein Dateiformat | Nur die erlaubten Schlüssel |
| Zwei Sets mit gleichem Titel | Duplikaterkennung greift | Titel eindeutig machen |

---

## 9. Selbstprüfung vor der Ausgabe

Die KI **MUST** vor der Antwort diese Liste prüfen. Bei einem „Nein“ korrigieren.

- [ ] Beginnt die Datei mit `---` und endet der Kopfbereich mit `---`?
- [ ] Stehen `format: sylvalearn` und `version: 1` exakt so in der Datei?
- [ ] Ist `title` vorhanden, einzeilig, getrimmt und ≤ 40 Zeichen?
- [ ] Ist `description` vorhanden und einzeilig?
- [ ] Ist `emoji` (falls vorhanden) genau ein Emoji?
- [ ] Ist `mode` (falls vorhanden) exakt `self-compare` oder `input-answer`?
- [ ] Ist `id` (falls vorhanden) ≤ 128 Zeichen und eindeutig?
- [ ] Beginnt jede Karte mit `## ` (zwei Rauten + Leerzeichen)?
- [ ] Hat jede Karte eine nicht-leere Frage **und** eine nicht-leere Antwort?
- [ ] Beginnt keine Antwortzeile mit `## ` oder `---`?
- [ ] Gibt es keine Code-Fences, keine Einleitung und keinen Kommentar außerhalb der Datei?
- [ ] Sind alle Titel innerhalb der Datei eindeutig?
- [ ] Ist die Ausgabe UTF-8 und enthält keine internen Felder?

---

## 10. Copy-and-paste-Auftrag für die andere KI

Diesen Block zusammen mit dem Inhalt dieser Datei (Abschnitte 1–9) an die andere KI geben.
Platzhalter ersetzen:

```text
Du bist Redakteur für SylvaLearn-Lernsets.

Befolge die angehängte Spezifikation „SylvaLearn – Lernset-Schema für KI-Erstellung“
vollständig. Sie ist verbindlich; bei Widersprüchen gilt die Spezifikation.

Auftrag:
- Thema: {{THEMA}}
- Zielgruppe: {{ZIELGRUPPE}}
- Sprache: {{SPRACHE}}
- Anzahl Karten: {{ANZAHL_KARTEN}}
- Lernmodus: {{self-compare | input-answer}}
- Gewünschte Tiefe: {{ÜBERBLICK | PRÜFUNGSVORBEREITUNG | DETAILWISSEN}}

Ausgabe:
Gib ausschließlich den vollständigen Inhalt der Markdown-Datei aus.
Keine Einleitung, keine Erklärung, keine Code-Fences, kein Kommentar.
Wenn Angaben fehlen oder widersprüchlich sind, stelle zuerst eine Rückfrage.
```

---

## 11. Referenz im Code

| Thema | Datei |
|-------|-------|
| Parser (Markdown → Rohdaten) | `Code/data/import-export/markdown.js` |
| Validierung (Fehlermeldungen) | `Code/data/import-export/validator.js` |
| Defaults, IDs, Migration | `Code/data/import-export/migrations.js` |
| Import-Pipeline | `Code/data/import-export/importer.js` |
| Tests aller Formatfälle | `scripts/test-import-export.mjs` |

Test ausführen:

```bash
node scripts/test-import-export.mjs
```
