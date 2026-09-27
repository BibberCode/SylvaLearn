/* =========================
   SYLVALEARN – DATENVERWALTUNG (UI)
   Verdrahtet den Import-/Export-Bereich auf der
   Profilseite. Nutzt bestehende Storage-Funktionen
   (SylvaExporter / SylvaImporter) – keine eigene
   Datenhaltung. Alle Nutzernamen per textContent.

   Erwartete Element-IDs – je nach Seite vorhanden
   (der Manager läuft auf Profil UND Karten und
   nutzt nur, was es gibt):
   Profil: backupExportBtn, backupStatus, backupImportBtn,
     importInput, importModal (+ Unterelemente).
   Karten: importInput, importDropzone, importStatus,
     importModal (+ Unterelemente), learnsetList.
   (Exportieren hängt direkt an jedem Lernset –
   siehe Code/cards/.)

   Plain script (kein Modul), lädt nach den
   Import-/Export-Modulen (Reihenfolge bei defer).
   ========================= */

(function () {
  "use strict";

  var ACTION_LABELS = {
    add: "Hinzufügen",
    skip: "Überspringen",
    replace: "Ersetzen",
    new: "Als neues Lernset",
  };

  var preview = null;
  var lastFocused = null;

  /* ---------- HELPERS ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  function getLearnsets() {
    try {
      return JSON.parse(localStorage.getItem("learnsets")) || [];
    } catch (e) {
      return [];
    }
  }

  function setStatus(el, message, ok) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("success", "error");
    if (message) el.classList.add(ok ? "success" : "error");
  }

  function refreshSetCounter() {
    var el = $("numberOfSets");
    if (el) el.textContent = String(getLearnsets().length);
  }

  /* Statusziel: Import-Status auf der Karten-Seite,
     Backup-Status im Profil (dort liegt kein
     Import-Bereich mehr). */
  function statusTarget() {
    return $("importStatus") || $("backupStatus");
  }

  /* ---------- BACKUP-EXPORT ---------- */

  function doExportBackup() {
    var res = window.SylvaExporter.exportBackup();
    setStatus(
      $("backupStatus"),
      res.ok ? "Backup exportiert: " + res.fileName : (res.error || "Backup fehlgeschlagen."),
      res.ok
    );
  }

  /* ---------- IMPORT ---------- */

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    setStatus(statusTarget(), "Dateien werden geprüft …", true);
    window.SylvaImporter.analyze(files).then(function (p) {
      preview = p;
      setStatus(statusTarget(), "", true);
      openPreview();
      // Gleicher Dateiname soll erneut wählbar bleiben
      var input = $("importInput");
      if (input) input.value = "";
    }).catch(function (e) {
      console.error("SylvaLearn: Import-Analyse fehlgeschlagen:", e);
      setStatus(statusTarget(), "Import fehlgeschlagen: Die Dateien konnten nicht geprüft werden.", false);
    });
  }

  /* ---------- VORSCHAU-MODAL ---------- */

  function openPreview() {
    var modal = $("importModal");
    if (!modal || !preview) return;
    lastFocused = document.activeElement;
    var metaCheck = $("restoreMetaCheck");
    if (metaCheck) metaCheck.checked = true;
    renderPreview();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    var btn = $("importConfirmBtn");
    if (btn) btn.focus();
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    var modal = $("importModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function summarize() {
    var valid = preview.items.filter(function (it) { return it.internal && it.errors.length === 0; });
    var cards = valid.reduce(function (s, it) { return s + (it.cardCount || 0); }, 0);
    var fresh = valid.filter(function (it) { return !it.duplicate; }).length;
    var dups = valid.filter(function (it) { return !!it.duplicate; }).length;
    var broken = preview.items.length - valid.length + preview.fileErrors.length;
    return { sets: valid.length, cards: cards, fresh: fresh, dups: dups, broken: broken };
  }

  /* ---------- BACKUP-VORSCHAU ---------- */

  function mkEl(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  function formatBackupDate(iso) {
    if (!iso) return "–";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) {
      return String(iso);
    }
  }

  function themeLabel(value) {
    if (value === "dark") return "Dunkel";
    if (value === "light") return "Hell";
    return "System";
  }

  function backupRow(box, label, value) {
    var row = mkEl("div", "sylva-backup-row");
    row.appendChild(mkEl("span", "sylva-backup-key", label));
    row.appendChild(mkEl("span", "sylva-backup-value",
      value == null || value === "" ? "–" : String(value)));
    box.appendChild(row);
  }

  function historyDayCount(raw) {
    try {
      var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return String(parsed.length);
      if (parsed && typeof parsed === "object") return String(Object.keys(parsed).length);
    } catch (e) { /* kein valider Verlauf */ }
    return null;
  }

  /* Baut die Backup-Detailkarte: Datei, Profil (Avatar + Name),
     Einstellungen, Lernstand und Statistik. Alles per textContent
     (XSS-sicher); das Avatar-Thumbnail nur bei gültiger Data-URL
     (die Migration hat das bereits geprüft). */
  function renderBackupDetails(box, meta) {
    box.innerHTML = "";
    var card = mkEl("div", "sylva-backup-card");

    card.appendChild(mkEl("div", "sylva-backup-title", "🗄️ Backup"));
    backupRow(card, "Datei", meta.sourceFile || "–");
    backupRow(card, "Exportiert", formatBackupDate(meta.exportedAt));
    if (meta.appVersion) backupRow(card, "App-Version", meta.appVersion);

    var settings = meta.settings || {};
    var progress = meta.progress || {};
    var stats = meta.statistics || {};

    // Profil
    var profileRow = mkEl("div", "sylva-backup-profile");
    if (meta.hasAvatar && typeof settings.avatar === "string" &&
        settings.avatar.indexOf("data:image/") === 0) {
      var thumb = mkEl("img", "sylva-backup-avatar");
      thumb.alt = "Profilbild aus dem Backup";
      thumb.src = settings.avatar;
      profileRow.appendChild(thumb);
    }
    var who = mkEl("div", "sylva-backup-who");
    who.appendChild(mkEl("div", "sylva-backup-name", settings.name || "Ohne Name"));
    who.appendChild(mkEl("div", "sylva-backup-sub", "Profil aus dem Backup"));
    profileRow.appendChild(who);
    card.appendChild(profileRow);

    // Einstellungen
    var hasSettings = settings["sylva-theme"] !== undefined ||
      settings.maxMinutes !== undefined || settings.loadingScreen !== undefined;
    if (hasSettings) {
      card.appendChild(mkEl("div", "sylva-backup-heading", "⚙️ Einstellungen"));
      if (settings["sylva-theme"] !== undefined) {
        backupRow(card, "Design", themeLabel(settings["sylva-theme"]));
      }
      if (settings.maxMinutes !== undefined) {
        backupRow(card, "Tagesziel", settings.maxMinutes + " Min.");
      }
      if (settings.loadingScreen !== undefined) {
        backupRow(card, "Loading-Screen", settings.loadingScreen === "false" ? "Aus" : "An");
      }
    }

    // Lernstand
    var hasProgress = progress.streak !== undefined ||
      progress.dailyMinutes !== undefined || progress.totalMinutes !== undefined ||
      progress.currentSetName;
    if (hasProgress) {
      card.appendChild(mkEl("div", "sylva-backup-heading", "📈 Lernstand"));
      if (progress.streak !== undefined) backupRow(card, "Streak", progress.streak + " Tage");
      if (progress.dailyMinutes !== undefined || progress.totalMinutes !== undefined) {
        backupRow(card, "Lernzeit",
          (progress.dailyMinutes !== undefined ? progress.dailyMinutes : "–") + " Min. heute • " +
          (progress.totalMinutes !== undefined ? progress.totalMinutes : "–") + " Min. gesamt");
      }
      if (progress.currentSetName) backupRow(card, "Aktuelles Set", progress.currentSetName);
    }

    // Statistik
    var hasStats = stats.dailyCardsAll !== undefined || stats.rightCardsAll !== undefined;
    if (hasStats) {
      card.appendChild(mkEl("div", "sylva-backup-heading", "📊 Statistik"));
      var done = Number(stats.dailyCardsAll);
      var right = Number(stats.rightCardsAll);
      var statText = (stats.dailyCardsAll !== undefined ? stats.dailyCardsAll : "–") + " Karten heute";
      if (stats.rightCardsAll !== undefined) {
        statText += " • " + stats.rightCardsAll + " richtig";
        if (isFinite(done) && isFinite(right) && done > 0) {
          statText += " (" + Math.round((right / done) * 100) + " %)";
        }
      }
      backupRow(card, "Heute", statText);
      var days = stats.dailyCards_history !== undefined
        ? historyDayCount(stats.dailyCards_history)
        : null;
      if (days !== null) backupRow(card, "Verlauf", days + (days === "1" ? " Tag" : " Tage"));
    }

    box.appendChild(card);
  }

  function renderPreview() {
    // Dialog unvollständig (falsche Seite)? – dann nichts rendern.
    if (!$("importSummary") || !$("importItems") || !$("importFileErrors")) return;
    var s = summarize();

    var titleEl = $("importTitle");
    if (titleEl) titleEl.textContent = preview.isBackup ? "Backup-Vorschau" : "Import";

    $("importSummary").textContent =
      s.sets + (s.sets === 1 ? " Lernset" : " Lernsets") + " gefunden, " +
      s.cards + (s.cards === 1 ? " Karte" : " Karten") + " gefunden";

    var sub = [];
    if (s.fresh > 0) sub.push("+ " + s.fresh + " neue Lernsets");
    if (s.dups > 0) sub.push("↻ " + s.dups + " bereits vorhandene Lernsets");
    if (s.broken > 0) sub.push("⚠ " + s.broken + " fehlerhafte Dateien/Einträge");
    if (preview.isBackup && preview.backupMeta && preview.backupMeta.hasAvatar) {
      sub.push("🖼️ Profilbild enthalten");
    }
    if (sub.length === 0) sub.push("Keine importierbaren Inhalte gefunden.");
    $("importSubSummary").textContent = sub.join("  •  ");

    // Dateifehler
    var fileErrBox = $("importFileErrors");
    fileErrBox.innerHTML = "";
    preview.fileErrors.forEach(function (fe) {
      var p = document.createElement("p");
      p.className = "sylva-preview-error";
      p.textContent = (fe.fileName ? fe.fileName + ": " : "") + fe.message;
      fileErrBox.appendChild(p);
    });
    // Beschädigtes Profilbild blockiert nie den Import – nur Hinweis.
    if (preview.isBackup && preview.backupMeta && preview.backupMeta.avatarWarning) {
      var avWarn = document.createElement("p");
      avWarn.className = "sylva-preview-warning";
      avWarn.textContent = preview.backupMeta.avatarWarning;
      fileErrBox.appendChild(avWarn);
    }

    // Backup-Details nur bei Backups zeigen
    var backupBox = $("importBackupDetails");
    if (backupBox) {
      if (preview.isBackup && preview.backupMeta) {
        backupBox.style.display = "";
        renderBackupDetails(backupBox, preview.backupMeta);
      } else {
        backupBox.style.display = "none";
        backupBox.innerHTML = "";
      }
    }

    // Items
    var list = $("importItems");
    list.innerHTML = "";
    if (preview.items.length === 0) {
      var none = document.createElement("p");
      none.className = "sylva-preview-warning";
      none.textContent = "Keine Lernsets in den Dateien gefunden.";
      list.appendChild(none);
    }
    preview.items.forEach(function (item, idx) {
      list.appendChild(buildItemRow(item, idx));
    });

    // Backup-Meta nur bei Backups zeigen
    var metaBox = $("backupMetaBox");
    if (metaBox) metaBox.style.display = preview.isBackup ? "" : "none";

    updateConfirmButton();
  }

  function statusBadge(item) {
    var badge = document.createElement("span");
    badge.className = "sylva-badge";
    if (item.errors.length > 0) {
      badge.classList.add("err");
      badge.textContent = "Fehler";
    } else if (item.duplicate) {
      badge.classList.add("dup");
      badge.textContent = item.duplicate.kind === "id" ? "Duplikat (ID)" : "Duplikat (Name)";
    } else {
      badge.classList.add("new");
      badge.textContent = "Neu";
    }
    return badge;
  }

  function buildItemRow(item, idx) {
    var row = document.createElement("div");
    row.className = "sylva-preview-item";

    var title = document.createElement("div");
    title.className = "sylva-preview-title";
    title.textContent = (item.internal && item.internal.emoji ? item.internal.emoji + " " : "") + (item.label || "Unbenannt");
    title.appendChild(statusBadge(item));
    row.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "sylva-preview-meta";
    var parts = [];
    parts.push(item.cardCount + (item.cardCount === 1 ? " Karte" : " Karten"));
    parts.push("aus " + item.source);
    if (item.duplicate) parts.push("vorhanden: " + item.duplicate.name);
    meta.textContent = parts.join("  •  ");
    row.appendChild(meta);

    item.errors.forEach(function (msg) {
      var p = document.createElement("p");
      p.className = "sylva-preview-error";
      p.textContent = msg;
      row.appendChild(p);
    });
    item.warnings.forEach(function (msg) {
      var p = document.createElement("p");
      p.className = "sylva-preview-warning";
      p.textContent = msg;
      row.appendChild(p);
    });

    // Aktion pro Duplikat wählbar
    if (item.internal && item.errors.length === 0 && item.duplicate) {
      var actionRow = document.createElement("div");
      actionRow.className = "sylva-preview-action";
      var lab = document.createElement("span");
      lab.textContent = "Bei Duplikat:";
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", "Aktion für Duplikat " + item.label);
      ["skip", "replace", "new"].forEach(function (a) {
        var opt = document.createElement("option");
        opt.value = a;
        opt.textContent = ACTION_LABELS[a];
        if (item.action === a) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        item.action = sel.value;
        updateConfirmButton();
      });
      actionRow.append(lab, sel);
      row.appendChild(actionRow);
    }
    return row;
  }

  function updateConfirmButton() {
    var btn = $("importConfirmBtn");
    if (!btn || !preview) return;
    var valid = preview.items.filter(function (it) {
      return it.internal && it.errors.length === 0;
    });
    var importable = valid.filter(function (it) {
      return it.action !== "skip";
    }).length;
    // Nur beim Backup: Auch wenn alle Lernsets übersprungen werden,
    // darf importiert werden – dann werden nur die Backup-
    // Einstellungen (Profil, Lernstand, Statistiken)
    // wiederhergestellt, die Lernsets bleiben unangetastet.
    var metaOnly = preview.isBackup && valid.length > 0 &&
      importable === 0 && isMetaRestoreArmed();
    var canImport = importable > 0 || metaOnly;
    btn.disabled = !canImport;
    btn.textContent = importable > 0
      ? "Importieren (" + importable + ")"
      : (metaOnly ? "Backup wiederherstellen" : "Importieren");
    btn.style.opacity = canImport ? "" : "0.5";
    updateHint(valid.length, importable, metaOnly);
  }

  /* Meta-Wiederherstellung aktiv? (Nur Backups haben die Checkbox.) */
  function isMetaRestoreArmed() {
    var metaCheck = $("restoreMetaCheck");
    return !!(preview && preview.isBackup && metaCheck && metaCheck.checked);
  }

  /* Erklärt, warum gerade nichts importiert werden kann –
     statt den Button kommentarlos zu deaktivieren.
     „Überspringen“ heißt: dieses Set wird NICHT übernommen.
     Steht alles auf Überspringen (z. B. das einzige Set ist
     ein Duplikat), gibt es folgerichtig nichts zu importieren –
     dann hilft „Ersetzen“ oder „Als neu anlegen“. */
  function updateHint(validCount, importable, metaOnly) {
    var hint = $("importHint");
    if (!hint) return;
    var msg = "";
    if (validCount === 0) {
      msg = "Keine importierbaren Inhalte gefunden. Prüfe die Fehlermeldungen oben – deine bestehenden Daten wurden nicht verändert.";
    } else if (metaOnly) {
      msg = "Alle Lernsets werden übersprungen – es werden nur die Backup-Einstellungen (Profil, Lernstand, Statistiken) wiederhergestellt. Die Lernsets bleiben unverändert.";
    } else if (importable === 0) {
      msg = "Alle Lernsets stehen auf „Überspringen“ und werden nicht übernommen. Stelle bei einem Duplikat „Ersetzen“ oder „Als neu anlegen“ ein, wenn du es trotzdem importieren willst.";
    }
    hint.textContent = msg;
    hint.style.display = msg ? "" : "none";
  }

  function doCommit() {
    if (!preview) return;
    var restoreMeta = false;
    var metaCheck = $("restoreMetaCheck");
    if (metaCheck && preview.isBackup) restoreMeta = metaCheck.checked;
    var res = window.SylvaImporter.commit(preview, restoreMeta);
    if (!res.ok) {
      setStatus(statusTarget(), "Import fehlgeschlagen: " + (res.error || "Unbekannter Fehler."), false);
      closePreview();
      return;
    }
    var parts = [];
    if (res.imported > 0) parts.push(res.imported + " hinzugefügt");
    if (res.replaced > 0) parts.push(res.replaced + " ersetzt");
    if (res.asNew > 0) parts.push(res.asNew + " als neu angelegt");
    if (res.skipped > 0) parts.push(res.skipped + " übersprungen");
    if (res.restoredAvatar) parts.push("Profilbild wiederhergestellt");
    if (res.restoredMeta) parts.push("Einstellungen wiederhergestellt");
    setStatus(
      statusTarget(),
      parts.length > 0 ? "Import erfolgreich: " + parts.join(", ") + "." : "Import abgeschlossen.",
      true
    );
    closePreview();
    preview = null;
    refreshSetCounter();
    refreshSetOverview();
    if (res.restoredMeta) refreshProfileUI();
  }

  /* Profilseite sofort neu befüllen, damit wiederhergestellter Name,
     Lernziel, Theme, Loading-Schalter und Avatar ohne Reload sichtbar
     sind. Jedes Feld einzeln mit Guard – läuft auch auf der
     Karten-Seite (dort existiert nichts davon) ohne Fehler. */
  function refreshProfileUI() {
    try {
      var name = null, maxMinutes = null, avatar = null, loading = null;
      try {
        name = localStorage.getItem("name");
        maxMinutes = localStorage.getItem("maxMinutes");
        avatar = localStorage.getItem("avatar");
        loading = localStorage.getItem("loadingScreen");
      } catch (e) {
        return;
      }
      var nameEl = $("name");
      if (nameEl && name) nameEl.textContent = name;
      var nameInput = $("nameInput");
      if (nameInput && name) nameInput.value = name;
      var maxEl = $("maxMinutes");
      if (maxEl && maxMinutes) maxEl.textContent = maxMinutes;
      var maxInput = $("maxMinutesInput");
      if (maxInput && maxMinutes) maxInput.value = maxMinutes;
      var img = $("avatarImg");
      if (img && avatar && avatar.indexOf("data:image/") === 0) img.src = avatar;
      var loadingBox = $("checkboxInput");
      if (loadingBox) loadingBox.checked = loading !== "false";
      // Gespeichertes Theme sofort anwenden (schreibt nichts um,
      // wendet nur den gerade wiederhergestellten Stand an).
      try {
        if (window.SylvaTheme && typeof window.SylvaTheme.get === "function") {
          var current = window.SylvaTheme.get();
          if (typeof window.SylvaTheme.set === "function") window.SylvaTheme.set(current);
          document.querySelectorAll("#themeSwitch [data-theme]").forEach(function (b) {
            b.classList.toggle("active", b.dataset.theme === current);
          });
        }
      } catch (e) { /* Theme-UI optional */ }
    } catch (e) {
      console.error("SylvaLearn: Profilansicht konnte nicht aktualisiert werden:", e);
    }
  }

  /* Übersicht auf der Karten-Seite sofort neu rendern,
     damit importierte Sets ohne Reload erscheinen.
     (Im Profil gibt es keine Übersicht – Guard.) */
  function refreshSetOverview() {
    try {
      if (document.getElementById("learnsetList") && typeof window.renderLearnsets === "function") {
        window.renderLearnsets();
      }
    } catch (e) {
      console.error("SylvaLearn: Übersicht konnte nicht aktualisiert werden:", e);
    }
  }

  /* ---------- INIT ---------- */

  /* Datei-Input unabhängig von der Dropzone verdrahten:
     Auf der Profilseite gibt es keine Dropzone (nur Backup
     über Button) – ohne diesen Listener passierte nach der
     Dateiauswahl gar nichts (keine Vorschau, kein Import). */
  function initFileInput() {
    var input = $("importInput");
    if (!input || input.dataset.sylvaWired) return;
    input.dataset.sylvaWired = "1";
    input.addEventListener("change", function () {
      handleFiles(input.files);
    });
  }

  function initDropzone() {
    var zone = $("importDropzone");
    var input = $("importInput");
    if (!zone || !input) return;

    function openDialog() {
      input.click();
    }
    zone.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      openDialog();
    });
    zone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDialog();
      }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        zone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        zone.classList.remove("drag-over");
      });
    });
    zone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });
  }

  /* Tastaturbedienung für Div-Buttons (passend zu bestehenden Cards) */
  function makeKeyboardClickable(el, action) {
    if (!el) return;
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    });
  }

  function init() {
    // Stabile IDs für Alt-Daten nachrüsten (schreibt nur bei Bedarf)
    try {
      if (window.SylvaMigrations) window.SylvaMigrations.ensureLearnsetIds();
    } catch (e) {
      console.error("SylvaLearn: ID-Migration fehlgeschlagen:", e);
    }

    if ($("backupExportBtn")) $("backupExportBtn").addEventListener("click", doExportBackup);
    makeKeyboardClickable($("backupExportBtn"), doExportBackup);
    if ($("backupImportBtn")) $("backupImportBtn").addEventListener("click", function () {
      var input = $("importInput");
      if (input) input.click();
    });

    initFileInput();
    initDropzone();

    // Vorschau-Dialog
    if ($("importCancelBtn")) $("importCancelBtn").addEventListener("click", closePreview);
    if ($("importConfirmBtn")) $("importConfirmBtn").addEventListener("click", doCommit);
    // Checkbox-Umschaltung aktualisiert Button + Hinweis sofort
    // (wichtig, wenn alle Sets übersprungen sind: nur mit
    // Wiederherstellung gibt es dann etwas zu importieren).
    if ($("restoreMetaCheck")) $("restoreMetaCheck").addEventListener("change", updateConfirmButton);
    var overlay = $("importModal");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePreview();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
        closePreview();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
