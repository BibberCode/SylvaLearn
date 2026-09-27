/* SylvaLearn – Import/Export-Tests (Node 20+, keine Dependencies)
 * Aufruf: node scripts/test-import-export.mjs
 * Prüft: learnset -> markdown -> learnset, backup -> JSON -> backup,
 * v1 -> current structure sowie alle Fehlerfälle aus dem Konzept.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "Code", "data", "import-export");

/* ---------- Browser-Stubs ---------- */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.document = { querySelector: () => null };
globalThis.window = globalThis;

/* ---------- Module laden (gleiche Dateien wie im Browser) ---------- */
for (const f of ["migrations.js", "validator.js", "markdown.js", "json.js", "exporter.js", "importer.js"]) {
  vm.runInThisContext(readFileSync(join(dir, f), "utf8"), { filename: f });
}
const { SylvaMigrations: M, SylvaValidator: V, SylvaMarkdown: MD, SylvaBackupJson: JB, SylvaExporter: EX, SylvaImporter: IM } = globalThis;

/* ---------- Mini-Framework ---------- */
let passed = 0;
let failed = 0;
const failures = [];
function test(name, fn) {
  store.clear();
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      return r.then(
        () => { passed++; console.log("  ok  " + name); },
        (e) => { failed++; failures.push(name + ": " + (e && e.message)); console.error("  FAIL " + name + " – " + (e && e.message)); }
      );
    }
    passed++;
    console.log("  ok  " + name);
  } catch (e) {
    failed++;
    failures.push(name + ": " + (e && e.message));
    console.error("  FAIL " + name + " – " + (e && e.message));
  }
  return Promise.resolve();
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion fehlgeschlagen");
}
function file(name, content) {
  return { name, text: async () => content };
}
const DEMO_SET = {
  id: "test-id-1",
  name: "Biologie – Zelle",
  emoji: "🧬",
  description: "Aufbau und Funktion der Zelle",
  qa: [
    { frage: "Was ist die Zellmembran?", antwort: "Die Zellmembran grenzt die Zelle ab.", sicherheit: 3 },
    { frage: "Was ist der Zellkern?", antwort: "Der Zellkern enthält die DNA.", sicherheit: 1 },
  ],
  mode: "self-compare",
  allCardsAverage: 5,
  rightCardsAverage: 3,
};

/* ---------- Tests ---------- */
console.log("SylvaLearn Import/Export-Tests\n");

await test("1. gültige Markdown-Datei (Beispiel aus Konzept)", async () => {
  const md = `---\nformat: sylvalearn\nversion: 1\ntitle: Biologie – Zelle\ndescription: Aufbau und Funktion der Zelle\n---\n\n## Was ist die Zellmembran?\n\nDie Zellmembran grenzt die Zelle ab.\n`;
  const p = await IM.analyze([file("bio.md", md)]);
  assert(p.items.length === 1, "1 Set erwartet");
  assert(p.items[0].errors.length === 0, "keine Fehler erwartet: " + p.items[0].errors.join(";"));
  assert(p.items[0].internal.qa[0].frage === "Was ist die Zellmembran?", "Frage falsch");
});

await test("2. gültige JSON-Backup-Datei", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  localStorage.setItem("name", "Tester");
  const backup = JB.createBackup();
  const p = await IM.analyze([file("b.json", JB.stringifyBackup(backup))]);
  assert(p.isBackup === true, "Backup-Flag erwartet");
  assert(p.items.length === 1 && p.items[0].errors.length === 0, "Set ohne Fehler erwartet");
});

await test("3. leere Datei wird abgelehnt", async () => {
  const p = await IM.analyze([file("leer.md", "   \n  ")]);
  assert(p.items.length === 0, "keine Items erwartet");
  assert(p.fileErrors.length === 1, "Dateifehler erwartet");
});

await test("4. ungültiges JSON wird abgelehnt", async () => {
  const p = await IM.analyze([file("kaputt.json", "{ kein json,,")]);
  assert(p.fileErrors.length === 1 && /JSON/.test(p.fileErrors[0].message), "JSON-Fehlermeldung erwartet");
});

await test("5. Markdown ohne Header wird abgelehnt", async () => {
  const p = await IM.analyze([file("ohne.md", "## Nur eine Frage?\n\nAntwort ohne Header\n")]);
  assert(p.fileErrors.length === 1 && /Header/.test(p.fileErrors[0].message), "Header-Fehlermeldung erwartet, got: " + JSON.stringify(p.fileErrors));
});

await test("6. unbekannte Version wird abgelehnt", async () => {
  const md = `---\nformat: sylvalearn\nversion: 99\ntitle: X\ndescription: Y\n---\n\n## F?\n\nA\n`;
  const p = await IM.analyze([file("v99.md", md)]);
  assert(p.items.length === 1 && p.items[0].errors.some((m) => /Version/.test(m)), "Versionsfehler erwartet");
});

await test("7. fehlender Titel wird abgelehnt", async () => {
  const md = `---\nformat: sylvalearn\nversion: 1\ndescription: Y\n---\n\n## F?\n\nA\n`;
  const p = await IM.analyze([file("notitle.md", md)]);
  assert(p.items[0].errors.some((m) => /Titel/.test(m)), "Titelfehler erwartet");
});

await test("8. fehlende Frage wird konkret gemeldet", async () => {
  // Direkter Validator-Test mit leerer Frage:
  const errs = V.validateLearnset({ title: "T", cards: [{ question: "  ", answer: "A" }] }, "T");
  assert(errs.some((e) => /keine Frage/.test(e.message)), "Frage-Fehlermeldung erwartet");
});

await test("9. fehlende Antwort wird konkret gemeldet (Karte 7)", async () => {
  const cards = Array.from({ length: 7 }, (_, i) => ({ question: "F" + (i + 1), answer: i === 6 ? "   " : "A" + (i + 1) }));
  const errs = V.validateLearnset({ title: "Biologie", cards }, "Biologie");
  assert(errs.length === 1 && /Karte 7.*keine Antwort/.test(errs[0].message), "Erwartet 'Karte 7 besitzt keine Antwort', got: " + JSON.stringify(errs));
});

await test("10. leeres Lernset ist gültig (mit Warnung)", async () => {
  const md = `---\nformat: sylvalearn\nversion: 1\ntitle: Leer\ndescription: Noch keine Karten\n---\n`;
  const p = await IM.analyze([file("leer.md", md)]);
  assert(p.items.length === 1 && p.items[0].errors.length === 0, "leeres Set gültig");
  assert(p.items[0].warnings.length === 1, "Warnung erwartet");
});

await test("11. Duplikat (ID + Name) + alle Modi", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  const md = MD.learnsetToMarkdown(DEMO_SET);
  const p = await IM.analyze([file("dup.md", md)]);
  assert(p.items[0].duplicate && p.items[0].duplicate.kind === "id", "ID-Duplikat erwartet");
  // replace
  p.items[0].action = "replace";
  let res = IM.commit(p, false);
  assert(res.ok && res.replaced === 1, "replace erwartet");
  // skip
  const p2 = await IM.analyze([file("dup.md", md)]);
  p2.items[0].action = "skip";
  res = IM.commit(p2, false);
  assert(res.ok && res.skipped === 1 && JSON.parse(localStorage.getItem("learnsets")).length === 1, "skip erwartet");
  // new
  const p3 = await IM.analyze([file("dup.md", md)]);
  p3.items[0].action = "new";
  res = IM.commit(p3, false);
  const sets = JSON.parse(localStorage.getItem("learnsets"));
  assert(res.ok && res.asNew === 1 && sets.length === 2, "new erwartet");
  assert(sets[0].id !== sets[1].id, "neue ID erwartet");
  assert(sets[0].name !== sets[1].name, "eindeutiger Name erwartet");
  // Namens-Duplikat ohne ID (Alt-Daten)
  localStorage.setItem("learnsets", JSON.stringify([{ name: "Alt-Set", qa: [] }]));
  const p4 = await IM.analyze([file("a.md", `---\nformat: sylvalearn\nversion: 1\ntitle: alt-set\ndescription: d\n---\n\n## F?\n\nA\n`)]);
  assert(p4.items[0].duplicate && p4.items[0].duplicate.kind === "name", "Namens-Duplikat erwartet");
});

await test("12. mehrere Dateien gleichzeitig", async () => {
  const a = `---\nformat: sylvalearn\nversion: 1\ntitle: A\ndescription: d\n---\n\n## F?\n\nA\n`;
  const b = `---\nformat: sylvalearn\nversion: 1\ntitle: B\ndescription: d\n---\n\n## G?\n\nH\n`;
  const p = await IM.analyze([file("a.md", a), file("b.md", b)]);
  assert(p.items.length === 2, "2 Sets erwartet");
  const res = IM.commit(p, false);
  assert(res.ok && res.imported === 2, "2 importiert erwartet");
});

await test("13. sehr viele Karten (2000) in sinnvoller Zeit", async () => {
  let md = `---\nformat: sylvalearn\nversion: 1\ntitle: Groß\ndescription: d\n---\n`;
  for (let i = 0; i < 2000; i++) md += `\n## Frage ${i}?\n\nAntwort ${i}\n`;
  const t0 = Date.now();
  const p = await IM.analyze([file("big.md", md)]);
  const dt = Date.now() - t0;
  assert(p.items[0].cardCount === 2000, "2000 Karten erwartet");
  assert(dt < 5000, "zu langsam: " + dt + "ms");
});

await test("14. Unicode/Umlaute bleiben erhalten", async () => {
  const set = { ...DEMO_SET, name: "Größe – Übung äöü 日本語 🌱", description: "Zärtlich grüßt der Bär 🐻", qa: [{ frage: "Was heißt „Straße“?", antwort: "Straße – Σίσυφος" }] };
  const back = MD.markdownToLearnsets(MD.learnsetToMarkdown(set)).sets[0];
  assert(back.title === set.name && back.description === set.description, "Unicode-Titel/Beschreibung");
  assert(back.cards[0].question === set.qa[0].frage && back.cards[0].answer === set.qa[0].antwort, "Unicode-Karten");
});

await test("15. Sonderzeichen im Titel (YAML, Markdown)", async () => {
  const set = { ...DEMO_SET, name: 'Titel: mit "Doppelpunkt" # Hash', qa: [{ frage: "F? *bold* `code`", antwort: "A: mit \\ Backslash" }] };
  const md = MD.learnsetToMarkdown(set);
  const back = MD.markdownToLearnsets(md).sets[0];
  assert(back.title === set.name, "Titel-Roundtrip, got: " + back.title);
  assert(back.cards[0].question === set.qa[0].frage, "Frage-Roundtrip");
  assert(back.cards[0].answer === set.qa[0].antwort, "Antwort-Roundtrip");
});

await test("16. Windows-Zeilenumbrüche (CRLF)", async () => {
  const md = "---\r\nformat: sylvalearn\r\nversion: 1\r\ntitle: Win\r\ndescription: d\r\n---\r\n\r\n## Frage?\r\n\r\nAntwort\r\n";
  const p = await IM.analyze([file("win.md", md)]);
  assert(p.items.length === 1 && p.items[0].errors.length === 0, "CRLF gültig");
  assert(p.items[0].internal.qa[0].frage === "Frage?", "Frage getrimmt");
});

await test("17. beschädigte Datei wird abgelehnt", async () => {
  // Kaputter Header (Zeile ohne Doppelpunkt) + fehlendes schließendes ---
  const brokenHeader = `---\nformat: sylvalearn\nversion: 1\ntitle: T\nDAS IST KEIN KEY VALUE\n---\n\n## F?\n\nA\n`;
  const p1 = await IM.analyze([file("x.md", brokenHeader)]);
  assert(p1.fileErrors.length === 1 && /Kopfzeile/.test(p1.fileErrors[0].message), "Header-Fehler erwartet, got: " + JSON.stringify(p1.fileErrors));
  const noClose = `---\nformat: sylvalearn\nversion: 1\ntitle: T\n`;
  const p2 = await IM.analyze([file("y.md", noClose)]);
  assert(p2.fileErrors.length === 1, "Fehler bei fehlendem --- erwartet");
});

await test("18. Abbruch verändert keine Daten (Atomicity)", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  const before = localStorage.getItem("learnsets");
  const p = await IM.analyze([file("neu.md", `---\nformat: sylvalearn\nversion: 1\ntitle: Neu\ndescription: d\n---\n\n## F?\n\nA\n`)]);
  // kein commit (= Abbruch) -> unverändert
  assert(localStorage.getItem("learnsets") === before, "Storage unverändert ohne Commit");
  // ungültiger Import -> commit verweigert
  const bad = await IM.analyze([file("bad.md", "müll ohne header")]);
  const res = IM.commit(bad, false);
  assert(res.ok === false && localStorage.getItem("learnsets") === before, "kein Commit bei Fehlern");
});

await test("Roundtrip learnset → markdown → learnset (alle Felder)", async () => {
  const md = MD.learnsetToMarkdown(DEMO_SET);
  assert(/^---\nformat: sylvalearn\nversion: 1\n/m.test(md), "Header-Reihenfolge deterministisch");
  const raw = MD.markdownToLearnsets(md).sets[0];
  assert(raw.id === DEMO_SET.id, "ID erhalten");
  const internal = M.migrateLearnset(raw);
  assert(internal.name === DEMO_SET.name, "Name");
  assert(internal.description === DEMO_SET.description, "Beschreibung");
  assert(internal.emoji === DEMO_SET.emoji, "Emoji");
  assert(internal.mode === DEMO_SET.mode, "Modus");
  assert(internal.qa.length === 2, "Kartenzahl");
  assert(internal.qa[0].frage === DEMO_SET.qa[0].frage && internal.qa[0].antwort === DEMO_SET.qa[0].antwort, "Karteninhalt");
  assert(internal.qa.every((c) => c.sicherheit === 3), "sicherheit-Default");
});

await test("Roundtrip backup → JSON → backup (alle Gruppen)", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  localStorage.setItem("name", "Lernender");
  localStorage.setItem("maxMinutes", "60");
  localStorage.setItem("sylva-theme", "dark");
  localStorage.setItem("dailyMinutes", "12");
  localStorage.setItem("streak", "4");
  localStorage.setItem("dailyCardsAll", "10");
  localStorage.setItem("rightCardsAll", "7");
  localStorage.setItem("dailyCards_history", JSON.stringify([{ date: "x", value: { dailyCards: 1, rightCards: 1, average: 100 } }]));
  const backup = JB.createBackup();
  assert(backup.format === "sylvalearn-backup" && backup.version === 1 && backup.exportedAt, "Backup-Header");
  const parsed = JB.parseBackupText(JB.stringifyBackup(backup)).backup;
  assert(V.validateBackup(parsed).length === 0, "Backup valide");
  const migrated = M.migrateBackup(parsed);
  assert(migrated.learnsets.length === 1 && migrated.settings.name === "Lernender", "Sets+Settings");
  assert(migrated.progress.streak === "4" && migrated.statistics.dailyCardsAll === "10", "Progress+Statistik");
  assert(migrated.learnsets[0].allCardsAverage === 5, "Zähler bleiben im Backup erhalten");
});

await test("Backup enthält das Profilbild und stellt es wieder her", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  localStorage.setItem("name", "Backup-Name");
  localStorage.setItem("maxMinutes", "45");
  localStorage.setItem("avatar", "data:image/jpeg;base64,/9j/ABCDEF");
  const backup = JB.createBackup();
  assert(backup.data.settings.avatar === "data:image/jpeg;base64,/9j/ABCDEF", "Avatar im Backup erwartet");
  // Neues Gerät simulieren: alles löschen, dann Backup importieren
  store.clear();
  const p = await IM.analyze([file("b.json", JB.stringifyBackup(backup))]);
  assert(p.backupMeta && p.backupMeta.hasAvatar === true, "Avatar-Vorschau erwartet");
  assert(typeof p.backupMeta.exportedAt === "string" && p.backupMeta.exportedAt, "Exportdatum in Backup-Vorschau erwartet");
  assert(p.backupMeta.sourceFile === "b.json", "Dateiname in Backup-Vorschau erwartet");
  const res = IM.commit(p, true);
  assert(res.ok && res.restoredAvatar === true, "Avatar-Restore erwartet");
  assert(res.restoredMeta === true, "Meta-Restore-Flag erwartet");
  assert(localStorage.getItem("avatar") === "data:image/jpeg;base64,/9j/ABCDEF", "Avatar wiederhergestellt");
  assert(localStorage.getItem("name") === "Backup-Name", "Name wiederhergestellt");
  assert(localStorage.getItem("maxMinutes") === "45", "Lernziel wiederhergestellt");
});

await test("Beschädigtes Profilbild blockiert den Import nicht", async () => {
  localStorage.setItem("learnsets", JSON.stringify([DEMO_SET]));
  localStorage.setItem("avatar", "kein-bild");
  const backup = JB.createBackup();
  assert(!("avatar" in backup.data.settings), "kaputtes Avatar wird nicht exportiert");
  backup.data.settings.avatar = 12345;
  const p = await IM.analyze([file("b.json", JB.stringifyBackup(backup))]);
  assert(p.items.length === 1 && p.items[0].errors.length === 0, "Lernset trotz kaputtem Avatar importierbar");
  assert(p.backupMeta && p.backupMeta.avatarWarning, "Avatar-Hinweis erwartet");
  const res = IM.commit(p, true);
  assert(res.ok && !res.restoredAvatar, "kein Avatar-Restore bei kaputtem Bild");
});

await test("v1 → aktuelle Struktur (Migration füllt Defaults)", async () => {
  const internal = M.migrateLearnset({ format: "sylvalearn", version: 1, title: "Alt", cards: [{ question: "F?", answer: "A" }] });
  assert(M.isValidId(internal.id), "ID generiert");
  assert(internal.emoji === "📘" && internal.mode === "self-compare", "Defaults");
  assert(internal.qa[0].sicherheit === 3 && internal.allCardsAverage === 0, "Zähler/sicherheit");
});

await test("Dateinamen werden sanitiert", async () => {
  const n = EX.singleSetFileName({ name: 'Bio: Zelle/Teil *1*? "A" <B> | C' });
  assert(n === "SylvaLearn-Bio-ZelleTeil-1-A-B-C.md", "got: " + n);
  assert(/^SylvaLearn-Backup-\d{4}-\d{2}-\d{2}\.json$/.test(EX.backupFileName()), "Backup-Name");
  const u = EX.singleSetFileName({ name: "Größe – Übung 🌱" });
  assert(u === "SylvaLearn-Größe-–-Übung-🌱.md", "Unicode bleibt, got: " + u);
});

await test("Export-Determinismus (zweimal identisch)", async () => {
  const a = MD.learnsetToMarkdown(DEMO_SET);
  const b = MD.learnsetToMarkdown(JSON.parse(JSON.stringify(DEMO_SET)));
  assert(a === b, "deterministisch");
});

await test("Platzhalter-Karte [{sicherheit:3}] wird nicht exportiert", async () => {
  const md = MD.learnsetToMarkdown({ name: "Neu", description: "d", qa: [{ sicherheit: 3 }] });
  assert(MD.markdownToLearnsets(md).sets[0].cards.length === 0, "keine Karten");
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen.`);
if (failed > 0) {
  console.error("Fehler:\n- " + failures.join("\n- "));
  process.exit(1);
}
