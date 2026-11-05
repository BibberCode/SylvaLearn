if ("serviceWorker" in navigator) {
  // sw.js liegt immer im Projekt-Root – unabhängig davon, von welcher
  // Seite app.js eingebunden wird.
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const swUrl = new URL("sw.js", scriptUrl);
  const hadController = Boolean(navigator.serviceWorker.controller);

  // updateViaCache: "none" sorgt dafür, dass der Browser sw.js nicht
  // aus dem HTTP-Cache nimmt. Sonst kann eine alte Service-Worker-
  // Version noch tagelang alte JS-Dateien ausliefern.
  navigator.serviceWorker
    .register(swUrl, { updateViaCache: "none" })
    .then(registration => {
      console.log("Service Worker aktiv");
      registration.update().catch(() => {});
    })
    .catch(err => console.log("SW Fehler:", err));

  // Nach einem Service-Worker-Update einmal neu laden, damit die
  // neuen Module sicher ausgeführt werden. Beim allerersten
  // Installieren gibt es noch keinen alten Controller – dann ist kein
  // Reload nötig.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    if (sessionStorage.getItem("sylva-sw-reloaded") === "1") return;

    sessionStorage.setItem("sylva-sw-reloaded", "1");
    window.location.reload();
  });

  // Flag erst nach kurzer Zeit zurücksetzen. Würde es sofort
  // gelöscht, könnte ein spät eintreffendes controllerchange-
  // Ereignis eine Reload-Schleife auslösen.
  const clearReloadFlag = () => {
    setTimeout(() => {
      sessionStorage.removeItem("sylva-sw-reloaded");
    }, 5000);
  };

  if (document.readyState === "complete") {
    clearReloadFlag();
  } else {
    window.addEventListener("load", clearReloadFlag, { once: true });
  }
}
