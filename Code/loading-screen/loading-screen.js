const loadingScreenEnabled =
  localStorage.getItem("loadingScreen") !== "false";

const basePath = location.hostname.includes("github.io")
  ? "/SylvaLearn"
  : "";

// Wenn Loading Screen aus -> Element sofort verstecken, Nav-Transition bleibt sauber
if (!loadingScreenEnabled) {
  // Sofort alle vorhandenen <sylva-loading> unsichtbar machen (falls HTML sie enthält)
  const hideAll = () => document.querySelectorAll("sylva-loading").forEach(el => {
    el.style.display = "none";
    el.style.pointerEvents = "none";
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideAll, { once: true });
  } else {
    hideAll();
  }
  // Dummy definieren damit <sylva-loading> kein Unknown-Element bleibt
  if (!customElements.get("sylva-loading")) {
    class SylvaLoadingDisabled extends HTMLElement {
      connectedCallback() { this.style.display = "none"; }
    }
    customElements.define("sylva-loading", SylvaLoadingDisabled);
  }
} else {

  class SylvaLoading extends HTMLElement {

    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this.startTime = performance.now();
      this.minDuration = 700;
      // viaNav Marker aufräumen – Mindestdauer bleibt bei angeschaltetem Screen 700ms
      try { sessionStorage.removeItem("sylva-nav-from"); } catch {}
    }

    connectedCallback() {
      this.render();

      if (document.readyState === "complete") {
        this.finish();
      } else {
        window.addEventListener(
          "load",
          () => this.finish(),
          { once: true }
        );
      }
    }

    render() {

      const cssPath =
        `${basePath}/Code/loading-screen/loading-screen.css`;

      this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="${cssPath}">

        <div class="loading-screen">
          <div class="loader"></div>
        </div>
      `;
    }

    finish() {

      const elapsed =
        performance.now() - this.startTime;

      const remaining =
        Math.max(0, this.minDuration - elapsed);

      setTimeout(() => {
        this.hide();
      }, remaining);
    }

    hide() {

      this.classList.add("hidden");

      setTimeout(() => {
        this.remove();
      }, 400);
    }
  }

  customElements.define(
    "sylva-loading",
    SylvaLoading
  );
}