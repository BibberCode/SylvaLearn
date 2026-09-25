#!/usr/bin/env node
/* =========================
   SYLVALEARN – VERSION BUMP
   Single Source of Truth: VERSION (z.B. "v1.0.8 beta")
   Schreibt die Version in:
     - index.html  (<meta name="version" content="…">)
     - Code/profile/feedback.html  (Version: …)

   Nutzung:
     node scripts/bump-version.mjs [major|minor|patch]  (Default: patch)
     node scripts/bump-version.mjs --set "v1.2.0 beta"
     node scripts/bump-version.mjs --sync     (nur verteilen, ohne Bump)
     node scripts/bump-version.mjs --check    (CI: prüfen ob alles sync ist)
   Nur Node-Builtins, keine Dependencies.
   ========================= */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FILE = join(ROOT, "VERSION");
const INDEX_FILE = join(ROOT, "index.html");
const FEEDBACK_FILE = join(ROOT, "Code", "profile", "feedback.html");

function parse(version) {
  const m = version.trim().match(/^(v)?(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!m) throw new Error(`Ungültiges Format in VERSION: "${version.trim()}" (erwartet z.B. "v1.0.8 beta")`);
  return { prefix: m[1] ?? "", major: Number(m[2]), minor: Number(m[3]), patch: Number(m[4]), suffix: m[5] ?? "" };
}

function format(v) {
  return `${v.prefix}${v.major}.${v.minor}.${v.patch}${v.suffix}`;
}

function replaceOnce(text, regex, replacement, label) {
  if (!regex.test(text)) throw new Error(`Muster nicht gefunden in ${label}`);
  return text.replace(regex, replacement);
}

function applyVersion(version) {
  // 1) index.html – Meta-Tag
  let index = readFileSync(INDEX_FILE, "utf-8");
  index = replaceOnce(
    index,
    /(<meta\s+name="version"\s+content=")[^"]*(")/,
    `$1${version}$2`,
    "index.html"
  );
  writeFileSync(INDEX_FILE, index);

  // 2) feedback.html – Versions-Tag (per id oder generisch "Version: …")
  let feedback = readFileSync(FEEDBACK_FILE, "utf-8");
  if (feedback.includes('id="appVersion"')) {
    feedback = replaceOnce(
      feedback,
      /(<[^>]*id="appVersion"[^>]*>\s*Version:\s*)(v?\d+\.\d+\.\d+[ \t]*[A-Za-z0-9]*)/,
      `$1${version}`,
      "feedback.html"
    );
  } else {
    feedback = replaceOnce(
      feedback,
      /(<p[^>]*>\s*Version:\s*)(v?\d+\.\d+\.\d+[ \t]*[A-Za-z0-9]*)/,
      `$1${version}`,
      "feedback.html"
    );
  }
  writeFileSync(FEEDBACK_FILE, feedback);

  // 3) VERSION-Datei
  writeFileSync(VERSION_FILE, version + "\n");
}

function readCurrent() {
  return {
    file: readFileSync(VERSION_FILE, "utf-8").trim(),
    index: (readFileSync(INDEX_FILE, "utf-8").match(/<meta\s+name="version"\s+content="([^"]*)"/) ?? [])[1] ?? "(fehlt)",
    feedback: (readFileSync(FEEDBACK_FILE, "utf-8").match(/Version:\s*([^<\n]*)/) ?? [])[1]?.trim() ?? "(fehlt)",
  };
}

const args = process.argv.slice(2);

if (args.includes("--check")) {
  const cur = readCurrent();
  const ok = cur.file === cur.index && cur.file === cur.feedback;
  console.log(`VERSION:  ${cur.file}`);
  console.log(`index:    ${cur.index}`);
  console.log(`feedback: ${cur.feedback}`);
  if (!ok) {
    console.error("FEHLER: Versionen sind nicht synchron. Lokal fixen mit: node scripts/bump-version.mjs --sync");
    process.exit(1);
  }
  console.log("OK: alles synchron.");
  process.exit(0);
}

if (args.includes("--sync")) {
  const version = readFileSync(VERSION_FILE, "utf-8").trim();
  parse(version); // validieren
  applyVersion(version);
  console.log(`Synchronisiert auf ${version}`);
  process.exit(0);
}

const setIdx = args.indexOf("--set");
if (setIdx !== -1) {
  const version = (args[setIdx + 1] ?? "").trim();
  if (!version) throw new Error('Fehlender Wert für --set, z.B. --set "v1.2.0 beta"');
  parse(version); // validieren
  applyVersion(version);
  console.log(`Gesetzt auf ${version}`);
  process.exit(0);
}

const level = args[0] ?? "patch";
if (!["major", "minor", "patch"].includes(level)) {
  throw new Error(`Unbekannt: "${level}" – nutze major|minor|patch, --set oder --check`);
}

const current = parse(readFileSync(VERSION_FILE, "utf-8"));
if (level === "major") {
  current.major += 1;
  current.minor = 0;
  current.patch = 0;
} else if (level === "minor") {
  current.minor += 1;
  current.patch = 0;
} else {
  current.patch += 1;
}
const next = format(current);
applyVersion(next);
console.log(`Bump (${level}): ${next}`);
