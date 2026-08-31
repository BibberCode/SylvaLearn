const loadingScreenEnabled =
  localStorage.getItem("loadingScreen") !== "false";

if (loadingScreenEnabled) {

  class SylvaLoading extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this.startTime = performance.now();
      this.minDuration = 700;
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
      this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="/Code/loading-screen/loading-screen.css">

        <div class="loading-screen">
          <div class="loader"></div>
        </div>
      `;
    }

    finish() {
      const elapsed = performance.now() - this.startTime;

      const remaining = Math.max(
        0,
        this.minDuration - elapsed
      );

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

  customElements.define("sylva-loading", SylvaLoading);
}