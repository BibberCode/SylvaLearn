# SylvaLearn 🚀

A Progressive Web App focused on confident, efficient, and smart learning 📚🧠

---

## ✨ About the Project

Learn App is a flashcard-based learning system designed to help users memorize content more effectively using repetition, confidence tracking, and adaptive difficulty.

This is my first Progressive Web App (PWA), so bugs or unexpected behavior may still occur 🐛

---

## 🎯 Features

* 📚 Flashcard-based learning system
* 🧠 Smart Mode (AI-based answer comparison)
* ⚡ Strict Mode (exact answer matching)
* 🔍 Self-Compare (semantic similarity evaluation)
* 📊 Progress tracking per learning set
* 💾 Offline storage using localStorage
* 🔄 Weighted card system (harder cards appear more often)
* 📱 PWA support (installable on devices)
* 💾 Import/Export: learnsets as Markdown, full backup as JSON (see below)

---

## 💾 Import / Export (local, no account needed)

On the **Karten** page you can:

* import `.md` / `.json` files (multi-select + drag & drop,
  with preview and per-duplicate choice: skip / replace / add as new)
* export each learnset directly via its own **📤 Exportieren**
  button (also available in the editor) as a Markdown file (`.md`)

In the profile page under **Datenverwaltung** you can:

* export a full backup as JSON (learnsets, settings incl. profile
  picture, learning time, streak and statistics) and restore it

Markdown format (`version: 1`):

```md
---
format: sylvalearn
version: 1
title: Biologie – Zelle
description: Aufbau und Funktion der Zelle
emoji: 🧬
mode: self-compare
id: <stable id for duplicate detection>
---

## Was ist die Zellmembran?

Die Zellmembran grenzt die Zelle ab und reguliert den Stoffaustausch.
```

Backup format (`version: 1`):

```json
{
  "format": "sylvalearn-backup",
  "version": 1,
  "exportedAt": "2026-09-27T13:45:00.000Z",
  "data": {
    "learnsets": [],
    "settings": {},
    "progress": {},
    "statistics": {}
  }
}
```

Notes:

* Every file is fully validated **before** anything is written –
  a failed import never touches existing data.
* Implementation: `Code/data/import-export/`
  (`markdown.js`, `json.js`, `validator.js`, `migrations.js`,
  `exporter.js`, `importer.js`, `data-manager.js`).
  Version checks live only in `migrations.js`, so future
  formats can be migrated centrally.
* Tests: `node scripts/test-import-export.mjs`
  (roundtrips `learnset → markdown → learnset` and
  `backup → JSON → backup` plus all documented error cases).

---

## 🧩 How it works

1. A question is shown
2. You type your answer
3. The system evaluates your response
4. You set a confidence level (1–5)
5. The system adapts future repetitions based on your performance

---

## 🛠️ Technologies

* HTML5
* CSS3
* JavaScript (Vanilla)
* ES Modules
* localStorage
* Transformers.js (optional AI feature)

---

## 🚀 Installation

1. Clone the repository
2. Open `index.html` in your browser
3. No build tools required – runs fully in the browser

---

## 🐛 Bugs & Contributions

This is an early-stage project.

You can help by:

* 🐞 Opening an issue
* 🔧 Fixing bugs or improving features
* 💡 Suggesting improvements

The project is open source and welcomes contributions.

---

## 🔮 Planned Features

* 🔐 User accounts
* 📈 Advanced statistics per card
* 🧠 Improved spaced repetition algorithm
* 🎮 Gamification system

---

## 👤 Author

BibberCode

---

## ⚖️ License

This project is licensed under the MIT License.
You are free to use, modify, and distribute it.
