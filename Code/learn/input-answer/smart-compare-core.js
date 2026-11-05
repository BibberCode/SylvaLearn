/* =========================
   SYLVALEARN – SMART COMPARE CORE
   Reine Textlogik für den Smart-Modus:
   - Tippfehler-Toleranz (fuzzy Token-Matching)
   - Paraphrasen (Semantik kommt von außen)
   - Widerspruchserkennung (Verneinung, Zahlen, Einheiten)

   Bewusst ohne DOM, ohne Modell und ohne Netz, damit die Logik
   testbar bleibt. Das Embedding-Modell wird im Schwester-Modul
   geladen und liefert nur den semantischen Score.
   ========================= */

export const CONFIG = Object.freeze({
  // Ab wie vielen Tokens eine Antwort als "lang" gilt.
  shortAnswerTokens: 3,

  // Ab diesem semantischen Score gilt eine Antwort als inhaltlich passend.
  // Kurze Antworten brauchen eine höhere Schwelle, weil das Modell
  // verwandte Begriffe (z. B. Zellmembran/Zellwand) sonst zu großzügig
  // bewertet. Echte Synonyme sollten zusätzlich als Alternativantwort
  // hinterlegt werden.
  semanticThresholdShort: 0.92,
  semanticThresholdLong: 0.82,

  // Schwelle für den kombinierten Score (Semantik + Textähnlichkeit).
  combinedThresholdShort: 0.84,
  combinedThresholdLong: 0.74,

  // Reine Tippfehler-Erkennung.
  typoFuzzy: 0.85,
  typoLengthRatio: 0.75,
  typoMinSemantic: 0.55,

  // Gewichte für den kombinierten Score.
  semanticWeight: 0.75,
  lexicalWeight: 0.25,
  lexicalFuzzy: 0.6,
  lexicalChar: 0.25,
  lexicalLength: 0.15,

  // Multiplikatoren bei erkannten Widersprüchen. 1 = kein Abzug.
  penaltyNegation: 0.25,
  penaltyNumber: 0.5,
  penaltyUnit: 0.25,

  // Bei Widersprüchen muss der Rest der Antwort deutlich besser sein.
  contradictionMargin: 0.12,
});

const NUMBER_WORDS = Object.freeze({
  null: 0,
  eins: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwölf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fünfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
  zwanzig: 20,
  dreißig: 30,
  vierzig: 40,
  fünfzig: 50,
  sechzig: 60,
  siebzig: 70,
  achtzig: 80,
  neunzig: 90,
  hundert: 100,
  tausend: 1000,
  million: 1000000,
  millionen: 1000000,
});

// Zahl im deutschen Format, inkl. Tausenderpunkt und Dezimalkomma.
const NUMBER_PATTERN = String.raw`-?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)`;

const UNIT_ALIASES = Object.freeze({
  m: "m",
  meter: "m",
  metern: "m",
  metre: "m",

  cm: "cm",
  zentimeter: "cm",
  zentimetern: "cm",

  mm: "mm",
  millimeter: "mm",
  millimetern: "mm",

  km: "km",
  kilometer: "km",
  kilometern: "km",

  kg: "kg",
  kilogramm: "kg",
  kilo: "kg",

  g: "g",
  gramm: "g",

  mg: "mg",
  milligramm: "mg",

  l: "l",
  liter: "l",
  litern: "l",

  ml: "ml",
  milliliter: "ml",

  s: "s",
  sekunde: "s",
  sekunden: "s",

  min: "min",
  minute: "min",
  minuten: "min",

  h: "h",
  stunde: "h",
  stunden: "h",

  "%": "%",
  prozent: "%",

  "°c": "c",
  c: "c",
  celsius: "c",
  grad: "c",

  "°f": "f",
  f: "f",
  fahrenheit: "f",
});

const UNIT_DEFS = Object.freeze({
  m: { dim: "length", factor: 1 },
  cm: { dim: "length", factor: 0.01 },
  mm: { dim: "length", factor: 0.001 },
  km: { dim: "length", factor: 1000 },

  g: { dim: "mass", factor: 1 },
  kg: { dim: "mass", factor: 1000 },
  mg: { dim: "mass", factor: 0.001 },

  l: { dim: "volume", factor: 1 },
  ml: { dim: "volume", factor: 0.001 },

  s: { dim: "time", factor: 1 },
  min: { dim: "time", factor: 60 },
  h: { dim: "time", factor: 3600 },

  "%": { dim: "percent", factor: 1 },
  c: { dim: "celsius", factor: 1 },
  f: { dim: "fahrenheit", factor: 1 },
});

const NEGATION_RE = /\b(nicht|kein(?:e|en|em|er|es)?|ohne|nie|niemals|nichts|weder|fehlt|fehlen|fehlte|fehlten|mangelt|mangeln|entbehrt|abwesend)\b/g;

/* ---------------- NORMALISIERUNG ---------------- */

// Für das Embedding-Modell: Umlaute, ß und Groß-/Kleinschreibung
// bleiben erhalten. Das Modell ist case-sensitiv; deutsche Substantive
// werden dadurch besser unterschieden. Kleinschreibung wird im
// Vergleich zusätzlich als Variante geprüft.
export function normalizeForEmbedding(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

// Für Textvergleiche: deutsche Schreibvarianten vereinheitlichen.
// ä -> ae (nicht a), damit "zählen" und "zahlen" unterscheidbar bleiben.
export function normalizeForMatch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("de-DE")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value) {
  return value.split(" ").filter(Boolean);
}

// Kurze, kommagetrennte Antworten wie "unsicher, ungewiss" sind
// Alternativantworten. Lange Sätze und Aufzählungen mit "und"
// werden bewusst nicht aufgeteilt, damit z. B.
// "Zellkern, Mitochondrien und Ribosomen" nicht als Einzelantwort
// durchgeht.
export function splitAlternatives(value) {
  let text = String(value ?? "")
    .normalize("NFC")
    // Unsichtbare Zeichen (z. B. aus kopierten Texten) entfernen.
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (!text) return [];

  const hadSlash = /[/／]/.test(text);
  const hadDash = /[–—]/.test(text);

  // Schrägstriche als Trenner behandeln. Brüche ("1/2") und
  // zusammengesetzte Einheiten ("km/h") werden unten wieder
  // ausgeschlossen.
  text = text.replace(/[/／]/g, ", ");

  // Neben normalen Kommas auch typografische/vollbreite Trennzeichen
  // akzeptieren. "und" bleibt bewusst ein Aufzählungszeichen.
  const parts = text
    .split(/\s*(?:[,;，；、|｜•·–—]|\b(?:oder|respektive|bzw)\b\.?|\n+)\s*/i)
    .map(part => part.replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, "").trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 6) return [];

  const normalizedParts = parts.map(part => normalizeForMatch(part));

  // "1/2" oder "1–2": Brüche/Bereiche, keine Alternativen.
  if (
    (hadSlash || hadDash) &&
    normalizedParts.every(part => /^\d+$/.test(part))
  ) return [];

  // "km/h" ist eine zusammengesetzte Einheit, keine Alternative.
  // Bei "m, cm" (Komma) bleibt die Alternativliste dagegen erhalten.
  if (hadSlash && normalizedParts.every(part => {
    const tokens = tokenize(part);
    return tokens.length === 1 &&
      Object.prototype.hasOwnProperty.call(UNIT_ALIASES, tokens[0]);
  })) return [];

  const tokenCounts = [];

  for (let i = 0; i < parts.length; i++) {
    const tokens = tokenize(normalizedParts[i]);

    if (tokens.length === 0 || tokens.length > 4) return [];
    if (/\bund\b/i.test(parts[i])) return [];

    tokenCounts.push(tokens.length);
  }

  // "Ja, das ist richtig" ist keine Alternativliste. Echte
  // Synonymlisten haben meist ähnlich lange Teile.
  const shortest = Math.min(...tokenCounts);
  const longest = Math.max(...tokenCounts);
  if (shortest === 0 || longest / shortest > 2) return [];

  return parts;
}

/* ---------------- TIPPFEHLER ---------------- */

export function levenshtein(a, b) {
  if (a === b) return 0;

  const al = a.length;
  const bl = b.length;

  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);

  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;

    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;

      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[bl];
}

export function spellingSimilarity(a, b) {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

// Fuzzy-F1 über einzelne Wörter. Fängt Tippfehler, Flexion und
// kleine Umstellungen ab, ohne Zusatzwörter zu ignorieren.
export function fuzzyTokenScore(userTokens, correctTokens) {
  if (!userTokens.length || !correctTokens.length) return 0;

  let userSum = 0;

  for (const u of userTokens) {
    let best = 0;

    for (const c of correctTokens) {
      if (Math.abs(u.length - c.length) > 3) continue;

      const sim = spellingSimilarity(u, c);
      if (sim > best) best = sim;
      if (best === 1) break;
    }

    userSum += best;
  }

  let correctSum = 0;

  for (const c of correctTokens) {
    let best = 0;

    for (const u of userTokens) {
      if (Math.abs(c.length - u.length) > 3) continue;

      const sim = spellingSimilarity(c, u);
      if (sim > best) best = sim;
      if (best === 1) break;
    }

    correctSum += best;
  }

  const precision = userSum / userTokens.length;
  const recall = correctSum / correctTokens.length;

  return precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
}

// Zeichen-Bigramme: robust bei Tippfehlern und kleinen Umformulierungen.
export function charDice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const grams = new Map();

  for (let i = 0; i <= a.length - 2; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) || 0) + 1);
  }

  let intersection = 0;
  let total = 0;

  for (const count of grams.values()) total += count;

  for (let i = 0; i <= b.length - 2; i++) {
    const g = b.slice(i, i + 2);
    total++;

    const available = grams.get(g) || 0;
    if (available > 0) {
      intersection++;
      grams.set(g, available - 1);
    }
  }

  return total === 0 ? 0 : (2 * intersection) / total;
}

/* ---------------- ZAHLEN & EINHEITEN ---------------- */

function normalizeNumber(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "";

  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  // Tausenderpunkte entfernen ("1.234" -> "1234"), Dezimalkomma -> Punkt.
  s = s.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  s = s.replace(",", ".");

  const n = Number(s);
  if (!Number.isFinite(n)) return "";

  return String(negative ? -n : n);
}

function parseNumberToken(token) {
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
    return NUMBER_WORDS[token];
  }

  const normalized = normalizeNumber(token);
  if (normalized === "") return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function numbersOf(value) {
  const lowered = String(value ?? "").toLocaleLowerCase("de-DE");
  const result = new Set();
  const re = new RegExp(NUMBER_PATTERN, "g");

  for (const match of lowered.matchAll(re)) {
    const n = normalizeNumber(match[0]);
    if (n !== "") result.add(n);
  }

  // Zahlwörter ("zwei") zusätzlich als Zahl erfassen.
  for (const word of normalizeForMatch(value).split(" ")) {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, word)) {
      result.add(String(NUMBER_WORDS[word]));
    }
  }

  return result;
}

export function numbersMismatch(a, b) {
  const A = numbersOf(a);
  const B = numbersOf(b);

  if (A.size === 0 || B.size === 0) return false;
  if (A.size !== B.size) return true;

  for (const n of A) {
    if (!B.has(n)) return true;
  }

  return false;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

export function measurementsOf(value) {
  const lowered = String(value ?? "").toLocaleLowerCase("de-DE");
  const out = [];
  const re = new RegExp(`(${NUMBER_PATTERN})\\s*([a-zäöüß%°]+)`, "g");

  for (const match of lowered.matchAll(re)) {
    const number = parseNumberToken(match[1]);
    if (number === null) continue;

    const canonical = UNIT_ALIASES[match[2]];
    if (!canonical) continue;

    const def = UNIT_DEFS[canonical];
    if (!def) continue;

    out.push({
      dim: def.dim,
      value: round(number * def.factor),
    });
  }

  return out;
}

export function sameMeasurements(a, b) {
  if (a.length !== b.length) return false;

  const key = (m) => `${m.dim}:${m.value}`;
  const A = new Set(a.map(key));
  const B = new Set(b.map(key));

  if (A.size !== B.size) return false;

  for (const k of A) {
    if (!B.has(k)) return false;
  }

  return true;
}

/* ---------------- VERNEINUNG ---------------- */

export function negationCount(value) {
  // "nicht nur" ist keine Verneinung.
  const text = normalizeForMatch(value).replace(/\bnicht nur\b/g, "");
  return (text.match(NEGATION_RE) || []).length;
}

export function negationMismatch(a, b) {
  return (negationCount(a) > 0) !== (negationCount(b) > 0);
}

/* ---------------- ANALYSE ---------------- */

export function analyzeLexical(userAnswer, correctAnswer) {
  const userText = normalizeForMatch(userAnswer);
  const correctText = normalizeForMatch(correctAnswer);

  const userTokens = tokenize(userText);
  const correctTokens = tokenize(correctText);

  const exact = userText !== "" && userText === correctText;
  const short = correctTokens.length <= CONFIG.shortAnswerTokens;

  const fuzzy = fuzzyTokenScore(userTokens, correctTokens);
  const char = charDice(userText, correctText);

  const maxTokens = Math.max(userTokens.length, correctTokens.length);
  const lengthRatio = maxTokens === 0
    ? 0
    : Math.min(userTokens.length, correctTokens.length) / maxTokens;

  const negMismatch = negationMismatch(userAnswer, correctAnswer);

  // Einheiten nur vergleichen, wenn beide Seiten welche haben.
  const userMeasurements = measurementsOf(userAnswer);
  const correctMeasurements = measurementsOf(correctAnswer);
  const hasMeasurements =
    userMeasurements.length > 0 && correctMeasurements.length > 0;

  const unitMismatch = hasMeasurements
    ? !sameMeasurements(userMeasurements, correctMeasurements)
    : false;

  // Wenn Einheiten vorhanden sind, übernehmen sie den Zahlenvergleich
  // (5 m == 500 cm), sonst werden nackte Zahlen verglichen.
  const numMismatch = hasMeasurements
    ? false
    : numbersMismatch(userAnswer, correctAnswer);

  const penalty =
    (negMismatch ? CONFIG.penaltyNegation : 1) *
    (numMismatch ? CONFIG.penaltyNumber : 1) *
    (unitMismatch ? CONFIG.penaltyUnit : 1);

  return {
    userText,
    correctText,
    userTokens,
    correctTokens,
    exact,
    short,
    fuzzy,
    char,
    lengthRatio,
    negationMismatch: negMismatch,
    numberMismatch: numMismatch,
    unitMismatch,
    penalty,
  };
}

/* ---------------- ENTSCHEIDUNG ---------------- */

export function decide(analysis, semantic = 0, semanticAvailable = false) {
  if (!analysis.userText || !analysis.correctText) {
    return { correct: false, score: 0, reason: "empty" };
  }

  if (analysis.exact) {
    return { correct: true, score: 1, reason: "exact" };
  }

  const {
    fuzzy,
    char,
    lengthRatio,
    short,
    penalty,
  } = analysis;

  const lexical =
    CONFIG.lexicalFuzzy * fuzzy +
    CONFIG.lexicalChar * char +
    CONFIG.lexicalLength * Math.max(0, Math.min(1, lengthRatio));

  const combined = semanticAvailable
    ? CONFIG.semanticWeight * semantic + CONFIG.lexicalWeight * lexical
    : lexical;

  const score = combined * penalty;

  const semanticThreshold = short
    ? CONFIG.semanticThresholdShort
    : CONFIG.semanticThresholdLong;

  const semanticOk =
    semanticAvailable &&
    semantic >= semanticThreshold &&
    (short || fuzzy >= 0.2);

  const typoOk =
    fuzzy >= CONFIG.typoFuzzy &&
    lengthRatio >= CONFIG.typoLengthRatio &&
    (!semanticAvailable || semantic >= CONFIG.typoMinSemantic);

  // Kurze, echte Synonyme haben oft keine gemeinsamen Wortteile
  // (Computer/Rechner, Arzt/Mediziner). Das Modell erkennt sie
  // semantisch, aber der kombinierte Score bleibt niedrig.
  const shortSynonymOk =
    short &&
    semanticAvailable &&
    semantic >= 0.88 &&
    char < 0.3;

  // Grauzone bei kurzen Antworten: Das Modell hält verwandte Begriffe
  // (Zellmembran/Zellwand, Zellkern/Zellmembran) oft für ähnlich.
  // Gemeinsame Wortteile + keine echte Tippfehler-Ähnlichkeit sprechen
  // dann eher für einen anderen Fachbegriff als für ein Synonym.
  const grayZoneReject =
    short &&
    semanticAvailable &&
    semantic >= 0.84 &&
    semantic < semanticThreshold &&
    fuzzy < 0.75 &&
    char >= 0.3;

  const baseThreshold = short
    ? CONFIG.combinedThresholdShort
    : CONFIG.combinedThresholdLong;

  const threshold = penalty === 1
    ? baseThreshold
    : Math.min(0.96, baseThreshold + CONFIG.contradictionMargin);

  const combinedOk = score >= threshold;

  // Bei erkanntem Widerspruch dürfen Semantik/Tippfehler allein
  // nicht mehr durchwinken.
  const correct = penalty === 1
    ? (typoOk || shortSynonymOk || (!grayZoneReject && (semanticOk || combinedOk)))
    : combinedOk;

  return {
    correct,
    score,
    combined,
    lexical,
    semantic,
    semanticAvailable,
    threshold,
    semanticOk,
    typoOk,
    combinedOk,
    shortSynonymOk,
    grayZoneReject,
    reason: correct ? "match" : "no-match",
  };
}
