/* =========================
   SYLVALEARN – PROFILNAME ANZEIGEN (Home)
   Liest localStorage "name", heilt verbotene
   Alt-Werte und rendert per textContent.
   ========================= */

(function () {
  "use strict";

  function renderUserName() {
    const el = document.getElementById("name");
    if (!el) return;

    let name = "";
    try {
      if (window.SylvaNameFilter) {
        name = window.SylvaNameFilter.migrateStoredProfileName() || "";
      } else {
        name = localStorage.getItem("name") || "";
      }
    } catch {
      name = "";
    }

    name = (name || "").trim().slice(0, 24);
    el.textContent = name || "Lernender";
  }

  window.addEventListener("DOMContentLoaded", renderUserName);
  window.SylvaRenderUserName = renderUserName;
})();
