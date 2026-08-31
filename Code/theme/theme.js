// SylvaLearn Theme – Dark / Light / System
// Persistenz: localStorage "sylva-theme" = "light" | "dark" | "system"
// Frühzeitiges Setzen via Inline-Script im <head> verhindert FOUC, hier nur Logik + Events
(function () {
  const STORAGE_KEY = "sylva-theme";

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function getSystem() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function getEffective(theme) {
    if (theme === "dark" || theme === "light") return theme;
    return getSystem();
  }
  function apply(theme) {
    const effective = getEffective(theme);
    document.documentElement.setAttribute("data-theme", effective);
    document.documentElement.style.colorScheme = effective;
    // Meta theme-color für Browser-UI (optional)
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = effective === "dark" ? "#0b1410" : "#f3f7f4";
    document.dispatchEvent(new CustomEvent("themechange", { detail: effective }));
  }

  // Initial bereits via Inline-Script gesetzt, hier nochmal sicherstellen
  const stored = getStored();
  apply(stored || "system");

  // System-Wechsel beobachten (nur wenn auf system)
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const cur = getStored();
      if (!cur || cur === "system") apply("system");
    });
  } catch {}

  // Globale API
  window.SylvaTheme = {
    set(theme) {
      // theme: "light" | "dark" | "system"
      try {
        if (theme === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, theme);
      } catch {}
      apply(theme);
    },
    get() { return getStored() || "system"; },
    getEffective() { return getEffective(getStored() || "system"); },
    toggle() {
      const cur = getEffective(getStored() || "system");
      const next = cur === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      apply(next);
      return next;
    },
    isDark() { return getEffective(getStored() || "system") === "dark"; }
  };
})();
