class AppNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.init();
  }

  getBasePath() {
    return location.hostname.includes("github.io")
      ? "/SylvaLearn"
      : "";
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 9999;

          left: 0;
          right: 0;
          bottom: 0;

          display: flex;
          justify-content: center;

          pointer-events: none;
        }

        .nav {
          position: relative;

          width: min(420px, calc(100vw - 32px));

          display: grid;
          grid-template-columns: repeat(5, 1fr);

          align-items: center;

          padding: 6px;
          margin-bottom: 14px;

          box-sizing: border-box;

          border-radius: 999px;

          background: rgba(255, 255, 255, 0.78);

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);

          border: 1px solid rgba(255, 255, 255, 0.65);

          box-shadow:
            0 10px 25px rgba(0, 0, 0, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.05);

          overflow: hidden;

          pointer-events: auto;
        }

        button {
          position: relative;
          z-index: 2;

          width: 100%;
          min-width: 0;

          border: 0;
          outline: 0;

          background: transparent;

          padding: 10px 0;

          font-family: inherit;
          font-size: 12px;

          color: #7a8a82;

          border-radius: 999px;

          cursor: pointer;

          transition:
            color 0.2s ease,
            transform 0.12s ease;
        }

        button:hover {
          color: #1f6f4a;
        }

        button.active {
          color: #1f6f4a;
          font-weight: 600;
        }

        button span {
          display: block;

          font-size: 18px;
          line-height: 20px;

          margin-bottom: 2px;
        }

        button:active {
          transform: scale(0.93);
        }

        /*
         * ==========================================
         * BUBBLE
         * ==========================================
         */

        .bubble {
          position: absolute;

          top: 6px;
          left: 6px;

          height: calc(100% - 12px);

          width: 0;

          border-radius: 999px;

          background: #e8f3ed;

          box-shadow:
            inset 0 0 0 1px rgba(31, 111, 74, 0.04);

          z-index: 1;

          pointer-events: none;

          transform: translate3d(0, 0, 0);

          /*
           * WICHTIG:
           * Anfangs KEINE Transition.
           */

          transition: none;
        }

        /*
         * Erst nachdem die Navigation vollständig
         * positioniert wurde, wird diese Klasse gesetzt.
         */

        .bubble.ready {
          transition:
            transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @media (max-width: 420px) {
          .nav {
            width: calc(100vw - 20px);
            margin-bottom: 10px;
          }

          button {
            padding: 9px 0;
            font-size: 11px;
          }

          button span {
            font-size: 17px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bubble {
            transition: none !important;
          }

          button {
            transition: none !important;
          }
        }
      </style>

      <nav class="nav" aria-label="Hauptnavigation">

        <div class="bubble"></div>

        <button data-page="/index">
          <span>🏠</span>
          Home
        </button>

        <button data-page="/Code/cards/cards">
          <span>📚</span>
          Karten
        </button>

        <button data-page="/Code/learn/learn">
          <span>🎓</span>
          Lernen
        </button>

        <button data-page="/Code/stats/stats">
          <span>📊</span>
          Statistik
        </button>

        <button data-page="/Code/profile/profile">
          <span>👤</span>
          Profil
        </button>

      </nav>
    `;
  }

  init() {
    const nav = this.shadowRoot.querySelector(".nav");
    const bubble = this.shadowRoot.querySelector(".bubble");

    const buttons = Array.from(
      this.shadowRoot.querySelectorAll("button")
    );

    const base = this.getBasePath();

    /*
     * ==========================================
     * AKTUELLEN PFAD
     * ==========================================
     */

    let currentPath = location.pathname;

    if (base && currentPath.startsWith(base)) {
      currentPath = currentPath.slice(base.length);
    }

    if (!currentPath) {
      currentPath = "/";
    }

    /*
     * ==========================================
     * PFAD NORMALISIEREN
     * ==========================================
     */

    const normalize = (path) => {
      if (path === "/index") {
        return "/index.html";
      }

      return path.endsWith(".html")
        ? path
        : path + ".html";
    };

    /*
     * ==========================================
     * AKTIVEN BUTTON FINDEN
     * ==========================================
     */

    let activeButton = null;

    buttons.forEach((button) => {
      const page = button.dataset.page;
      const target = normalize(page);

      if (
        currentPath === target ||
        currentPath.endsWith(target)
      ) {
        activeButton = button;
      }

      if (
        page === "/index" &&
        (
          currentPath === "/" ||
          currentPath === "/index.html"
        )
      ) {
        activeButton = button;
      }
    });

    /*
     * ==========================================
     * BUBBLE POSITION
     * ==========================================
     */

    const positionBubble = (button) => {
      if (!button) return;

      const index = buttons.indexOf(button);

      if (index === -1) return;

      const innerWidth = nav.clientWidth - 12;

      const itemWidth =
        innerWidth / buttons.length;

      bubble.style.width =
        `${itemWidth}px`;

      bubble.style.transform =
        `translate3d(${index * itemWidth}px, 0, 0)`;
    };

    /*
     * ==========================================
     * INITIALISIERUNG
     * ==========================================
     */

    if (activeButton) {

      activeButton.classList.add("active");

      /*
       * Ganz wichtig:
       * Bubble zuerst unsichtbar positionieren.
       */

      bubble.style.visibility = "hidden";

      positionBubble(activeButton);

      /*
       * Browser erst rendern lassen.
       */

      requestAnimationFrame(() => {

        requestAnimationFrame(() => {

          /*
           * Jetzt ist die Bubble bereits
           * an der richtigen Stelle.
           */

          bubble.style.visibility = "visible";

          /*
           * Erst jetzt Animation aktivieren.
           */

          bubble.classList.add("ready");

        });

      });
    }

    /*
     * ==========================================
     * NAVIGATION
     * ==========================================
     */

    buttons.forEach((button) => {

      button.addEventListener("click", (event) => {

        event.preventDefault();

        if (button === activeButton) {
          return;
        }

        /*
         * Alten Active-State entfernen
         */

        buttons.forEach((b) => {
          b.classList.remove("active");
        });

        /*
         * Neuen Active-State setzen
         */

        button.classList.add("active");

        /*
         * Bubble animieren
         */

        positionBubble(button);

        /*
         * Zielseite
         */

        const target =
          normalize(button.dataset.page);

        const destination =
          base + target;

        /*
         * Navigation direkt ausführen.
         *
         * Keine künstliche 180ms Verzögerung.
         */

        window.location.href = destination;
      });

    });

    /*
     * ==========================================
     * RESIZE
     * ==========================================
     */

    let resizeTimer;

    window.addEventListener("resize", () => {

      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {

        if (activeButton) {
          bubble.classList.remove("ready");

          positionBubble(activeButton);

          requestAnimationFrame(() => {
            bubble.classList.add("ready");
          });
        }

      }, 100);

    });
  }
}

customElements.define("app-nav", AppNav);