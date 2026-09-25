# SylvaLearn – Info für Entwicklung

Zentrale Hinweise, damit nichts auseinanderläuft. Ausführliche Projektbeschreibung steht in `README.md`.

## 1. Versionierung

Single Source of Truth ist die Datei `VERSION` (z. B. `v1.1.0 beta`).
Das Script `scripts/bump-version.mjs` verteilt sie automatisch nach:

- `index.html` → `<meta name="version" content="…">`
- `Code/profile/feedback.html` → Tag mit `id="appVersion"` (`Version: …`)

Befehle (Node 20+, keine Dependencies nötig):

```bash
npm run version:patch   # v1.1.0 beta → v1.1.1 beta
npm run version:minor   # v1.1.0 beta → v1.2.0 beta
npm run version:major   # v1.1.0 beta → v2.0.0 beta
npm run version:sync    # nur verteilen, ohne zu erhöhen
npm run version:check   # prüfen, ob alles synchron ist
node scripts/bump-version.mjs --set "v1.2.0 beta"  # manuell setzen
```

Zu beachten:

- Version **nie von Hand** in `index.html` oder `feedback.html` ändern – immer über das Script, sonst meldet der CI-Job `version-sync` einen Fehler.
- Das Suffix (z. B. ` beta`) bleibt bei Bump automatisch erhalten.
- Falls eine neue Stelle die Version anzeigen soll: im Script in `applyVersion()` ergänzen, **nicht** hart codieren.

## 2. Namensfilter (Profil + Lernsets)

Zentrale Datei: `Code/shared/name-filter.js` (`window.SylvaNameFilter`).
Verdrahtet in: Profil (`profile-script.js`), Lernset erstellen (`learnsets.js`), Lernset umbenennen (`editor.js`), Home-Gruß (`home/frontend/userName.js`).

Zu beachten:

- Neue verbotene Begriffe **nur dort** ergänzen:
  - `FORBIDDEN_EXACT` → blockt den exakten Namen (`admin`, `test`, …).
  - `FORBIDDEN_SUBSTRINGS` → blockt auch zusammengesetzte Namen (`HitlerFan123`). Nur schwere Begriffe ab 5 Zeichen eintragen, sonst gibt es False Positives (`Chess`, `Crisis`, `Contest` müssen erlaubt bleiben).
- Script-Tag **vor** den Verbrauchern laden (Reihenfolge bei `defer` zählt). Beispiel `profile.html`:
  ```html
  <script src="../shared/name-filter.js" defer></script>
  <script src="../profile/profile-script.js" defer></script>
  ```
- Set-Namen immer mit Trim vergleichen: `(s.name || "").trim() === name.trim()`.
- Nutzernamen nur per `textContent` anzeigen, nie per `innerHTML`.
- Längen-Caps: Profil 24 Zeichen, Lernset 40 Zeichen.

## 3. Statistik-Tracking

Schreibende Module: `Code/stats/avarageCardsAll.js` (global/Tag) und `Code/stats/avarageCardsAlone.js` (pro Set). Lesende Schicht: `Code/stats/frontend/stats-store.js` (`window.SylvaStats`), Rendering: `stats-render.js`.

Zu beachten:

- Zähler **immer frisch aus `localStorage` lesen**, keine Modul-Caches – mehrere Lernseiten-Module teilen sich sonst veraltete Werte.
- Tages-Rollover (`dailyCards_date` vs. heute) läuft beim Import **und** beim Öffnen der Stats-Seite. Leere Tage (0 Karten) werden nicht in `dailyCards_history` geschrieben.
- History ist auf die letzten 30 Tage begrenzt.
- Neue Antwortpfade (z. B. neuer Lernmodus) müssen `rightAnswerAll()` / `wrongAnswerAll()` **und** `rightAnswerAlone()` / `wrongAnswerAlone()` aufrufen, sonst fehlen die Daten in Übersicht bzw. pro Set.
- `learnsets[].allCardsAverage` / `rightCardsAverage` bei neuen Sets immer mit `0` anlegen.

## 4. Lernzeit & Streak

- `Code/home/frontend/countingTime.js` muss auf **jeder** Seite eingebunden sein (auch neue Seiten!), sonst steht `dailyMinutes`/`totalMinutes` still. Aktuell drin: Home, Lernen, Karten, Editor, Profil, Stats, beide Lernmodi.
- `streak.js` braucht `dailyMinutes >= 10` für einen Streak-Tag, rendert den gespeicherten Wert aber immer.
- Datumsformat: `sv-SE` (`YYYY-MM-DD`) für Zeit/Streak, `toDateString()` für Karten-History – beim Vergleichen per `Date`-Objekt matchen, nie per String.

## 5. Neue Seite anlegen (Checkliste)

1. Theme-Snippet gegen FOUC direkt nach `<meta charset>` kopieren (siehe `index.html` Zeile 9).
2. `loading-screen.css` + `sylva-loading`-Element + `loading-screen.js` einbinden.
3. Haupt-CSS `Code/home/frontend/style.css` wiederverwenden, seitenspezifisches CSS nur als Ergänzung.
4. `theme.js`, `app-nav.js` + `<app-nav></app-nav>` einbinden.
5. `countingTime.js` einbinden (siehe Punkt 4).
6. Falls ein Name angezeigt/gesetzt wird: `name-filter.js` **davor** laden (siehe Punkt 2).
7. Falls die Seite die App-Version zeigt: ans Bump-Script denken (siehe Punkt 1).
